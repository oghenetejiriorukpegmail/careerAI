import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

// Interface for resume data
export interface ResumeData {
  fullName: string;
  jobTitle?: string; // Target job title for this tailored resume
  contactInfo: {
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    description: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    graduationDate?: string;
  }>;
  skills: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date?: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  trainings?: Array<{
    name: string;
    provider: string;
    date?: string;
    duration?: string;
    description?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
  }>;
  references?: Array<{
    name: string;
    title: string;
    company: string;
    phone?: string;
    email?: string;
    relationship?: string;
  }>;
}

// Interface for cover letter data
export interface CoverLetterData {
  fullName: string;
  contactInfo: {
    email: string;
    phone?: string;
    location?: string;
  };
  date: string;
  recipient?: {
    name?: string;
    title?: string;
    company: string;
    address?: string;
  };
  jobTitle: string;
  paragraphs: string[];
  closing: string;
}

// Modern color palette - Enhanced
const colors = {
  primary: rgb(0.067, 0.333, 0.8),       // Modern professional blue
  primaryLight: rgb(0.94, 0.96, 0.99),   // Very light blue for backgrounds
  secondary: rgb(0.25, 0.25, 0.25),      // Darker gray for better contrast
  light: rgb(0.97, 0.97, 0.97),         // Light gray for backgrounds
  accent: rgb(0.75, 0.75, 0.75),        // Medium gray for lines
  text: rgb(0.1, 0.1, 0.1),             // Near black for text
  white: rgb(1, 1, 1)                    // Pure white
};

// Helper function to wrap text and calculate height
function wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is too long, split it
        lines.push(word);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Helper function to add a new page when needed
function checkAndAddPage(
  pdfDoc: PDFDocument, 
  currentPage: PDFPage, 
  currentY: number, 
  requiredHeight: number,
  margins: { top: number; bottom: number }
): { page: PDFPage; y: number } {
  if (currentY - requiredHeight < margins.bottom) {
    const newPage = pdfDoc.addPage([612, 792]);
    return { page: newPage, y: 792 - margins.top };
  }
  return { page: currentPage, y: currentY };
}

// Helper function to check if a section should start on a new page
function checkSectionStart(
  pdfDoc: PDFDocument,
  currentPage: PDFPage,
  currentY: number,
  minimumSectionHeight: number,
  margins: { top: number; bottom: number }
): { page: PDFPage; y: number } {
  if (currentY - minimumSectionHeight < margins.bottom) {
    const newPage = pdfDoc.addPage([612, 792]);
    return { page: newPage, y: 792 - margins.top };
  }
  return { page: currentPage, y: currentY };
}

// Helper function to draw a section header with modern styling
function drawSectionHeader(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont
): number {
  // Draw light background for section header
  page.drawRectangle({
    x: x - 10,
    y: y - 5,
    width: width + 20,
    height: 20,
    color: colors.primaryLight,
  });
  
  // Draw section title
  page.drawText(text.toUpperCase(), {
    x,
    y,
    size: 13,
    font,
    color: colors.primary,
  });
  
  return y - 28;
}

// Helper function to draw contact icons (simplified)
function drawContactItem(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  isEmail: boolean = false
): number {
  // Draw a small bullet point as icon substitute
  page.drawCircle({
    x: x + 3,
    y: y + 3,
    size: 2,
    color: colors.primary,
  });
  
  page.drawText(text, {
    x: x + 12,
    y,
    size: 10,
    font,
    color: colors.secondary,
  });
  
  return font.widthOfTextAtSize(text, 10) + 25;
}

/**
 * Generates a modern, ATS-optimized resume PDF
 * @param data Resume data
 * @returns PDF document as Uint8Array
 */
