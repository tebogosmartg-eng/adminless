import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { School, User, AlertCircle, Save, Trash2, ImagePlus, Mail, Phone, Loader2, Hash, ShieldCheck } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { showSuccess, showError } from "@/utils/toast";
import { AsyncStatus } from "@/components/ui/AsyncStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSafeForm } from "@/hooks/useSafeForm";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SafeInput } from "@/components/safe-form/SafeInput";

export const SchoolProfileSettings = () => {
  const { 
    schoolName,
    schoolCode,
    saceNumber,
    teacherName,
    contactEmail,
    contactPhone,
    schoolLogo, setSchoolLogo,
    atRiskThreshold,
    updateProfileSettings
  } = useSettings();

  const form = useSafeForm({
    initialValues: {
      schoolName: schoolName ?? "",
      schoolCode: schoolCode ?? "",
      saceNumber: saceNumber ?? "",
      teacherName: teacherName ?? "",
      contactEmail: contactEmail ?? "",
      contactPhone: contactPhone ?? "",
      threshold: (atRiskThreshold ?? 0).toString(),
    },
  });
  const { reset } = form;
  const initializedRef = useRef(false);
  const hydrationValues = useMemo(
    () => ({
      schoolName: schoolName ?? "",
      schoolCode: schoolCode ?? "",
      saceNumber: saceNumber ?? "",
      teacherName: teacherName ?? "",
      contactEmail: contactEmail ?? "",
      contactPhone: contactPhone ?? "",
      threshold: (atRiskThreshold ?? 0).toString(),
    }),
    [schoolName, schoolCode, saceNumber, teacherName, contactEmail, contactPhone, atRiskThreshold],
  );
  const profileValidationRules = useMemo(
    () => ({
      schoolName: [{ type: "required" as const, message: "School name is required." }],
      teacherName: [{ type: "required" as const, message: "Teacher name is required." }],
      contactEmail: [
        { type: "required" as const, message: "Contact email is required." },
        { type: "email" as const, message: "Enter a valid email address." },
      ],
      threshold: [{ type: "number" as const, message: "Threshold must be a number." }],
    }),
    [],
  );

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [removeLogoDialogOpen, setRemoveLogoDialogOpen] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    reset(hydrationValues);
    initializedRef.current = true;
  }, [hydrationValues, reset]);

  const handleSaveProfile = useCallback(async (source: "manual" | "auto" = "manual") => {
    if (saveInFlightRef.current) return false;

    setErrorMessage(null);
    const hasValidFields = form.validateAll(profileValidationRules);
    if (!hasValidFields) {
      if (source === "manual") {
        showError("Please fix the highlighted fields.");
      }
      setErrorMessage("Please fix the highlighted fields before saving.");
      setStatusMessage(null);
      return false;
    }

    setStatusMessage("Saving...");
    const thresh = parseInt(form.values.threshold, 10);
    if (isNaN(thresh) || thresh < 0 || thresh > 100) {
      if (source === "manual") {
        showError("Invalid threshold value. Must be between 0 and 100.");
      }
      setErrorMessage("Invalid threshold value. It must be between 0 and 100.");
      setStatusMessage(null);
      return false;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    try {
        await updateProfileSettings({
            schoolName: form.values.schoolName,
            schoolCode: form.values.schoolCode,
            saceNumber: form.values.saceNumber,
            teacherName: form.values.teacherName,
            contactEmail: form.values.contactEmail,
            contactPhone: form.values.contactPhone,
            atRiskThreshold: thresh
        });
        form.reset({
          ...form.values,
          threshold: thresh.toString(),
        });
        if (source === "manual") {
          showSuccess("Profile settings saved successfully.");
        }
        setStatusMessage("Saved ✓");
        return true;
    } catch (e) {
        if (source === "manual") {
          showError("Failed to save settings.");
        }
        setErrorMessage("Failed to save settings. Please try again.");
        setStatusMessage(null);
        return false;
    } finally {
        saveInFlightRef.current = false;
        setIsSaving(false);
    }
  }, [form, profileValidationRules, updateProfileSettings]);

  const autoSave = useAutoSave({
    isDirty: form.isDirty,
    onSave: () => handleSaveProfile("auto").then(() => undefined),
    delayMs: 1200,
    enabled: true,
  });
  const autoSaveError = autoSave.saveError;
  const feedbackPhase =
    isSaving || autoSave.isSaving
      ? "saving"
      : errorMessage || autoSaveError
        ? "error"
        : statusMessage || autoSave.didSave
          ? "success"
          : "idle";
  const feedbackMessage =
    statusMessage ?? (isSaving || autoSave.isSaving ? "Saving..." : autoSave.didSave ? "Saved ✓" : null);
  const feedbackError = errorMessage ?? autoSaveError;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        showError("Image too large. Please use a logo smaller than 500KB.");
        setErrorMessage("Image too large. Please use a logo smaller than 500KB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        void setSchoolLogo(base64String)
          .then(() => {
            showSuccess("Saved ✓");
            setStatusMessage("Saved ✓");
          })
          .catch(() => {
            setErrorMessage("Failed - Retry");
            setStatusMessage(null);
          });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    void setSchoolLogo(null)
      .then(() => {
        if (logoInputRef.current) logoInputRef.current.value = "";
        showSuccess("Saved ✓");
        setStatusMessage("Saved ✓");
      })
      .catch(() => {
        setErrorMessage("Failed - Retry");
        setStatusMessage(null);
      });
    setRemoveLogoDialogOpen(false);
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
      <CardContent className="space-y-6 min-w-0">
        <AsyncStatus
          state={{
            status: feedbackPhase,
            error: feedbackError,
            retry: () => handleSaveProfile("manual"),
          }}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0">
          <section className="flex flex-col items-center gap-2 sm:items-start">
             <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">School Logo</Label>
             <div className="h-32 w-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden relative group">
                {schoolLogo ? (
                  <>
                    <img src={schoolLogo} alt="School Logo" className="h-full w-full object-contain p-1" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="destructive" size="icon" onClick={() => setRemoveLogoDialogOpen(true)}>
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </>
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground opacity-50" />
                )}
             </div>
             <div className="flex items-center gap-2 w-full">
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
          </section>

          <div className="space-y-6 sm:col-span-2">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Institution Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="school-name">School Name</Label>
                <div className="relative">
                  <School className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <SafeInput
                    id="school-name"
                    name="schoolName"
                    form={form}
                    rules={profileValidationRules.schoolName}
                    error={form.errors.schoolName}
                    placeholder="e.g. Sunnydale High School"
                    className="pl-9 h-10 w-full"
                  />
                </div>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="school-code">School Code (EMIS / Nat. Code)</Label>
                <div className="relative">
                  <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <SafeInput
                    id="school-code"
                    name="schoolCode"
                    form={form}
                    placeholder="e.g. 12345678"
                    className="pl-9 h-10 w-full"
                  />
                </div>
              </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Teacher Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="teacher-name">Teacher Name</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <SafeInput
                    id="teacher-name"
                    name="teacherName"
                    form={form}
                    rules={profileValidationRules.teacherName}
                    error={form.errors.teacherName}
                    placeholder="e.g. Mr. Smith"
                    className="pl-9 h-10 w-full"
                  />
                </div>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="sace-number">SACE Registration Number</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <SafeInput
                    id="sace-number"
                    name="saceNumber"
                    form={form}
                    placeholder="e.g. 1234567"
                    className="pl-9 h-10 w-full"
                  />
                </div>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="contact-email">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <SafeInput
                    id="contact-email"
                    name="contactEmail"
                    form={form}
                    rules={profileValidationRules.contactEmail}
                    error={form.errors.contactEmail}
                    placeholder="info@school.com"
                    className="pl-9 h-10 w-full"
                  />
                </div>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <SafeInput
                    id="contact-phone"
                    name="contactPhone"
                    form={form}
                    placeholder="e.g. +27 12 345 6789"
                    className="pl-9 h-10 w-full"
                  />
                </div>
              </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Risk Highlighting</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="threshold" className="flex items-center gap-2">
                  At Risk Threshold (%)
                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                </Label>
                <div className="relative">
                  <SafeInput
                    id="threshold"
                    name="threshold"
                    form={form}
                    rules={profileValidationRules.threshold}
                    error={form.errors.threshold}
                    type="number"
                    placeholder="50"
                    min={0}
                    max={100}
                    className="w-full h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Learners scoring below this percentage will be highlighted as "At Risk".
                  </p>
                </div>
              </div>
              </div>
            </section>
            <div className="flex justify-end gap-2">
                 <Button onClick={() => void handleSaveProfile("manual")} className="w-full sm:w-auto h-10 font-bold" disabled={isSaving || autoSave.isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Professional Profile
                </Button>
            </div>
          </div>
        </div>
      </CardContent>
      <AlertDialog open={removeLogoDialogOpen} onOpenChange={setRemoveLogoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove school logo?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the logo from future reports until you upload a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveLogo}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};