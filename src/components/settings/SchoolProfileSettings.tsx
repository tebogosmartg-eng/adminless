import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { School, User, AlertCircle, Save, Trash2, ImagePlus, Mail, Phone, Loader2, Hash } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { showSuccess, showError } from "@/utils/toast";

export const SchoolProfileSettings = () => {
  const { 
    schoolName,
    schoolCode,
    teacherName,
    contactEmail,
    contactPhone,
    schoolLogo, setSchoolLogo,
    atRiskThreshold,
    updateProfileSettings
  } = useSettings();

  const [tempSchoolName, setTempSchoolName] = useState(schoolName);
  const [tempSchoolCode, setTempSchoolCode] = useState(schoolCode);
  const [tempTeacherName, setTempTeacherName] = useState(teacherName);
  const [tempContactEmail, setTempContactEmail] = useState(contactEmail);
  const [tempContactPhone, setTempContactPhone] = useState(contactPhone);
  const [tempThreshold, setTempThreshold] = useState(atRiskThreshold.toString());
  const [isSaving, setIsSaving] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempSchoolName(schoolName);
    setTempSchoolCode(schoolCode);
    setTempTeacherName(teacherName);
    setTempContactEmail(contactEmail);
    setTempContactPhone(contactPhone || "");
    setTempThreshold(atRiskThreshold.toString());
  }, [schoolName, schoolCode, teacherName, contactEmail, contactPhone, atRiskThreshold]);

  const handleSaveProfile = async () => {
    const thresh = parseInt(tempThreshold);
    if (isNaN(thresh) || thresh < 0 || thresh > 100) {
      showError("Invalid threshold value. Must be between 0 and 100.");
      return;
    }

    setIsSaving(true);
    try {
        await updateProfileSettings({
            schoolName: tempSchoolName,
            schoolCode: tempSchoolCode,
            teacherName: tempTeacherName,
            contactEmail: tempContactEmail,
            contactPhone: tempContactPhone,
            atRiskThreshold: thresh
        });
        showSuccess("Profile settings saved successfully.");
    } catch (e) {
        showError("Failed to save settings.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        showError("Image too large. Please use a logo smaller than 500KB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSchoolLogo(base64String);
        showSuccess("School logo updated.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setSchoolLogo(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    showSuccess("School logo removed.");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <School className="h-5 w-5 text-primary" />
          <CardTitle>School & Report Profile</CardTitle>
        </div>
        <CardDescription>
          These details will appear on your generated PDF reports and SA-SAMS exports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center gap-2">
             <Label>School Logo</Label>
             <div className="h-32 w-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden relative group">
                {schoolLogo ? (
                  <>
                    <img src={schoolLogo} alt="School Logo" className="h-full w-full object-contain p-1" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="destructive" size="icon" onClick={handleRemoveLogo}>
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </>
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground opacity-50" />
                )}
             </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="relative cursor-pointer" asChild>
                  <label>
                     Upload
                     <input 
                      ref={logoInputRef}
                      type="file" 
                      accept="image/png, image/jpeg" 
                      className="hidden" 
                      onChange={handleLogoUpload}
                     />
                  </label>
                </Button>
             </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="school-name">School Name</Label>
                <div className="relative">
                  <School className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="school-name"
                    placeholder="e.g. Sunnydale High School"
                    value={tempSchoolName}
                    onChange={(e) => setTempSchoolName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="school-code">School Code (EMIS / Nat. Code)</Label>
                <div className="relative">
                  <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="school-code"
                    placeholder="e.g. 12345678"
                    value={tempSchoolCode}
                    onChange={(e) => setTempSchoolCode(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="teacher-name">Teacher Name</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="teacher-name"
                    placeholder="e.g. Mr. Smith"
                    value={tempTeacherName}
                    onChange={(e) => setTempTeacherName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="contact-email">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact-email"
                    placeholder="info@school.com"
                    value={tempContactEmail}
                    onChange={(e) => setTempContactEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact-phone"
                    placeholder="e.g. +27 12 345 6789"
                    value={tempContactPhone}
                    onChange={(e) => setTempContactPhone(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

               <div className="grid w-full items-center gap-1.5 sm:col-span-2">
                <Label htmlFor="threshold" className="flex items-center gap-2">
                  At Risk Threshold (%)
                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                </Label>
                <div className="relative">
                  <Input
                    id="threshold"
                    type="number"
                    placeholder="50"
                    min={0}
                    max={100}
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(e.target.value)}
                    className="w-full sm:w-[120px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Learners scoring below this percentage will be highlighted as "At Risk".
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleSaveProfile} className="w-full sm:w-auto" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Profile & Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};