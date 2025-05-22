import { queryAI } from './config';
import { ParsedResume, ParsedJobDescription } from '../documents/document-parser';
import { ResumeData, CoverLetterData, generateResumePDF, generateCoverLetterPDF, generateFileName } from '../documents/pdf-generator';

/**
 * Generate an ATS-optimized resume based on user profile and job description
 * @param resume User's parsed resume data
 * @param jobDescription Parsed job description
 * @param userName User's full name
 * @param companyName Company name
 * @returns Generated PDF as Uint8Array and filename
 */
export async function generateAtsResume(
  resume: ParsedResume,
  jobDescription: ParsedJobDescription,
  userName: string,
  companyName: string
): Promise<{ pdf: Uint8Array; fileName: string }> {
  try {
    // Create a prompt for the AI to tailor the resume
    const prompt = `
      I need to create an ATS-optimized resume for a job application.

      Here is the candidate's information:
      ${JSON.stringify(resume, null, 2)}

      Here is the job description:
      ${JSON.stringify(jobDescription, null, 2)}

      Please tailor the resume to highlight relevant skills and experience that match the job requirements.
      Focus on incorporating the keywords from the job description naturally.
      Return the result as a JSON object with this structure:
      {
        "fullName": "",
        "contactInfo": {
          "email": "",
          "phone": "",
          "location": "",
          "linkedin": ""
        },
        "summary": "",
        "experience": [
          {
            "title": "",
            "company": "",
            "location": "",
            "startDate": "",
            "endDate": "",
            "description": ["", ""]
          }
        ],
        "education": [
          {
            "institution": "",
            "degree": "",
            "field": "",
            "graduationDate": ""
          }
        ],
        "skills": ["", ""],
        "certifications": [
          {
            "name": "",
            "issuer": "",
            "date": "",
            "expiryDate": "",
            "credentialId": ""
          }
        ],
        "trainings": [
          {
            "name": "",
            "provider": "",
            "date": "",
            "duration": "",
            "description": ""
          }
        ],
        "projects": [
          {
            "name": "",
            "description": ""
          }
        ],
        "references": [
          {
            "name": "",
            "title": "",
            "company": "",
            "phone": "",
            "email": "",
            "relationship": ""
          }
        ]
      }

      Include certifications, training, and projects ONLY if they are available in the candidate's resume data.
      If these sections are not present in the original data, omit them from the output or leave them as empty arrays.
      
      For references:
      - If the candidate has provided specific references in their data, include them
      - If no specific references are provided, include a standard "References available upon request" entry:
        [{"name": "References available upon request", "title": "", "company": "", "phone": "", "email": "", "relationship": ""}]
      - Always include the references section unless specifically inappropriate for the role
      
      Ensure all the experience descriptions are achievement-oriented and quantifiable where possible.
      Include the most relevant skills from the candidate's profile that match the job requirements.
      Keep the content truthful and based on the provided information.
    `;

    const systemPrompt = `
      You are an expert resume writer who specializes in creating ATS-optimized resumes.
      Your goal is to tailor the candidate's resume to match the job description without fabricating experience.
      Focus on highlighting relevant experience, using appropriate keywords, and creating achievement-oriented bullet points.
    `;

    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Extract content from the AI response object
    let parsedContent: string;
    if (response && typeof response === 'object' && response.choices && response.choices.length > 0) {
      parsedContent = response.choices[0].message.content;
    } else if (typeof response === 'string') {
      parsedContent = response;
    } else {
      throw new Error('Invalid AI response format');
    }

    // Clean up the response if it contains markdown code blocks or explanatory text
    let cleanedContent = parsedContent;
    
    // Remove markdown code blocks
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    const codeBlockMatch = codeBlockRegex.exec(cleanedContent);
    if (codeBlockMatch) {
      cleanedContent = codeBlockMatch[1].trim();
    }
    
    // If the response starts with explanatory text, try to extract JSON from it
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}');
    if (jsonStart > 0 && jsonEnd > jsonStart) {
      cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
    }
    
    // Parse the response to get the tailored resume data
    const tailoredResumeData: ResumeData = JSON.parse(cleanedContent);
    
    // Generate the PDF
    const pdf = await generateResumePDF(tailoredResumeData);
    
    // Generate the filename
    const fileName = generateFileName(companyName, userName, 'Resume');
    
    return { pdf, fileName };
  } catch (error) {
    console.error('Error generating ATS resume:', error);
    throw new Error('Failed to generate ATS-optimized resume');
  }
}

