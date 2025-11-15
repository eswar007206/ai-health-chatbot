import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { SignIn } from "./SignIn";
import { Signup } from "./Signup";

export const Auth = () => {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Navigate to home page after successful auth
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center">
            <img src="/logo.png" alt="FeverEase" className="h-full w-full object-contain" />
          </div>
          <CardTitle className="text-4xl">FeverEase</CardTitle>
          <CardDescription>Your AI Health Companion for Fever Care</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <SignIn onSuccess={handleSuccess} />
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <Signup onSuccess={() => {
                // Switch to sign in tab after successful signup
                setActiveTab("signin");
                handleSuccess();
              }} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
