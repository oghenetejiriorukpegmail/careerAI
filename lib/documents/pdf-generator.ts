import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

// Helper function to sanitize text for PDF encoding
function sanitizeForPDF(text: string): string {
  if (!text) return '';
  
  // Replace common Unicode characters with ASCII equivalents
  const replacements: { [key: string]: string } = {
    'Μ': 'M', // Greek capital Mu
    'μ': 'u', // Greek small mu
    '–': '-', // En dash
    '—': '-', // Em dash
    '"': '"', // Left double quote
    '"': '"', // Right double quote
    ''': "'", // Left single quote
    ''': "'", // Right single quote
    '…': '...', // Ellipsis
    '°': ' degrees', // Degree symbol
    '±': '+/-', // Plus-minus
    '×': 'x', // Multiplication sign
    '÷': '/', // Division sign
    '≤': '<=', // Less than or equal
    '≥': '>=', // Greater than or equal
    '≠': '!=', // Not equal
    '∞': 'infinity', // Infinity
    '™': '(TM)', // Trademark
    '®': '(R)', // Registered
    '©': '(C)', // Copyright
    '€': 'EUR', // Euro
    '£': 'GBP', // Pound
    '¥': 'JPY', // Yen
    '₹': 'INR', // Rupee
    // Add more as needed
  };
  
  let sanitized = text;
  for (const [unicode, ascii] of Object.entries(replacements)) {
    sanitized = sanitized.replace(new RegExp(unicode, 'g'), ascii);
  }
  
  // Remove any remaining non-ASCII characters
  sanitized = sanitized.replace(/[^\x00-\x7F]/g, '');
  
  return sanitized;
}

