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
    issueDate?: string; // Alternative date field
    expiryDate?: string;
    credentialId?: string;
    credential_id?: string; // Alternative credential ID field
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
  workAuthorization?: string;
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

// Helper function to format dates consistently
function formatCertificationDate(dateString: string): string {
  if (!dateString) return '';
  
  // Try to parse the date
  const date = new Date(dateString);
  
  // Check if it's a valid date
  if (!isNaN(date.getTime())) {
    // Format as "Month Year" (e.g., "October 2023")
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }
  
  // If it's already in "Month Year" format, return as-is
  if (/^[A-Z][a-z]+\s+\d{4}$/.test(dateString.trim())) {
    return dateString.trim();
  }
  
  // If it's in "Month YYYY" or "Mon YYYY" format, standardize
  const monthYearMatch = dateString.match(/^([A-Z][a-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    return monthYearMatch[0];
  }
  
  // If it's just a year, format as "December YYYY" (assuming end of year)
  if (/^\d{4}$/.test(dateString.trim())) {
    return `December ${dateString.trim()}`;
  }
  
  // If it's in ISO format (YYYY-MM-DD), parse and format
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const isoDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isoDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }
  
  // If none of the above, return the original string
  return dateString.trim();
}

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
  console.log('[PDF Generator] Generating PDF with data:', {
    fullName: data.fullName,
    hasWorkAuth: !!data.workAuthorization,
    workAuthValue: data.workAuthorization,
    contactLocation: data.contactInfo?.location,
    contactEmail: data.contactInfo?.email,
    hasContactInfo: !!data.contactInfo
  });

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
  // Name with larger, modern typography - handle undefined fullName
  const fullName = data.fullName || 'Applicant';
  currentPage.drawText(fullName, {
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
  
  // Contact information - first line with email, phone, location
  let contactX = margins.left;
  const contactY = currentY;
  const maxFirstLineWidth = contentWidth * 0.75; // Reserve space to avoid cutoff
  let currentContactX = contactX;
  
  if (data.contactInfo.email) {
    const width = drawContactItem(currentPage, data.contactInfo.email, currentContactX, contactY, helvetica, true);
    currentContactX += width;
  }
  
  if (data.contactInfo.phone && currentContactX + 120 < margins.left + maxFirstLineWidth) {
    const width = drawContactItem(currentPage, data.contactInfo.phone, currentContactX, contactY, helvetica);
    currentContactX += width;
  }
  
  if (data.contactInfo.location && currentContactX + 120 < margins.left + maxFirstLineWidth) {
    drawContactItem(currentPage, data.contactInfo.location, currentContactX, contactY, helvetica);
  }
  
  // LinkedIn on a new line if provided
  if (data.contactInfo.linkedin) {
    currentY -= 15;
    drawContactItem(currentPage, data.contactInfo.linkedin, margins.left, currentY, helvetica);
  }
  
  currentY -= 15;
  
  // Work Authorization (if provided)
  if (data.workAuthorization) {
    console.log('[PDF] Drawing work authorization:', data.workAuthorization);
    currentPage.drawText('Work Authorization: ', {
      x: margins.left,
      y: currentY,
      size: 10,
      font: helveticaBold,
      color: colors.secondary,
    });
    
    const authTextWidth = helveticaBold.widthOfTextAtSize('Work Authorization: ', 10);
    currentPage.drawText(data.workAuthorization, {
      x: margins.left + authTextWidth,
      y: currentY,
      size: 10,
      font: helvetica,
      color: colors.text,
    });
    currentY -= 20;
  } else {
    console.log('[PDF] No work authorization provided in data');
    currentY -= 20;
  }
  
  // Subtle separator line
  currentPage.drawRectangle({
    x: margins.left,
    y: currentY,
    width: contentWidth,
    height: 0.5,
    color: colors.accent,
  });
  currentY -= 20;
  
  // SUMMARY SECTION
  currentY = drawSectionHeader(currentPage, 'Professional Summary', margins.left, currentY, contentWidth, helveticaBold);
  currentY = drawWrappedText(data.summary, margins.left, 10.5, helvetica, colors.secondary, contentWidth, 1.5);
  currentY -= 20;
  
  // EXPERIENCE SECTION
  const pageInfo1 = checkSectionStart(pdfDoc, currentPage, currentY, 60, margins);
  currentPage = pageInfo1.page;
  currentY = pageInfo1.y;
  
  currentY = drawSectionHeader(currentPage, 'Professional Experience', margins.left, currentY, contentWidth, helveticaBold);
  
  for (const job of data.experience) {
    const pageInfo2 = checkAndAddPage(pdfDoc, currentPage, currentY, 50, margins);
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
    currentY -= 16;
    
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
    currentY -= 15;
    
    // Achievement bullets with modern styling
    for (const bullet of job.description) {
      // Skip empty or whitespace-only bullets
      if (!bullet || bullet.trim() === '') {
        continue;
      }
      
      const pageInfo3 = checkAndAddPage(pdfDoc, currentPage, currentY, 12, margins);
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
    
    currentY -= 10;
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
  
  // SKILLS SECTION - Enhanced for Executive-Level Technical Prowess ($500K+ roles)
  const pageInfo6 = checkSectionStart(pdfDoc, currentPage, currentY, 80, margins);
  currentPage = pageInfo6.page;
  currentY = pageInfo6.y;
  
  currentY = drawSectionHeader(currentPage, 'Technical Expertise & Core Competencies', margins.left, currentY, contentWidth, helveticaBold);
  
  // Enhanced skills display with comprehensive coverage
  if (data.skills && data.skills.length > 0) {
    // Split complex skills into individual components
    const processSkills = (skills) => {
      const individualSkills = [];
      
      for (const skill of skills) {
        // Handle skills that contain parentheses with comma-separated items
        if (skill.includes('(') && skill.includes(')')) {
          const baseSkill = skill.split('(')[0].trim();
          const parenthesesContent = skill.match(/\(([^)]+)\)/)?.[1];
          
          if (parenthesesContent) {
            // Add the base skill
            individualSkills.push(baseSkill);
            
            // Split the parentheses content by commas and add each as individual skill
            const subSkills = parenthesesContent.split(',').map(s => s.trim());
            individualSkills.push(...subSkills);
          } else {
            individualSkills.push(skill);
          }
        } else if (skill.includes(',')) {
          // Handle comma-separated skills
          const splitSkills = skill.split(',').map(s => s.trim()).filter(s => s.length > 0);
          individualSkills.push(...splitSkills);
        } else {
          individualSkills.push(skill);
        }
      }
      
      return individualSkills;
    };
    
    // Process skills to split them into individual components
    const allSkills = processSkills(data.skills);
    
    // Create enhanced skill pills layout optimized for comprehensive display
    let skillX = margins.left;
    let skillY = currentY;
    const skillSpacing = 8; // Reduced spacing for more skills per line
    const lineHeight = 22; // Optimized line height
    
    for (const skill of allSkills) {
      // For executive resumes, show full skill information - no truncation
      const skillWidth = helvetica.widthOfTextAtSize(skill, 9) + 14;
      
      // Check if skill fits on current line with proper margins
      if (skillX + skillWidth > width - margins.right - 10) {
        skillX = margins.left;
        skillY -= lineHeight;
        
        // Check if we need a new page
        const pageInfo = checkAndAddPage(pdfDoc, currentPage, skillY, lineHeight, margins);
        currentPage = pageInfo.page;
        if (pageInfo.y !== skillY) skillY = pageInfo.y;
      }
      
      // Draw premium skill pill with executive-level styling
      currentPage.drawRectangle({
        x: skillX,
        y: skillY - 2,
        width: skillWidth,
        height: 15, // Slightly reduced height for more compact display
        color: colors.primaryLight,
        borderColor: colors.primary,
        borderWidth: 0.8, // Slightly thicker border for premium appearance
      });
      
      // Draw full skill text with optimized positioning
      currentPage.drawText(skill, {
        x: skillX + 7,
        y: skillY + 2,
        size: 9,
        font: helvetica,
        color: colors.primary,
      });
      
      skillX += skillWidth + skillSpacing;
    }
    
    currentY = skillY;
    currentY -= 25;
  } else {
    // No skills section, adjust spacing accordingly
    currentY -= 20;
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
      
      // Handle certification name and date layout - check multiple possible date fields
      const rawCertDate = cert.date || cert.issueDate || (cert as any).obtained_date || (cert as any).date_obtained;
      const certDate = rawCertDate ? formatCertificationDate(rawCertDate) : null;
      
      // Check for expiration date
      const rawExpiryDate = cert.expiryDate || cert.validUntil || (cert as any).expiry_date || (cert as any).expires || (cert as any).valid_until;
      const isExpired = rawExpiryDate ? new Date(rawExpiryDate) < new Date() : false;
      
      if (certDate) {
        const dateWidth = helvetica.widthOfTextAtSize(certDate, 9);
        const dateX = width - margins.right - dateWidth;
        
        // Prepare certification name with inactive indicator
        const displayName = isExpired ? `${cert.name} (INACTIVE)` : cert.name;
        const nameColor = isExpired ? rgb(0.6, 0.6, 0.6) : colors.primary; // Gray for inactive, normal color otherwise
        
        // Check if certification name fits on one line with date
        const certNameWidth = helveticaBold.widthOfTextAtSize(displayName, 11);
        const availableSpaceForName = dateX - margins.left - 20; // 20px buffer
        
        if (certNameWidth <= availableSpaceForName) {
          // Single line: certification name and date on same line
          currentPage.drawText(displayName, {
            x: margins.left,
            y: currentY,
            size: 11,
            font: helveticaBold,
            color: nameColor,
          });
          
          currentPage.drawText(certDate, {
            x: dateX,
            y: currentY,
            size: 9,
            font: helvetica,
            color: colors.secondary,
          });
          
          currentY -= 16;
        } else {
          // Multi-line: certification name wraps, date on new line
          currentY = drawWrappedText(displayName, margins.left, 11, helveticaBold, nameColor, contentWidth, 1.4);
          
          currentPage.drawText(certDate, {
            x: dateX,
            y: currentY + 6,
            size: 9,
            font: helvetica,
            color: colors.secondary,
          });
          
          currentY -= 8;
        }
      } else {
        // No date: use full width for certification name
        const displayName = isExpired ? `${cert.name} (INACTIVE)` : cert.name;
        const nameColor = isExpired ? rgb(0.6, 0.6, 0.6) : colors.primary; // Gray for inactive, normal color otherwise
        
        currentY = drawWrappedText(displayName, margins.left, 11, helveticaBold, nameColor, contentWidth, 1.4);
        currentY -= 8;
      }
      
      // Handle credential ID with multiple possible field names
      const credentialId = cert.credentialId || (cert as any).credential_id || (cert as any).id;
      const certInfo = [cert.issuer, credentialId ? `ID: ${credentialId}` : null].filter(Boolean).join(' | ');
      if (certInfo) {
        currentY = drawWrappedText(certInfo, margins.left, 9, helvetica, colors.secondary, contentWidth, 1.4);
        currentY -= 8;
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
      const pageInfoTrainItem = checkAndAddPage(pdfDoc, currentPage, currentY, 50, margins);
      currentPage = pageInfoTrainItem.page;
      currentY = pageInfoTrainItem.y;
      
      // Handle training name and date layout (matching certification style)
      if (training.date) {
        const dateWidth = helvetica.widthOfTextAtSize(training.date, 9);
        const dateX = width - margins.right - dateWidth;
        
        // Check if training name fits on one line with date
        const trainingNameWidth = helveticaBold.widthOfTextAtSize(training.name, 11);
        const availableSpaceForName = dateX - margins.left - 20; // 20px buffer
        
        if (trainingNameWidth <= availableSpaceForName) {
          // Single line: training name and date on same line
          currentPage.drawText(training.name, {
            x: margins.left,
            y: currentY,
            size: 11,
            font: helveticaBold,
            color: colors.primary,
          });
          
          currentPage.drawText(training.date, {
            x: dateX,
            y: currentY,
            size: 9,
            font: helvetica,
            color: colors.secondary,
          });
          
          currentY -= 16;
        } else {
          // Multi-line: training name wraps, date on new line
          currentY = drawWrappedText(training.name, margins.left, 11, helveticaBold, colors.primary, contentWidth, 1.4);
          
          currentPage.drawText(training.date, {
            x: dateX,
            y: currentY + 6,
            size: 9,
            font: helvetica,
            color: colors.secondary,
          });
          
          currentY -= 8;
        }
      } else {
        // No date: use full width for training name
        currentY = drawWrappedText(training.name, margins.left, 11, helveticaBold, colors.primary, contentWidth, 1.4);
        currentY -= 8;
      }
      
      const trainInfo = [training.provider, training.duration ? `Duration: ${training.duration}` : null].filter(Boolean).join(' | ');
      if (trainInfo) {
        currentY = drawWrappedText(trainInfo, margins.left, 9, helvetica, colors.secondary, contentWidth, 1.4);
        currentY -= 6;
      }
      
      if (training.description) {
        currentY = drawWrappedText(training.description, margins.left, 10, helvetica, colors.text, contentWidth, 1.5);
        currentY -= 6;
      }
      
      currentY -= 8; // Reduced spacing between training items
    }
  }
  
  // Projects section - enhanced for executive-level positions ($500K+ roles)
  const validProjects = data.projects?.filter(project => {
    // For executive roles, include all projects with any meaningful content
    if (!project.name && !project.description) {
      return false;
    }
    
    // Include projects with just a name (we'll enhance the presentation)
    if (project.name && project.name.trim().length >= 2) {
      return true;
    }
    
    // Include projects with any substantial description
    if (project.description && project.description.trim().length >= 10) {
      return true;
    }
    
    // Only filter out completely empty or obvious placeholder content
    const content = (project.name || '') + ' ' + (project.description || '');
    const contentLower = content.toLowerCase().trim();
    
    // Filter only obvious placeholders
    const placeholderPhrases = [
      'lorem ipsum',
      'sample text',
      'placeholder text',
      'example project'
    ];
    
    if (placeholderPhrases.some(phrase => contentLower.includes(phrase))) {
      return false;
    }
    
    return content.trim().length > 0;
  }) || [];

  if (validProjects.length > 0) {
    const pageInfo7 = checkSectionStart(pdfDoc, currentPage, currentY, 70, margins);
    currentPage = pageInfo7.page;
    currentY = pageInfo7.y;
    
    currentY = drawSectionHeader(currentPage, 'Key Projects & Strategic Initiatives', margins.left, currentY, contentWidth, helveticaBold);
    
    for (const project of validProjects) {
      const pageInfo8 = checkAndAddPage(pdfDoc, currentPage, currentY, 60, margins);
      currentPage = pageInfo8.page;
      currentY = pageInfo8.y;
      
      // Enhanced project name with executive-level formatting
      if (project.name && project.name.trim()) {
        currentY = drawWrappedText(project.name.trim(), margins.left, 12, helveticaBold, colors.primary, contentWidth, 1.3);
        currentY -= 6; // Reduced spacing after title
      }
      
      // Enhanced description with professional formatting
      if (project.description && project.description.trim()) {
        const description = project.description.trim();
        
        // Add bullet point for better visual hierarchy
        currentPage.drawCircle({
          x: margins.left + 5,
          y: currentY + 4,
          size: 2.5,
          color: colors.primary,
        });
        
        currentY = drawWrappedText(description, margins.left + 15, 10.5, helvetica, colors.text, contentWidth - 15, 1.5);
        currentY -= 6; // Space before tech tags
        
        // Extract and display technology tags
        const projectText = (project.name || '') + ' ' + description;
        const technologies = extractTechnologies(projectText);
        
        if (technologies.length > 0) {
          // Draw technology tags
          let techX = margins.left + 15;
          let techY = currentY;
          const techSpacing = 6;
          const techLineHeight = 18;
          
          for (const tech of technologies) {
            const techColors = getTechColor(tech);
            const techWidth = helvetica.widthOfTextAtSize(tech, 8) + 10;
            
            // Check if tech tag fits on current line
            if (techX + techWidth > width - margins.right - 10) {
              techX = margins.left + 15;
              techY -= techLineHeight;
              
              // Check if we need a new page
              const pageInfo = checkAndAddPage(pdfDoc, currentPage, techY, techLineHeight, margins);
              currentPage = pageInfo.page;
              if (pageInfo.y !== techY) techY = pageInfo.y;
            }
            
            // Draw tech tag background
            currentPage.drawRectangle({
              x: techX,
              y: techY - 2,
              width: techWidth,
              height: 12,
              color: techColors.background,
              borderColor: techColors.border,
              borderWidth: 0.5,
            });
            
            // Draw tech tag text
            currentPage.drawText(tech, {
              x: techX + 5,
              y: techY + 1,
              size: 8,
              font: helvetica,
              color: techColors.text,
            });
            
            techX += techWidth + techSpacing;
          }
          
          currentY = techY - 8;
        } else {
          currentY -= 4; // No tech tags, just add normal spacing
        }
        
      } else if (project.name && project.name.trim()) {
        // If only name is available, add professional context note
        currentPage.drawCircle({
          x: margins.left + 5,
          y: currentY + 4,
          size: 2.5,
          color: colors.primary,
        });
        
        currentY = drawWrappedText('Strategic initiative contributing to organizational objectives and business growth.', margins.left + 15, 10, helvetica, colors.secondary, contentWidth - 15, 1.5);
        
        // Extract technologies from project name if no description
        const technologies = extractTechnologies(project.name);
        
        if (technologies.length > 0) {
          currentY -= 6; // Space before tech tags
          
          // Draw technology tags
          let techX = margins.left + 15;
          let techY = currentY;
          const techSpacing = 6;
          const techLineHeight = 18;
          
          for (const tech of technologies) {
            const techColors = getTechColor(tech);
            const techWidth = helvetica.widthOfTextAtSize(tech, 8) + 10;
            
            // Check if tech tag fits on current line
            if (techX + techWidth > width - margins.right - 10) {
              techX = margins.left + 15;
              techY -= techLineHeight;
              
              // Check if we need a new page
              const pageInfo = checkAndAddPage(pdfDoc, currentPage, techY, techLineHeight, margins);
              currentPage = pageInfo.page;
              if (pageInfo.y !== techY) techY = pageInfo.y;
            }
            
            // Draw tech tag background
            currentPage.drawRectangle({
              x: techX,
              y: techY - 2,
              width: techWidth,
              height: 12,
              color: techColors.background,
              borderColor: techColors.border,
              borderWidth: 0.5,
            });
            
            // Draw tech tag text
            currentPage.drawText(tech, {
              x: techX + 5,
              y: techY + 1,
              size: 8,
              font: helvetica,
              color: techColors.text,
            });
            
            techX += techWidth + techSpacing;
          }
          
          currentY = techY - 8;
        } else {
          currentY -= 4;
        }
      }
      
      currentY -= 10; // Reduced spacing between projects
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
        currentY -= 12; // Reduced spacing
      } else {
        // Reference name and title
        const nameTitle = ref.title ? `${ref.name}, ${ref.title}` : ref.name;
        currentY = drawWrappedText(nameTitle, margins.left, 11, helveticaBold, colors.primary, contentWidth, 1.3);
        currentY -= 4; // Further reduced spacing
        
        // Company
        if (ref.company) {
          currentY = drawWrappedText(ref.company, margins.left, 10, helvetica, colors.secondary, contentWidth, 1.3);
          currentY -= 3; // Further reduced spacing
        }
        
        // Contact information
        const contactInfo = [
          ref.phone ? `Phone: ${ref.phone}` : null,
          ref.email ? `Email: ${ref.email}` : null,
        ].filter(Boolean).join(' | ');
        
        if (contactInfo) {
          currentY = drawWrappedText(contactInfo, margins.left, 9, helvetica, colors.secondary, contentWidth, 1.3);
          currentY -= 2; // Further reduced spacing
        }
        
        // Relationship
        if (ref.relationship) {
          currentY = drawWrappedText(`Relationship: ${ref.relationship}`, margins.left, 9, helvetica, colors.text, contentWidth, 1.3);
          currentY -= 2; // Further reduced spacing
        }
        
        currentY -= 5; // Much smaller space between references
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
  
  // Draw name at the top - handle undefined fullName
  const fullName = data.fullName || 'Applicant';
  currentPage.drawText(fullName, {
    x: margins.left,
    y: currentY,
    size: 16,
    font: timesBold,
  });
  currentY -= 15; // Standard spacing between all elements
  
  // Contact info line
  const contactText = [
    data.contactInfo.email,
    data.contactInfo.phone,
    data.contactInfo.location,
  ].filter(Boolean).join(' | ');
  
  currentY = drawWrappedText(contactText, margins.left, 10, timesRoman);
  currentY -= 15; // Standard spacing
  
  // Date
  currentPage.drawText(data.date, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesRoman,
  });
  currentY -= 30; // Extra space between date and recipient for visual separation
  
  // Recipient info
  if (data.recipient) {
    if (data.recipient.name) {
      currentPage.drawText(data.recipient.name, {
        x: margins.left,
        y: currentY,
        size: 10,
        font: timesRoman,
      });
      currentY -= 15; // Standard spacing
      
      // Show title only if we have a specific name (not "Hiring Manager")
      if (data.recipient.title && data.recipient.name !== 'Hiring Manager' && data.recipient.title !== 'Hiring Manager') {
        currentPage.drawText(data.recipient.title, {
          x: margins.left,
          y: currentY,
          size: 10,
          font: timesRoman,
        });
        currentY -= 15; // Standard spacing
      }
    }
    
    currentPage.drawText(data.recipient.company, {
      x: margins.left,
      y: currentY,
      size: 10,
      font: timesRoman,
    });
    currentY -= 15; // Standard spacing
    
    if (data.recipient.address) {
      currentY = drawWrappedText(data.recipient.address, margins.left, 10, timesRoman);
      currentY -= 5;
    }
  }
  
  currentY -= 15; // Standard spacing
  
  // Subject line
  const subjectText = `Re: Application for ${data.jobTitle} Position`;
  currentPage.drawText(subjectText, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesBold,
  });
  currentY -= 15; // Standard spacing
  
  // Greeting - use recipient name if available, otherwise default to Hiring Manager
  const greeting = data.recipient?.name && data.recipient.name.trim() !== '' && data.recipient.name !== 'Hiring Manager' 
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
  
  // Name - handle undefined fullName
  const fullNameCover = data.fullName || 'Applicant';
  currentPage.drawText(fullNameCover, {
    x: margins.left,
    y: currentY,
    size: 10,
    font: timesBold,
  });
  
  return await pdfDoc.save();
}

/**
 * Generates file name according to PRD requirements
 * Format: companyName_userFirstname_jobTitle_docType_YYYY-MM-DD.pdf|docx
 * Example: openAI_Oghenetejiri_Senior_Network_Engineer_resume_2025-01-23.pdf
 * @param companyName Company name
 * @param userName User's full name
 * @param docType 'Resume' or 'CoverLetter'
 * @param jobTitle Optional job title to include in filename
 * @param format File format ('pdf' or 'docx')
 * @returns Formatted file name with company, first name, job title, document type, date, and format
 */
export function generateFileName(companyName: string, userName: string, docType: 'Resume' | 'CoverLetter', jobTitle?: string, format: 'pdf' | 'docx' = 'pdf'): string {
  const sanitizedCompany = companyName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  
  // Extract first name from full name
  const firstName = userName.split(' ')[0];
  const sanitizedFirstName = firstName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  
  // Add current date in YYYY-MM-DD format
  const currentDate = new Date().toISOString().split('T')[0]; // Gets YYYY-MM-DD format
  
  // Sanitize job title if provided
  if (jobTitle) {
    const sanitizedJobTitle = jobTitle.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    return `${sanitizedCompany}_${sanitizedFirstName}_${sanitizedJobTitle}_${docType.toLowerCase()}_${currentDate}.${format}`;
  }
  
  return `${sanitizedCompany}_${sanitizedFirstName}_${docType.toLowerCase()}_${currentDate}.${format}`;
}

// Helper function to extract technologies from text
function extractTechnologies(text: string): string[] {
  if (!text) return [];
  
  const techPatterns = [
    // Programming Languages
    /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|Scala|Perl|R|MATLAB|Objective-C|Shell|PowerShell|Bash)\b/gi,
    // Web Technologies
    /\b(HTML|CSS|SASS|SCSS|React|Angular|Vue\.?js|Node\.?js|Express|Django|Flask|Laravel|Rails|Spring|ASP\.NET|jQuery|Bootstrap|Tailwind)\b/gi,
    // Databases
    /\b(MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|Oracle|SQL Server|SQLite|Cassandra|DynamoDB|Neo4j|InfluxDB|MariaDB)\b/gi,
    // Cloud & DevOps
    /\b(AWS|Azure|GCP|Google Cloud|Docker|Kubernetes|Terraform|Jenkins|GitLab|GitHub Actions|CircleCI|Ansible|Puppet|Chef|Vagrant)\b/gi,
    // Networking & Security
    /\b(BGP|OSPF|MPLS|VPN|VLAN|SDN|Cisco|Juniper|Palo Alto|Fortinet|Check Point|Wireshark|Nmap|OpenSSL|IPSec|SSL|TLS)\b/gi,
    // Data & Analytics
    /\b(Hadoop|Spark|Kafka|Airflow|Tableau|Power BI|Grafana|Prometheus|Splunk|ELK Stack|Kibana|Logstash|Apache|Nginx)\b/gi,
    // Mobile & Desktop
    /\b(iOS|Android|React Native|Flutter|Xamarin|Unity|Electron|Qt|WPF|Swing|JavaFX)\b/gi,
    // Tools & Platforms
    /\b(Git|SVN|JIRA|Confluence|Slack|Teams|Zoom|VS Code|IntelliJ|Eclipse|Postman|Insomnia|SoapUI)\b/gi,
    // Methodologies & Frameworks
    /\b(Agile|Scrum|Kanban|DevOps|CI\/CD|TDD|BDD|Microservices|REST|GraphQL|SOAP|gRPC|API|SDK|MVC|MVVM)\b/gi,
    // Specialized Technologies
    /\b(Blockchain|Ethereum|Bitcoin|IoT|AI|ML|Machine Learning|Deep Learning|Neural Networks|TensorFlow|PyTorch|OpenCV|CUDA)\b/gi
  ];
  
  const technologies = new Set<string>();
  
  for (const pattern of techPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean up the match
        const cleaned = match.replace(/\.js$/, '.js').replace(/\.?js$/, '.js');
        technologies.add(cleaned);
      });
    }
  }
  
  return Array.from(technologies);
}

