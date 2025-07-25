"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import "./print.css";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Download, Edit, Trash2, Calendar, FileText, CheckCircle, Clock, AlertCircle, Zap, ArrowUp, Printer } from "lucide-react";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { RewriteDialog } from "@/components/ui/rewrite-dialog";
import { ManualEditDialog } from "@/components/ui/manual-edit-dialog";
import ErrorBoundary from "@/components/error-boundary";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableSection } from "@/components/ui/sortable-section";
import {
  PersonalInfoSection,
  ExperienceSection,
  EducationSection,
  SkillsSection,
  CertificationsSection,
  TrainingSection,
  ProjectsSection,
  LanguagesSection,
  AwardsSection,
  ReferencesSection,
  AdditionalSectionsSection
} from "./resume-sections";

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
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showRewriteDialog, setShowRewriteDialog] = useState(false);
  const [rewriteSection, setRewriteSection] = useState<{
    title: string;
    content: string;
    path: string[];
  } | null>(null);
  const [showManualEditDialog, setShowManualEditDialog] = useState(false);
  const [manualEditSection, setManualEditSection] = useState<{
    title: string;
    content: any;
    path: string[];
    contentType: string;
    fieldDefinitions?: any[];
  } | null>(null);
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    "personal-info",
    "experience",
    "education",
    "skills",
    "certifications",
    "training",
    "projects",
    "languages",
    "awards",
    "references",
    "additional-sections"
  ]);

  const resumeId = params.id as string;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check if print mode is requested
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('print') === 'true' && resume && resume.parsed_data) {
      // Open print preview instead of direct print
      setShowPrintPreview(true);
      // Remove print parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [resume]);

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

  // Scroll detection for back to top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setShowBackToTop(scrollPosition > 400); // Show after scrolling 400px
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handlePrint = () => {
    // Store original title
    const originalTitle = document.title;
    
    // Set empty title to remove filename from print
    document.title = ' ';
    
    // Print
    window.print();
    
    // Restore original title after a short delay
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const handleRewriteClick = (sectionTitle: string, content: string, path: string[]) => {
    setRewriteSection({ title: sectionTitle, content, path });
    setShowRewriteDialog(true);
  };

  const handleManualEditClick = (sectionTitle: string, content: any, path: string[], contentType: string, fieldDefinitions?: any[]) => {
    setManualEditSection({ title: sectionTitle, content, path, contentType, fieldDefinitions });
    setShowManualEditDialog(true);
  };

  const handleRewriteAccept = async (newContent: string) => {
    if (!resume || !rewriteSection) return;

    try {
      // Deep clone the parsed_data to avoid mutations
      const updatedParsedData = JSON.parse(JSON.stringify(resume.parsed_data));
      
      // Navigate to the correct section and update it
      let current = updatedParsedData;
      for (let i = 0; i < rewriteSection.path.length - 1; i++) {
        current = current[rewriteSection.path[i]];
      }
      
      // Handle array descriptions (like experience bullet points and skills)
      const lastKey = rewriteSection.path[rewriteSection.path.length - 1];
      if (Array.isArray(current[lastKey])) {
        // Special handling for skills - split by comma
        if (lastKey === 'skills') {
          current[lastKey] = newContent.split(',').map(skill => skill.trim()).filter(skill => skill);
        } else {
          // For other arrays (like experience bullet points), split by newline
          current[lastKey] = newContent.split('\n').filter(line => line.trim());
        }
      } else {
        current[lastKey] = newContent;
      }

      // Update the resume in the database
      const { error } = await supabase
        .from("resumes")
        .update({ parsed_data: updatedParsedData })
        .eq("id", resume.id);

      if (error) {
        throw error;
      }

      // Update local state
      setResume({ ...resume, parsed_data: updatedParsedData });
      
      toast({
        title: "Success",
        description: "Section updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating section:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update section",
        variant: "destructive",
      });
    }
  };

  const handleManualEditSave = async (newContent: any) => {
    if (!resume || !manualEditSection) return;

    try {
      // Deep clone the parsed_data to avoid mutations
      const updatedParsedData = JSON.parse(JSON.stringify(resume.parsed_data));
      
      // Navigate to the correct section and update it
      let current = updatedParsedData;
      const path = manualEditSection.path;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      
      // Update the final value
      const lastKey = path[path.length - 1];
      current[lastKey] = newContent;

      // Update the resume in the database
      const { error } = await supabase
        .from("resumes")
        .update({ parsed_data: updatedParsedData })
        .eq("id", resume.id);

      if (error) {
        throw error;
      }

      // Update local state
      setResume({ ...resume, parsed_data: updatedParsedData });
      
      toast({
        title: "Success",
        description: "Your changes have been saved",
      });
    } catch (error: any) {
      console.error("Error updating section:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    }
  };

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-[500px]">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
              </div>
              <p className="text-sm text-slate-600 font-medium">Loading resume...</p>
            </div>
          </div>
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
      return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
    } else if (status === 'processing') {
      return <Clock className="h-3.5 w-3.5 text-yellow-600 animate-spin" />;
    } else {
      return <AlertCircle className="h-3.5 w-3.5 text-orange-600" />;
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
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 print:bg-white">
      <div className="container mx-auto px-4 py-6 space-y-6 print:px-0 print:py-0">
        {/* Modern Navigation Header */}
        <div className="flex items-center justify-between print:hidden">
          <Link href="/dashboard/resume">
            <Button 
              variant="ghost" 
              className="-ml-2 hover:bg-white/60 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Resumes
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white/60 hover:bg-white/80 border-slate-200 shadow-sm transition-all hover:shadow-md" 
              onClick={() => setShowPrintPreview(true)}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white/60 hover:bg-red-50 border-slate-200 text-slate-700 hover:text-red-600 hover:border-red-200 shadow-sm transition-all hover:shadow-md" 
              onClick={deleteResume}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Modern Resume Header Card */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow print:shadow-none print:border print:border-gray-300 print:hidden">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-4">
                  {/* Icon Container */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-semibold text-slate-900 truncate">
                      {resume.file_name}
                    </h1>
                    
                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(resume.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}</span>
                      </div>
                      
                      {resume.file_size && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{(resume.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon()}
                        <span className={`text-sm font-medium ${
                          resume?.processing_status === 'completed' || resume?.parsed_data 
                            ? 'text-green-600' 
                            : 'text-yellow-600'
                        }`}>
                          {getStatusText()}
                        </span>
                      </div>
                      
                      {showAttribution && resume.ai_provider && resume.ai_model && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Zap className="h-3 w-3" />
                          <span className="font-medium">AI: {resume.ai_provider}/{resume.ai_model}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {resume.parsed_data && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sectionOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {sectionOrder.map((sectionId) => {
                  switch (sectionId) {
                    case "personal-info":
                      return (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <PersonalInfoSection data={resume.parsed_data} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      );
                    case "experience":
                      return resume.parsed_data.experience && resume.parsed_data.experience.length > 0 ? (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <ExperienceSection data={resume.parsed_data.experience} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      ) : null;
                    case "education":
                      return resume.parsed_data.education && resume.parsed_data.education.length > 0 ? (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <EducationSection data={resume.parsed_data.education} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      ) : null;
                    case "skills":
                      return resume.parsed_data.skills && resume.parsed_data.skills.length > 0 ? (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <SkillsSection data={resume.parsed_data.skills} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      ) : null;
                    case "certifications":
                      return resume.parsed_data.certifications && resume.parsed_data.certifications.length > 0 ? (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <CertificationsSection data={resume.parsed_data.certifications} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      ) : null;
                    case "training":
                      return resume.parsed_data.training && resume.parsed_data.training.length > 0 ? (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <TrainingSection data={resume.parsed_data.training} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      ) : null;
                    case "projects":
                      return resume.parsed_data.projects && resume.parsed_data.projects.length > 0 ? (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <ProjectsSection data={resume.parsed_data.projects} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      ) : null;
                    case "languages":
                      return resume.parsed_data.languages && resume.parsed_data.languages.length > 0 ? (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <LanguagesSection data={resume.parsed_data.languages} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      ) : null;
                    case "awards":
                      return resume.parsed_data.awards && resume.parsed_data.awards.length > 0 ? (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <AwardsSection data={resume.parsed_data.awards} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      ) : null;
                    case "references":
                      return resume.parsed_data.references && resume.parsed_data.references.length > 0 ? (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <ReferencesSection data={resume.parsed_data.references} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      ) : null;
                    case "additional-sections":
                      return resume.parsed_data.additional_sections && resume.parsed_data.additional_sections.length > 0 ? (
                        <SortableSection key={sectionId} id={sectionId}>
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                            <AdditionalSectionsSection data={resume.parsed_data.additional_sections} onRewrite={handleRewriteClick} onManualEdit={handleManualEditClick} />
                          </Card>
                        </SortableSection>
                      ) : null;
                    default:
                      return null;
                  }
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 rounded-full w-12 h-12 p-0 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 print:hidden"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
      
      {/* Print Preview Dialog */}
      {resume && resume.parsed_data && (
        <PrintPreviewDialog
          open={showPrintPreview}
          onOpenChange={setShowPrintPreview}
          resumeData={resume.parsed_data}
          resumeName={resume.file_name}
          sectionOrder={sectionOrder}
          onSectionOrderChange={setSectionOrder}
        />
      )}
      
      {/* Rewrite Dialog */}
      {rewriteSection && (
        <RewriteDialog
          open={showRewriteDialog}
          onOpenChange={setShowRewriteDialog}
          sectionTitle={rewriteSection.title}
          currentContent={rewriteSection.content}
          onAccept={handleRewriteAccept}
          fullResumeData={resume?.parsed_data}
        />
      )}
      
      {/* Manual Edit Dialog */}
      {manualEditSection && (
        <ManualEditDialog
          open={showManualEditDialog}
          onOpenChange={setShowManualEditDialog}
          sectionTitle={manualEditSection.title}
          currentContent={manualEditSection.content}
          onSave={handleManualEditSave}
          contentType={manualEditSection.contentType as any}
          fieldDefinitions={manualEditSection.fieldDefinitions}
        />
      )}
      </div>
    </ErrorBoundary>
  );
}