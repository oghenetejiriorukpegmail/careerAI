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

async function updateExistingResume() {
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
      workAuth: profile.work_authorization,
      location: profile.location,
      city: profile.city,
      state: profile.state,
      country: profile.country
    });
    
    // Get the most recent resume
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (resumeError) {
      console.error('Error fetching resume:', resumeError);
      return;
    }
    
    console.log('Resume loaded:', {
      id: resume.id,
      hasWorkAuth: !!resume.parsed_data?.workAuthorization,
      hasAddress: !!resume.parsed_data?.address
    });
    
    // Create updated parsed data with profile information merged
    const updatedData = { ...resume.parsed_data };
    
    // Merge work authorization if available
    if (profile.work_authorization) {
      updatedData.workAuthorization = profile.work_authorization;
      console.log('✓ Adding work authorization:', profile.work_authorization);
    }
    
    // Merge location data - construct from city, state, country if available
    if (profile.city || profile.state || profile.country) {
      const locationParts = [];
      if (profile.city) locationParts.push(profile.city);
      if (profile.state) locationParts.push(profile.state);
      if (profile.country) locationParts.push(profile.country);
      const profileLocation = locationParts.join(', ');
      
      // Update structured data with profile location if not already present or if profile has better data
      if (!updatedData.address || updatedData.address.length < profileLocation.length) {
        updatedData.address = profileLocation;
        console.log('✓ Adding/updating address:', profileLocation);
      }
    } else if (profile.location && (!updatedData.address || updatedData.address.length < profile.location.length)) {
      // Fallback to old location field
      updatedData.address = profile.location;
      console.log('✓ Adding address from old location field:', profile.location);
    }
    
    // Ensure email is consistent
    if (profile.email && !updatedData.email) {
      updatedData.email = profile.email;
      console.log('✓ Adding email from profile');
    }
    
    // Ensure name is consistent if missing
    if (profile.full_name && !updatedData.name) {
      updatedData.name = profile.full_name;
      console.log('✓ Adding name from profile');
    }
    
    // Update the resume in the database
    const { error: updateError } = await supabase
      .from('resumes')
      .update({ parsed_data: updatedData })
      .eq('id', resume.id);
    
    if (updateError) {
      console.error('Error updating resume:', updateError);
      return;
    }
    
    console.log('');
    console.log('✅ Resume updated successfully!');
    console.log('Updated fields:', {
      workAuthorization: updatedData.workAuthorization,
      address: updatedData.address,
      email: updatedData.email,
      name: updatedData.name
    });
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

updateExistingResume();