// Helper function to get color for technology type
function getTechColor(tech: string): { background: RGB; text: RGB; border: RGB } {
  const techLower = tech.toLowerCase();
  
  // Programming Languages - Blue shades
  if (['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin'].some(lang => techLower.includes(lang))) {
    return {
      background: rgb(0.9, 0.95, 1.0),
      text: rgb(0.1, 0.3, 0.7),
      border: rgb(0.3, 0.5, 0.9)
    };
  }
  
  // Web Technologies - Green shades
  if (['react', 'angular', 'vue', 'node', 'express', 'html', 'css', 'bootstrap', 'tailwind'].some(web => techLower.includes(web))) {
    return {
      background: rgb(0.9, 1.0, 0.9),
      text: rgb(0.1, 0.6, 0.1),
      border: rgb(0.2, 0.8, 0.2)
    };
  }
  
  // Databases - Purple shades
  if (['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sql'].some(db => techLower.includes(db))) {
    return {
      background: rgb(0.95, 0.9, 1.0),
      text: rgb(0.4, 0.1, 0.7),
      border: rgb(0.6, 0.3, 0.9)
    };
  }
  
  // Cloud & DevOps - Orange shades
  if (['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'devops'].some(cloud => techLower.includes(cloud))) {
    return {
      background: rgb(1.0, 0.95, 0.9),
      text: rgb(0.8, 0.4, 0.1),
      border: rgb(0.9, 0.6, 0.2)
    };
  }
  
  // Networking - Red shades
  if (['bgp', 'ospf', 'mpls', 'vpn', 'vlan', 'cisco', 'juniper', 'networking'].some(net => techLower.includes(net))) {
    return {
      background: rgb(1.0, 0.9, 0.9),
      text: rgb(0.7, 0.1, 0.1),
      border: rgb(0.9, 0.3, 0.3)
    };
  }
  
  // Default - Gray shades
  return {
    background: rgb(0.95, 0.95, 0.95),
    text: rgb(0.3, 0.3, 0.3),
    border: rgb(0.5, 0.5, 0.5)
  };
}