"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Download, Edit, Trash2, User, Mail, Phone, Calendar, FileText, Briefcase, GraduationCap, Code, CheckCircle, Clock, AlertCircle, MapPin, Globe, Award, BookOpen, Wrench, Trophy, FileType, Users, Heart, Star, Zap } from "lucide-react";

type Resume = {
  id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  file_path: string;
  processing_status?: string;
  ai_provider?: string;
  ai_model?: string;
  created_at: string;
  parsed_data: any;
  extracted_text?: string;
};

export default function ResumeViewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttribution, setShowAttribution] = useState(false);

  const resumeId = params.id as string;

  // Load attribution setting
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          setShowAttribution(settings.showAiAttribution || false);
        }
      } catch (error) {
        console.error('Error loading attribution setting:', error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData && userData.user) {
          const { data, error } = await supabase
            .from("resumes")
            .select("*")
            .eq("id", resumeId)
            .eq("user_id", userData.user.id)
            .single();
            
          if (error) {
            throw error;
          }
          
          setResume(data);
        }
      } catch (error: any) {
        console.error("Error fetching resume:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load resume",
          variant: "destructive",
        });
        router.push("/dashboard/resume");
      } finally {
        setLoading(false);
      }
    };

    if (resumeId) {
      fetchResume();
    }
  }, [resumeId, toast, router]);

  const deleteResume = async () => {
    if (!resume) return;
    
    try {
      const { error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resume.id);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Resume deleted successfully",
      });
      
      router.push("/dashboard/resume");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete resume",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/resume">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Resumes
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center p-6">
            <h3 className="text-xl font-semibold mb-2">Resume Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The resume you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/dashboard/resume">
              <Button>Back to Resumes</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = () => {
    // If processing_status is null/undefined but parsed_data exists, assume completed
    const status = resume?.processing_status || (resume?.parsed_data ? 'completed' : 'pending');
    
    if (status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (status === 'processing') {
      return <Clock className="h-4 w-4 text-yellow-600" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-orange-600" />;
    }
  };

  const getStatusText = () => {
    // If processing_status is null/undefined but parsed_data exists, assume completed
    const status = resume?.processing_status || (resume?.parsed_data ? 'completed' : 'pending');
    
    if (status === 'completed') {
      return 'Processed';
    } else if (status === 'processing') {
      return 'Processing...';
    } else {
      return 'Pending';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/resume">
            <Button variant="ghost" className="hover:bg-white/50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Resumes
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white/50 hover:bg-white/70 border-red-200 text-red-700 hover:text-red-800" onClick={deleteResume}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Header Card with Enhanced Design */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="pb-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {resume.file_name}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(resume.created_at).toLocaleDateString()}
                  </div>
                  {resume.file_size && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {(resume.file_size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {getStatusIcon()}
                    <span className={resume?.processing_status === 'completed' || resume?.parsed_data ? 'text-green-600' : 'text-yellow-600'}>
                      {getStatusText()}
                    </span>
                  </div>
                  {showAttribution && resume.ai_provider && resume.ai_model && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Zap className="h-3 w-3" />
                      <span>Powered by: {resume.ai_provider}/{resume.ai_model}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {resume.parsed_data && (
          <>
            {/* Personal Information Card */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="h-5 w-5 text-blue-600" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-4">
                    {resume.parsed_data.name && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <User className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-blue-900">Name</div>
                          <div className="text-blue-700 break-words">{resume.parsed_data.name}</div>
                        </div>
                      </div>
                    )}
                    {resume.parsed_data.email && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <Mail className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-green-900">Email</div>
                          <div className="text-green-700 break-all">{resume.parsed_data.email}</div>
                        </div>
                      </div>
                    )}
                    {resume.parsed_data.phone && (
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                        <Phone className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-purple-900">Phone</div>
                          <div className="text-purple-700 break-words">{resume.parsed_data.phone}</div>
                        </div>
                      </div>
                    )}
                    {resume.parsed_data.address && (
                      <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                        <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-orange-900">Address</div>
                          <div className="text-orange-700 break-words">{resume.parsed_data.address}</div>
                        </div>
                      </div>
                    )}
                    {resume.parsed_data.linkedin && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-blue-900">LinkedIn</div>
                          <a 
                            href={resume.parsed_data.linkedin} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-700 hover:underline break-all text-sm leading-relaxed"
                            title={resume.parsed_data.linkedin}
                          >
                            {resume.parsed_data.linkedin}
                          </a>
                        </div>
                      </div>
                    )}
                    {resume.parsed_data.website && (
                      <div className="flex items-start gap-3 p-3 bg-teal-50 rounded-lg">
                        <Globe className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-teal-900">Website</div>
                          <a 
                            href={resume.parsed_data.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-teal-700 hover:underline break-all text-sm leading-relaxed"
                            title={resume.parsed_data.website}
                          >
                            {resume.parsed_data.website}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg">
                      <h3 className="font-semibold mb-3 text-slate-800">Professional Summary</h3>
                      {resume.parsed_data.summary ? (
                        <p className="text-slate-600 leading-relaxed">{resume.parsed_data.summary}</p>
                      ) : (
                        <p className="text-slate-500 italic">No summary available</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Experience Card */}
            {resume.parsed_data.experience && resume.parsed_data.experience.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Briefcase className="h-5 w-5 text-orange-600" />
                    Experience ({resume.parsed_data.experience.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {resume.parsed_data.experience.map((exp: any, index: number) => (
                      <div key={index} className="relative pl-6 pb-6 border-l-2 border-orange-200 last:border-l-0 last:pb-0">
                        <div className="absolute -left-2 top-0 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
                        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg">
                          <div className="font-semibold text-lg text-orange-900">{exp.title}</div>
                          <div className="text-orange-700 font-medium">{exp.company}</div>
                          <div className="text-sm text-orange-600 mb-2">{exp.duration}</div>
                          {exp.description && (
                            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                              {exp.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education Card */}
            {resume.parsed_data.education && resume.parsed_data.education.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                    Education ({resume.parsed_data.education.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {resume.parsed_data.education.map((edu: any, index: number) => (
                      <div key={index} className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                        <div className="font-semibold text-indigo-900">{edu.degree}</div>
                        {edu.school && <div className="text-indigo-700 font-medium">{edu.school}</div>}
                        {edu.year && <div className="text-sm text-indigo-600">{edu.year}</div>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills Card */}
            {resume.parsed_data.skills && resume.parsed_data.skills.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Code className="h-5 w-5 text-emerald-600" />
                    Skills ({resume.parsed_data.skills.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {resume.parsed_data.skills.map((skill: string, index: number) => {
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
                          className={`px-3 py-2 rounded-full text-sm font-medium border transition-all hover:scale-105 hover:shadow-sm ${colorClass}`}
                        >
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications Card */}
            {resume.parsed_data.certifications && resume.parsed_data.certifications.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Award className="h-5 w-5 text-yellow-600" />
                    Certifications ({resume.parsed_data.certifications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {resume.parsed_data.certifications.map((cert: any, index: number) => (
                      <div key={index} className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-100">
                        <div className="font-semibold text-yellow-900">{cert.name}</div>
                        {cert.issuer && <div className="text-yellow-700 font-medium">{cert.issuer}</div>}
                        <div className="text-sm text-yellow-600 space-y-1">
                          {cert.date && <div>Obtained: {cert.date}</div>}
                          {cert.expiry && <div>Expires: {cert.expiry}</div>}
                          {cert.credential_id && <div>ID: {cert.credential_id}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Training Card */}
            {resume.parsed_data.training && resume.parsed_data.training.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    Training & Courses ({resume.parsed_data.training.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resume.parsed_data.training.map((training: any, index: number) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                        <div className="font-semibold text-green-900">{training.name}</div>
                        {training.provider && <div className="text-green-700 font-medium">{training.provider}</div>}
                        <div className="text-sm text-green-600 space-y-1">
                          {training.date && <div>Completed: {training.date}</div>}
                          {training.duration && <div>Duration: {training.duration}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* References Card */}
            {resume.parsed_data.references && resume.parsed_data.references.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Users className="h-5 w-5 text-slate-600" />
                    References ({resume.parsed_data.references.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {resume.parsed_data.references.map((ref: any, index: number) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-100">
                        <div className="font-semibold text-slate-900">{ref.name}</div>
                        {ref.title && <div className="text-slate-700 font-medium">{ref.title}</div>}
                        {ref.company && <div className="text-slate-600">{ref.company}</div>}
                        <div className="text-sm text-slate-600 space-y-1 mt-2">
                          {ref.email && <div>Email: {ref.email}</div>}
                          {ref.phone && <div>Phone: {ref.phone}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Languages Card */}
            {resume.parsed_data.languages && resume.parsed_data.languages.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Globe className="h-5 w-5 text-teal-600" />
                    Languages ({resume.parsed_data.languages.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {resume.parsed_data.languages.map((lang: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
                        <span className="font-medium text-teal-900">{lang.language}</span>
                        <span className="text-sm text-teal-700 bg-teal-100 px-2 py-1 rounded">{lang.proficiency}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Projects Card */}
            {resume.parsed_data.projects && resume.parsed_data.projects.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Wrench className="h-5 w-5 text-purple-600" />
                    Projects ({resume.parsed_data.projects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {resume.parsed_data.projects.map((project: any, index: number) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                        <div className="font-semibold text-purple-900">{project.name}</div>
                        {project.description && <p className="text-purple-700 mt-2">{project.description}</p>}
                        <div className="text-sm text-purple-600 mt-2 space-y-1">
                          {project.date && <div>Date: {project.date}</div>}
                          {project.url && (
                            <div>
                              URL: <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline">{project.url}</a>
                            </div>
                          )}
                          {project.technologies && project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {project.technologies.map((tech: string, techIndex: number) => (
                                <span key={techIndex} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Awards Card */}
            {resume.parsed_data.awards && resume.parsed_data.awards.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    Awards & Honors ({resume.parsed_data.awards.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resume.parsed_data.awards.map((award: any, index: number) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-100">
                        <div className="font-semibold text-yellow-900">{award.name}</div>
                        {award.issuer && <div className="text-yellow-700 font-medium">{award.issuer}</div>}
                        {award.date && <div className="text-sm text-yellow-600">Date: {award.date}</div>}
                        {award.description && <p className="text-yellow-700 mt-2 text-sm">{award.description}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Sections Card */}
            {resume.parsed_data.additional_sections && resume.parsed_data.additional_sections.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Zap className="h-5 w-5 text-violet-600" />
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resume.parsed_data.additional_sections.map((section: any, index: number) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-100">
                        <div className="font-semibold text-violet-900 mb-2">{section.section_title}</div>
                        <div className="text-violet-700 text-sm whitespace-pre-line">{section.content}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}