/**
 * Generate a personalized cover letter based on user profile and job description
 * @param resume User's parsed resume data
 * @param jobDescription Parsed job description
 * @param userName User's full name
 * @param companyName Company name
 * @returns Generated PDF as Uint8Array and filename
 */
export async function generateCoverLetter(
  resume: ParsedResume,
  jobDescription: ParsedJobDescription,
  userName: string,
  companyName: string
): Promise<{ pdf: Uint8Array; fileName: string }> {
  try {
    // Create a prompt for the AI to generate a cover letter
    const prompt = `
      I need to create a personalized cover letter for a job application.

      Here is the candidate's information:
      ${JSON.stringify(resume, null, 2)}

      Here is the job description:
      ${JSON.stringify(jobDescription, null, 2)}

      Please generate a professional, compelling cover letter that:
      1. Expresses interest in the specific role
      2. Highlights 2-3 most relevant qualifications/experiences
      3. Demonstrates understanding of the company
      4. Explains why the candidate is a good fit
      5. Includes a call to action

      Return the result as a JSON object with this structure:
      {
        "fullName": "",
        "contactInfo": {
          "email": "",
          "phone": "",
          "location": ""
        },
        "date": "Current date (Month DD, YYYY)",
        "recipient": {
          "name": "Hiring Manager", 
          "title": "Hiring Manager",
          "company": "",
          "address": ""
        },
        "jobTitle": "",
        "paragraphs": ["", "", ""],
        "closing": "Sincerely,"
      }

      The paragraphs should typically include:
      1. Introduction and statement of interest
      2. Body paragraph(s) highlighting relevant experiences and skills 
      3. Closing paragraph with call to action

      Keep the cover letter concise, professional, and tailored to the specific job opportunity.
    `;

    const systemPrompt = `
      You are an expert cover letter writer who specializes in creating personalized, compelling cover letters.
      Your goal is to create a cover letter that highlights the candidate's most relevant qualifications
      and demonstrates their fit for the specific role and company.
    `;

    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Extract content from the AI response object
    let parsedContent: string;
    if (response && typeof response === 'object' && response.choices && response.choices.length > 0) {
      parsedContent = response.choices[0].message.content;
    } else if (typeof response === 'string') {
      parsedContent = response;
    } else {
      throw new Error('Invalid AI response format');
    }

    // Clean up the response if it contains markdown code blocks or explanatory text
    let cleanedContent = parsedContent;
    
    // Remove markdown code blocks
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    const codeBlockMatch = codeBlockRegex.exec(cleanedContent);
    if (codeBlockMatch) {
      cleanedContent = codeBlockMatch[1].trim();
    }
    
    // If the response starts with explanatory text, try to extract JSON from it
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}');
    if (jsonStart > 0 && jsonEnd > jsonStart) {
      cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
    }
    
    // Parse the response to get the cover letter data
    const coverLetterData: CoverLetterData = JSON.parse(cleanedContent);
    
    // Generate the PDF
    const pdf = await generateCoverLetterPDF(coverLetterData);
    
    // Generate the filename
    const fileName = generateFileName(companyName, userName, 'CoverLetter');
    
    return { pdf, fileName };
  } catch (error) {
    console.error('Error generating cover letter:', error);
    throw new Error('Failed to generate cover letter');
  }
}

/**
 * Generate LinkedIn profile optimization suggestions
 * @param linkedInData LinkedIn profile data
 * @returns Array of optimization suggestions
 */
export async function generateLinkedInOptimizationTips(linkedInData: any): Promise<string[]> {
  try {
    // Create a prompt for the AI to analyze the LinkedIn profile
    const prompt = `
      I need recommendations to optimize a LinkedIn profile.

      Here is the current LinkedIn profile data:
      ${JSON.stringify(linkedInData, null, 2)}

      Please provide 5-8 specific, actionable recommendations to improve this LinkedIn profile's:
      1. Headline (for visibility in searches)
      2. Summary/About section
      3. Experience descriptions (achievement-oriented)
      4. Skills section
      5. Overall profile completeness and professionalism

      Return the results as an array of strings, with each string being a specific recommendation.
      Make the recommendations detailed and actionable, not generic advice.
    `;

    const systemPrompt = `
      You are an expert LinkedIn profile optimizer who helps professionals improve their visibility
      and attractiveness to hiring managers and recruiters. You provide specific, actionable
      recommendations that will have a meaningful impact on profile effectiveness.
    `;

    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Parse the response to get the optimization tips
    const optimizationTips: string[] = JSON.parse(response.choices[0].message.content);
    
    return optimizationTips;
  } catch (error) {
    console.error('Error generating LinkedIn optimization tips:', error);
    throw new Error('Failed to generate LinkedIn profile optimization tips');
  }
}