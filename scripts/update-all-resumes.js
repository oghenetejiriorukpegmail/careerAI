const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateAllResumes() {
  try {
    // Get your profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'oghenetejiri@gmail.com')
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }
    
    console.log('Profile loaded:', {
      userId: profile.id,
      workAuth: profile.work_authorization,
      location: profile.location,
      city: profile.city,
      state: profile.state,
      country: profile.country
    });
    
    // Get ALL resumes for this user
    const { data: resumes, error: resumesError } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (resumesError) {
      console.error('Error fetching resumes:', resumesError);
      return;
    }
    
    console.log(`Found ${resumes.length} resumes to update`);
    console.log('');
    
    // Prepare profile location data
    const locationParts = [];
    if (profile.city) locationParts.push(profile.city);
    if (profile.state) locationParts.push(profile.state);
    if (profile.country) locationParts.push(profile.country);
    const constructedLocation = locationParts.length > 0 ? locationParts.join(', ') : null;
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Update each resume
    for (const resume of resumes) {
      console.log(`Processing resume: ${resume.file_name} (ID: ${resume.id})`);
      
      if (!resume.parsed_data) {
        console.log('  ⚠ Skipping - no parsed data');
        skippedCount++;
        continue;
      }
      
      // Create updated parsed data with profile information merged
      const updatedData = { ...resume.parsed_data };
      let hasChanges = false;
      
      // Merge work authorization if available
      if (profile.work_authorization && !updatedData.workAuthorization) {
        updatedData.workAuthorization = profile.work_authorization;
        console.log('  ✓ Adding work authorization:', profile.work_authorization);
        hasChanges = true;
      } else if (updatedData.workAuthorization) {
        console.log('  ⚠ Work authorization already present:', updatedData.workAuthorization);
      } else {
        console.log('  ⚠ No work authorization to add');
      }
      
      // Merge location data
      const targetLocation = constructedLocation || profile.location;
      if (targetLocation) {
        if (!updatedData.address || updatedData.address.length < targetLocation.length) {
          updatedData.address = targetLocation;
          console.log('  ✓ Adding/updating address:', targetLocation);
          hasChanges = true;
        } else {
          console.log('  ⚠ Address already present:', updatedData.address);
        }
      }
      
      // Ensure email is consistent
      if (profile.email && !updatedData.email) {
        updatedData.email = profile.email;
        console.log('  ✓ Adding email from profile');
        hasChanges = true;
      }
      
      // Ensure name is consistent if missing
      if (profile.full_name && !updatedData.name) {
        updatedData.name = profile.full_name;
        console.log('  ✓ Adding name from profile');
        hasChanges = true;
      }
      
      if (hasChanges) {
        // Update the resume in the database
        const { error: updateError } = await supabase
          .from('resumes')
          .update({ parsed_data: updatedData })
          .eq('id', resume.id);
        
        if (updateError) {
          console.error('  ❌ Error updating resume:', updateError);
        } else {
          console.log('  ✅ Resume updated successfully');
          updatedCount++;
        }
      } else {
        console.log('  ⏭ No changes needed');
        skippedCount++;
      }
      
      console.log('');
    }
    
    console.log('Update Summary:');
    console.log('===============');
    console.log(`Total resumes: ${resumes.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log('');
    console.log('✅ All resumes have been processed!');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

updateAllResumes();