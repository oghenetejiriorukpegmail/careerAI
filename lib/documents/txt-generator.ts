import { ResumeData, CoverLetterData } from './pdf-generator';

// Helper function to format dates consistently
function formatDate(dateString: string): string {
  if (!dateString || dateString.toLowerCase() === 'present') {
    return 'Present';
  }
  
  // If already in MM/YYYY format, return as is
  if (/^\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  // Convert "Month YYYY" to "MM/YYYY" format
  const monthMap: { [key: string]: string } = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09', 'sept': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
  };
  
  // Try to parse "Month YYYY" or "Month Year" format
  const monthYearMatch = dateString.match(/^(\w+)\s+(\d{4})$/i);
  if (monthYearMatch) {
    const monthName = monthYearMatch[1].toLowerCase();
    const year = monthYearMatch[2];
    const monthNumber = monthMap[monthName];
    if (monthNumber) {
      return `${monthNumber}/${year}`;
    }
  }
  
  // If we can't parse it, return as is
  return dateString;
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
      matches.forEach(match => technologies.add(match));
    }
  }
  
  return Array.from(technologies).sort();
}

/**
 * Generate a plain text version of a resume for copy-paste into job applications
 */
export function generateResumeTXT(data: ResumeData): string {
  const lines: string[] = [];
  
  // Header - handle missing fullName
  const fullName = data.fullName || 'Applicant';
  lines.push(fullName.toUpperCase());
  
  // Contact Information - handle missing contactInfo
  const contactInfo = [
    data.contactInfo?.email,
    data.contactInfo?.phone,
    data.contactInfo?.location,
    data.contactInfo?.linkedin
  ].filter(Boolean);
  
  lines.push(contactInfo.join(' | '));
  lines.push(''); // Empty line
  
  // Professional Summary
  if (data.summary) {
    lines.push('PROFESSIONAL SUMMARY');
    lines.push('-'.repeat(50));
    lines.push(data.summary);
    lines.push('');
  }
  
  // Experience
  if (data.experience && data.experience.length > 0) {
    lines.push('PROFESSIONAL EXPERIENCE');
    lines.push('-'.repeat(50));
    
    data.experience.forEach((exp, index) => {
      // Job title and company
      lines.push(`${exp.title}`);
      lines.push(`${exp.company}${exp.location ? ` | ${exp.location}` : ''}`);
      
      // Dates - format consistently
      const formattedStartDate = formatDate(exp.startDate);
      const formattedEndDate = formatDate(exp.endDate || 'Present');
      lines.push(`${formattedStartDate} - ${formattedEndDate}`);
      lines.push('');
      
      // Description
      if (exp.description && exp.description.length > 0) {
        exp.description.forEach(desc => {
          lines.push(`• ${desc}`);
        });
      }
      
      // Add space between jobs (except last one)
      if (index < data.experience.length - 1) {
        lines.push('');
      }
    });
    lines.push('');
  }
  
  // Education
  if (data.education && data.education.length > 0) {
    lines.push('EDUCATION');
    lines.push('-'.repeat(50));
    
    data.education.forEach(edu => {
      lines.push(`${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`);
      lines.push(`${edu.institution}`);
      if (edu.graduationDate) {
        lines.push(`Graduated: ${formatDate(edu.graduationDate)}`);
      }
      lines.push('');
    });
  }
  
  // Skills
  if (data.skills && data.skills.length > 0) {
    lines.push('TECHNICAL SKILLS');
    lines.push('-'.repeat(50));
    
    // Group skills by type or show as comma-separated list
    const skillsText = data.skills.join(', ');
    lines.push(skillsText);
    lines.push('');
  }
  
  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    lines.push('CERTIFICATIONS');
    lines.push('-'.repeat(50));
    
    data.certifications.forEach(cert => {
      // Check for expiration date
      const rawExpiryDate = cert.expiryDate;
      let isExpired = rawExpiryDate ? new Date(rawExpiryDate) < new Date() : false;
      
      // If no explicit expiry date, check for commonly expired certifications based on their typical validity periods
      if (!rawExpiryDate && (cert.date || cert.issueDate)) {
        const certDate = cert.date || cert.issueDate;
        const certificationDate = new Date(certDate);
        const currentDate = new Date();
        const yearsSinceCertification = (currentDate.getTime() - certificationDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        
        // Define typical validity periods for common certifications (in years)
        const certificationValidityPeriods: { [key: string]: number } = {
          'CCIE': 3, // Cisco Certified Internetwork Expert - 3 years
          'CCNP': 3, // Cisco Certified Network Professional - 3 years  
          'CCNA': 3, // Cisco Certified Network Associate - 3 years
          'CISSP': 3, // Certified Information Systems Security Professional - 3 years
          'CISM': 3, // Certified Information Security Manager - 3 years
          'CISA': 3, // Certified Information Systems Auditor - 3 years
          'CompTIA Security+': 3, // CompTIA Security+ - 3 years
          'CompTIA Network+': 3, // CompTIA Network+ - 3 years
          'AWS Certified': 3, // AWS Certifications - 3 years
          'Microsoft Certified': 3, // Microsoft Certifications - varies, but often 3 years
          'PMP': 3, // Project Management Professional - 3 years
          'ITIL': 3, // ITIL certifications - 3 years
          'Fortinet': 2, // Fortinet certifications - 2 years
          'Juniper': 3, // Juniper certifications - 3 years
          'Nokia': 3, // Nokia certifications - 3 years
        };
        
        // Check if certification name matches any of the patterns that typically expire
        for (const [certPattern, validityYears] of Object.entries(certificationValidityPeriods)) {
          if (cert.name.toLowerCase().includes(certPattern.toLowerCase())) {
            if (yearsSinceCertification > validityYears) {
              isExpired = true;
              break;
            }
          }
        }
      }
      
      let certLine = isExpired ? `${cert.name} (INACTIVE)` : cert.name;
      
      if (cert.issuer) {
        certLine += ` | ${cert.issuer}`;
      }
      
      const certDate = cert.date || cert.issueDate;
      if (certDate) {
        certLine += ` | ${formatDate(certDate)}`;
      }
      
      if (cert.credentialId || cert.credential_id) {
        certLine += ` | ID: ${cert.credentialId || cert.credential_id}`;
      }
      
      lines.push(certLine);
    });
    lines.push('');
  }
  
  // Projects
  if (data.projects && data.projects.length > 0) {
    lines.push('KEY PROJECTS');
    lines.push('-'.repeat(50));
    
    data.projects.forEach(project => {
      lines.push(`${project.name}`);
      lines.push(`${project.description}`);
      
      // Extract and display technology tags
      const projectText = (project.name || '') + ' ' + (project.description || '');
      const technologies = extractTechnologies(projectText);
      
      if (technologies.length > 0) {
        lines.push(`Technologies: [${technologies.join('] [')}]`);
      }
      
      lines.push('');
    });
  }
  
  // Training
  if (data.trainings && data.trainings.length > 0) {
    lines.push('PROFESSIONAL TRAINING');
    lines.push('-'.repeat(50));
    
    data.trainings.forEach(training => {
      let trainingLine = training.name;
      if (training.provider) {
        trainingLine += ` | ${training.provider}`;
      }
      if (training.date) {
        trainingLine += ` | ${formatDate(training.date)}`;
      }
      if (training.duration) {
        trainingLine += ` | ${training.duration}`;
      }
      
      lines.push(trainingLine);
      
      if (training.description) {
        lines.push(`${training.description}`);
      }
      lines.push('');
    });
  }
  
  // Work Authorization
  if (data.workAuthorization) {
    lines.push('WORK AUTHORIZATION');
    lines.push('-'.repeat(50));
    lines.push(data.workAuthorization);
    lines.push('');
  }
  
  // References
  if (data.references && data.references.length > 0) {
    lines.push('REFERENCES');
    lines.push('-'.repeat(50));
    
    data.references.forEach(ref => {
      if (ref.name === 'References available upon request') {
        lines.push('References available upon request');
      } else {
        lines.push(`${ref.name}`);
        if (ref.title) {
          lines.push(`${ref.title}`);
        }
        if (ref.company) {
          lines.push(`${ref.company}`);
        }
        
        const contactInfo = [ref.email, ref.phone].filter(Boolean);
        if (contactInfo.length > 0) {
          lines.push(contactInfo.join(' | '));
        }
        
        if (ref.relationship) {
          lines.push(`Relationship: ${ref.relationship}`);
        }
        lines.push('');
      }
    });
  }
  
  return lines.join('\n').trim();
}

