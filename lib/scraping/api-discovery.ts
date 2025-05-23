/**
 * Attempt to discover and call job posting APIs directly
 */
export async function discoverAndFetchAPI(url: string, html: string): Promise<any> {
  console.log('[API DISCOVERY] Attempting to find and call job API...');
  
  // Extract job ID from URL
  const jobIdMatch = url.match(/(?:jobs?|positions?|postings?|careers?)[\/\-](\d+)/i);
  if (!jobIdMatch) {
    console.log('[API DISCOVERY] No job ID found in URL');
    return null;
  }
  
  const jobId = jobIdMatch[1];
  console.log(`[API DISCOVERY] Found job ID: ${jobId}`);
  
  // Parse base URL
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  
  // Common API patterns to try
  const apiPatterns = [
    `/api/jobs/${jobId}`,
    `/api/v1/jobs/${jobId}`,
    `/api/v2/jobs/${jobId}`,
    `/api/positions/${jobId}`,
    `/api/postings/${jobId}`,
    `/api/careers/jobs/${jobId}`,
    `/careers/api/jobs/${jobId}`,
    `/careers-home/api/jobs/${jobId}`,
    `/jobs/api/${jobId}`,
    `/job/${jobId}/data`,
    `/jobs/${jobId}.json`,
    `/api/job-postings/${jobId}`,
    `/services/jobs/${jobId}`,
    `/data/jobs/${jobId}`,
    `/content/jobs/${jobId}`
  ];
  
  // For ePlus specifically
  if (url.includes('eplus')) {
    apiPatterns.unshift(
      `/api/icims/jobs/${jobId}`,
      `/icims/api/jobs/${jobId}`,
      `/careers-home/api/icims/jobs/${jobId}`
    );
  }
  
  // Try each API endpoint
  for (const pattern of apiPatterns) {
    const apiUrl = baseUrl + pattern;
    console.log(`[API DISCOVERY] Trying: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': url
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('json')) {
          const data = await response.json();
          console.log('[API DISCOVERY] Found valid JSON response!');
          
          // Check if this looks like job data
          if (isJobData(data)) {
            return {
              success: true,
              apiUrl,
              data
            };
          }
        }
      }
    } catch (error) {
      // Continue to next endpoint
    }
  }
  
  // Try GraphQL endpoint
  const graphqlUrl = baseUrl + '/graphql';
  try {
    const graphqlQuery = {
      query: `
        query GetJob($id: ID!) {
          job(id: $id) {
            id
            title
            description
            company
            location
            requirements
            qualifications
            responsibilities
          }
        }
      `,
      variables: { id: jobId }
    };
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': url
      },
      body: JSON.stringify(graphqlQuery),
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.job) {
        console.log('[API DISCOVERY] Found GraphQL job data!');
        return {
          success: true,
          apiUrl: graphqlUrl,
          data: data.data.job
        };
      }
    }
  } catch (error) {
    // GraphQL not available
  }
  
  console.log('[API DISCOVERY] No working API endpoints found');
  return null;
}

function isJobData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Check for job-related fields
  const jobFields = ['title', 'jobTitle', 'position', 'description', 'company', 
                    'location', 'responsibilities', 'qualifications', 'requirements'];
  
  let fieldCount = 0;
  for (const field of jobFields) {
    if (data[field] || (data.job && data.job[field])) {
      fieldCount++;
    }
  }
  
  return fieldCount >= 2;
}