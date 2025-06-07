const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Dynamic import for TypeScript modules
async function loadJobProcessor() {
  try {
    // Try to load the compiled JavaScript version first
    const path = require('path');
    const jobProcessorPath = path.join(__dirname, '.next/server/chunks/job-processor.js');
    return require(jobProcessorPath).JobProcessor;
  } catch (error) {
    console.log('Job processor not available in production build, job processing will be disabled');
    return null;
  }
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = process.env.PORT || 3000;

// Job processing configuration
const JOB_POLL_INTERVAL = parseInt(process.env.JOB_POLL_INTERVAL || '30000'); // 30 seconds default for Replit
const JOB_BATCH_SIZE = parseInt(process.env.JOB_BATCH_SIZE || '3'); // Smaller batch for inline processing

// Configure the app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let jobProcessingInterval = null;
let isProcessingJobs = false;
let JobProcessor = null;

// Job processing function
async function processJobs() {
  if (!JobProcessor || isProcessingJobs) {
    return;
  }

  isProcessingJobs = true;
  
  try {
    await JobProcessor.processPendingJobs(JOB_BATCH_SIZE);
  } catch (error) {
    console.error('[JOB PROCESSOR] Error processing jobs:', error);
  } finally {
    isProcessingJobs = false;
  }
}

app.prepare().then(async () => {
  // Load JobProcessor if available
  JobProcessor = await loadJobProcessor();
  
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;
      
      // Handle health check explicitly
      if (pathname === '/health') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          status: 'ok', 
          message: 'CareerAI is healthy',
          jobProcessor: JobProcessor ? 'enabled' : 'disabled',
          environment: process.env.NODE_ENV
        }));
        return;
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Health check available at http://${hostname}:${port}/health`);
      console.log(`> Environment: ${process.env.NODE_ENV}`);
      
      // Start job processing if in production and JobProcessor is available
      if (!dev && JobProcessor) {
        console.log(`> Starting inline job processor (interval: ${JOB_POLL_INTERVAL}ms, batch: ${JOB_BATCH_SIZE})`);
        
        // Process jobs immediately on startup
        processJobs();
        
        // Set up interval for continuous processing
        jobProcessingInterval = setInterval(processJobs, JOB_POLL_INTERVAL);
      } else if (!dev && !JobProcessor) {
        console.log('> Job processing disabled - JobProcessor not available in build');
        console.log('> Jobs will be processed inline when created');
      } else {
        console.log('> Job processing disabled in development mode');
      }
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  
  if (jobProcessingInterval) {
    clearInterval(jobProcessingInterval);
    console.log('Job processor stopped');
  }
  
  // Give time for current job to complete
  setTimeout(() => {
    process.exit(0);
  }, isProcessingJobs ? 5000 : 0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down server...');
  
  if (jobProcessingInterval) {
    clearInterval(jobProcessingInterval);
  }
  
  process.exit(0);
});