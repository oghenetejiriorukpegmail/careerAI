import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from 'docx';

interface ContactInfo {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
}

interface Experience {
  title: string;
  company: string;
  location?: string;
  duration: string;
  description: string[];
  technologies?: string[];
}

interface Education {
  degree: string;
  school: string;
  location?: string;
  year: string;
  gpa?: string;
}

interface ResumeData {
  contactInfo: ContactInfo;
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    expiry?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
    date?: string;
    url?: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
}

export async function generateResumeDocx(resumeData: ResumeData): Promise<Uint8Array> {
  const sections = [];

  // Header with contact information
  const headerParagraphs = [];
  
  // Name
  if (resumeData.contactInfo.fullName) {
    headerParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resumeData.contactInfo.fullName,
            bold: true,
            size: 32,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );
  }

  // Contact details
  const contactDetails = [];
  if (resumeData.contactInfo.email) contactDetails.push(resumeData.contactInfo.email);
  if (resumeData.contactInfo.phone) contactDetails.push(resumeData.contactInfo.phone);
  if (resumeData.contactInfo.location) contactDetails.push(resumeData.contactInfo.location);
  
  if (contactDetails.length > 0) {
    headerParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactDetails.join(' | '),
            size: 20,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );
  }

  // LinkedIn and Website
  const links = [];
  if (resumeData.contactInfo.linkedin) links.push(resumeData.contactInfo.linkedin);
  if (resumeData.contactInfo.website) links.push(resumeData.contactInfo.website);
  
  if (links.length > 0) {
    headerParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: links.join(' | '),
            size: 20,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      })
    );
  }

  sections.push(...headerParagraphs);

  // Professional Summary
  if (resumeData.summary) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PROFESSIONAL SUMMARY",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "000000",
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: resumeData.summary,
            size: 20,
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  // Experience Section
  if (resumeData.experience && resumeData.experience.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PROFESSIONAL EXPERIENCE",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "000000",
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
      })
    );

    resumeData.experience.forEach((exp, index) => {
      // Job title and company
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: 22,
            }),
            new TextRun({
              text: ` | ${exp.company}`,
              size: 22,
            }),
          ],
          spacing: { before: index === 0 ? 0 : 180, after: 60 },
        })
      );

      // Location and duration
      const locationDuration = [];
      if (exp.location) locationDuration.push(exp.location);
      if (exp.duration) locationDuration.push(exp.duration);

      if (locationDuration.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: locationDuration.join(' | '),
                italics: true,
                size: 20,
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }

      // Job descriptions
      if (exp.description && exp.description.length > 0) {
        exp.description.forEach((desc) => {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `• ${desc}`,
                  size: 20,
                }),
              ],
              spacing: { after: 60 },
              indent: { left: 360 },
            })
          );
        });
      }

      // Technologies used
      if (exp.technologies && exp.technologies.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Technologies: ",
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: exp.technologies.join(', '),
                size: 20,
              }),
            ],
            spacing: { after: 120 },
            indent: { left: 360 },
          })
        );
      }
    });
  }

  // Education Section
  if (resumeData.education && resumeData.education.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "EDUCATION",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "000000",
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
      })
    );

    resumeData.education.forEach((edu, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.degree,
              bold: true,
              size: 22,
            }),
            new TextRun({
              text: ` | ${edu.school}`,
              size: 22,
            }),
          ],
          spacing: { before: index === 0 ? 0 : 180, after: 60 },
        })
      );

      const eduDetails = [];
      if (edu.location) eduDetails.push(edu.location);
      if (edu.year) eduDetails.push(edu.year);
      if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);

      if (eduDetails.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: eduDetails.join(' | '),
                italics: true,
                size: 20,
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    });
  }

  // Skills Section
  if (resumeData.skills && resumeData.skills.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "TECHNICAL SKILLS",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "000000",
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: resumeData.skills.join(', '),
            size: 20,
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  // Certifications Section
  if (resumeData.certifications && resumeData.certifications.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "CERTIFICATIONS",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "000000",
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
      })
    );

    resumeData.certifications.forEach((cert) => {
      const certText = `${cert.name} - ${cert.issuer} (${cert.date})`;
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${certText}`,
              size: 20,
            }),
          ],
          spacing: { after: 60 },
          indent: { left: 360 },
        })
      );
    });
  }

  // Projects Section
  if (resumeData.projects && resumeData.projects.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PROJECTS",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "000000",
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
      })
    );

    resumeData.projects.forEach((project, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: project.name,
              bold: true,
              size: 22,
            }),
            ...(project.date ? [
              new TextRun({
                text: ` (${project.date})`,
                size: 20,
                italics: true,
              }),
            ] : []),
          ],
          spacing: { before: index === 0 ? 0 : 180, after: 60 },
        })
      );

      if (project.description) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: project.description,
                size: 20,
              }),
            ],
            spacing: { after: 60 },
            indent: { left: 360 },
          })
        );
      }

      if (project.technologies && project.technologies.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Technologies: ",
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: project.technologies.join(', '),
                size: 20,
              }),
            ],
            spacing: { after: 120 },
            indent: { left: 360 },
          })
        );
      }

      if (project.url) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `URL: ${project.url}`,
                size: 20,
              }),
            ],
            spacing: { after: 120 },
            indent: { left: 360 },
          })
        );
      }
    });
  }

  // Languages Section
  if (resumeData.languages && resumeData.languages.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "LANGUAGES",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "000000",
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
      })
    );

    const languageText = resumeData.languages
      .map(lang => `${lang.language} (${lang.proficiency})`)
      .join(', ');

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: languageText,
            size: 20,
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  // Create the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });

  // Generate the document buffer
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}