// Interface for resume data
export interface ResumeData {
  fullName: string;
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

// Print-friendly color palette
const colors = {
  primary: rgb(0, 0, 0),           // Pure black for best print quality
  secondary: rgb(0.2, 0.2, 0.2),   // Dark gray for secondary text
  light: rgb(0.98, 0.98, 0.98),    // Very light gray for backgrounds (will print well)
  accent: rgb(0.6, 0.6, 0.6),      // Medium gray for lines (visible in print)
  text: rgb(0, 0, 0),              // Pure black for maximum readability
  white: rgb(1, 1, 1),             // Pure white
  printBlue: rgb(0.1, 0.2, 0.4)    // Dark blue that prints well in B&W
};

// Helper function to wrap text and calculate height
function wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
  // Sanitize text before processing
  const sanitizedText = sanitizeForPDF(text);
  const words = sanitizedText.split(' ');
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

// Helper function to safely draw text with sanitization
function drawSanitizedText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color?: { red: number; green: number; blue: number };
    opacity?: number;
  }
): void {
  const sanitizedText = sanitizeForPDF(text);
  page.drawText(sanitizedText, options);
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

// Helper function to draw a section header with print-friendly styling
function drawSectionHeader(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont
): number {
  // Draw section title with larger size for better print visibility
  drawSanitizedText(page, text.toUpperCase(), {
    x,
    y,
    size: 12,
    font,
    color: colors.primary,
  });
  
  // Draw a full-width line for better print visibility
  page.drawRectangle({
    x,
    y: y - 10,
    width: width,
    height: 0.75, // Thicker line for print
    color: colors.accent,
  });
  
  return y - 28; // More spacing for readability
}

// Helper function to add page numbers to all pages
function addPageNumbers(pdfDoc: PDFDocument, font: PDFFont): void {
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  pages.forEach((page, index) => {
    const pageNumber = index + 1;
    const { width, height } = page.getSize();
    
    // Add page number at bottom center
    const text = `Page ${pageNumber} of ${totalPages}`;
    const textWidth = font.widthOfTextAtSize(text, 8);
    
    drawSanitizedText(page, text, {
      x: (width - textWidth) / 2,
      y: 30, // 30 points from bottom
      size: 8,
      font,
      color: colors.secondary,
    });
  });
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
  
  drawSanitizedText(page, text, {
    x: x + 12,
    y,
    size: 9,
    font,
    color: colors.secondary,
  });
  
  return font.widthOfTextAtSize(text, 9) + 20;
}

/**
 * Generates a modern, ATS-optimized resume PDF
 * @param data Resume data
 * @returns PDF document as Uint8Array
 */
export async function generateResumePDF(data: ResumeData): Promise<Uint8Array> {
  // Debug logging
  console.log('[PDF Generator] Generating resume with data:', {
    fullName: data.fullName,
    hasContactInfo: !!data.contactInfo,
    hasSummary: !!data.summary,
    experienceCount: data.experience?.length || 0,
    educationCount: data.education?.length || 0,
    skillsCount: data.skills?.length || 0,
    certificationsCount: data.certifications?.length || 0,
    trainingsCount: data.trainings?.length || 0,
    projectsCount: data.projects?.length || 0,
    referencesCount: data.references?.length || 0
  });
  
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([612, 792]); // US Letter
  
  // Get fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = currentPage.getSize();
  // Standard print margins: 0.75 inches (54 points) on all sides for better printer compatibility
  const margins = { top: 54, bottom: 72, left: 54, right: 54 };
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
      
      drawSanitizedText(currentPage, line, {
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
  
  // HEADER SECTION WITH PRINT-FRIENDLY LAYOUT
  // Name with larger, bold typography for impact
  drawSanitizedText(currentPage, data.fullName, {
    x: margins.left,
    y: currentY,
    size: 22, // Slightly smaller for better balance on print
    font: helveticaBold,
    color: colors.primary,
  });
  currentY -= 32;
  
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
  currentY = drawWrappedText(data.summary, margins.left, 10, helvetica, colors.text, contentWidth, 1.4);
  currentY -= 20;
  
  // EXPERIENCE SECTION
  // Ensure at least 100 points available for first experience entry
  const pageInfo1 = checkSectionStart(pdfDoc, currentPage, currentY, 100, margins);
  currentPage = pageInfo1.page;
  currentY = pageInfo1.y;
  
  currentY = drawSectionHeader(currentPage, 'Professional Experience', margins.left, currentY, contentWidth, helveticaBold);
  
  console.log('[PDF Generator] Processing experience section, jobs:', data.experience?.length || 0);
  
  if (!data.experience || data.experience.length === 0) {
    console.warn('[PDF Generator] No experience data found!');
    drawSanitizedText(currentPage, 'No experience data available', {
      x: margins.left,
      y: currentY,
      size: 10,
      font: helvetica,
      color: colors.secondary,
    });
    currentY -= 30;
  } else {
    for (const job of data.experience) {
      const pageInfo2 = checkAndAddPage(pdfDoc, currentPage, currentY, 70, margins);
      currentPage = pageInfo2.page;
      currentY = pageInfo2.y;
      
      // Job title and company in modern layout
      drawSanitizedText(currentPage, job.title, {
        x: margins.left,
        y: currentY,
        size: 12,
        font: helveticaBold,
        color: colors.primary,
      });
      
      // Company name on the same line, right-aligned
      const companyText = job.company;
      const companyWidth = helveticaBold.widthOfTextAtSize(companyText, 11);
      drawSanitizedText(currentPage, companyText, {
        x: width - margins.right - companyWidth,
        y: currentY,
        size: 11,
        font: helveticaBold,
        color: colors.secondary,
      });
      currentY -= 16;
      
      // Date range and location
      const dateText = `${job.startDate} - ${job.endDate || 'Present'}`;
      drawSanitizedText(currentPage, dateText, {
        x: margins.left,
        y: currentY,
        size: 9,
        font: helvetica,
        color: colors.secondary,
      });
      
      if (job.location) {
        const locationWidth = helvetica.widthOfTextAtSize(job.location, 9);
        drawSanitizedText(currentPage, job.location, {
          x: width - margins.right - locationWidth,
          y: currentY,
          size: 9,
          font: helvetica,
          color: colors.secondary,
        });
      }
      currentY -= 18;
      
      // Achievement bullets with modern styling
      for (const bullet of job.description) {
        const pageInfo3 = checkAndAddPage(pdfDoc, currentPage, currentY, 15, margins);
        currentPage = pageInfo3.page;
        currentY = pageInfo3.y;
        
        // Simple bullet point for print
        drawSanitizedText(currentPage, '•', {
          x: margins.left,
          y: currentY,
          size: 10,
          font: helvetica,
          color: colors.primary,
        });
        
        currentY = drawWrappedText(bullet, margins.left + 15, 9, helvetica, colors.text, contentWidth - 15, 1.3);
        currentY -= 3;
      }
      
      currentY -= 15;
    }
  }
  
  // EDUCATION SECTION
  const pageInfo4 = checkSectionStart(pdfDoc, currentPage, currentY, 60, margins);
  currentPage = pageInfo4.page;
  currentY = pageInfo4.y;
  
  currentY = drawSectionHeader(currentPage, 'Education', margins.left, currentY, contentWidth, helveticaBold);
  
  console.log('[PDF Generator] Processing education section, items:', data.education?.length || 0);
  
  if (!data.education || data.education.length === 0) {
    console.warn('[PDF Generator] No education data found!');
    drawSanitizedText(currentPage, 'No education data available', {
      x: margins.left,
      y: currentY,
      size: 10,
      font: helvetica,
      color: colors.secondary,
    });
    currentY -= 30;
  } else {
    for (const edu of data.education) {
      const pageInfo5 = checkAndAddPage(pdfDoc, currentPage, currentY, 45, margins);
      currentPage = pageInfo5.page;
      currentY = pageInfo5.y;
      
      // Degree and field
      const degree = `${edu.degree}${edu.field ? ' in ' + edu.field : ''}`;
      drawSanitizedText(currentPage, degree, {
        x: margins.left,
        y: currentY,
        size: 11,
        font: helveticaBold,
        color: colors.primary,
      });
      
      // Graduation date (right-aligned)
      if (edu.graduationDate) {
        const dateWidth = helvetica.widthOfTextAtSize(edu.graduationDate, 9);
        drawSanitizedText(currentPage, edu.graduationDate, {
          x: width - margins.right - dateWidth,
          y: currentY,
          size: 9,
          font: helvetica,
          color: colors.secondary,
        });
      }
      currentY -= 16;
      
      // Institution
      drawSanitizedText(currentPage, edu.institution, {
        x: margins.left,
        y: currentY,
        size: 10,
        font: helvetica,
        color: colors.secondary,
      });
      currentY -= 20;
    }
  }
  
  // SKILLS SECTION with modern pill-style layout
  const pageInfo6 = checkSectionStart(pdfDoc, currentPage, currentY, 60, margins);
  currentPage = pageInfo6.page;
  currentY = pageInfo6.y;
  
  currentY = drawSectionHeader(currentPage, 'Core Competencies', margins.left, currentY, contentWidth, helveticaBold);
  
  console.log('[PDF Generator] Processing skills section, skills:', data.skills?.length || 0);
  
  if (!data.skills || data.skills.length === 0) {
    console.warn('[PDF Generator] No skills data found!');
    drawSanitizedText(currentPage, 'No skills data available', {
      x: margins.left,
      y: currentY,
      size: 10,
      font: helvetica,
      color: colors.secondary,
    });
    currentY -= 30;
  } else {
    // Create skill pills layout
    let skillX = margins.left;
    let skillY = currentY;
    const skillSpacing = 8;
    const lineHeight = 20;
    
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
      
      // Draw skill pill with print-friendly border
      currentPage.drawRectangle({
        x: skillX,
        y: skillY - 2,
        width: skillWidth,
        height: 14,
        color: colors.white, // White background for clean print
        borderColor: colors.secondary,
        borderWidth: 1, // Thicker border for print visibility
      });
      
      // Draw skill text
      drawSanitizedText(currentPage, skill, {
        x: skillX + 8,
        y: skillY + 3,
        size: 9,
        font: helvetica,
        color: colors.secondary,
      });
      
      skillX += skillWidth + skillSpacing;
    }
    
    currentY = skillY - 25;
  }
  
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
      
      drawSanitizedText(currentPage, cert.name, {
        x: margins.left,
        y: currentY,
        size: 11,
        font: helveticaBold,
        color: colors.primary,
      });
      
      if (cert.date) {
        const dateWidth = helvetica.widthOfTextAtSize(cert.date, 9);
        drawSanitizedText(currentPage, cert.date, {
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
        drawSanitizedText(currentPage, certInfo, {
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
      
      drawSanitizedText(currentPage, training.name, {
        x: margins.left,
        y: currentY,
        size: 11,
        font: helveticaBold,
        color: colors.primary,
      });
      
      if (training.date) {
        const dateWidth = helvetica.widthOfTextAtSize(training.date, 9);
        drawSanitizedText(currentPage, training.date, {
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
        drawSanitizedText(currentPage, trainInfo, {
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
      
      drawSanitizedText(currentPage, project.name, {
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
        drawSanitizedText(currentPage, "References available upon request", {
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
        drawSanitizedText(currentPage, nameTitle, {
          x: margins.left,
          y: currentY,
          size: 11,
          font: helveticaBold,
          color: colors.primary,
        });
        currentY -= 16;
        
        // Company
        if (ref.company) {
          drawSanitizedText(currentPage, ref.company, {
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
  
  // Add page numbers to all pages
  addPageNumbers(pdfDoc, helvetica);
  
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
  // Standard business letter margins: 1 inch (72 points) on all sides
  const margins = { top: 72, bottom: 72, left: 72, right: 72 };
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
      
      drawSanitizedText(currentPage, line, {
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
  drawSanitizedText(currentPage, data.fullName, {
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
  drawSanitizedText(currentPage, data.date, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  currentY -= 30;
  
  // Recipient info
  if (data.recipient) {
    if (data.recipient.name) {
      drawSanitizedText(currentPage, data.recipient.name, {
        x: margins.left,
        y: currentY,
        size: 10,
        font: timesRoman,
      });
      currentY -= 15;
      
      // Show title only if we have a specific name (not "Hiring Manager")
      if (data.recipient.title && data.recipient.name !== 'Hiring Manager' && data.recipient.title !== 'Hiring Manager') {
        drawSanitizedText(currentPage, data.recipient.title, {
          x: margins.left,
          y: currentY,
          size: 10,
          font: timesRoman,
        });
        currentY -= 15;
      }
    }
    
    drawSanitizedText(currentPage, data.recipient.company, {
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
  drawSanitizedText(currentPage, subjectText, {
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
  
  drawSanitizedText(currentPage, greeting, {
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
  drawSanitizedText(currentPage, data.closing, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  
  currentY -= 60; // Space for signature
  
  // Name
  drawSanitizedText(currentPage, data.fullName, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesBold,
  });
  
  // Add page numbers if multiple pages
  if (pdfDoc.getPageCount() > 1) {
    addPageNumbers(pdfDoc, timesRoman);
  }
  
  return await pdfDoc.save();
}

/**
 * Generates file name according to PRD requirements
 * @param companyName Company name
 * @param userName User's full name
 * @param docType 'Resume' or 'CoverLetter'
 * @returns Formatted file name with company and user's first name
 */
export function generateFileName(companyName: string, userName: string, docType: 'Resume' | 'CoverLetter'): string {
  const sanitizedCompany = companyName.replace(/\s+/g, '_');
  
  // Extract first name from full name
  const firstName = userName.split(' ')[0];
  const sanitizedFirstName = firstName.replace(/\s+/g, '_');
  
  return `${sanitizedCompany}_${sanitizedFirstName}_${docType}.pdf`;
}