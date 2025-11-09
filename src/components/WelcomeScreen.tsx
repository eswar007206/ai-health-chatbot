import { Activity, Heart, Thermometer, Clock, AlertTriangle, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface WelcomeScreenProps {
  onQuickAction: (action: string) => void;
}

const quickActions = [
  {
    icon: Stethoscope,
    title: "Doctor Consultation",
    description: "Talk to a doctor",
    action: "doctor",
    isLink: true,
  },
  {
    icon: AlertTriangle,
    title: "Emergency Guide",
    description: "Know when to seek help",
    action: "What are the emergency symptoms I should watch out for? When should I seek immediate medical attention?",
    variant: "destructive" as const,
  },
  {
    icon: Thermometer,
    title: "Symptom Check",
    description: "Analyze your symptoms",
    action: "I want to check my symptoms and get medical advice",
  },
  {
    icon: Heart,
    title: "Medicine Guide",
    description: "Get medication info",
    action: "I need information about medications and dosage",
  },
  {
    icon: Activity,
    title: "Health Tips",
    description: "Get preventive advice",
    action: "What are some general health tips and preventive measures?",
  },
  {
    icon: Clock,
    title: "Follow-up Care",
    description: "Recovery guidance",
    action: "When should I follow up with a healthcare provider?",
  },
];

export const WelcomeScreen = ({ onQuickAction }: WelcomeScreenProps) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">FeverEase</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          Your AI health companion. Ask me about symptoms, medical conditions,
          medications, or general health advice.
        </p>
        <Button 
          variant="destructive" 
          size="lg"
          className="mt-2"
          onClick={() => onQuickAction("What are the emergency symptoms I should watch out for? When should I seek immediate medical attention?")}
        >
          🚨 Emergency Guide
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-4xl">
        {quickActions.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.title}
              className={`group cursor-pointer border-2 p-6 transition-all hover:shadow-lg ${
                item.variant === 'destructive' 
                  ? 'hover:border-red-500 hover:bg-red-50/50'
                  : 'hover:border-primary hover:bg-primary/5'
              }`}
              onClick={() => {
                if (item.isLink) {
                  navigate(`/${item.action}`);
                } else {
                  onQuickAction(item.action);
                }
              }}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  item.variant === 'destructive'
                    ? 'bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white'
                    : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Alert className="max-w-2xl">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important Notice</AlertTitle>
        <AlertDescription>
          This AI assistant provides general health information and guidance. It is not a 
          substitute for professional medical advice, diagnosis, or treatment. Always seek 
          the advice of your physician or qualified health provider with questions regarding 
          a medical condition. In case of emergency, call your local emergency services immediately.
        </AlertDescription>
      </Alert>
    </div>
  );
};
