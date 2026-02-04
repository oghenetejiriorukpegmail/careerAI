import { calculateOptimalTokens } from './token-manager';
import OpenAI from 'openai';

// Debug environment variables during initialization
console.log('[AI_CONFIG] Initializing with environment:', {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? `${process.env.OPENROUTER_API_KEY.substring(0, 10)}...` : 'NOT SET',
  NODE_ENV: process.env.NODE_ENV
});

// AI model configuration
export const AI_CONFIG = {
  // OpenRouter configuration
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '', // Set OPENROUTER_API_KEY in your environment variables
    model: 'mistralai/devstral-small-2505:free', // Updated to use devstral-small free model
    // Alternative model: 'moonshotai/kimi-k2:free' - Free Kimi K2 model
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  // Requesty Router configuration
  requesty: {
    apiKey: process.env.ROUTER_API_KEY || '', // Set ROUTER_API_KEY in your environment variables
    model: 'anthropic/claude-sonnet-4',
    baseUrl: 'https://router.requesty.ai/v1'
  },
  // OpenAI configuration (keeping for backwards compatibility)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '', // Set OPENAI_API_KEY in your environment variables
    model: 'gpt-4'
  },
  // Keep Gemini reference for backward compatibility
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '', // Set GEMINI_API_KEY in your environment variables
    model: 'gemini-pro'
  },
  // Vertex AI configuration
  vertex: {
    apiKey: process.env.VERTEX_API_KEY || process.env.GOOGLE_API_KEY || '', // Set VERTEX_API_KEY or GOOGLE_API_KEY in your environment variables
    model: 'vertex/anthropic/claude-3-5-sonnet-20241022@us-east5',
    projectId: process.env.GOOGLE_PROJECT_ID || '', // Set GOOGLE_PROJECT_ID in your environment variables
    location: 'us-east5'
  },
  // Direct Anthropic configuration for fallback
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '', // Set ANTHROPIC_API_KEY in your environment variables
    model: 'claude-sonnet-4', // Claude Sonnet 4
    baseUrl: 'https://api.anthropic.com'
  }
};

// Improved token counter function with better token estimation
function estimateTokenCount(text: string): number {
  // Use a more accurate ratio - Claude's tokenization is closer to 3.5 chars per token for English text
  const baseEstimate = Math.ceil(text.length / 3.5);
  
  // Count special characters that typically get their own tokens
  const numPunctuation = (text.match(/[.,!?;:]/g) || []).length;
  const numWhitespace = (text.match(/\s+/g) || []).length;
  const numNumbers = (text.match(/\d+/g) || []).length;
  
  // Add adjustments for special elements that typically result in separate tokens
  const adjustedEstimate = baseEstimate + 
    (numPunctuation * 0.3) + // Punctuation often gets its own token
    (numWhitespace * 0.2) + // Whitespace typically gets its own token
    (numNumbers * 0.3);     // Numbers often tokenize differently
  
  // Round up to be conservative
  return Math.ceil(adjustedEstimate);
}

// Log token usage at key points
function logTokenUsage(source: string, text: string, additionalTokens: number = 0): void {
  const estimatedTokens = estimateTokenCount(text);
  const totalEstimate = estimatedTokens + additionalTokens;
  
  console.log(`[TOKEN USAGE] ${source}: ~${estimatedTokens} tokens (text) + ${additionalTokens} tokens (overhead) = ~${totalEstimate} tokens total`);
  console.log(`[TOKEN USAGE] Text length: ${text.length} characters`);
  
  // Log warning if approaching token limits
  if (totalEstimate > 25000) {
    console.warn(`[TOKEN WARNING] ${source} is using ${totalEstimate} tokens, which is approaching model limits`);
  }
}

// Function to truncate text to fit within token limits
function truncateToTokenLimit(text: string, maxTokens: number = 30000, bypassLimits: boolean = false): string {
  // If bypassing limits, return the text as-is
  if (bypassLimits) {
    console.log('[TOKEN TRUNCATION] Bypassing token limits - returning full text');
    logTokenUsage("Input text (no truncation)", text, 0);
    return text;
  }
  
  // Reserve tokens for the system prompt, user prompt template, and AI response
  const SYSTEM_PROMPT_TOKENS = 150;  // Approximate tokens for system prompt
  const PROMPT_TEMPLATE_TOKENS = 850; // Approximate tokens for the prompt template (JSON schema, instructions)
  const RESPONSE_RESERVED_TOKENS = 5000; // Reserve tokens for AI response
  
  // Calculate actual token limit for the document text
  const textTokenLimit = maxTokens - SYSTEM_PROMPT_TOKENS - PROMPT_TEMPLATE_TOKENS - RESPONSE_RESERVED_TOKENS;
  
  // Estimate tokens in the provided text
  const estimatedTokens = estimateTokenCount(text);
  
  // Log token usage before any truncation
  logTokenUsage("Input text", text, SYSTEM_PROMPT_TOKENS + PROMPT_TEMPLATE_TOKENS);
  
  if (estimatedTokens <= textTokenLimit) {
    return text; // No truncation needed
  }
  
  console.log(`Text exceeds token limit (est. ${estimatedTokens} tokens vs. limit ${textTokenLimit}). Truncating...`);
  
  // Calculate approximate character limit based on our token ratio (3.5 chars per token)
  const charLimit = Math.floor(textTokenLimit * 3.5);
  
  // Keep first 2/3 and last 1/3 of allowed length, dropping the middle
  // This "middle-out" approach preserves the beginning and end of documents
  if (charLimit > 3000) {
    const firstPart = Math.floor(charLimit * 0.7); // Keep more of the beginning
    const lastPart = charLimit - firstPart - 100; // Reserve 100 chars for the ellipsis and buffer
    
    const truncated = text.substring(0, firstPart) + 
      '\n\n[...content truncated to meet token limits...]\n\n' + 
      text.substring(text.length - lastPart);
    
    // Log token usage after truncation
    logTokenUsage("Truncated text", truncated, SYSTEM_PROMPT_TOKENS + PROMPT_TEMPLATE_TOKENS);
    
    return truncated;
  }
  
  // For very short limits, just truncate the end
  const shortenedText = text.substring(0, charLimit) + '...';
  
  // Log token usage after truncation
  logTokenUsage("Truncated text (short)", shortenedText, SYSTEM_PROMPT_TOKENS + PROMPT_TEMPLATE_TOKENS);
  
  return shortenedText;
}


