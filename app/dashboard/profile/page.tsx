"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader, User, Github, Linkedin, Mail, Phone, MapPin, Briefcase } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [workAuthorization, setWorkAuthorization] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
            
          if (error) throw error;
          
          setProfile(data);
          setFullName(data.full_name || "");
          setEmail(data.email || user.email || "");
          setPhone(data.phone || "");
          setLocation(data.location || "");
          setCity(data.city || "");
          setState(data.state || "");
          setCountry(data.country || "");
          setWorkAuthorization(data.work_authorization || "");
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [toast]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not found");
      
      // First try to update with work_authorization
      let updateData: any = {
        full_name: fullName,
        email,
        phone,
        location: city || state || country ? `${city}${city && state ? ', ' : ''}${state}${(city || state) && country ? ', ' : ''}${country}` : location,
        city,
        state,
        country,
        updated_at: new Date().toISOString(),
      };
      
      // Only include work_authorization if it has a value
      if (workAuthorization) {
        updateData.work_authorization = workAuthorization;
      }
      
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);
        
      if (error) {
        // If error is about new columns, try without them
        if (error.message && (error.message.includes('work_authorization') || 
            error.message.includes('city') || 
            error.message.includes('state') || 
            error.message.includes('country'))) {
          console.warn('Some columns not available, updating without them');
          delete updateData.work_authorization;
          delete updateData.city;
          delete updateData.state;
          delete updateData.country;
          
          const { error: retryError } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", user.id);
            
          if (retryError) throw retryError;
          
          toast({
            title: "Profile Updated",
            description: "Your profile has been updated (work authorization not available yet)",
          });
          return;
        }
        throw error;
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and profile information
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <form onSubmit={handleUpdateProfile}>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location (Optional)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Input
                        id="city"
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <Input
                        id="state"
                        placeholder="State/Province"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <Input
                        id="country"
                        placeholder="Country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your location details for better job matching
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workAuth">Work Authorization Status (Optional)</Label>
                  <Select
                    value={workAuthorization}
                    onValueChange={setWorkAuthorization}
                    disabled={saving}
                  >
                    <SelectTrigger id="workAuth">
                      <SelectValue placeholder="Select work authorization status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US Citizen">US Citizen</SelectItem>
                      <SelectItem value="Green Card">Green Card (Permanent Resident)</SelectItem>
                      <SelectItem value="H1B">H1B Visa</SelectItem>
                      <SelectItem value="H4 EAD">H4 EAD</SelectItem>
                      <SelectItem value="F1 OPT">F1 OPT</SelectItem>
                      <SelectItem value="F1 CPT">F1 CPT</SelectItem>
                      <SelectItem value="TN">TN Visa</SelectItem>
                      <SelectItem value="L1">L1 Visa</SelectItem>
                      <SelectItem value="L2 EAD">L2 EAD</SelectItem>
                      <SelectItem value="Other">Other Work Authorization</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This information will be included in your generated resumes if provided
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Career Profile</CardTitle>
              <CardDescription>
                Manage your career information and LinkedIn profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">LinkedIn Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your LinkedIn profile to get personalized optimization suggestions and enhanced job matching.
                </p>
                <Link href="/dashboard/profile/linkedin">
                  <Button variant="outline" className="mt-2">
                    <Linkedin className="h-4 w-4 mr-2" />
                    Manage LinkedIn Integration
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Resume Management</h3>
                <p className="text-sm text-muted-foreground">
                  Upload and manage your resumes to create tailored job applications.
                </p>
                <Link href="/dashboard/resume">
                  <Button variant="outline" className="mt-2">
                    Manage Resumes
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email</span>
                </div>
                <span>{email}</span>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Name</span>
                </div>
                <span>{fullName}</span>
              </div>
              
              {phone && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Phone</span>
                  </div>
                  <span>{phone}</span>
                </div>
              )}
              
              {(city || state || country) && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location</span>
                  </div>
                  <span>{`${city}${city && state ? ', ' : ''}${state}${(city || state) && country ? ', ' : ''}${country}`}</span>
                </div>
              )}
              
              {workAuthorization && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Work Authorization</span>
                  </div>
                  <span>{workAuthorization}</span>
                </div>
              )}
              
              <div className="border-t pt-4 mt-4">
                <Button variant="outline" className="w-full text-destructive hover:text-destructive" asChild>
                  <Link href="/change-password">Change Password</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>
                Manage your data and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Your Data</h3>
                <p className="text-sm text-muted-foreground">
                  You can download all your data or delete your account at any time.
                </p>
                <div className="flex space-x-2 mt-2">
                  <Button variant="outline" size="sm">
                    Download Data
                  </Button>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}