/**
 * Generate a plain text version of a cover letter for copy-paste into job applications
 */
export function generateCoverLetterTXT(data: CoverLetterData): string {
  const lines: string[] = [];
  
  // Header - handle missing fullName
  const fullName = data.fullName || 'Applicant';
  lines.push(fullName);
  
  // Contact Information - handle missing contactInfo
  const contactInfo = [
    data.contactInfo?.email,
    data.contactInfo?.phone,
    data.contactInfo?.location
  ].filter(Boolean);
  
  lines.push(contactInfo.join(' | '));
  lines.push('');
  
  // Date - handle missing date
  const date = data.date || new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  lines.push(date);
  lines.push('');
  
  // Recipient
  if (data.recipient) {
    if (data.recipient.name) {
      lines.push(data.recipient.name);
    }
    if (data.recipient.title && data.recipient.name !== 'Hiring Manager') {
      lines.push(data.recipient.title);
    }
    if (data.recipient.company) {
      lines.push(data.recipient.company);
    }
    if (data.recipient.address) {
      lines.push(data.recipient.address);
    }
    lines.push('');
  }
  
  // Subject
  if (data.jobTitle) {
    lines.push(`Re: Application for ${data.jobTitle} Position`);
    lines.push('');
  }
  
  // Greeting
  const greeting = data.recipient?.name && data.recipient.name.trim() !== '' && data.recipient.name !== 'Hiring Manager' 
    ? `Dear ${data.recipient.name},`
    : 'Dear Hiring Manager,';
  
  lines.push(greeting);
  lines.push('');
  
  // Body paragraphs
  if (data.paragraphs && data.paragraphs.length > 0) {
    data.paragraphs.forEach((paragraph, index) => {
      if (paragraph.trim()) {
        lines.push(paragraph);
        // Add space between paragraphs (except last one)
        if (index < data.paragraphs.length - 1) {
          lines.push('');
        }
      }
    });
  }
  
  lines.push('');
  
  // Closing
  lines.push(data.closing || 'Sincerely,');
  lines.push('');
  lines.push('');
  lines.push(data.fullName);
  
  return lines.join('\n').trim();
}

/**
 * Create a downloadable TXT file from text content
 */
export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}