// Function to make a request to Gemini 2.5 Flash
export async function queryGemini(prompt: string, systemPrompt?: string, bypassLimits: boolean = false) {
  try {
    console.log(`Calling Gemini API with key: ${AI_CONFIG.gemini.apiKey.substring(0, 10)}...`);
    
    // Apply token limiting for Gemini
    const MAX_GEMINI_TOKENS = 30000; // Gemini Pro supports up to 32K tokens, using 30K to be safe
    
    // Check if prompt needs truncation
    const originalLength = prompt.length;
    const truncatedPrompt = truncateToTokenLimit(prompt, MAX_GEMINI_TOKENS, bypassLimits);
    
    if (truncatedPrompt.length < originalLength) {
      console.log(`Truncated Gemini prompt from ${originalLength} to ${truncatedPrompt.length} characters`);
    }
    
    // Prepare the request body with system prompt (if provided)
    const requestContents = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      requestContents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      requestContents.push({
        role: 'model',
        parts: [{ text: 'I understand the instructions.' }]
      });
    }
    
    // Add user prompt
    requestContents.push({
      role: 'user',
      parts: [{ text: truncatedPrompt }]
    });
    
    console.log(`Making request to Gemini model: ${AI_CONFIG.gemini.model}`);
    
    // Use correct URL format for gemini-pro model
    const apiUrl = AI_CONFIG.gemini.model.includes('models/') 
      ? `https://generativelanguage.googleapis.com/v1/${AI_CONFIG.gemini.model}:generateContent`
      : `https://generativelanguage.googleapis.com/v1/models/${AI_CONFIG.gemini.model}:generateContent`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': AI_CONFIG.gemini.apiKey,
      },
      body: JSON.stringify({
        contents: requestContents,
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        }
      }),
      // No timeout - let the request complete
      // signal: AbortSignal.timeout(120000) // Removed timeout
    });

    // Check for HTTP errors
    if (!response.ok) {
      let errorMessage = `Status ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = JSON.stringify(errorData);
        console.error('Gemini API error:', errorData);
        
        // Check for token limit errors and try again with more aggressive truncation
        if (errorMessage.includes('exceed') && errorMessage.includes('token')) {
          console.log('Token limit exceeded for Gemini, trying with more aggressive truncation');
          
          // Truncate more aggressively
          const shorterPrompt = truncateToTokenLimit(prompt, Math.floor(MAX_GEMINI_TOKENS * 0.6));
          
          // Use correct URL format for retry
          const retryApiUrl = AI_CONFIG.gemini.model.includes('models/') 
            ? `https://generativelanguage.googleapis.com/v1/${AI_CONFIG.gemini.model}:generateContent`
            : `https://generativelanguage.googleapis.com/v1/models/${AI_CONFIG.gemini.model}:generateContent`;
            
          // Retry with shorter prompt
          const retryResponse = await fetch(retryApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': AI_CONFIG.gemini.apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: shorterPrompt }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192,
              }
            }),
            // signal: AbortSignal.timeout(120000) // Removed timeout
          });
          
          if (retryResponse.ok) {
            console.log('Retry with shorter prompt for Gemini successful');
            const data = await retryResponse.json();
            
            // Make sure the response has the expected format
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
              console.error('Unexpected Gemini retry response format:', data);
              throw new Error('Gemini API returned unexpected response format on retry');
            }
            
            // Log the raw Gemini retry response for debugging
            let retryContent = data.candidates[0].content.parts[0].text;
            console.log(`[RAW GEMINI RETRY RESPONSE] First 500 chars: ${retryContent.substring(0, 500)}...`);
            
            // Check if response contains markdown code blocks
            if (retryContent.includes('```')) {
              console.warn('[GEMINI RETRY RESPONSE WARNING] Response contains markdown code blocks - cleaning up');
              
              // If content starts with code block, remove the opening marker
              if (retryContent.startsWith('```')) {
                // Check for language specifier like ```json
                const afterMarker = retryContent.substring(3);
                const languageMatch = afterMarker.match(/^[a-z]+\s/);
                const contentStartPos = languageMatch ? 3 + languageMatch[0].length : 3;
                
                // Get content after the opening marker
                retryContent = retryContent.substring(contentStartPos);
                console.log('[GEMINI RETRY] Removed opening code block marker');
              }
              
              // Remove closing code block marker if present
              if (retryContent.endsWith('```')) {
                retryContent = retryContent.substring(0, retryContent.length - 3).trim();
                console.log('[GEMINI RETRY] Removed closing code block marker');
              }
              
              // Remove any remaining code block markers
              retryContent = retryContent.replace(/```/g, '');
              
              // Update the content 
              data.candidates[0].content.parts[0].text = retryContent;
              console.log('[GEMINI RETRY] Cleaned response of code block markers');
            }
            
            // Transform Gemini response to match OpenRouter format
            return {
              choices: [
                {
                  message: {
                    content: retryContent,
                    role: 'assistant'
                  },
                  index: 0
                }
              ]
            };
          }
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini error response:', parseError);
      }
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    // Parse response JSON
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      throw new Error(`Failed to parse Gemini response: ${parseError instanceof Error ? parseError instanceof Error ? parseError.message : "Unknown error" : 'Unknown error'}`);
    }
    
    // Make sure the response has the expected format
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Unexpected Gemini response format:', data);
      throw new Error('Gemini API returned unexpected response format');
    }
    
    // Log the raw Gemini response for debugging
    let rawContent = data.candidates[0].content.parts[0].text;
    console.log(`[RAW GEMINI RESPONSE] First 500 chars: ${rawContent.substring(0, 500)}...`);
    
    // Write complete response to log file
    if (typeof process !== 'undefined') {
      try {
        // Dynamic import for ESM compatibility
        import('fs').then(fs => {
          // Create logs directory if it doesn't exist
          if (!fs.existsSync('./logs')) {
            fs.mkdirSync('./logs', { recursive: true });
          }
          
          // Create a timestamped filename for the log
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const logFilePath = `./logs/gemini_response_${timestamp}.txt`;
          
          // Write the complete text to the log file
          fs.writeFileSync(logFilePath, rawContent);
          console.log(`Complete Gemini response saved to ${logFilePath}`);
          
          // Also write raw API response JSON for reference
          fs.writeFileSync(`./logs/gemini_raw_${timestamp}.json`, JSON.stringify(data, null, 2));
        }).catch(err => {
          console.error('Failed to import fs module:', err);
        });
      } catch (err) {
        console.error('Error writing Gemini log file:', err);
      }
    }
    
    // Clean up any markdown code blocks
    if (rawContent.includes('```')) {
      console.warn('[GEMINI RESPONSE WARNING] Response contains markdown code blocks - cleaning up');
      
      // If content starts with code block, remove the opening marker
      if (rawContent.startsWith('```')) {
        // Handle language specifier like ```json
        const afterMarker = rawContent.substring(3);
        const languageMatch = afterMarker.match(/^[a-z]+\s/);
        const contentStartPos = languageMatch ? 3 + languageMatch[0].length : 3;
        
        // Get content after the opening marker
        rawContent = rawContent.substring(contentStartPos);
        console.log('[GEMINI] Removed opening code block marker');
      }
      
      // Remove closing code block marker if present
      if (rawContent.endsWith('```')) {
        rawContent = rawContent.substring(0, rawContent.length - 3).trim();
        console.log('[GEMINI] Removed closing code block marker');
      }
      
      // Remove any remaining code block markers
      rawContent = rawContent.replace(/```/g, '');
      console.log('[GEMINI] Cleaned response of code block markers');
    }
    
    // Fix potentially malformed JSON
    if (rawContent.startsWith('{') && (rawContent.includes('"contactInfo"') || rawContent.includes('"jobTitle"'))) {
      console.log('[GEMINI] Attempting to fix potentially malformed JSON');
      
      try {
        // Try to parse as-is first
        JSON.parse(rawContent);
        console.log('[GEMINI] JSON appears valid');
      } catch (jsonError) {
        console.warn('[GEMINI] JSON parsing failed, applying fixes:', jsonError instanceof Error ? jsonError instanceof Error ? jsonError.message : "Unknown error" : 'Unknown error');
        
        // For extreme cases like very large documents, try extracting just the most crucial info
        if (rawContent.length > 10000) {
          console.log('[GEMINI] Large document detected, applying more aggressive JSON extraction');
          
          try {
            // First attempt - extract only basic fields
            const contactInfoMatch = rawContent.match(/"contactInfo"\s*:\s*{([^}]+)}/);
            const contactInfo = contactInfoMatch ? contactInfoMatch[0] : ''; 
            
            const summaryMatch = rawContent.match(/"summary"\s*:\s*"[^"]+"/);
            const summary = summaryMatch ? summaryMatch[0] : '';
            
            // Extract just the first few experiences
            let experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*,\s*{[^{]*?}\s*,\s*{[^{]*?}\s*\]/);
            if (!experienceMatch) {
              // Try with fewer items
              experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*,\s*{[^{]*?}\s*\]/);
              if (!experienceMatch) {
                // Try with just one item
                experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*\]/);
              }
            }
            const experience = experienceMatch ? experienceMatch[0] : '"experience": []';
            
            // Extract education
            let educationMatch = rawContent.match(/"education"\s*:\s*\[[^\]]*?\]/);
            const education = educationMatch ? educationMatch[0] : '"education": []';
            
            // Extract skills
            let skillsMatch = rawContent.match(/"skills"\s*:\s*\[[^\]]*?\]/);
            const skills = skillsMatch ? skillsMatch[0] : '"skills": []';
            
            // Extract certifications if present
            let certificationsMatch = rawContent.match(/"certifications"\s*:\s*\[[^\]]*?\]/);
            const certifications = certificationsMatch ? certificationsMatch[0] + ',' : '';
            
            // Build a simplified JSON with only the key parts
            const truncatedJson = 
              '{\n' +
              '  ' + contactInfo + ',\n' +
              '  ' + summary + ',\n' +
              '  ' + experience + ',\n' +
              '  ' + education + ',\n' +
              '  ' + skills + '\n' +
              (certifications ? '  ' + certifications + '\n' : '') +
              '}';
            
            // Try to parse the simplified JSON
            try {
              // Fix any trailing/missing commas
              const fixedJson = truncatedJson
                .replace(/,\s*\n\s*}/g, '\n}')  // Remove comma before closing brace
                .replace(/"\s*,\s*"/g, '", "')  // Fix spacing around commas
                .replace(/}\s*,\s*{/g, '}, {'); // Fix spacing in arrays
                
              JSON.parse(fixedJson);
              rawContent = fixedJson;
              console.log('[GEMINI] Successfully extracted and built simplified JSON');
            } catch (simplifyError) {
              console.warn('[GEMINI] Simplified JSON parsing failed:', simplifyError instanceof Error ? simplifyError instanceof Error ? simplifyError.message : "Unknown error" : 'Unknown error');
              
              // If that fails, use super aggressive approach for just contact info
              try {
                // Just extract name, email, phone, and summary
                const nameMatch = rawContent.match(/"fullName"\s*:\s*"([^"]*)"/);
                const emailMatch = rawContent.match(/"email"\s*:\s*"([^"]*)"/);
                const phoneMatch = rawContent.match(/"phone"\s*:\s*"([^"]*)"/);
                // Extract summary text - handle the format "summary": "text"
                let summaryText = '';
                if (summaryMatch) {
                  const summaryExtraction = summaryMatch[0].match(/"summary"\s*:\s*"([^"]*)"/);
                  summaryText = summaryExtraction ? summaryExtraction[1] : '';
                }
                
                const minimumJson = `{
                  "contactInfo": {
                    "fullName": "${nameMatch ? nameMatch[1] : ''}",
                    "email": "${emailMatch ? emailMatch[1] : ''}",
                    "phone": "${phoneMatch ? phoneMatch[1] : ''}"
                  },
                  "summary": "${summaryText}",
                  "experience": [],
                  "education": [],
                  "skills": [],
                  "certifications": []
                }`;
                
                JSON.parse(minimumJson);
                rawContent = minimumJson;
                console.log('[GEMINI] Built minimum viable JSON with just contact info');
              } catch (minimalError) {
                console.warn('[GEMINI] Even minimal JSON failed:', minimalError);
              }
            }
          } catch (extractionError) {
            console.error('[GEMINI] JSON extraction approach failed:', extractionError);
          }
        } else {
          // Standard fixes for smaller JSON
          const originalContent = rawContent;
          rawContent = rawContent
            // Fix trailing commas in arrays and objects
            .replace(/,(\s*[\]}])/g, '$1')
            // Fix missing commas between elements
            .replace(/}(\s*){/g, '},\n$1{')
            // Fix unescaped quotes in strings by replacing all quotes with controlled replacements
            .replace(/\\"/g, '____ESCAPED_QUOTE____')
            .replace(/"/g, '____QUOTE____')
            .replace(/____ESCAPED_QUOTE____/g, '\\"')
            .replace(/____QUOTE____/g, '"')
            // Fix truncated JSON by adding a closing bracket if needed
            .replace(/([^}])$/, '$1}')
            // Ensure strings are properly quoted
            .replace(/([{,]\s*)([^",{}[\]\s]+)(\s*:)/g, '$1"$2"$3');
          
          // Check if the JSON is now valid
          try {
            JSON.parse(rawContent);
            console.log('[GEMINI] Successfully fixed malformed JSON');
          } catch (fixError) {
            console.warn('[GEMINI] JSON fixing failed, reverting to original content:', fixError instanceof Error ? fixError instanceof Error ? fixError.message : "Unknown error" : 'Unknown error');
            rawContent = originalContent;
          }
        }
      }
    }
    
    // Update the content in the response
    data.candidates[0].content.parts[0].text = rawContent;
    
    // Transform Gemini response to match OpenRouter format
    return {
      choices: [
        {
          message: {
            content: rawContent,
            role: 'assistant'
          },
          index: 0
        }
      ]
    };
  } catch (error) {
    console.error('Error calling Gemini:', error);
    // Add more context to help diagnose the issue
    if (error instanceof TypeError && error instanceof Error ? error.message : "Unknown error".includes('fetch')) {
      throw new Error(`Network error connecting to Gemini: ${error instanceof Error ? error.message : "Unknown error"}`);
    } else if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini request timed out after 30 seconds');
    } else {
      throw error;
    }
  }
}

// Function to query OpenAI API via Requesty
export async function queryOpenAI(prompt: string, systemPrompt?: string, bypassLimits: boolean = false) {
  try {
    console.log(`Calling OpenAI API via Requesty with model: ${AI_CONFIG.openai.model}`);
    
    // Apply token limiting for OpenAI
    const MAX_OPENAI_TOKENS = 30000; // GPT-4 supports up to 32K tokens, using 30K to be safe
    
    // Check if prompt needs truncation
    const originalLength = prompt.length;
    const truncatedPrompt = truncateToTokenLimit(prompt, MAX_OPENAI_TOKENS, bypassLimits);
    
    if (truncatedPrompt.length < originalLength) {
      console.log(`Truncated OpenAI prompt from ${originalLength} to ${truncatedPrompt.length} characters`);
    }
    
    // Prepare the request body
    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    // Add user prompt
    messages.push({
      role: 'user',
      content: truncatedPrompt
    });
    
    // Make the request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.openai.model,
        messages: messages,
        temperature: 0.2,
        max_tokens: AI_CONFIG.openai.model.includes('gpt-4') ? 32000 : 8192
      }),
      // No timeout - let the request complete
      // signal: AbortSignal.timeout(120000) // Removed timeout
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      let errorMessage = `Status ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = JSON.stringify(errorData);
        console.error('OpenAI API error:', errorData);
      } catch (parseError) {
        console.error('Failed to parse OpenAI error response:', parseError);
      }
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    
    // Log the raw OpenAI response for debugging
    if (data.choices && data.choices[0] && data.choices[0].message) {
      let rawContent = data.choices[0].message.content;
      console.log(`[RAW OPENAI RESPONSE] First 500 chars: ${rawContent.substring(0, 500)}...`);
      
      // Clean up code blocks from responses for easier JSON parsing
      if (rawContent.includes('```')) {
        console.log('[OPENAI] Response contains code blocks - cleaning up...');
        
        // If content starts with code block, remove the opening marker
        if (rawContent.startsWith('```')) {
          // Check for language specifier like ```json
          const afterMarker = rawContent.substring(3);
          const languageMatch = afterMarker.match(/^[a-z]+\s/);
          const contentStartPos = languageMatch ? 3 + languageMatch[0].length : 3;
          
          // Get content after the opening marker
          rawContent = rawContent.substring(contentStartPos);
          console.log('[OPENAI] Removed opening code block marker');
        }
        
        // Remove closing code block marker if present
        if (rawContent.endsWith('```')) {
          rawContent = rawContent.substring(0, rawContent.length - 3).trim();
          console.log('[OPENAI] Removed closing code block marker');
        }
        
        // Remove any remaining code block markers
        rawContent = rawContent.replace(/```/g, '');
        console.log('[OPENAI] Cleaned response of code block markers');
      }
      
      // Special case to fix JSONP style responses (common with OpenAI)
      if (rawContent.includes('callback(') || rawContent.includes('onResponse(')) {
        console.log('[OPENAI] JSONP-style response detected, extracting JSON');
        const match = rawContent.match(/(?:callback|onResponse)\(([\s\S]*)\)(?:;?)/);
        if (match && match[1]) {
          rawContent = match[1];
          console.log('[OPENAI] Extracted JSON from callback wrapper');
        }
      }
      
      // Fix potentially malformed JSON
      if (rawContent.startsWith('{') && (rawContent.includes('"contactInfo"') || rawContent.includes('"jobTitle"'))) {
        console.log('[OPENAI] Attempting to fix potentially malformed JSON');
        
        try {
          // Try to parse as-is first
          JSON.parse(rawContent);
          console.log('[OPENAI] JSON appears valid');
        } catch (jsonError) {
          console.warn('[OPENAI] JSON parsing failed, applying fixes:', jsonError instanceof Error ? jsonError.message : "Unknown error");
          
          // Fix common JSON issues
          const originalContent = rawContent;
          rawContent = rawContent
            // Fix trailing commas in arrays and objects
            .replace(/,(\s*[\]}])/g, '$1')
            // Fix missing commas between elements
            .replace(/}(\s*){/g, '},\n$1{')
            // Fix unescaped quotes by using controlled replacements
            .replace(/\\"/g, '____ESCAPED_QUOTE____')
            .replace(/"/g, '____QUOTE____')
            .replace(/____ESCAPED_QUOTE____/g, '\\"')
            .replace(/____QUOTE____/g, '"')
            // Fix unterminated strings by adding a quote at the end
            .replace(/"([^"]*)$/, '"$1"')
            // Fix truncated JSON by adding closing brackets if needed
            .replace(/([^}])$/, '$1}');
            
          // Check if the JSON is now valid
          try {
            JSON.parse(rawContent);
            console.log('[OPENAI] Successfully fixed malformed JSON');
          } catch (fixError) {
            console.warn('[OPENAI] JSON fixing failed, reverting to original content:', fixError instanceof Error ? fixError.message : "Unknown error");
            rawContent = originalContent;
          }
        }
      }
      
      // Update the content in the response
      data.choices[0].message.content = rawContent;
      console.log('[OPENAI] Processed and cleaned response content');
    }
    
    return data;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

// Function to query Requesty Router API with Gemini model
export async function queryRequesty(prompt: string, systemPrompt?: string, bypassLimits: boolean = false) {
  try {
    console.log(`Calling Requesty Router API with model: ${AI_CONFIG.requesty.model}`);
    
    // Apply token limiting for the model
    const MAX_TOKENS = 30000;
    
    // Check if prompt needs truncation
    const originalLength = prompt.length;
    const truncatedPrompt = truncateToTokenLimit(prompt, MAX_TOKENS, bypassLimits);
    
    if (truncatedPrompt.length < originalLength) {
      console.log(`Truncated prompt from ${originalLength} to ${truncatedPrompt.length} characters`);
    }
    
    // Prepare the request body
    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    // Add user prompt
    messages.push({
      role: 'user',
      content: truncatedPrompt
    });
    
    // Make the request to Requesty Router API
    const response = await fetch(`${AI_CONFIG.requesty.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.requesty.apiKey}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.requesty.model,
        messages: messages,
        temperature: 0.2,
        max_tokens: AI_CONFIG.requesty.model.includes('claude') ? 32000 : 8192
      }),
      // No timeout - let the request complete
      // signal: AbortSignal.timeout(90000) // Removed timeout
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      let errorMessage = `Status ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = JSON.stringify(errorData);
        console.error('Requesty Router API error:', errorData);
      } catch (parseError) {
        console.error('Failed to parse Requesty Router error response:', parseError);
      }
      throw new Error(`Requesty Router API error: ${errorMessage}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    
    // Log the raw response for debugging
    if (data.choices && data.choices[0] && data.choices[0].message) {
      let rawContent = data.choices[0].message.content;
      console.log(`[RAW REQUESTY RESPONSE] First 500 chars: ${rawContent.substring(0, 500)}...`);
      
      // Write complete response to log file
      if (typeof process !== 'undefined') {
        try {
          // Dynamic import for ESM compatibility
          import('fs').then(fs => {
            // Create logs directory if it doesn't exist
            if (!fs.existsSync('./logs')) {
              fs.mkdirSync('./logs', { recursive: true });
            }
            
            // Create a timestamped filename for the log
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logFilePath = `./logs/requesty_response_${timestamp}.txt`;
            
            // Write the complete text to the log file
            fs.writeFileSync(logFilePath, rawContent);
            console.log(`Complete Requesty response saved to ${logFilePath}`);
            
            // Also write raw API response JSON for reference
            fs.writeFileSync(`./logs/requesty_raw_${timestamp}.json`, JSON.stringify(data, null, 2));
          }).catch(err => {
            console.error('Failed to import fs module:', err);
          });
        } catch (err) {
          console.error('Error writing Requesty log file:', err);
        }
      }
      
      // Clean up code blocks from responses for easier JSON parsing
      if (rawContent.includes('```')) {
        console.log('[REQUESTY] Response contains code blocks - cleaning up...');
        
        // If content starts with code block, remove the opening marker and language specifier
        if (rawContent.startsWith('```')) {
          // Check for language specifier like ```json
          const afterMarker = rawContent.substring(3);
          const languageMatch = afterMarker.match(/^[a-z]+\s/);
          const contentStartPos = languageMatch ? 3 + languageMatch[0].length : 3;
          
          // Get content after the opening marker
          rawContent = rawContent.substring(contentStartPos);
          console.log('[REQUESTY] Removed opening code block marker');
        }
        
        // Remove closing code block marker if present
        if (rawContent.endsWith('```')) {
          rawContent = rawContent.substring(0, rawContent.length - 3).trim();
          console.log('[REQUESTY] Removed closing code block marker');
        }
        
        // Remove any remaining code block markers
        rawContent = rawContent.replace(/```/g, '');
        console.log('[REQUESTY] Cleaned response of code block markers');
      }
      
      // Normalize whitespace in JSON-like responses (Claude sometimes adds extra spaces)
      if (rawContent.trim().startsWith('{') && rawContent.trim().endsWith('}')) {
        console.log('[REQUESTY] Normalizing whitespace in JSON response');
        try {
          // First try to parse it directly
          JSON.parse(rawContent);
        } catch (jsonError) {
          // If parsing fails, try to normalize whitespace
          try {
            // Use our helper function to normalize JSON with whitespace issues
            console.log('[REQUESTY] Attempting to normalize JSON with whitespace issues');
            const normalized = normalizeJson(rawContent);
            
            // Check if normalization was successful
            try {
              JSON.parse(normalized);
              console.log('[REQUESTY] JSON normalization successful');
              rawContent = normalized; // Update the content with normalized version
            } catch (parseError) {
              console.warn('[REQUESTY] JSON normalization did not result in valid JSON');
              // Keep original rawContent
            }
          } catch (normalizeError) {
            console.warn('[REQUESTY] Failed to normalize JSON whitespace:', normalizeError);
          }
        }
      }
      
      // Fix potentially malformed JSON
      if (rawContent.startsWith('{') && (rawContent.includes('"contactInfo"') || rawContent.includes('"jobTitle"'))) {
        console.log('[REQUESTY] Attempting to fix potentially malformed JSON');
        
        try {
          // Try to parse as-is first
          JSON.parse(rawContent);
          console.log('[REQUESTY] JSON appears valid');
        } catch (jsonError) {
          console.warn('[REQUESTY] JSON parsing failed, applying fixes:', jsonError instanceof Error ? jsonError.message : "Unknown error");
          
          // For extreme cases like very large documents, try extracting just the most crucial info
          if (rawContent.length > 10000) {
            console.log('[REQUESTY] Large document detected, applying more aggressive JSON extraction');
            
            try {
              // First attempt - extract only basic fields
              const contactInfoMatch = rawContent.match(/"contactInfo"\s*:\s*{([^}]+)}/);
              const contactInfo = contactInfoMatch ? contactInfoMatch[0] : ''; 
              
              const summaryMatch = rawContent.match(/"summary"\s*:\s*"[^"]+"/);
              const summary = summaryMatch ? summaryMatch[0] : '';
              
              // Extract just the first few experiences
              let experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*,\s*{[^{]*?}\s*,\s*{[^{]*?}\s*\]/);
              if (!experienceMatch) {
                // Try with fewer items
                experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*,\s*{[^{]*?}\s*\]/);
                if (!experienceMatch) {
                  // Try with just one item
                  experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*\]/);
                }
              }
              const experience = experienceMatch ? experienceMatch[0] : '"experience": []';
              
              // Extract education
              let educationMatch = rawContent.match(/"education"\s*:\s*\[[^\]]*?\]/);
              const education = educationMatch ? educationMatch[0] : '"education": []';
              
              // Extract skills
              let skillsMatch = rawContent.match(/"skills"\s*:\s*\[[^\]]*?\]/);
              const skills = skillsMatch ? skillsMatch[0] : '"skills": []';
              
              // Build a simplified JSON with only the key parts
              const truncatedJson = 
                '{\n' +
                '  ' + contactInfo + ',\n' +
                '  ' + summary + ',\n' +
                '  ' + experience + ',\n' +
                '  ' + education + ',\n' +
                '  ' + skills + '\n' +
                '}';
              
              // Try to parse the simplified JSON
              try {
                // Fix any trailing/missing commas
                const fixedJson = truncatedJson
                  .replace(/,\s*\n\s*}/g, '\n}')  // Remove comma before closing brace
                  .replace(/"\s*,\s*"/g, '", "')  // Fix spacing around commas
                  .replace(/}\s*,\s*{/g, '}, {'); // Fix spacing in arrays
                  
                JSON.parse(fixedJson);
                rawContent = fixedJson;
                console.log('[REQUESTY] Successfully extracted and built simplified JSON');
              } catch (simplifyError) {
                console.warn('[REQUESTY] Simplified JSON parsing failed:', simplifyError instanceof Error ? simplifyError.message : "Unknown error");
                
                // If that fails, use super aggressive approach for just contact info
                try {
                  // Just extract name, email, phone, and summary
                  const nameMatch = rawContent.match(/"fullName"\s*:\s*"([^"]*)"/);
                  const emailMatch = rawContent.match(/"email"\s*:\s*"([^"]*)"/);
                  const phoneMatch = rawContent.match(/"phone"\s*:\s*"([^"]*)"/);
                  
                  // Extract summary text - handle the format "summary": "text"
                  let summaryText = '';
                  const summaryMatch = rawContent.match(/"summary"\s*:\s*"[^"]+"/);
                  if (summaryMatch) {
                    const summaryExtraction = summaryMatch[0].match(/"summary"\s*:\s*"([^"]*)"/);
                    summaryText = summaryExtraction ? summaryExtraction[1] : '';
                  }
                  
                  const minimumJson = `{
                    "contactInfo": {
                      "fullName": "${nameMatch ? nameMatch[1] : ''}",
                      "email": "${emailMatch ? emailMatch[1] : ''}",
                      "phone": "${phoneMatch ? phoneMatch[1] : ''}"
                    },
                    "summary": "${summaryText}",
                    "experience": [],
                    "education": [],
                    "skills": [],
                    "certifications": []
                  }`;
                  
                  JSON.parse(minimumJson);
                  rawContent = minimumJson;
                  console.log('[REQUESTY] Built minimum viable JSON with just contact info');
                } catch (minimalError) {
                  console.warn('[REQUESTY] Even minimal JSON failed:', minimalError);
                }
              }
            } catch (extractionError) {
              console.error('[REQUESTY] JSON extraction approach failed:', extractionError);
            }
          } else {
            // Standard fixes for smaller JSON
            const originalContent = rawContent;
            rawContent = rawContent
              // Fix trailing commas in arrays and objects
              .replace(/,(\s*[\]}])/g, '$1')
              // Fix missing commas between elements
              .replace(/}(\s*){/g, '},\n$1{')
              // Fix unescaped quotes by using controlled replacements
              .replace(/\\"/g, '____ESCAPED_QUOTE____')
              .replace(/"/g, '____QUOTE____')
              .replace(/____ESCAPED_QUOTE____/g, '\\"')
              .replace(/____QUOTE____/g, '"')
              // Fix unterminated strings by adding a quote at the end
              .replace(/"([^"]*)$/, '"$1"')
              // Fix truncated JSON by adding closing brackets if needed
              .replace(/([^}])$/, '$1}');
              
            // Check if the JSON is now valid
            try {
              JSON.parse(rawContent);
              console.log('[REQUESTY] Successfully fixed malformed JSON');
            } catch (fixError) {
              console.warn('[REQUESTY] JSON fixing failed, reverting to original content:', fixError instanceof Error ? fixError.message : "Unknown error");
              rawContent = originalContent;
            }
          }
        }
      }
      
      // Update the content in the response
      data.choices[0].message.content = rawContent;
      console.log('[REQUESTY] Processed and cleaned response content');
    }
    
    return data;
  } catch (error) {
    console.error('Error calling Requesty Router:', error);
    throw error;
  }
}

// Helper function to normalize JSON with whitespace issues
function normalizeJson(jsonString: string): string {
  try {
    // Extract all string values first to protect them
    const strings: string[] = [];
    const stringPattern = /"([^"]*)"/g;
    let extractedContent = jsonString.replace(stringPattern, (match, content) => {
      strings.push(match);
      return `"__STRING_${strings.length - 1}__"`;
    });
    
    // Normalize JSON structure
    extractedContent = extractedContent
      .replace(/\s+/g, '') // Remove all whitespace
      .replace(/,/g, ',') // Normalize commas
      .replace(/:/g, ':') // Normalize colons
      .replace(/\{/g, '{') // Normalize open braces
      .replace(/\}/g, '}') // Normalize close braces
      .replace(/\[/g, '[') // Normalize open brackets
      .replace(/\]/g, ']'); // Normalize close brackets
    
    // Put back the original strings
    const normalized = extractedContent.replace(/"__STRING_(\d+)__"/g, (match, index) => {
      return strings[parseInt(index)];
    });
    
    // Test if it parses correctly
    JSON.parse(normalized);
    return normalized;
  } catch (normalizeError) {
    // Try another approach - simple minification
    try {
      // Simply remove whitespace around punctuation
      const minified = jsonString
        .replace(/\s*:\s*/g, ':')  // Remove spaces around colons
        .replace(/\s*,\s*/g, ',')  // Remove spaces around commas
        .replace(/\s*\{\s*/g, '{') // Remove spaces around opening braces
        .replace(/\s*\}\s*/g, '}') // Remove spaces around closing braces
        .replace(/\s*\[\s*/g, '[') // Remove spaces around opening brackets
        .replace(/\s*\]\s*/g, ']') // Remove spaces around closing brackets
        .trim();
      
      // Test if it parses correctly
      JSON.parse(minified);
      return minified;
    } catch (minifyError) {
      // Return the original string if all normalization attempts fail
      return jsonString;
    }
  }
}

// Create OpenAI client configured for OpenRouter
function getOpenRouterClient() {
  return new OpenAI({
    baseURL: AI_CONFIG.openrouter.baseUrl,
    apiKey: AI_CONFIG.openrouter.apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://careeraisystem.com',
      'X-Title': 'CareerAI System'
    },
    timeout: 600000, // 10 minutes
  });
}

// Function to query OpenRouter API using OpenAI SDK (handles streaming properly)
export async function queryOpenRouter(prompt: string, systemPrompt?: string, useCase: string = 'default', tokenLimits?: any, bypassLimits: boolean = false, overrideModel?: string) {
  const modelToUse = overrideModel || AI_CONFIG.openrouter.model;
  const requestStartTime = Date.now();

  try {
    console.log(`Calling OpenRouter API with model: ${modelToUse}`);
    
    // Apply token limiting based on the model - Claude models have much higher limits
    let MAX_TOKENS = 30000; // Default for most models
    
    // Claude models have much higher context limits
    if (modelToUse.includes('claude-sonnet-4') || modelToUse.includes('claude-3-5-sonnet') || modelToUse.includes('claude-3-opus')) {
      MAX_TOKENS = 150000; // Claude Sonnet 4 and 3.5 have 200K context, use 150K to be safe
      console.log(`[OPENROUTER] Using higher token limit (${MAX_TOKENS}) for Claude model: ${modelToUse}`);
    } else if (modelToUse.includes('claude')) {
      MAX_TOKENS = 80000; // Other Claude models have 100K+ context
      console.log(`[OPENROUTER] Using medium token limit (${MAX_TOKENS}) for Claude model: ${modelToUse}`);
    }
    
    // Check if prompt needs truncation
    const originalLength = prompt.length;
    const truncatedPrompt = truncateToTokenLimit(prompt, MAX_TOKENS, bypassLimits);
    
    if (truncatedPrompt.length < originalLength) {
      console.log(`Truncated prompt from ${originalLength} to ${truncatedPrompt.length} characters`);
    }

    // Log token usage
    logTokenUsage("OpenRouter prompt", truncatedPrompt, systemPrompt ? estimateTokenCount(systemPrompt) : 0);

    // Get OpenAI client configured for OpenRouter
    const client = getOpenRouterClient();

    // Build messages array
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: truncatedPrompt });

    console.log(`[OPENROUTER] Starting streaming request to ${modelToUse} at ${new Date().toISOString()}`);

    // Use streaming for long-running requests to prevent TCP timeouts
    const stream = await client.chat.completions.create({
      model: modelToUse,
      messages,
      temperature: 0.2,
      max_tokens: calculateOptimalTokens(
        modelToUse,
        prompt.length + (systemPrompt?.length || 0),
        useCase,
        tokenLimits?.[useCase] || tokenLimits?.general,
        bypassLimits
      ),
      stream: true
    });

    // Accumulate streaming response
    let fullContent = '';
    let chunkCount = 0;
    let finishReason = 'stop';

    console.log('[OPENROUTER] Reading streaming response...');

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        chunkCount++;
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }

      // Log progress every 100 chunks
      if (chunkCount > 0 && chunkCount % 100 === 0) {
        console.log(`[OPENROUTER] Received ${chunkCount} chunks, ${fullContent.length} chars so far...`);
      }
    }

    const streamElapsed = Date.now() - requestStartTime;
    console.log(`[OPENROUTER] Streaming complete in ${streamElapsed}ms (${(streamElapsed / 1000).toFixed(1)}s), ${chunkCount} chunks, ${fullContent.length} chars, finish: ${finishReason}`);

    // Build a response object that matches the non-streaming format
    const data = {
      choices: [{
        message: {
          content: fullContent,
          role: 'assistant'
        },
        index: 0,
        finish_reason: finishReason
      }]
    };
    
    // Log the raw response for debugging
    if (data.choices && data.choices[0] && data.choices[0].message) {
      let rawContent = data.choices[0].message.content;
      console.log(`[RAW OPENROUTER RESPONSE] First 500 chars: ${rawContent.substring(0, 500)}...`);
      
      // Write complete response to log file
      if (typeof process !== 'undefined') {
        try {
          // Dynamic import for ESM compatibility
          import('fs').then(fs => {
            // Create logs directory if it doesn't exist
            if (!fs.existsSync('./logs')) {
              fs.mkdirSync('./logs', { recursive: true });
            }
            
            // Create a timestamped filename for the log
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logFilePath = `./logs/openrouter_response_${timestamp}.txt`;
            
            // Write the complete text to the log file
            fs.writeFileSync(logFilePath, rawContent);
            console.log(`Complete OpenRouter response saved to ${logFilePath}`);
            
            // Also write raw API response JSON for reference
            fs.writeFileSync(`./logs/openrouter_raw_${timestamp}.json`, JSON.stringify(data, null, 2));
          }).catch(err => {
            console.error('Failed to import fs module:', err);
          });
        } catch (err) {
          console.error('Error writing OpenRouter log file:', err);
        }
      }
      
      // Clean up code blocks from responses for easier JSON parsing
      if (rawContent.includes('```')) {
        console.log('[OPENROUTER] Response contains code blocks - cleaning up...');
        
        // More thorough code block cleanup with regex
        if (rawContent.includes('```')) {
          console.log('[OPENROUTER] Cleaning up markdown code blocks');
          rawContent = rawContent
            .replace(/^```json\s*/g, '')   // Remove opening ```json
            .replace(/^```\s*/g, '')       // Remove opening ``` without json
            .replace(/\s*```$/g, '')       // Remove closing ```
            .replace(/```/g, '')          // Remove any remaining code block markers
            .trim();
          console.log('[OPENROUTER] Removed code block markers');
        }
      }
      
      // NOTE: Do NOT convert escaped newlines to actual newlines in JSON
      // JSON requires escaped newlines within strings
      // Removing this problematic conversion that was breaking valid JSON
      
      // Normalize whitespace in JSON-like responses (Claude sometimes adds extra spaces)
      if (rawContent.trim().startsWith('{') && rawContent.trim().endsWith('}')) {
        console.log('[OPENROUTER] Normalizing whitespace in JSON response');
        try {
          // First try to parse it directly
          JSON.parse(rawContent);
        } catch (jsonError) {
          // If parsing fails, try to normalize whitespace
          try {
            // Use our helper function to normalize JSON with whitespace issues
            console.log('[OPENROUTER] Attempting to normalize JSON with whitespace issues');
            const normalized = normalizeJson(rawContent);
            
            // Check if normalization was successful
            try {
              JSON.parse(normalized);
              console.log('[OPENROUTER] JSON normalization successful');
              rawContent = normalized; // Update the content with normalized version
            } catch (parseError) {
              console.warn('[OPENROUTER] JSON normalization did not result in valid JSON');
              // Keep original rawContent
            }
          } catch (normalizeError) {
            console.warn('[OPENROUTER] Failed to normalize JSON whitespace:', normalizeError);
          }
        }
      }
      
      // Fix potentially malformed JSON
      if (rawContent.startsWith('{') && (rawContent.includes('"contactInfo"') || rawContent.includes('"jobTitle"'))) {
        console.log('[OPENROUTER] Attempting to fix potentially malformed JSON');
        
        try {
          // Try to parse as-is first
          JSON.parse(rawContent);
          console.log('[OPENROUTER] JSON appears valid');
        } catch (jsonError) {
          console.warn('[OPENROUTER] JSON parsing failed, applying fixes:', jsonError instanceof Error ? jsonError.message : "Unknown error");
          
          // For extreme cases like very large documents, try extracting just the most crucial info
          if (rawContent.length > 10000) {
            console.log('[OPENROUTER] Large document detected, applying more aggressive JSON extraction');
            
            try {
              // First attempt - extract only basic fields
              const contactInfoMatch = rawContent.match(/"contactInfo"\s*:\s*{([^}]+)}/);
              const contactInfo = contactInfoMatch ? contactInfoMatch[0] : ''; 
              
              const summaryMatch = rawContent.match(/"summary"\s*:\s*"[^"]+"/);
              const summary = summaryMatch ? summaryMatch[0] : '';
              
              // Extract just the first few experiences
              let experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*,\s*{[^{]*?}\s*,\s*{[^{]*?}\s*\]/);
              if (!experienceMatch) {
                // Try with fewer items
                experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*,\s*{[^{]*?}\s*\]/);
                if (!experienceMatch) {
                  // Try with just one item
                  experienceMatch = rawContent.match(/"experience"\s*:\s*\[\s*{[^{]*?}\s*\]/);
                }
              }
              const experience = experienceMatch ? experienceMatch[0] : '"experience": []';
              
              // Extract education
              let educationMatch = rawContent.match(/"education"\s*:\s*\[[^\]]*?\]/);
              const education = educationMatch ? educationMatch[0] : '"education": []';
              
              // Extract skills
              let skillsMatch = rawContent.match(/"skills"\s*:\s*\[[^\]]*?\]/);
              const skills = skillsMatch ? skillsMatch[0] : '"skills": []';
              
              // Build a simplified JSON with only the key parts
              const truncatedJson = 
                '{\n' +
                '  ' + contactInfo + ',\n' +
                '  ' + summary + ',\n' +
                '  ' + experience + ',\n' +
                '  ' + education + ',\n' +
                '  ' + skills + '\n' +
                '}';
              
              // Try to parse the simplified JSON
              try {
                // Fix any trailing/missing commas
                const fixedJson = truncatedJson
                  .replace(/,\s*\n\s*}/g, '\n}')  // Remove comma before closing brace
                  .replace(/"\s*,\s*"/g, '", "')  // Fix spacing around commas
                  .replace(/}\s*,\s*{/g, '}, {'); // Fix spacing in arrays
                  
                JSON.parse(fixedJson);
                rawContent = fixedJson;
                console.log('[OPENROUTER] Successfully extracted and built simplified JSON');
              } catch (simplifyError) {
                console.warn('[OPENROUTER] Simplified JSON parsing failed:', simplifyError instanceof Error ? simplifyError.message : "Unknown error");
                
                // If that fails, use super aggressive approach for just contact info
                try {
                  // Just extract name, email, phone, and summary
                  const nameMatch = rawContent.match(/"fullName"\s*:\s*"([^"]*)"/);
                  const emailMatch = rawContent.match(/"email"\s*:\s*"([^"]*)"/);
                  const phoneMatch = rawContent.match(/"phone"\s*:\s*"([^"]*)"/);
                  
                  // Extract summary text - handle the format "summary": "text"
                  let summaryText = '';
                  if (summaryMatch) {
                    const summaryExtraction = summaryMatch[0].match(/"summary"\s*:\s*"([^"]*)"/);
                    summaryText = summaryExtraction ? summaryExtraction[1] : '';
                  }
                  
                  const minimumJson = `{
                    "contactInfo": {
                      "fullName": "${nameMatch ? nameMatch[1] : ''}",
                      "email": "${emailMatch ? emailMatch[1] : ''}",
                      "phone": "${phoneMatch ? phoneMatch[1] : ''}"
                    },
                    "summary": "${summaryText}",
                    "experience": [],
                    "education": [],
                    "skills": [],
                    "certifications": []
                  }`;
                  
                  JSON.parse(minimumJson);
                  rawContent = minimumJson;
                  console.log('[OPENROUTER] Built minimum viable JSON with just contact info');
                } catch (minimalError) {
                  console.warn('[OPENROUTER] Even minimal JSON failed:', minimalError);
                }
              }
            } catch (extractionError) {
              console.error('[OPENROUTER] JSON extraction approach failed:', extractionError);
            }
          } else {
            // Standard fixes for smaller JSON
            const originalContent = rawContent;
            rawContent = rawContent
              // Fix trailing commas in arrays and objects
              .replace(/,(\s*[\]}])/g, '$1')
              // Fix missing commas between elements
              .replace(/}(\s*){/g, '},\n$1{')
              // Fix unescaped quotes by using controlled replacements
              .replace(/\\"/g, '____ESCAPED_QUOTE____')
              .replace(/"/g, '____QUOTE____')
              .replace(/____ESCAPED_QUOTE____/g, '\\"')
              .replace(/____QUOTE____/g, '"')
              // Fix unterminated strings by adding a quote at the end
              .replace(/"([^"]*)$/, '"$1"')
              // Fix truncated JSON by adding closing brackets if needed
              .replace(/([^}])$/, '$1}');
              
            // Check if the JSON is now valid
            try {
              JSON.parse(rawContent);
              console.log('[OPENROUTER] Successfully fixed malformed JSON');
            } catch (fixError) {
              console.warn('[OPENROUTER] JSON fixing failed, reverting to original content:', fixError instanceof Error ? fixError.message : "Unknown error");
              rawContent = originalContent;
            }
          }
        }
      }
      
      // Update the content in the response
      data.choices[0].message.content = rawContent;
      console.log('[OPENROUTER] Processed and cleaned response content');
    }
    
    return data;
  } catch (error: any) {
    const errorElapsed = Date.now() - requestStartTime;
    console.error(`[OPENROUTER] Error after ${errorElapsed}ms (${(errorElapsed / 1000).toFixed(1)}s):`, error);

    // Check if this is a timeout or network error
    if (error?.cause?.code === 'ETIMEDOUT' || error?.cause?.code === 'ENETUNREACH' ||
        error?.name === 'AbortError' || error?.code === 'ECONNRESET') {
      console.error('[OPENROUTER] Request timed out or network unreachable. The model may be taking too long to respond.');
      throw new Error(`OpenRouter request failed after ${(errorElapsed / 1000).toFixed(1)}s: Network timeout. The ${modelToUse} model may be overloaded.`);
    }

    // Handle OpenAI SDK specific errors
    if (error?.status) {
      console.error(`[OPENROUTER] API error status: ${error.status}`);
      if (error.status === 429) {
        throw new Error(`Rate limit exceeded for ${modelToUse}. Please try again later.`);
      }
      if (error.status === 503) {
        throw new Error(`Model ${modelToUse} is currently unavailable. Please try a different model.`);
      }
    }

    throw error;
  }
}

// Function to handle AI requests with prioritization of different providers
// Load user settings or use defaults
async function loadUserSettings() {
  try {
    if (typeof window !== 'undefined') {
      // Client side - try to check local storage first (for non-authenticated users)
      try {
        const localSettings = localStorage.getItem('userSettings');
        if (localSettings) {
          console.log('Using settings from localStorage');
          return JSON.parse(localSettings);
        }
      } catch (localStorageError) {
        console.log('No local settings found:', localStorageError);
      }
      
      // Then try the API (for authenticated users)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        const response = await fetch('/api/settings', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const settings = await response.json();
          console.log('Using settings from API');
          
          // Save to localStorage for future use
          try {
            localStorage.setItem('userSettings', JSON.stringify(settings));
          } catch (saveError) {
            console.warn('Failed to save settings to localStorage:', saveError);
          }
          
          return settings;
        }
      } catch (apiError) {
        console.log('Failed to load settings from API:', apiError);
      }
    } else if (global.userSettings) {
      // Server side - use cached settings if available
      return global.userSettings;
    } else {
      // Server side - use devstral-small via OpenRouter
      return {
        aiProvider: 'openrouter',
        aiModel: 'mistralai/devstral-small-2505:free',
        documentAiOnly: true,
        enableLogging: true
      };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  
  // Default settings if loading fails
  return {
    aiProvider: 'openrouter',
    aiModel: 'mistralai/devstral-small-2505:free',
    documentAiOnly: true,
    enableLogging: true
  };
}

export async function queryAI(prompt: string, systemPrompt?: string, providedSettings?: any, useCase: string = 'default', bypassLimits: boolean = false) {
  // Use provided settings or load user settings
  const settings = providedSettings || await loadUserSettings();
  
  // Handle provider and model from settings - default to devstral-small with OpenRouter
  const provider = settings.aiProvider || 'openrouter';
  const model = settings.aiModel || 'mistralai/devstral-small-2505:free';
  
  console.log(`Using AI provider from settings: ${provider}`);
  console.log(`Using AI model from settings: ${model}`);
  if (bypassLimits) {
    console.log(`[QUERY AI] Token limits BYPASSED for this request`);
  }
  
  // Configure the selected provider and model
  switch (provider) {
    case 'requesty':
      AI_CONFIG.requesty.model = model;
      break;
    case 'openrouter':
      // Configure for OpenRouter
      AI_CONFIG.openrouter.model = model;
      break;
    case 'anthropic':
      // Configure for direct Anthropic API
      AI_CONFIG.openai.model = model; // Use OpenAI format for now
      break;
    case 'google':
      // Configure for direct Google API
      AI_CONFIG.gemini.model = model;
      break;
    case 'openai':
      // Configure for direct OpenAI API
      AI_CONFIG.openai.model = model;
      break;
    default:
      // Default to Requesty
      AI_CONFIG.requesty.model = model;
  }
  
  // Use the selected provider with Claude Sonnet 4 as fallback
  console.log(`Using ${provider} provider with model ${model} with Claude Sonnet 4 fallback`);
  
  try {
    switch (provider) {
      case 'requesty':
        console.log(`Using Requesty Router API with model ${AI_CONFIG.requesty.model}`);
        return await queryRequesty(prompt, systemPrompt, bypassLimits);
      case 'openrouter':
        console.log(`Using OpenRouter API with model ${model}`);
        return await queryOpenRouter(prompt, systemPrompt, useCase, settings?.tokenLimits, bypassLimits);
      case 'anthropic':
        console.log(`Using Anthropic API directly with model ${model}`);
        return await queryAnthropic(prompt, systemPrompt, bypassLimits);
      case 'google':
        console.log(`Using Google AI API directly with model ${model}`);
        return await queryGemini(prompt, systemPrompt, bypassLimits);
      case 'openai':
        console.log(`Using OpenAI API directly with model ${model}`);
        return await queryOpenAI(prompt, systemPrompt, bypassLimits);
      case 'vertex':
        console.log(`Using Vertex AI with model ${model}`);
        AI_CONFIG.vertex.model = model;
        // For now, we're using Requesty as it can route to Vertex AI
        return await queryRequesty(prompt, systemPrompt, bypassLimits);
      default:
        console.log(`Using Requesty Router API (default) with model ${AI_CONFIG.requesty.model}`);
        return await queryRequesty(prompt, systemPrompt, bypassLimits);
    }
  } catch (error) {
    console.error(`Primary AI provider ${provider} failed:`, error);
    
    // Try Claude Sonnet 4 as fallback via OpenRouter
    if (AI_CONFIG.openrouter.apiKey) {
      console.log('Attempting fallback to Claude Sonnet 4 via OpenRouter...');
      try {
        // Use Claude Sonnet 4 as fallback
        return await queryOpenRouter(prompt, systemPrompt, useCase, { general: { maxTokens: 32000 } }, bypassLimits, 'anthropic/claude-sonnet-4');
      } catch (fallbackError) {
        console.error('Fallback to Claude Sonnet 4 also failed:', fallbackError);
        throw error; // Throw the original error
      }
    } else {
      console.error('No OpenRouter API key available for fallback');
      throw error;
    }
  }
}

// Direct Anthropic API query function
export async function queryAnthropic(prompt: string, systemPrompt?: string, bypassLimits: boolean = false) {
  try {
    if (!AI_CONFIG.anthropic.apiKey) {
      throw new Error('Anthropic API key not configured');
    }
    
    const messages = [];
    
    // Add user message
    messages.push({
      role: 'user',
      content: prompt
    });
    
    const requestBody: any = {
      model: AI_CONFIG.anthropic.model,
      max_tokens: 4000,
      temperature: 0.7,
      messages
    };
    
    // Add system prompt if provided
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }
    
    console.log(`[ANTHROPIC] Making API request to model: ${AI_CONFIG.anthropic.model}`);
    
    const response = await fetch(`${AI_CONFIG.anthropic.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_CONFIG.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[ANTHROPIC] API error: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract content from Anthropic's response format
    let content = '';
    if (data.content && Array.isArray(data.content)) {
      content = data.content.map((item: any) => item.text || '').join('');
    } else if (data.content && typeof data.content === 'string') {
      content = data.content;
    }
    
    // Log usage
    if (data.usage) {
      console.log(`[ANTHROPIC] Token usage - Input: ${data.usage.input_tokens}, Output: ${data.usage.output_tokens}, Total: ${data.usage.input_tokens + data.usage.output_tokens}`);
    }
    
    return content;
    
  } catch (error) {
    console.error('[ANTHROPIC] Query failed:', error);
    throw error;
  }
}