export async function generateResumePDF(data: ResumeData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([612, 792]); // US Letter
  
  // Get fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = currentPage.getSize();
  const margins = { top: 50, bottom: 50, left: 60, right: 60 };
  const contentWidth = width - margins.left - margins.right;
  let currentY = height - margins.top;
  
  // Helper function to draw text with wrapping and pagination
  const drawWrappedText = (
    text: string, 
    x: number, 
    fontSize: number, 
    font: PDFFont, 
    color = colors.text,
    maxWidth: number = contentWidth,
    lineHeightMultiplier: number = 1.3
  ): number => {
    const lines = wrapText(text, maxWidth, fontSize, font);
    const lineHeight = fontSize * lineHeightMultiplier;
    
    for (const line of lines) {
      const pageInfo = checkAndAddPage(pdfDoc, currentPage, currentY, lineHeight, margins);
      currentPage = pageInfo.page;
      currentY = pageInfo.y;
      
      currentPage.drawText(line, {
        x,
        y: currentY,
        size: fontSize,
        font,
        color,
      });
      
      currentY -= lineHeight;
    }
    
    return currentY;
  };
  
  // HEADER SECTION WITH MODERN LAYOUT
  // Name with larger, modern typography
  currentPage.drawText(data.fullName, {
    x: margins.left,
    y: currentY,
    size: 28,
    font: helveticaBold,
    color: colors.primary,
  });
  currentY -= 32;
  
  // Job title (if provided for this tailored resume)
  if (data.jobTitle) {
    currentPage.drawText(data.jobTitle, {
      x: margins.left,
      y: currentY,
      size: 16,
      font: helvetica,
      color: colors.secondary,
    });
    currentY -= 24;
  } else {
    currentY -= 6; // Less spacing if no job title
  }
  
  // Contact information in a clean, horizontal layout
  let contactX = margins.left;
  const contactY = currentY;
  
  if (data.contactInfo.email) {
    const width = drawContactItem(currentPage, data.contactInfo.email, contactX, contactY, helvetica, true);
    contactX += width;
  }
  
  if (data.contactInfo.phone) {
    const width = drawContactItem(currentPage, data.contactInfo.phone, contactX, contactY, helvetica);
    contactX += width;
  }
  
  if (data.contactInfo.location) {
    const width = drawContactItem(currentPage, data.contactInfo.location, contactX, contactY, helvetica);
    contactX += width;
  }
  
  if (data.contactInfo.linkedin) {
    drawContactItem(currentPage, data.contactInfo.linkedin, contactX, contactY, helvetica);
  }
  
  currentY -= 35;
  
  // Subtle separator line
  currentPage.drawRectangle({
    x: margins.left,
    y: currentY,
    width: contentWidth,
    height: 0.5,
    color: colors.accent,
  });
  currentY -= 25;
  
  // SUMMARY SECTION
  currentY = drawSectionHeader(currentPage, 'Professional Summary', margins.left, currentY, contentWidth, helveticaBold);
  currentY = drawWrappedText(data.summary, margins.left, 10.5, helvetica, colors.secondary, contentWidth, 1.6);
  currentY -= 25;
  
  // EXPERIENCE SECTION
  const pageInfo1 = checkSectionStart(pdfDoc, currentPage, currentY, 80, margins);
  currentPage = pageInfo1.page;
  currentY = pageInfo1.y;
  
  currentY = drawSectionHeader(currentPage, 'Professional Experience', margins.left, currentY, contentWidth, helveticaBold);
  
  for (const job of data.experience) {
    const pageInfo2 = checkAndAddPage(pdfDoc, currentPage, currentY, 70, margins);
    currentPage = pageInfo2.page;
    currentY = pageInfo2.y;
    
    // Job title
    currentPage.drawText(job.title, {
      x: margins.left,
      y: currentY,
      size: 12,
      font: helveticaBold,
      color: colors.primary,
    });
    currentY -= 18;
    
    // Company name
    currentPage.drawText(job.company, {
      x: margins.left,
      y: currentY,
      size: 11,
      font: helveticaBold,
      color: colors.secondary,
    });
    currentY -= 16;
    
    // Date range and location
    const dateText = `${job.startDate} - ${job.endDate || 'Present'}`;
    const locationAndDate = job.location ? `${dateText} | ${job.location}` : dateText;
    
    currentPage.drawText(locationAndDate, {
      x: margins.left,
      y: currentY,
      size: 10,
      font: helvetica,
      color: colors.secondary,
    });
    currentY -= 20;
    
    // Achievement bullets with modern styling
    for (const bullet of job.description) {
      const pageInfo3 = checkAndAddPage(pdfDoc, currentPage, currentY, 15, margins);
      currentPage = pageInfo3.page;
      currentY = pageInfo3.y;
      
      // Enhanced bullet point
      currentPage.drawCircle({
        x: margins.left + 5,
        y: currentY + 4,
        size: 2,
        color: colors.primary,
      });
      
      currentY = drawWrappedText(bullet, margins.left + 15, 10, helvetica, colors.secondary, contentWidth - 15, 1.5);
      currentY -= 5;
    }
    
    currentY -= 15;
  }
  
  // EDUCATION SECTION
  const pageInfo4 = checkSectionStart(pdfDoc, currentPage, currentY, 60, margins);
  currentPage = pageInfo4.page;
  currentY = pageInfo4.y;
  
  currentY = drawSectionHeader(currentPage, 'Education', margins.left, currentY, contentWidth, helveticaBold);
  
  for (const edu of data.education) {
    const pageInfo5 = checkAndAddPage(pdfDoc, currentPage, currentY, 45, margins);
    currentPage = pageInfo5.page;
    currentY = pageInfo5.y;
    
    // Degree and field
    const degree = `${edu.degree}${edu.field ? ' in ' + edu.field : ''}`;
    currentPage.drawText(degree, {
      x: margins.left,
      y: currentY,
      size: 11,
      font: helveticaBold,
      color: colors.primary,
    });
    
    // Graduation date (right-aligned)
    if (edu.graduationDate) {
      const dateWidth = helvetica.widthOfTextAtSize(edu.graduationDate, 9);
      currentPage.drawText(edu.graduationDate, {
        x: width - margins.right - dateWidth,
        y: currentY,
        size: 9,
        font: helvetica,
        color: colors.secondary,
      });
    }
    currentY -= 16;
    
    // Institution
    currentPage.drawText(edu.institution, {
      x: margins.left,
      y: currentY,
      size: 10,
      font: helvetica,
      color: colors.secondary,
    });
    currentY -= 20;
  }
  
  // SKILLS SECTION with modern pill-style layout
  const pageInfo6 = checkSectionStart(pdfDoc, currentPage, currentY, 60, margins);
  currentPage = pageInfo6.page;
  currentY = pageInfo6.y;
  
  currentY = drawSectionHeader(currentPage, 'Core Competencies', margins.left, currentY, contentWidth, helveticaBold);
  
  // Create skill pills layout with better organization
  let skillX = margins.left;
  let skillY = currentY;
  const skillSpacing = 10;
  const lineHeight = 24;
  
  for (const skill of data.skills) {
    const skillWidth = helvetica.widthOfTextAtSize(skill, 9) + 16;
    
    // Check if skill fits on current line
    if (skillX + skillWidth > width - margins.right) {
      skillX = margins.left;
      skillY -= lineHeight;
      
      // Check if we need a new page
      const pageInfo = checkAndAddPage(pdfDoc, currentPage, skillY, lineHeight, margins);
      currentPage = pageInfo.page;
      if (pageInfo.y !== skillY) skillY = pageInfo.y;
    }
    
    // Draw enhanced skill pill background
    currentPage.drawRectangle({
      x: skillX,
      y: skillY - 2,
      width: skillWidth,
      height: 16,
      color: colors.primaryLight,
      borderColor: colors.primary,
      borderWidth: 0.75,
    });
    
    // Draw skill text
    currentPage.drawText(skill, {
      x: skillX + 8,
      y: skillY + 3,
      size: 9,
      font: helvetica,
      color: colors.primary,
    });
    
    skillX += skillWidth + skillSpacing;
  }
  
  currentY = skillY - 25;
  
  // ADDITIONAL SECTIONS (Certifications, Training, Projects, References)
  // Following the same modern design pattern...
  
  // Certifications section
  if (data.certifications && data.certifications.length > 0) {
    const pageInfoCert = checkSectionStart(pdfDoc, currentPage, currentY, 70, margins);
    currentPage = pageInfoCert.page;
    currentY = pageInfoCert.y;
    
    currentY = drawSectionHeader(currentPage, 'Certifications', margins.left, currentY, contentWidth, helveticaBold);
    
    for (const cert of data.certifications) {
      const pageInfoCertItem = checkAndAddPage(pdfDoc, currentPage, currentY, 50, margins);
      currentPage = pageInfoCertItem.page;
      currentY = pageInfoCertItem.y;
      
      currentPage.drawText(cert.name, {
        x: margins.left,
        y: currentY,
        size: 11,
        font: helveticaBold,
        color: colors.primary,
      });
      
      if (cert.date) {
        const dateWidth = helvetica.widthOfTextAtSize(cert.date, 9);
        currentPage.drawText(cert.date, {
          x: width - margins.right - dateWidth,
          y: currentY,
          size: 9,
          font: helvetica,
          color: colors.secondary,
        });
      }
      currentY -= 16;
      
      const certInfo = [cert.issuer, cert.credentialId ? `ID: ${cert.credentialId}` : null].filter(Boolean).join(' | ');
      if (certInfo) {
        currentPage.drawText(certInfo, {
          x: margins.left,
          y: currentY,
          size: 9,
          font: helvetica,
          color: colors.secondary,
        });
        currentY -= 15;
      }
    }
    currentY -= 10;
  }
  
  // Training section
  if (data.trainings && data.trainings.length > 0) {
    const pageInfoTrain = checkSectionStart(pdfDoc, currentPage, currentY, 80, margins);
    currentPage = pageInfoTrain.page;
    currentY = pageInfoTrain.y;
    
    currentY = drawSectionHeader(currentPage, 'Professional Development', margins.left, currentY, contentWidth, helveticaBold);
    
    for (const training of data.trainings) {
      const pageInfoTrainItem = checkAndAddPage(pdfDoc, currentPage, currentY, 60, margins);
      currentPage = pageInfoTrainItem.page;
      currentY = pageInfoTrainItem.y;
      
      currentPage.drawText(training.name, {
        x: margins.left,
        y: currentY,
        size: 11,
        font: helveticaBold,
        color: colors.primary,
      });
      
      if (training.date) {
        const dateWidth = helvetica.widthOfTextAtSize(training.date, 9);
        currentPage.drawText(training.date, {
          x: width - margins.right - dateWidth,
          y: currentY,
          size: 9,
          font: helvetica,
          color: colors.secondary,
        });
      }
      currentY -= 16;
      
      const trainInfo = [training.provider, training.duration ? `Duration: ${training.duration}` : null].filter(Boolean).join(' | ');
      if (trainInfo) {
        currentPage.drawText(trainInfo, {
          x: margins.left,
          y: currentY,
          size: 9,
          font: helvetica,
          color: colors.secondary,
        });
        currentY -= 12;
      }
      
      if (training.description) {
        currentY = drawWrappedText(training.description, margins.left, 9, helvetica, colors.text, contentWidth, 1.3);
      }
      currentY -= 15;
    }
  }
  
  // Projects section
  if (data.projects && data.projects.length > 0) {
    const pageInfo7 = checkSectionStart(pdfDoc, currentPage, currentY, 70, margins);
    currentPage = pageInfo7.page;
    currentY = pageInfo7.y;
    
    currentY = drawSectionHeader(currentPage, 'Notable Projects', margins.left, currentY, contentWidth, helveticaBold);
    
    for (const project of data.projects) {
      const pageInfo8 = checkAndAddPage(pdfDoc, currentPage, currentY, 45, margins);
      currentPage = pageInfo8.page;
      currentY = pageInfo8.y;
      
      currentPage.drawText(project.name, {
        x: margins.left,
        y: currentY,
        size: 11,
        font: helveticaBold,
        color: colors.primary,
      });
      currentY -= 16;
      
      currentY = drawWrappedText(project.description, margins.left, 9, helvetica, colors.text, contentWidth, 1.3);
      currentY -= 15;
    }
  }
  
  // References section
  if (data.references && data.references.length > 0) {
    const pageInfoRef = checkSectionStart(pdfDoc, currentPage, currentY, 70, margins);
    currentPage = pageInfoRef.page;
    currentY = pageInfoRef.y;
    
    currentY = drawSectionHeader(currentPage, 'References', margins.left, currentY, contentWidth, helveticaBold);
    
    for (const ref of data.references) {
      const pageInfoRefItem = checkAndAddPage(pdfDoc, currentPage, currentY, 60, margins);
      currentPage = pageInfoRefItem.page;
      currentY = pageInfoRefItem.y;
      
      // Handle "References available upon request" case
      if (ref.name === "References available upon request") {
        currentPage.drawText("References available upon request", {
          x: margins.left,
          y: currentY,
          size: 11,
          font: helvetica,
          color: colors.text,
        });
        currentY -= 20;
      } else {
        // Reference name and title
        const nameTitle = ref.title ? `${ref.name}, ${ref.title}` : ref.name;
        currentPage.drawText(nameTitle, {
          x: margins.left,
          y: currentY,
          size: 11,
          font: helveticaBold,
          color: colors.primary,
        });
        currentY -= 16;
        
        // Company
        if (ref.company) {
          currentPage.drawText(ref.company, {
            x: margins.left,
            y: currentY,
            size: 10,
            font: helvetica,
            color: colors.secondary,
          });
          currentY -= 12;
        }
        
        // Contact information
        const contactInfo = [
          ref.phone ? `Phone: ${ref.phone}` : null,
          ref.email ? `Email: ${ref.email}` : null,
        ].filter(Boolean).join(' | ');
        
        if (contactInfo) {
          currentY = drawWrappedText(contactInfo, margins.left, 9, helvetica, colors.secondary, contentWidth, 1.3);
          currentY -= 5;
        }
        
        // Relationship
        if (ref.relationship) {
          currentY = drawWrappedText(`Relationship: ${ref.relationship}`, margins.left, 9, helvetica, colors.text, contentWidth, 1.3);
        }
        
        currentY -= 15; // Space between references
      }
    }
  }
  
  return await pdfDoc.save();
}

