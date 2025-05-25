"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader, Upload, Check, X, HardDrive } from "lucide-react";
import { GoogleDrivePicker } from "@/components/google-drive-picker";

export default function UploadResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bucketInitialized, setBucketInitialized] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Storage bucket checks disabled for development
  useEffect(() => {
    const checkBuckets = async () => {
      try {
        console.log("Storage bucket checks disabled - assuming initialized");
        setBucketInitialized(true);
        setError(null);
      } catch (err) {
        console.error("Error in bucket initialization:", err);
        setBucketInitialized(true);
      }
    };
    
    checkBuckets();
  }, []);

  const handleFilePicked = useCallback((selectedFile: File) => {
    // Check file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF or DOCX file");
      return;
    }
    
    // Check file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFilePicked(acceptedFiles[0]);
    }
  }, [handleFilePicked]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  });
  
  const uploadResume = async () => {
    if (!file || !bucketInitialized) return;
    
    try {
      setUploading(true);
      setError(null);
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("User not found");
      
      // Create unique filename to avoid collisions
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${userData.user.id}/${fileName}`;
      
      console.log(`Uploading file to user_files/${filePath}`);
      
      // Use the all-in-one endpoint that handles upload, parsing, and database saving
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userData.user.id);
      
      setUploading(false);
      setAnalyzing(true);
      
      try {
        // All-in-one endpoint that handles upload, parsing, and database insertion
        const response = await fetch('/api/resumeupload', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Resume processing error:", errorData);
          throw new Error(errorData.error || "Failed to process resume");
        }
        
        const processedData = await response.json();
        
        if (!processedData.success) {
          throw new Error(processedData.error || "Resume processing failed");
        }
        
        // Log any partial successes/failures
        if (processedData.error) {
          console.warn("Partial success:", processedData.error);
        }
        
        console.log("Resume processed successfully:", {
          uploadSuccess: processedData.uploadSuccess,
          parseSuccess: processedData.parseSuccess,
          aiSuccess: processedData.aiSuccess,
          dbSuccess: processedData.dbSuccess
        });
        
        // Success!
        toast({
          title: "Resume Uploaded",
          description: "Your resume has been uploaded and analyzed successfully.",
        });
        
        router.push("/dashboard/resume");
      } catch (processingError: any) {
        console.error("Resume processing error:", processingError);
        
        // The all-in-one endpoint might have partially succeeded
        // So let's show a message that explains the state
        toast({
          title: "Resume Upload Issue",
          description: processingError.message || "There was an issue processing your resume. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Resume upload error:", error);
      setUploading(false);
      setAnalyzing(false);
      setError(error.message || "Failed to upload resume");
    } finally {
      setAnalyzing(false);
    }
  };
  
  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Upload Resume</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Upload your current resume to get started with CareerAI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Resume</CardTitle>
          <CardDescription>
            Upload your existing resume in PDF or DOCX format
          </CardDescription>
        </CardHeader>
        <CardContent>
          {file ? (
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                disabled={uploading || analyzing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div {...getRootProps()} className="cursor-pointer">
                <div className={`border-2 border-dashed rounded-md p-6 sm:p-8 text-center ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}>
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    <h3 className="text-base sm:text-lg font-medium">Drag & drop your resume</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      or click to browse files (PDF or DOCX, max 5MB)
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or choose from</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFilePicked(file);
                    }}
                    disabled={uploading || analyzing}
                    className="sr-only"
                    id="device-file-input"
                  />
                  <label
                    htmlFor="device-file-input"
                    className={`inline-flex items-center justify-center w-full rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 ${
                      uploading || analyzing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                  >
                    <HardDrive className="mr-2 h-4 w-4" />
                    Device Files
                  </label>
                </div>
                <GoogleDrivePicker 
                  onFilePicked={handleFilePicked}
                  disabled={uploading || analyzing}
                />
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 rounded-md bg-destructive/15 text-destructive text-sm">
              {error}
            </div>
          )}
          
          <div className="mt-6 space-y-4">
            <h3 className="text-md font-medium">What happens next?</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${file ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span>Upload your resume</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${analyzing ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {analyzing ? (
                    <Loader className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="text-xs">2</span>
                  )}
                </div>
                <span>AI analyzes your resume content</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted">
                  <span className="text-xs">3</span>
                </div>
                <span>Generate tailored resumes for job applications</span>
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/dashboard/resume")}>
            Cancel
          </Button>
          <Button
            onClick={uploadResume}
            disabled={!file || uploading || analyzing || !bucketInitialized}
          >
            {uploading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : analyzing ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Upload & Analyze"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}