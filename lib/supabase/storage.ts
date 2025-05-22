import { supabaseAdmin } from './client';

/**
 * Initializes required storage buckets in Supabase
 * Run this function server-side during app initialization
 */
export async function initializeStorageBuckets() {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key');
    }
    // Create bucket for user resumes
    const { data: resumesBucket, error: resumesError } = await supabaseAdmin.storage.getBucket('resumes');
    if (!resumesBucket && resumesError) {
      const { error } = await supabaseAdmin.storage.createBucket('resumes', {
        public: false,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      });
      
      if (error) throw error;
      console.log('Created resumes bucket');
    }
    
    // Create bucket for user uploaded files
    const { data: userFilesBucket, error: userFilesError } = await supabaseAdmin.storage.getBucket('user_files');
    if (!userFilesBucket && userFilesError) {
      const { error } = await supabaseAdmin.storage.createBucket('user_files', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (error) throw error;
      console.log('Created user_files bucket');
    }
    
    // Create bucket for generated documents
    const { data: generatedBucket, error: generatedError } = await supabaseAdmin.storage.getBucket('generated');
    if (!generatedBucket && generatedError) {
      const { error } = await supabaseAdmin.storage.createBucket('generated', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (error) throw error;
      console.log('Created generated documents bucket');
    }
    
    // Note: Storage bucket policies need to be set up separately using SQL
    // See /supabase/storage-policies.sql for the required policies
    // The JavaScript client doesn't support policy creation directly
    // 
    // For immediate functionality, use the /api/upload endpoint which uses
    // the admin client to bypass RLS policies
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
    return { success: false, error };
  }
}

/**
 * Gets a pre-signed URL for a file in a bucket
 * @param bucket The storage bucket name
 * @param path The file path within the bucket
 * @param expiresIn Expiration time in seconds (default: 60)
 * @returns URL to download the file
 */
export async function getFileUrl(bucket: string, path: string, expiresIn = 60) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key');
    }
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);
    
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error(`Error getting file URL for ${bucket}/${path}:`, error);
    throw error;
  }
}

/**
 * Uploads a file to a specified bucket
 * @param bucket The storage bucket name
 * @param path The file path within the bucket
 * @param file The file to upload
 * @returns Information about the uploaded file
 */
export async function uploadFile(bucket: string, path: string, file: File) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key');
    }
    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error uploading file to ${bucket}/${path}:`, error);
    throw error;
  }
}

/**
 * Deletes a file from a specified bucket
 * @param bucket The storage bucket name
 * @param path The file path within the bucket
 * @returns Result of the deletion operation
 */
export async function deleteFile(bucket: string, path: string) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key');
    }
    const { data, error } = await supabaseAdmin.storage.from(bucket).remove([path]);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error deleting file from ${bucket}/${path}:`, error);
    throw error;
  }
}

/**
 * Get a list of files in a bucket
 * @param bucket The storage bucket name
 * @param path Optional path prefix to filter results
 * @returns List of files in the bucket
 */
export async function listFiles(bucket: string, path?: string) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key');
    }
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(path || '');
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error listing files in ${bucket}${path ? '/' + path : ''}:`, error);
    throw error;
  }
}

/**
 * Check if storage buckets exist and are properly initialized
 * @returns Status of storage buckets
 */
export async function checkStorageBuckets() {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available - missing service role key');
    }
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    
    if (error) throw error;
    
    const requiredBuckets = ['resumes', 'user_files', 'generated'];
    const existingBuckets = buckets.map(b => b.name);
    const missingBuckets = requiredBuckets.filter(b => !existingBuckets.includes(b));
    
    return {
      initialized: missingBuckets.length === 0,
      existingBuckets,
      missingBuckets,
      error: null
    };
  } catch (error) {
    console.error('Error checking storage buckets:', error);
    return {
      initialized: false,
      existingBuckets: [],
      missingBuckets: ['resumes', 'user_files', 'generated'],
      error
    };
  }
}