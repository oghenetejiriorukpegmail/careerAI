"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, MapPin, Globe, Users, Briefcase, GraduationCap, Code, Award, BookOpen, Wrench, Trophy, Star, FileText, Zap, Edit2, Sparkles, Edit3 } from "lucide-react";

interface SectionProps {
  data: any;
  onRewrite?: (title: string, content: string, path: string[]) => void;
  onManualEdit?: (title: string, content: any, path: string[], contentType: string, fieldDefinitions?: any[]) => void;
}

export function PersonalInfoSection({ data, onRewrite, onManualEdit }: SectionProps) {
  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-blue-600" />
            Personal Information
          </CardTitle>
          {(onRewrite || onManualEdit) && data.summary && (
            <div className="flex gap-1 print:hidden">
              {onManualEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onManualEdit("Professional Summary", data.summary, ["summary"], "string")}
                  title="Manual Edit"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
              {onRewrite && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRewrite("Professional Summary", data.summary, ["summary"])}
                  title="AI Rewrite"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-3">
            {data.name && (
              <div className="flex items-start gap-3 p-2.5 bg-blue-50 rounded-lg">
                <User className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-blue-900">Name</div>
                  <div className="text-sm text-blue-700 break-words">{data.name}</div>
                </div>
              </div>
            )}
            {data.email && (
              <div className="flex items-start gap-3 p-2.5 bg-green-50 rounded-lg">
                <Mail className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-green-900">Email</div>
                  <div className="text-sm text-green-700 break-all">{data.email}</div>
                </div>
              </div>
            )}
            {data.phone && (
              <div className="flex items-start gap-3 p-2.5 bg-purple-50 rounded-lg">
                <Phone className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-purple-900">Phone</div>
                  <div className="text-sm text-purple-700 break-words">{data.phone}</div>
                </div>
              </div>
            )}
            {data.address && (
              <div className="flex items-start gap-3 p-2.5 bg-orange-50 rounded-lg">
                <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-orange-900">Address</div>
                  <div className="text-sm text-orange-700 break-words">{data.address}</div>
                </div>
              </div>
            )}
            {data.linkedin && (
              <div className="flex items-start gap-3 p-2.5 bg-blue-50 rounded-lg">
                <Users className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-blue-900">LinkedIn</div>
                  <a 
                    href={data.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-blue-700 hover:underline break-all"
                  >
                    {data.linkedin}
                  </a>
                </div>
              </div>
            )}
            {data.website && (
              <div className="flex items-start gap-3 p-2.5 bg-teal-50 rounded-lg">
                <Globe className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-teal-900">Website</div>
                  <a 
                    href={data.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-teal-700 hover:underline break-all"
                  >
                    {data.website}
                  </a>
                </div>
              </div>
            )}
          </div>
          {data.summary && (
            <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg">
              <h3 className="font-semibold text-sm mb-1 text-slate-800">Professional Summary</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{data.summary}</p>
            </div>
          )}
        </div>
      </CardContent>
    </>
  );
}

export function ExperienceSection({ data, onRewrite, onManualEdit }: SectionProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5 text-orange-600" />
          Experience ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((exp: any, index: number) => (
            <div key={index} className="relative pl-5 pb-4 border-l-2 border-orange-200 last:border-l-0 last:pb-0">
              <div className="absolute -left-[9px] top-0 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-3 rounded-lg">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <div className="font-semibold text-base text-orange-900">{exp.title}</div>
                    <div className="text-sm text-orange-700 font-medium">{exp.company}</div>
                    <div className="text-xs text-orange-600 mb-2">{exp.duration}</div>
                  </div>
                  {(onRewrite || onManualEdit) && exp.description && (
                    <div className="flex gap-1 print:hidden -mt-1 -mr-1">
                      {onManualEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const fieldDefs = [
                              { key: 'title', label: 'Job Title', type: 'text' },
                              { key: 'company', label: 'Company', type: 'text' },
                              { key: 'duration', label: 'Duration', type: 'text' },
                              { key: 'description', label: 'Description', type: 'array' }
                            ];
                            onManualEdit(
                              `Edit Experience: ${exp.title}`,
                              exp,
                              ["experience", index.toString()],
                              "object",
                              fieldDefs
                            );
                          }}
                          title="Manual Edit"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      )}
                      {onRewrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const content = Array.isArray(exp.description) 
                              ? exp.description.join('\n') 
                              : exp.description;
                            onRewrite(
                              `Experience: ${exp.title} at ${exp.company}`,
                              content,
                              ["experience", index.toString(), "description"]
                            );
                          }}
                          title="AI Rewrite"
                        >
                          <Sparkles className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {exp.description && (
                  <div className="text-sm text-slate-600 leading-relaxed">
                    {Array.isArray(exp.description) ? (
                      <ul className="list-disc list-inside space-y-1">
                        {exp.description.map((item: string, itemIndex: number) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="whitespace-pre-line">{exp.description}</div>
                    )}
                  </div>
                )}
                {exp.technologies && exp.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {exp.technologies.map((tech: string, techIndex: number) => {
                      const colors = [
                        'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300',
                        'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300',
                        'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-purple-300',
                        'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700 border-pink-300',
                        'bg-gradient-to-r from-teal-100 to-teal-200 text-teal-700 border-teal-300',
                      ];
                      const colorClass = colors[techIndex % colors.length];
                      return (
                        <span key={techIndex} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass} shadow-sm hover:shadow-md transition-all hover:scale-105`}>
                          {tech}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}

export function EducationSection({ data, onRewrite, onManualEdit }: SectionProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Education ({data.length})
          </CardTitle>
          {onManualEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const fieldDefs = [
                  { key: 'degree', label: 'Degree', type: 'text' },
                  { key: 'school', label: 'School', type: 'text' },
                  { key: 'location', label: 'Location', type: 'text' },
                  { key: 'year', label: 'Year', type: 'text' },
                  { key: 'gpa', label: 'GPA', type: 'text' }
                ];
                onManualEdit(
                  'Education',
                  data,
                  ['education'],
                  'array-of-objects',
                  fieldDefs
                );
              }}
              className="print:hidden"
              title="Edit Education"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((edu: any, index: number) => (
            <div key={index} className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
              <div className="font-semibold text-sm text-indigo-900">{edu.degree}</div>
              {edu.school && <div className="text-sm text-indigo-700">{edu.school}</div>}
              {edu.year && <div className="text-xs text-indigo-600">{edu.year}</div>}
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}

export function SkillsSection({ data, onRewrite, onManualEdit }: SectionProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-emerald-600" />
            Skills ({data.length})
          </div>
          {(onRewrite || onManualEdit) && (
            <div className="flex gap-1 print:hidden">
              {onManualEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onManualEdit('Skills', data, ['skills'], 'array')}
                  title="Manual Edit"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
              {onRewrite && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRewrite('Skills', data.join(', '), ['skills'])}
                  title="AI Rewrite"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {data.map((skill: string, index: number) => {
            const colors = [
              'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-200',
              'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-200',
              'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-200',
              'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-200',
              'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800 border-pink-200',
              'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border-indigo-200',
              'bg-gradient-to-r from-teal-100 to-teal-200 text-teal-800 border-teal-200',
              'bg-gradient-to-r from-cyan-100 to-cyan-200 text-cyan-800 border-cyan-200',
              'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-800 border-rose-200',
              'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border-amber-200'
            ];
            const colorClass = colors[index % colors.length];
            return (
              <span 
                key={index} 
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all hover:scale-105 hover:shadow-sm ${colorClass}`}
              >
                {skill}
              </span>
            );
          })}
        </div>
      </CardContent>
    </>
  );
}

export function CertificationsSection({ data, onRewrite, onManualEdit }: SectionProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-yellow-600" />
            Certifications ({data.length})
          </CardTitle>
          {onManualEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const fieldDefs = [
                  { key: 'name', label: 'Certification Name', type: 'text' },
                  { key: 'issuer', label: 'Issuer', type: 'text' },
                  { key: 'date', label: 'Date Obtained', type: 'date' },
                  { key: 'expiry', label: 'Expiry Date', type: 'date' },
                  { key: 'credential_id', label: 'Credential ID', type: 'text' }
                ];
                onManualEdit(
                  'Certifications',
                  data,
                  ['certifications'],
                  'array-of-objects',
                  fieldDefs
                );
              }}
              className="print:hidden"
              title="Edit Certifications"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((cert: any, index: number) => (
            <div key={index} className="p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-100">
              <div className="font-semibold text-sm text-yellow-900">{cert.name}</div>
              {cert.issuer && <div className="text-sm text-yellow-700">{cert.issuer}</div>}
              <div className="text-xs text-yellow-600 space-y-0.5 mt-1">
                {cert.date && <div>Obtained: {cert.date}</div>}
                {cert.expiry && <div>Expires: {cert.expiry}</div>}
                {cert.credential_id && <div>ID: {cert.credential_id}</div>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}

export function TrainingSection({ data, onRewrite, onManualEdit }: SectionProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-green-600" />
          Training & Courses ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((training: any, index: number) => (
            <div key={index} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <div className="font-semibold text-sm text-green-900">{training.name}</div>
              {training.provider && <div className="text-sm text-green-700">{training.provider}</div>}
              <div className="text-xs text-green-600 space-y-0.5 mt-1">
                {training.date && <div>Completed: {training.date}</div>}
                {training.duration && <div>Duration: {training.duration}</div>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}

export function ProjectsSection({ data, onRewrite, onManualEdit }: SectionProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="h-5 w-5 text-purple-600" />
          Projects ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((project: any, index: number) => (
            <div key={index} className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-sm text-purple-900">{project.name}</div>
                  {project.description && <p className="text-sm text-purple-700 mt-1">{project.description}</p>}
                </div>
                {(onRewrite || onManualEdit) && (
                  <div className="flex gap-1 print:hidden ml-2">
                    {onManualEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const fieldDefs = [
                            { key: 'name', label: 'Project Name', type: 'text' },
                            { key: 'description', label: 'Description', type: 'textarea' },
                            { key: 'date', label: 'Date', type: 'text' },
                            { key: 'url', label: 'URL', type: 'text' },
                            { key: 'technologies', label: 'Technologies', type: 'array' }
                          ];
                          onManualEdit(
                            `Edit Project: ${project.name}`,
                            project,
                            ['projects', index.toString()],
                            'object',
                            fieldDefs
                          );
                        }}
                        title="Manual Edit"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
                    {onRewrite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRewrite('Project Description', project.description || '', ['projects', index.toString(), 'description'])}
                        title="AI Rewrite"
                      >
                        <Sparkles className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="text-xs text-purple-600 mt-1 space-y-0.5">
                {project.date && <div>Date: {project.date}</div>}
                {project.url && (
                  <div>
                    URL: <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline">{project.url}</a>
                  </div>
                )}
              </div>
              {project.technologies && project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {project.technologies.map((tech: string, techIndex: number) => {
                    const colors = [
                      'bg-gradient-to-r from-violet-100 to-purple-200 text-purple-700 border-purple-300',
                      'bg-gradient-to-r from-pink-100 to-rose-200 text-rose-700 border-rose-300',
                      'bg-gradient-to-r from-indigo-100 to-blue-200 text-blue-700 border-blue-300',
                      'bg-gradient-to-r from-cyan-100 to-teal-200 text-teal-700 border-teal-300',
                      'bg-gradient-to-r from-fuchsia-100 to-pink-200 text-pink-700 border-pink-300',
                    ];
                    const colorClass = colors[techIndex % colors.length];
                    return (
                      <span key={techIndex} className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass} shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-default`}>
                        {tech}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}

export function LanguagesSection({ data, onRewrite, onManualEdit }: SectionProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5 text-teal-600" />
          Languages ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          {data.map((lang: any, index: number) => (
            <div key={index} className="flex justify-between items-center p-2.5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
              <span className="text-sm font-medium text-teal-900">{lang.language}</span>
              <span className="text-xs text-teal-700 bg-teal-100 px-2 py-0.5 rounded">{lang.proficiency}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}

export function AwardsSection({ data, onRewrite, onManualEdit }: SectionProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Awards & Honors ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((award: any, index: number) => (
            <div key={index} className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-100">
              <div className="font-semibold text-sm text-yellow-900">{award.name}</div>
              {award.issuer && <div className="text-sm text-yellow-700">{award.issuer}</div>}
              {award.date && <div className="text-xs text-yellow-600 mt-0.5">Date: {award.date}</div>}
              {award.description && <p className="text-xs text-yellow-700 mt-1">{award.description}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}

export function ReferencesSection({ data, onRewrite, onManualEdit }: SectionProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-slate-600" />
          References ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((ref: any, index: number) => (
            <div key={index} className="p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-100">
              <div className="font-semibold text-sm text-slate-900">{ref.name}</div>
              {ref.title && <div className="text-sm text-slate-700">{ref.title}</div>}
              {ref.company && <div className="text-xs text-slate-600">{ref.company}</div>}
              <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                {ref.email && <div>Email: {ref.email}</div>}
                {ref.phone && <div>Phone: {ref.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}

export function AdditionalSectionsSection({ data, onRewrite, onManualEdit }: SectionProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-violet-600" />
          Additional Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((section: any, index: number) => (
            <div key={index} className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-100">
              <div className="font-semibold text-sm text-violet-900 mb-1">{section.section_title}</div>
              <div className="text-sm text-violet-700 whitespace-pre-line">{section.content}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}