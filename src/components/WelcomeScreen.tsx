import { Activity, Heart, Thermometer, Clock, AlertTriangle, Stethoscope, Shield, HelpCircle, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface WelcomeScreenProps {
  onQuickAction: (action: string) => void;
}

const quickActions = [
  {
    icon: AlertTriangle,
    title: "Emergency Guide",
    description: "Learn warning signs that require immediate care",
    action: "What are the emergency symptoms I should watch out for? When should I seek immediate medical attention?",
    variant: "destructive" as const,
    priority: "high",
  },
  {
    icon: Stethoscope,
    title: "Professional Consultation",
    description: "Connect with licensed healthcare professionals",
    action: "doctor",
    isLink: true,
    priority: "high",
  },
  {
    icon: Thermometer,
    title: "Symptom Assessment",
    description: "Analyze symptoms and get preliminary guidance",
    action: "I want to check my symptoms and get medical advice",
    priority: "medium",
  },
  {
    icon: Heart,
    title: "Medication Information",
    description: "Detailed medication and dosage information",
    action: "I need information about medications and dosage",
    priority: "medium",
  },
  {
    icon: Activity,
    title: "Health & Prevention",
    description: "Evidence-based preventive care recommendations",
    action: "What are some general health tips and preventive measures?",
    priority: "medium",
  },
  {
    icon: Clock,
    title: "Follow-up Guidance",
    description: "Recovery timeline and healthcare follow-up planning",
    action: "When should I follow up with a healthcare provider?",
    priority: "medium",
  },
];

export const WelcomeScreen = ({ onQuickAction }: WelcomeScreenProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 via-white to-slate-50">
      {/* Professional Header Section */}
      <div className="flex flex-col items-center space-y-6 p-6 md:p-12 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="FeverEase Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain" />
          <div className="text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">FeverEase</h1>
            <p className="text-sm md:text-base text-slate-600 font-medium">AI-Powered Health Guidance System</p>
          </div>
        </div>

        {/* Professional Credentials Section removed per request */}

        <div className="max-w-2xl text-center space-y-3">
          <p className="text-lg md:text-xl text-slate-700 font-semibold">
            Your Personal Health Advisor
          </p>
          <p className="text-base text-slate-600 leading-relaxed">
            Get instant AI-powered health guidance for symptoms, medications, and medical conditions. 
            Our system provides evidence-based information to help you make informed healthcare decisions.
          </p>
        </div>

        <Alert className="max-w-2xl bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Medical Disclaimer</AlertTitle>
          <AlertDescription className="text-amber-800">
            This AI assistant provides general health information only. It is not a substitute for professional medical advice. 
            Always consult with qualified healthcare providers for diagnosis and treatment decisions.
          </AlertDescription>
        </Alert>
      </div>

      {/* Main Content Section */}
      <div className="flex-1 flex flex-col items-center py-8 md:py-12 px-6">
        {/* Emergency Banner */}
        <div className="w-full max-w-4xl mb-8">
          <Button 
            variant="destructive"
            size="lg"
            className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            onClick={() => onQuickAction("What are the emergency symptoms I should watch out for? When should I seek immediate medical attention?")}
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            🚨 Emergency Medical Guide
          </Button>
          <p className="text-xs text-slate-600 mt-2 text-center">
            For life-threatening emergencies, call your local emergency services immediately (911 in the US)
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="w-full max-w-4xl">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-6">Quick Access Tools</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((item) => {
              const Icon = item.icon;
              const isEmergency = item.priority === "high" && item.variant === "destructive";
              return (
                <Card
                  key={item.title}
                  className={`group cursor-pointer border-2 p-6 transition-all hover:shadow-lg relative overflow-hidden ${
                    isEmergency 
                      ? 'border-red-300 bg-gradient-to-br from-red-50 to-red-50/50 hover:border-red-500 hover:shadow-red-200'
                      : item.variant === 'destructive'
                      ? 'border-red-200 bg-white hover:border-red-400 hover:bg-red-50/30'
                      : 'border-blue-200 bg-white hover:border-blue-500 hover:bg-blue-50/30'
                  }`}
                  onClick={() => {
                    if (item.isLink) {
                      navigate(`/${item.action}`);
                    } else {
                      onQuickAction(item.action);
                    }
                  }}
                >
                  {isEmergency && (
                    <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-red-500 to-transparent"></div>
                  )}
                  <div className="flex flex-col items-start gap-3 h-full">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-all ${
                      isEmergency
                        ? 'bg-red-500 text-white shadow-lg'
                        : item.variant === 'destructive'
                        ? 'bg-red-100 text-red-600 group-hover:bg-red-500 group-hover:text-white'
                        : 'bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm md:text-base">{item.title}</h3>
                      <p className="text-xs md:text-sm text-slate-600 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Professional Footer Section */}
      <div className="border-t border-slate-200 bg-slate-50 px-6 py-8 md:py-10">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-slate-900">Getting Started</h4>
              </div>
              <p className="text-sm text-slate-600">
                Use the quick access tools above or ask any health-related question directly in the chat.
              </p>
            </div>
              <div className="text-center md:text-left">
                <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-slate-900">Your Privacy</h4>
                </div>
                <p className="text-sm text-slate-600">
                  All conversations are encrypted and secure. Your health data is protected.
                </p>
              </div>
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                <Phone className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-slate-900">Need Help?</h4>
              </div>
              <p className="text-sm text-slate-600">
                Connect with a licensed doctor via our professional consultation service.
              </p>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 space-y-2">
            <p>© 2025 FeverEase. All rights reserved.</p>
            <div className="flex justify-center gap-4">
              <button className="hover:text-slate-700 transition-colors">Terms of Service</button>
              <span>|</span>
              <button className="hover:text-slate-700 transition-colors">Privacy Policy</button>
              <span>|</span>
              <button className="hover:text-slate-700 transition-colors">Contact Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
