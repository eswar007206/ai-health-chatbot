import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Upload, ArrowLeft, Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AnalysisResult {
  analysis: {
    diagnosis?: string;
    risk_level?: string;
    treatment_plan?: string;
    abnormalities?: string[];
    recommendations?: string[];
  };
  final_report?: {
    diagnosis?: string;
    risk_level?: string;
    treatment_plan?: string;
    abnormalities?: string[];
    recommendations?: string[];
  };
}

export function ReportDiagnosisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a report image to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/analyze-report`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || "Failed to analyze report");
      }

      const result: AnalysisResult = await response.json();

      // Navigate to results page with the analysis
      navigate("/report-results", {
        state: {
          result: {
            analysis: result.analysis,
            final_report: result.final_report,
          },
        },
      });

      toast({
        title: "Analysis complete",
        description: "Your report has been analyzed successfully",
      });
    } catch (error) {
      console.error("Error analyzing report:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Report Analysis</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl p-6 md:p-8">
        <div className="grid gap-6">
          {/* Main Upload Card */}
          <Card className="border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200">
              <CardTitle>Upload Medical Report</CardTitle>
              <CardDescription>
                Upload a lab report, X-ray, or any medical document for AI-powered analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!preview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-blue-100 p-4 rounded-lg">
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Click to upload or drag and drop</p>
                      <p className="text-sm text-slate-500 mt-1">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-slate-100 rounded-lg overflow-hidden">
                    <img
                      src={preview}
                      alt="Report preview"
                      className="w-full max-h-96 object-contain"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-sm font-medium text-slate-900 mb-2">Selected file:</p>
                    <p className="text-sm text-slate-600 break-all">{file?.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(file!.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Alert */}
          <Alert className="border-emerald-200 bg-emerald-50">
            <ImageIcon className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-slate-700">
              <span className="font-semibold text-emerald-900">Tip:</span> For best results, ensure the report image is clear, well-lit, and captures all text legibly. Medical reports, lab results, X-rays, and ultrasounds are all supported.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {preview && (
              <Button
                variant="outline"
                onClick={handleClear}
                className="flex-1"
                disabled={isAnalyzing}
              >
                Clear & Upload Different
              </Button>
            )}
            <Button
              onClick={() => preview ? handleAnalyze() : fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className={`flex-1 ${
                preview
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : preview ? (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Analyze Report
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Select Report
                </>
              )}
            </Button>
          </div>

          {/* FAQ Section */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 text-sm">1. Upload</h4>
                <p className="text-sm text-slate-600">
                  Select and upload a clear image of your medical report
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 text-sm">2. Analysis</h4>
                <p className="text-sm text-slate-600">
                  Our AI analyzes the report and extracts key information
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 text-sm">3. Results</h4>
                <p className="text-sm text-slate-600">
                  Get a comprehensive analysis with diagnosis and recommendations
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <span className="font-semibold">Important:</span> This analysis is for informational purposes only and should not replace professional medical advice. Always consult with a qualified healthcare provider for diagnosis and treatment.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}