import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  createRoutesFromElements,
  createBrowserRouter,
  RouterProvider
} from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ReportDiagnosisPage } from "./pages/ReportDiagnosisPage";
import ReportResults from "./pages/ReportResults";
import NativeVoiceChat from "./pages/NativeVoiceChat";
import VideoConsultation from "./pages/VideoConsultation";
import { PatientDoctorsPage } from "@/components/PatientDoctorsPage_NEW";
import { DoctorRequestsPage } from "@/components/DoctorRequestsPage_NEW";
import { RequireAuth } from "@/components/RequireAuth";

const queryClient = new QueryClient();

// Create router with default configuration
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/" element={<Index />} />
      <Route path="/native-voice" element={<NativeVoiceChat />} />
      <Route path="/report-diagnosis" element={<ReportDiagnosisPage />} />
      <Route path="/report-results" element={<ReportResults />} />
      {/* Patient routes */}
      <Route 
        path="/doctors" 
        element={
          <RequireAuth allowedRoles={["patient"]}>
            <PatientDoctorsPage />
          </RequireAuth>
        } 
      />
      <Route 
        path="/video-consultation" 
        element={
          <RequireAuth allowedRoles={["patient"]}>
            <VideoConsultation />
          </RequireAuth>
        } 
      />
      {/* Doctor routes */}
      <Route 
        path="/doctor-requests" 
        element={
          <RequireAuth allowedRoles={["doctor"]}>
            <DoctorRequestsPage />
          </RequireAuth>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Route>
  )
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
