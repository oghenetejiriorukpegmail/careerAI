import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from 'docx';

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
      matches.forEach(match => technologies.add(match));
    }
  }
  
  return Array.from(technologies).sort();
}

// Helper function to get technology color based on category
function getTechColor(tech: string): string {
  const techLower = tech.toLowerCase();
  
  // Programming Languages - Blue
  if (['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin'].some(lang => techLower.includes(lang))) {
    return '1e40af'; // Blue
  }
  
  // Web Technologies - Green
  if (['react', 'angular', 'vue', 'node', 'express', 'html', 'css', 'bootstrap', 'tailwind'].some(web => techLower.includes(web))) {
    return '047857'; // Green
  }
  
  // Databases - Purple
  if (['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sql'].some(db => techLower.includes(db))) {
    return '7c2d92'; // Purple
  }
  
  // Cloud & DevOps - Orange
  if (['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'devops'].some(cloud => techLower.includes(cloud))) {
    return 'c2410c'; // Orange
  }
  
  // Default - Gray
  return '6b7280';
}

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
    date?: string;
    issueDate?: string; // Alternative date field
    expiry?: string;
    credentialId?: string;
    credential_id?: string; // Alternative credential ID field
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

  // Skills Section - Enhanced for Executive-Level Technical Prowess ($500K+ roles)
  if (resumeData.skills && resumeData.skills.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "TECHNICAL EXPERTISE & CORE COMPETENCIES",
            bold: true,
            size: 24,
            color: "1144BB", // Executive blue color
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "1144BB",
            size: 8,
            style: BorderStyle.SINGLE,
          },
        },
      })
    );

    // Ensure comprehensive skill coverage - include ALL skills
    const allSkills = [...resumeData.skills];
    
    // Enhanced skills presentation with better formatting
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: allSkills.join(' • '),
            size: 20,
            color: "333333",
          }),
        ],
        spacing: { after: 120 },
      })
    );

    // Add comprehensive technical expertise note
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "* Comprehensive technical expertise spanning full technology stacks, enterprise architectures, and strategic technology leadership for Fortune 500 environments.",
            size: 18,
            italics: true,
            color: "666666",
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
      // Handle multiple possible date field names - same as PDF generator
      const rawCertDate = cert.date || cert.issueDate || (cert as any).obtained_date || (cert as any).date_obtained;
      const certDate = rawCertDate ? formatCertificationDate(rawCertDate) : null;
      const credentialId = cert.credentialId || (cert as any).credential_id || (cert as any).id;
      
      // Check for expiration
      const rawExpiryDate = (cert as any).expiryDate || (cert as any).validUntil || (cert as any).expiry_date || (cert as any).expires || (cert as any).valid_until;
      const isExpired = rawExpiryDate ? new Date(rawExpiryDate) < new Date() : false;
      
      // Build certification text with formatted date if available
      let certText = isExpired ? `${cert.name} (INACTIVE) - ${cert.issuer}` : `${cert.name} - ${cert.issuer}`;
      if (certDate) {
        certText += ` (${certDate})`;
      }
      if (credentialId) {
        certText += ` | ID: ${credentialId}`;
      }
      
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

  // Projects Section - enhanced for executive-level positions ($500K+ roles)
  const validProjects = resumeData.projects?.filter(project => {
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
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "KEY PROJECTS & STRATEGIC INITIATIVES",
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

    validProjects.forEach((project, index) => {
      // Enhanced project name with executive-level formatting
      if (project.name && project.name.trim()) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: project.name.trim(),
                bold: true,
                size: 22,
                color: "1144BB", // Executive blue color
              }),
              ...(project.date ? [
                new TextRun({
                  text: ` (${project.date})`,
                  size: 20,
                  italics: true,
                }),
              ] : []),
            ],
            spacing: { before: index === 0 ? 0 : 200, after: 80 },
          })
        );
      }

      // Enhanced description with professional formatting
      if (project.description && project.description.trim()) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${project.description.trim()}`,
                size: 20,
              }),
            ],
            spacing: { after: 80 },
            indent: { left: 360 },
          })
        );
      } else if (project.name && project.name.trim()) {
        // If only name is available, add professional context
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "• Strategic initiative contributing to organizational objectives and business growth.",
                size: 20,
                italics: true,
              }),
            ],
            spacing: { after: 80 },
            indent: { left: 360 },
          })
        );
      }

      // Extract and display technology tags
      const projectText = (project.name || '') + ' ' + (project.description || '');
      const technologies = extractTechnologies(projectText);
      
      if (technologies.length > 0) {
        // Create technology tags paragraph
        const techRuns: TextRun[] = [
          new TextRun({
            text: "Technologies: ",
            bold: true,
            size: 18,
          })
        ];
        
        technologies.forEach((tech, index) => {
          const techColor = getTechColor(tech);
          
          // Add tech tag with colored background
          techRuns.push(
            new TextRun({
              text: ` ${tech} `,
              size: 16,
              color: 'ffffff',
              highlight: techColor,
              bold: true,
            })
          );
          
          // Add space between tags
          if (index < technologies.length - 1) {
            techRuns.push(
              new TextRun({
                text: " ",
                size: 16,
              })
            );
          }
        });
        
        sections.push(
          new Paragraph({
            children: techRuns,
            spacing: { after: 120 },
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