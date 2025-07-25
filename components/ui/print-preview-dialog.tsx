"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, X, Loader2, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeData: any;
  resumeName: string;
  sectionOrder: string[];
  onSectionOrderChange: (newOrder: string[]) => void;
}

// Helper function to safely render address data in print
function safeRenderAddress(address: any): string {
  if (typeof address === 'string') {
    return address;
  }
  
  if (typeof address === 'object' && address !== null) {
    // If it's an object with zone keys, extract and join the values
    const values = Object.values(address).filter(Boolean);
    return values.join(', ');
  }
  
  return '';
}

// Sortable section item component for the order list
function SortableItem({ id, label }: { id: string; label: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 bg-gray-50 rounded-md ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      <div
        className="cursor-grab hover:bg-gray-200 rounded p-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function PrintPreviewDialog({ 
  open, 
  onOpenChange, 
  resumeData, 
  resumeName,
  sectionOrder,
  onSectionOrderChange
}: PrintPreviewDialogProps) {
  const [showColors, setShowColors] = useState(true);
  const [layout, setLayout] = useState<"compact" | "standard" | "detailed">("standard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSectionOrder, setShowSectionOrder] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sectionLabels: Record<string, string> = {
    "personal-info": "Personal Information",
    "experience": "Experience",
    "education": "Education",
    "skills": "Skills",
    "certifications": "Certifications",
    "training": "Training & Courses",
    "projects": "Projects",
    "languages": "Languages",
    "awards": "Awards & Honors",
    "references": "References",
    "additional-sections": "Additional Information"
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sectionOrder.indexOf(active.id as string);
      const newIndex = sectionOrder.indexOf(over?.id as string);
      onSectionOrderChange(arrayMove(sectionOrder, oldIndex, newIndex));
    }
  };

  // Calculate approximate lines per page based on layout
  const getLinesPerPage = () => {
    switch (layout) {
      case "compact": return 55;
      case "standard": return 45;
      case "detailed": return 35;
      default: return 45;
    }
  };

  // Generate section HTML based on type
  const generateSectionHTML = (sectionId: string, data: any) => {
    switch (sectionId) {
      case "personal-info":
        return `
          ${data.summary ? `
            <div class="section">
              <h2 class="section-title">Professional Summary</h2>
              <p>${data.summary}</p>
            </div>
          ` : ''}
        `;
      
      case "experience":
        return data.experience && data.experience.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Experience</h2>
            ${data.experience.map((exp: any) => `
              <div class="experience-item">
                <div class="job-header">
                  <div>
                    <span class="job-title">${exp.title}</span>
                    <span class="company"> at ${exp.company}</span>
                  </div>
                  <span class="duration">${exp.duration || exp.startDate + ' - ' + (exp.endDate || 'Present')}</span>
                </div>
                ${exp.location ? `<div class="location">${exp.location}</div>` : ''}
                ${exp.description ? `
                  <ul class="description">
                    ${Array.isArray(exp.description) 
                      ? exp.description.map((item: string) => `<li>${item}</li>`).join('')
                      : exp.description.includes('\n') 
                        ? exp.description.split('\n').filter((line: string) => line.trim()).map((line: string) => `<li>${line.trim()}</li>`).join('')
                        : exp.description.includes('•') || exp.description.includes('-') || exp.description.includes('*')
                          ? exp.description.split(/[•\-\*]/).filter((item: string) => item.trim()).map((item: string) => `<li>${item.trim()}</li>`).join('')
                          : `<li>${exp.description}</li>`
                    }
                  </ul>
                ` : ''}
                ${exp.technologies && exp.technologies.length > 0 ? `
                  <div class="skills-container" style="margin-top: 0.75rem;">
                    <strong style="font-size: 0.9em; color: #4b5563;">Technologies:</strong>
                    ${exp.technologies.map((tech: string) => `
                      <span class="skill-badge" style="font-size: 0.85em;">${tech}</span>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : '';
      
      case "education":
        return data.education && data.education.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Education</h2>
            ${data.education.map((edu: any) => `
              <div class="experience-item">
                <div class="job-header">
                  <div>
                    <span class="job-title">${edu.degree}</span>
                    <span class="company"> - ${edu.school || edu.institution}</span>
                  </div>
                  <span class="duration">${edu.year || edu.graduationDate || ''}</span>
                </div>
                ${edu.field ? `<div style="color: #64748b; font-size: 0.9em;">${edu.field}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : '';
      
      case "skills":
        return data.skills && data.skills.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Skills</h2>
            <div class="skills-container">
              ${data.skills.map((skill: string) => `
                <span class="skill-badge">${skill}</span>
              `).join('')}
            </div>
          </div>
        ` : '';
      
      case "certifications":
        return data.certifications && data.certifications.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Certifications</h2>
            ${data.certifications.map((cert: any) => `
              <div class="experience-item">
                <div class="job-header">
                  <div>
                    <span class="job-title">${cert.name}</span>
                    <span class="company"> - ${cert.issuer}</span>
                  </div>
                  <span class="duration">${cert.date || ''}</span>
                </div>
                ${cert.credentialId || cert.credential_id ? `<div style="color: #64748b; font-size: 0.9em;">ID: ${cert.credentialId || cert.credential_id}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : '';
      
      case "training":
        return (data.training || data.trainings) && (data.training || data.trainings).length > 0 ? `
          <div class="section">
            <h2 class="section-title">Training & Professional Development</h2>
            ${(data.training || data.trainings).map((training: any) => `
              <div class="experience-item">
                <div class="job-header">
                  <div>
                    <span class="job-title">${training.name}</span>
                    ${training.provider ? `<span class="company"> - ${training.provider}</span>` : ''}
                  </div>
                  <span class="duration">${training.date || ''}</span>
                </div>
                ${training.description ? `<p style="margin-top: 0.5rem; color: #64748b;">${training.description}</p>` : ''}
                ${training.duration ? `<div style="color: #64748b; font-size: 0.9em;">Duration: ${training.duration}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : '';
      
      case "projects":
        return data.projects && data.projects.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Projects</h2>
            ${data.projects.map((project: any) => `
              <div class="experience-item">
                <div class="job-header">
                  <div>
                    <span class="job-title">${project.name}</span>
                  </div>
                  ${project.date ? `<span class="duration">${project.date}</span>` : ''}
                </div>
                ${project.description ? `<p style="margin-top: 0.5rem;">${project.description}</p>` : ''}
                ${project.technologies && project.technologies.length > 0 ? `
                  <div class="skills-container" style="margin-top: 0.5rem;">
                    ${project.technologies.map((tech: string) => `
                      <span class="skill-badge" style="font-size: 0.85em;">${tech}</span>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : '';
      
      case "languages":
        return data.languages && data.languages.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Languages</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem;">
              ${data.languages.map((lang: any) => `
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f1f5f9; border-radius: 4px;">
                  <span>${lang.language}</span>
                  <span style="color: #64748b;">${lang.proficiency}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : '';
      
      case "awards":
        return data.awards && data.awards.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Awards & Honors</h2>
            ${data.awards.map((award: any) => `
              <div class="experience-item">
                <div class="job-header">
                  <div>
                    <span class="job-title">${award.name}</span>
                    ${award.issuer ? `<span class="company"> - ${award.issuer}</span>` : ''}
                  </div>
                  ${award.date ? `<span class="duration">${award.date}</span>` : ''}
                </div>
                ${award.description ? `<p style="margin-top: 0.5rem; color: #64748b;">${award.description}</p>` : ''}
              </div>
            `).join('')}
          </div>
        ` : '';
      
      case "references":
        return data.references && data.references.length > 0 ? `
          <div class="section">
            <h2 class="section-title">References</h2>
            ${data.references[0].name === "References available upon request" ? 
              '<p>References available upon request</p>' :
              data.references.map((ref: any) => `
                <div class="experience-item">
                  <div class="job-header">
                    <div>
                      <span class="job-title">${ref.name}</span>
                      ${ref.title ? `<span class="company"> - ${ref.title}</span>` : ''}
                    </div>
                  </div>
                  ${ref.company ? `<div style="color: #64748b;">${ref.company}</div>` : ''}
                  ${ref.email || ref.phone ? `
                    <div style="color: #64748b; font-size: 0.9em; margin-top: 0.25rem;">
                      ${ref.email ? `Email: ${ref.email}` : ''}
                      ${ref.email && ref.phone ? ' | ' : ''}
                      ${ref.phone ? `Phone: ${ref.phone}` : ''}
                    </div>
                  ` : ''}
                </div>
              `).join('')
            }
          </div>
        ` : '';
      
      case "additional-sections":
        return data.additional_sections && data.additional_sections.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Additional Information</h2>
            ${data.additional_sections.map((section: any) => `
              <div style="margin-bottom: 1rem;">
                <h3 style="font-weight: 600; margin-bottom: 0.5rem;">${section.section_title}</h3>
                <p style="color: #64748b;">${section.content}</p>
              </div>
            `).join('')}
          </div>
        ` : '';
      
      default:
        return '';
    }
  };

  // Generate print preview HTML with pagination
  const generatePreviewHTML = () => {
    const colorClass = showColors ? "" : "no-colors";
    const layoutClass = `layout-${layout}`;
    
    // Generate sections in the current order
    const sectionsHTML = sectionOrder
      .map(sectionId => generateSectionHTML(sectionId, resumeData))
      .filter(html => html !== '')
      .join('');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Resume Preview</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.5;
              color: #1f2937;
              background: #f3f4f6;
              padding: 20px;
              margin: 0;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            
            /* Professional summary specific styling */
            .section p {
              line-height: 1.4;
              font-size: 12px;
            }
            
            .resume-container {
              max-width: 8.5in;
              margin: 0 auto;
              background: white;
            }
            
            /* Header Section */
            .header {
              margin-bottom: 0.5rem;
              text-align: center;
              padding-bottom: 0.5rem;
              border-bottom: 1px solid #e2e8f0;
            }
            
            .name {
              font-size: 24px;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 0.25rem;
              letter-spacing: -0.25px;
            }
            
            .contact-info {
              display: flex;
              justify-content: center;
              gap: 1rem;
              flex-wrap: wrap;
              color: #475569;
              font-size: 11px;
              font-weight: 500;
            }
            
            /* Sections */
            .section {
              margin-bottom: 0.5rem;
              padding: 0;
              background: transparent;
              border: none;
              border-radius: 0;
              box-shadow: none;
            }
            
            /* Last section needs no margin */
            .section:last-child {
              margin-bottom: 0;
            }
            
            /* Professional summary section should have minimal margin */
            .section:first-of-type {
              margin-bottom: 0.375rem;
            }
            
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 0.5rem;
              text-transform: uppercase;
              letter-spacing: 0.25px;
            }
            
            /* Experience */
            .experience-item {
              margin-bottom: 0.75rem;
              padding-bottom: 0.5rem;
              border-bottom: 1px solid #f1f5f9;
            }
            
            .experience-item:last-child {
              margin-bottom: 0;
              padding-bottom: 0;
              border-bottom: none;
            }
            
            .job-header {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              margin-bottom: 0.375rem;
              flex-wrap: wrap;
              gap: 0.5rem;
            }
            
            .job-title {
              font-weight: 700;
              color: #1e293b;
              font-size: 13px;
            }
            
            .company {
              color: #475569;
              font-weight: 400;
              font-size: 13px;
            }
            
            .duration {
              color: #6b7280;
              font-size: 11px;
              font-style: italic;
              white-space: nowrap;
              margin-left: auto;
            }
            
            .location {
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 0.25rem;
              font-style: italic;
            }
            
            .description {
              margin-top: 0.5rem;
              padding-left: 0;
              color: #374151;
              line-height: 1.6;
              list-style: none;
            }
            
            .description li {
              margin-bottom: 0.375rem;
              margin-left: 1.5rem;
              position: relative;
              text-align: left;
              font-size: 11px;
            }
            
            .description li:last-child {
              margin-bottom: 0;
            }
            
            .description li::before {
              content: "▸";
              position: absolute;
              left: -1.25rem;
              color: #3b82f6;
              font-weight: bold;
              font-size: 14px;
              line-height: 1.2;
            }
            
            /* Skills */
            .skills-container {
              display: flex;
              flex-wrap: wrap;
              gap: 0.5rem;
              align-items: center;
              margin-top: 0.25rem;
            }
            
            .skill-badge {
              padding: 0.375rem 0.875rem;
              background: #eff6ff;
              color: #1e40af;
              border-radius: 20px;
              font-size: 13px;
              border: 1px solid #bfdbfe;
              font-weight: 500;
              transition: all 0.2s;
            }
            
            .skill-badge:hover {
              background: #dbeafe;
              transform: translateY(-1px);
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            /* Technology badges in experience */
            .experience-item .skills-container {
              margin-top: 0.5rem;
              padding-top: 0.5rem;
              border-top: 1px solid #f1f5f9;
              gap: 0.375rem;
            }
            
            .experience-item .skills-container strong {
              font-size: 10px;
              color: #6b7280;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.025em;
            }
            
            .experience-item .skill-badge {
              font-size: 10px;
              padding: 0.125rem 0.5rem;
              background: #f3f4f6;
              color: #374151;
              border: 1px solid #e5e7eb;
              font-weight: 500;
              border-radius: 12px;
            }
            
            /* No colors mode */
            .no-colors .section {
              background: transparent;
              border: none;
            }
            
            .no-colors .header {
              border-bottom-color: #d1d5db;
            }
            
            .no-colors .name,
            .no-colors .section-title,
            .no-colors .job-title {
              color: black;
            }
            
            .no-colors .skill-badge {
              background: white;
              border: 1px solid #333;
              color: black;
            }
            
            .no-colors .experience-item .skill-badge {
              background: #f5f5f5;
              border-color: #666;
            }
            
            .no-colors .description li::before {
              color: black;
              content: "•";
              font-size: 12px;
            }
            
            .no-colors .skills-container strong {
              color: black !important;
            }
            
            /* Layout variations */
            /* Compact - Fit more content on fewer pages */
            .layout-compact {
              font-size: 9px;
              line-height: 1.3;
            }
            
            .layout-compact .header {
              margin-bottom: 0.75rem;
            }
            
            .layout-compact .name {
              font-size: 18px;
              margin-bottom: 0.2rem;
            }
            
            .layout-compact .contact-info {
              font-size: 9px;
              gap: 0.4rem;
            }
            
            .layout-compact .section {
              margin-bottom: 0.75rem;
              padding: 0;
            }
            
            .layout-compact .section-title {
              font-size: 12px;
              margin-bottom: 0.3rem;
              padding-bottom: 0.1rem;
            }
            
            .layout-compact .experience-item {
              margin-bottom: 0.4rem;
            }
            
            .layout-compact .skill-badge {
              padding: 0.1rem 0.4rem;
              font-size: 8px;
            }
            
            .layout-compact .description {
              margin-top: 0.3rem;
            }
            
            .layout-compact .description li {
              margin-bottom: 0.1rem;
            }
            
            /* Standard - Balanced spacing and readability */
            .layout-standard {
              font-size: 11px;
              line-height: 1.5;
            }
            
            .layout-standard .name {
              font-size: 24px;
            }
            
            .layout-standard .contact-info {
              font-size: 11px;
            }
            
            .layout-standard .section-title {
              font-size: 14px;
            }
            
            .layout-standard .job-title {
              font-size: 13px;
            }
            
            /* Detailed - More whitespace and larger text */
            .layout-detailed {
              font-size: 13px;
              line-height: 1.8;
            }
            
            .layout-detailed .name {
              font-size: 32px;
              margin-bottom: 1rem;
            }
            
            .layout-detailed .contact-info {
              font-size: 15px;
              gap: 1.5rem;
            }
            
            .layout-detailed .section {
              margin-bottom: 2rem;
              padding: 0;
            }
            
            .layout-detailed .section-title {
              font-size: 20px;
              margin-bottom: 1rem;
            }
            
            .layout-detailed .experience-item {
              margin-bottom: 1.5rem;
            }
            
            .layout-detailed .skill-badge {
              padding: 0.375rem 1rem;
              font-size: 14px;
            }
            
            /* Page simulation for preview */
            .page {
              width: 8.5in;
              padding: 0.5in 0.6in;
              margin: 0 auto;
              background: white;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              position: relative;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            @media print {
              body {
                padding: 0;
                margin: 0;
                background: white;
              }
              
              .page {
                box-shadow: none;
                margin: 0;
                padding: 0;
              }
              
              .section {
                box-shadow: none;
              }
              
              .skill-badge:hover {
                transform: none;
                box-shadow: none;
              }
              
              @page {
                size: letter;
                margin: 0.5in 0.6in;
              }
            }
          </style>
        </head>
        <body class="${colorClass} ${layoutClass}">
          <div class="page">
            <div class="resume-container">
              <div class="header">
              <h1 class="name">${resumeData.name || 'Your Name'}</h1>
              <div class="contact-info">
                ${[
                  resumeData.email,
                  resumeData.phone,
                  safeRenderAddress(resumeData.address),
                  resumeData.workAuthorization ? `Work Authorization: ${resumeData.workAuthorization}` : null,
                  resumeData.linkedin ? `LinkedIn: ${resumeData.linkedin}` : null,
                  resumeData.website
                ].filter(Boolean).map((item, index) => 
                  `<span>${index > 0 ? '• ' : ''}${item}</span>`
                ).join('\n                ')}
              </div>
            </div>
            
            ${sectionsHTML}
            </div>
          </div>
          
          <script>
            // Simple script to update iframe height without pagination
            window.addEventListener('load', function() {
              setTimeout(function() {
                const totalHeight = document.body.scrollHeight;
                window.parent.postMessage({ type: 'resize', height: totalHeight }, '*');
              }, 100);
            });
          </script>
        </body>
      </html>
    `;
  };

  // Update preview when options change
  useEffect(() => {
    if (open && iframeRef.current) {
      setIsGenerating(true);
      const previewHTML = generatePreviewHTML();
      const iframeDoc = iframeRef.current.contentDocument;
      
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(previewHTML);
        iframeDoc.close();
      }
      
      setTimeout(() => setIsGenerating(false), 500);
    }
  }, [open, showColors, layout, resumeData, sectionOrder]);

  // Handle iframe resize messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'resize' && iframeRef.current) {
        iframeRef.current.style.height = event.data.height + 'px';
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Store original title
      const originalTitle = document.title;
      document.title = ' ';
      
      // Print the iframe content
      iframeRef.current.contentWindow.print();
      
      // Restore title
      setTimeout(() => {
        document.title = originalTitle;
      }, 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Print Preview - {resumeName}</DialogTitle>
          <DialogDescription>
            Configure your print settings and preview how your resume will look when printed.
          </DialogDescription>
          <div className="mt-2 text-sm text-muted-foreground space-y-1">
            <p><strong>Compact:</strong> Maximum content density - ideal for experienced professionals with extensive history (9pt font)</p>
            <p><strong>Standard:</strong> Professional balance - recommended for most applications (11pt font)</p>
            <p><strong>Detailed:</strong> Enhanced readability - best for senior positions or when detail matters (13pt font)</p>
          </div>
        </DialogHeader>
        
        <div className="flex gap-6 p-4 border-b">
          <div className="flex items-center space-x-2">
            <Switch
              id="colors"
              checked={showColors}
              onCheckedChange={setShowColors}
            />
            <Label htmlFor="colors">Show colors</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="layout">Layout:</Label>
            <Select value={layout} onValueChange={(value: any) => setLayout(value)}>
              <SelectTrigger id="layout" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSectionOrder(!showSectionOrder)}
            >
              <GripVertical className="h-4 w-4 mr-2" />
              Reorder Sections
            </Button>
          </div>
        </div>
        
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Section Order Panel */}
          {showSectionOrder && (
            <div className="w-64 border-r p-4 overflow-y-auto bg-gray-50">
              <h3 className="font-semibold mb-4">Section Order</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag sections to reorder them in your resume
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sectionOrder}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {sectionOrder.map((sectionId) => {
                      // Only show sections that have data
                      const hasData = sectionId === "personal-info" || 
                        (resumeData[sectionId.replace("-", "_")] && resumeData[sectionId.replace("-", "_")].length > 0) ||
                        (resumeData[sectionId] && resumeData[sectionId].length > 0);
                      
                      if (!hasData) return null;
                      
                      return (
                        <SortableItem
                          key={sectionId}
                          id={sectionId}
                          label={sectionLabels[sectionId]}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
          
          {/* Preview Area */}
          <div className="flex-1 relative bg-gray-200 overflow-hidden">
            {isGenerating && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            )}
            <div className="w-full h-full overflow-auto p-4">
              <iframe
                ref={iframeRef}
                className="w-full min-h-full bg-transparent"
                style={{ minHeight: '1200px' }}
                title="Resume Preview"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}