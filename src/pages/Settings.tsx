import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { showSuccess, showError } from "@/utils/toast";
import { Eye, EyeOff, Save, ShieldCheck } from "lucide-react";

const Settings = () => {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem("gemini_api_key");
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("gemini_api_key", apiKey.trim());
      showSuccess("API Key saved successfully.");
    } else {
      localStorage.removeItem("gemini_api_key");
      showSuccess("API Key removed. Using default demo key.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and integrations.</p>
      </div>
      
      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>AI Integration</CardTitle>
          </div>
          <CardDescription>
            Configure your Google Gemini API key to enable AI features like scanning and insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="api-key">Gemini API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                placeholder="Enter your API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">Toggle password visibility</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your key is stored locally in your browser and never sent to our servers.
            </p>
          </div>
          <Button onClick={handleSaveKey}>
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grading System</CardTitle>
          <CardDescription>
            View the current grading symbols used for class analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="rounded-md border">
              <div className="grid grid-cols-3 border-b bg-muted/50 p-2 font-medium text-sm">
                <div>Range</div>
                <div>Symbol</div>
                <div>Level</div>
              </div>
              {[
                { range: "80 - 100%", symbol: "A", level: 7, color: "text-green-700" },
                { range: "70 - 79%", symbol: "B", level: 6, color: "text-green-600" },
                { range: "60 - 69%", symbol: "C", level: 5, color: "text-blue-600" },
                { range: "50 - 59%", symbol: "D", level: 4, color: "text-yellow-600" },
                { range: "40 - 49%", symbol: "E", level: 3, color: "text-orange-600" },
                { range: "30 - 39%", symbol: "F", level: 2, color: "text-red-600" },
                { range: "0 - 29%", symbol: "FF", level: 1, color: "text-red-700" },
              ].map((grade, i) => (
                <div key={i} className="grid grid-cols-3 p-2 text-sm border-b last:border-0">
                  <div>{grade.range}</div>
                  <div className={`font-bold ${grade.color}`}>{grade.symbol}</div>
                  <div>{grade.level}</div>
                </div>
              ))}
           </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;