/**
 * Generates a cover letter PDF
 * @param data Cover letter data
 * @returns PDF document as Uint8Array
 */
export async function generateCoverLetterPDF(data: CoverLetterData): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([612, 792]); // US Letter
  
  // Get fonts
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  const { width, height } = currentPage.getSize();
  const margins = { top: 50, bottom: 50, left: 72, right: 72 };
  const contentWidth = width - margins.left - margins.right;
  let currentY = height - margins.top;
  
  // Helper function to draw text with wrapping and pagination
  const drawWrappedText = (
    text: string, 
    x: number, 
    fontSize: number, 
    font: PDFFont, 
    maxWidth: number = contentWidth
  ): number => {
    const lines = wrapText(text, maxWidth, fontSize, font);
    const lineHeight = fontSize * 1.4; // More spacing for readability
    
    for (const line of lines) {
      // Check if we need a new page
      const pageInfo = checkAndAddPage(pdfDoc, currentPage, currentY, lineHeight, margins);
      currentPage = pageInfo.page;
      currentY = pageInfo.y;
      
      currentPage.drawText(line, {
        x,
        y: currentY,
        size: fontSize,
        font,
      });
      
      currentY -= lineHeight;
    }
    
    return currentY;
  };
  
  // Draw name at the top
  currentPage.drawText(data.fullName, {
    x: margins.left,
    y: currentY,
    size: 16,
    font: timesBold,
  });
  currentY -= 25;
  
  // Contact info line
  const contactText = [
    data.contactInfo.email,
    data.contactInfo.phone,
    data.contactInfo.location,
  ].filter(Boolean).join(' | ');
  
  currentY = drawWrappedText(contactText, margins.left, 10, timesRoman);
  currentY -= 30;
  
  // Date
  currentPage.drawText(data.date, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  currentY -= 30;
  
  // Recipient info
  if (data.recipient) {
    if (data.recipient.name) {
      currentPage.drawText(data.recipient.name, {
        x: margins.left,
        y: currentY,
        size: 10,
        font: timesRoman,
      });
      currentY -= 15;
      
      // Show title only if we have a specific name (not "Hiring Manager")
      if (data.recipient.title && data.recipient.name !== 'Hiring Manager' && data.recipient.title !== 'Hiring Manager') {
        currentPage.drawText(data.recipient.title, {
          x: margins.left,
          y: currentY,
          size: 10,
          font: timesRoman,
        });
        currentY -= 15;
      }
    }
    
    currentPage.drawText(data.recipient.company, {
      x: margins.left,
      y: currentY,
      size: 10,
      font: timesRoman,
    });
    currentY -= 15;
    
    if (data.recipient.address) {
      currentY = drawWrappedText(data.recipient.address, margins.left, 10, timesRoman);
      currentY -= 5;
    }
  }
  
  currentY -= 15;
  
  // Subject line
  const subjectText = `Re: Application for ${data.jobTitle} Position`;
  currentPage.drawText(subjectText, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesBold,
  });
  currentY -= 30;
  
  // Greeting - use recipient name if available, otherwise default to Hiring Manager
  const greeting = data.recipient?.name && data.recipient.name !== 'Hiring Manager' 
    ? `Dear ${data.recipient.name},` 
    : 'Dear Hiring Manager,';
  
  currentPage.drawText(greeting, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  currentY -= 25;
  
  // Body paragraphs
  for (const paragraph of data.paragraphs) {
    // Check if we need a new page
    const pageInfo = checkAndAddPage(pdfDoc, currentPage, currentY, 60, margins);
    currentPage = pageInfo.page;
    currentY = pageInfo.y;
    
    currentY = drawWrappedText(paragraph, margins.left, 10, timesRoman);
    currentY -= 15; // Space between paragraphs
  }
  
  // Closing
  currentY -= 10;
  currentPage.drawText(data.closing, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  
  currentY -= 60; // Space for signature
  
  // Name
  currentPage.drawText(data.fullName, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesBold,
  });
  
  return await pdfDoc.save();
}

/**
 * Generates file name according to PRD requirements
 * @param companyName Company name
 * @param userName User's full name
 * @param docType 'Resume' or 'CoverLetter'
 * @param jobTitle Optional job title to include in filename
 * @returns Formatted file name with company, job title, and user's first name
 */
export function generateFileName(companyName: string, userName: string, docType: 'Resume' | 'CoverLetter', jobTitle?: string): string {
  const sanitizedCompany = companyName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  
  // Extract first name from full name
  const firstName = userName.split(' ')[0];
  const sanitizedFirstName = firstName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  
  // Sanitize job title if provided
  if (jobTitle) {
    const sanitizedJobTitle = jobTitle.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    return `${sanitizedCompany}_${sanitizedJobTitle}_${sanitizedFirstName}_${docType}.pdf`;
  }
  
  return `${sanitizedCompany}_${sanitizedFirstName}_${docType}.pdf`;
}