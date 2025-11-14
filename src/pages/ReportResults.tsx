import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  AlertTriangle,
  Activity,
  Bed,
  CalendarClock,
  ShieldAlert,
  Stethoscope,
  TestTube,
  Utensils,
} from "lucide-react";

interface BioBertAnswers {
  diagnosis?: string;
  abnormal_values?: string;
  issues?: string;
  treatment?: string;
  summary?: string;
}

interface TreatmentPlan {
  medications?: string[];
  home_care?: string[];
  diet?: string[];
  lifestyle?: string[];
}

interface RiskLevel {
  level?: string;
  reason?: string;
}

interface FollowUpPlan {
  tests?: string[];
  doctor_visit?: string;
}

interface FinalReport {
  diagnosis?: string;
  abnormal_values?: string[] | string;
  issues_found?: string[] | string;
  treatment_plan?: TreatmentPlan;
  risk_level?: RiskLevel;
  danger_alerts?: string[] | string;
  follow_up?: FollowUpPlan;
  patient_summary?: string;
}

interface ReportAnalysisResult {
  raw_text?: string;
  biobert?: BioBertAnswers;
  final_report?: FinalReport | string;
}

const ensureArray = (value?: string[] | string): string[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const ReportResults = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const result = (location.state as { result?: ReportAnalysisResult } | null)?.result;

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">
            No report data found
          </h1>
          <p className="text-sm text-slate-600">
            It looks like you navigated here directly. Please upload a report
            first so we can analyze it.
          </p>
          <Button
            className="medical-button-primary"
            onClick={() => navigate("/report-diagnosis")}
          >
            Go to Report Diagnosis
          </Button>
        </div>
      </div>
    );
  }

  const finalReport: FinalReport | null =
    typeof result.final_report === "string" ? null : result.final_report || null;
  const biobert = result.biobert;
  const riskLevel = finalReport?.risk_level;
  const treatment = finalReport?.treatment_plan;

  const riskMap: Record<
    string,
    { label: string; ring: string; bg: string; text: string }
  > = {
    low: {
      label: "Low Risk",
      ring: "ring-emerald-400/50",
      bg: "bg-emerald-500/15",
      text: "text-emerald-200",
    },
    moderate: {
      label: "Moderate Risk",
      ring: "ring-amber-400/50",
      bg: "bg-amber-500/15",
      text: "text-amber-200",
    },
    high: {
      label: "High Risk",
      ring: "ring-rose-400/50",
      bg: "bg-rose-500/15",
      text: "text-rose-200",
    },
  };

  const riskBadge = riskLevel?.level
    ? riskMap[riskLevel.level.toLowerCase()] || riskMap.moderate
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-emerald-50/30 py-10 px-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.3em]">
            Report Results
          </p>
          <h1 className="text-3xl font-bold md:text-4xl text-slate-900">Doctor-style summary</h1>
          <p className="max-w-3xl text-sm text-slate-600 md:text-base">
            Combined BioBERT facts and Gemini medical reasoning. Share this with your doctor for
            final guidance.
          </p>
        </div>

        <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-md rounded-2xl p-6 text-slate-900">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Patient Summary
          </h2>
          <p className="mt-3 text-slate-700 text-base leading-relaxed">
            {finalReport?.patient_summary ||
              biobert?.summary ||
              "No detailed summary was generated. Please consult your doctor for a full explanation."}
          </p>
        </Card>

        {riskBadge && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card
              className={`rounded-2xl border-2 p-5 shadow-md ${
                riskLevel?.level?.toLowerCase() === 'low'
                  ? 'border-emerald-400 bg-emerald-50'
                  : riskLevel?.level?.toLowerCase() === 'moderate'
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-red-400 bg-red-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className={`h-10 w-10 ${
                  riskLevel?.level?.toLowerCase() === 'low'
                    ? 'text-emerald-600'
                    : riskLevel?.level?.toLowerCase() === 'moderate'
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Risk Assessment</p>
                  <p className={`text-2xl font-bold ${
                    riskLevel?.level?.toLowerCase() === 'low'
                      ? 'text-emerald-700'
                      : riskLevel?.level?.toLowerCase() === 'moderate'
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}>{riskBadge.label}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-700">{riskLevel?.reason || "Risk level not specified."}</p>
            </Card>

            {ensureArray(finalReport?.danger_alerts).length > 0 && (
              <Card className="rounded-2xl border-2 border-red-400 bg-red-50 p-5 shadow-md">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-10 w-10 text-red-600" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Danger Alerts</p>
                    <p className="text-lg font-semibold text-red-700">Watch immediately</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-red-800">
                  {finalReport && ensureArray(finalReport.danger_alerts).map((alert, idx) => (
                    <li key={idx}>• {alert}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 text-slate-900 shadow-md">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Diagnosis
            </h3>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {finalReport?.diagnosis || biobert?.diagnosis || "Not clearly identified"}
            </p>
          </Card>

          <Card className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-slate-900 shadow-md">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Issues Found
            </h3>
            <ul className="mt-3 list-disc pl-4 text-sm text-slate-700 space-y-1">
              {ensureArray(finalReport?.issues_found).length > 0 ? (
                ensureArray(finalReport?.issues_found).map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))
              ) : (
                <li>No specific issues highlighted.</li>
              )}
            </ul>
          </Card>
        </div>

        <Card className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 text-slate-900 shadow-md">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Abnormal values
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {ensureArray(finalReport?.abnormal_values).length > 0 ? (
              ensureArray(finalReport?.abnormal_values).map((value, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  <span>{value}</span>
                </li>
              ))
            ) : (
              <li>No abnormal values were clearly identified.</li>
            )}
          </ul>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 text-slate-900 shadow-md">
            <div className="flex items-center gap-2 text-blue-600">
              <Stethoscope className="h-5 w-5" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Medications</h3>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {ensureArray(treatment?.medications).length > 0 ? (
                ensureArray(treatment?.medications).map((med, idx) => <li key={idx}>• {med}</li>)
              ) : (
                <li>No medication guidance provided.</li>
              )}
            </ul>
          </Card>

          <Card className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-slate-900 shadow-md">
            <div className="flex items-center gap-2 text-emerald-600">
              <Bed className="h-5 w-5" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Rest & lifestyle</h3>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {ensureArray(treatment?.home_care)
                .concat(ensureArray(treatment?.lifestyle))
                .map((tip, idx) => (
                  <li key={idx}>• {tip}</li>
                ))}
              {ensureArray(treatment?.home_care).length === 0 &&
                ensureArray(treatment?.lifestyle).length === 0 && <li>No guidance provided.</li>}
            </ul>
          </Card>

          <Card className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 text-slate-900 shadow-md">
            <div className="flex items-center gap-2 text-amber-600">
              <Utensils className="h-5 w-5" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Diet plan</h3>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {ensureArray(treatment?.diet).length > 0 ? (
                ensureArray(treatment?.diet).map((tip, idx) => <li key={idx}>• {tip}</li>)
              ) : (
                <li>No diet guidance provided.</li>
              )}
            </ul>
          </Card>

          <Card className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 text-slate-900 shadow-md">
            <div className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Self-care focus</h3>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              Monitor temperature, stay hydrated, and rest until fever resolves.
            </p>
          </Card>
        </div>

        {finalReport?.follow_up && (
          <Card className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 text-slate-900 shadow-md">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Follow-up plan
            </h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2 text-sm text-slate-700">
              <div>
                <div className="flex items-center gap-2 text-blue-600">
                  <TestTube className="h-4 w-4" />
                  <p className="font-semibold">Tests to repeat</p>
                </div>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-700">
                  {ensureArray(finalReport.follow_up.tests).length > 0 ? (
                    ensureArray(finalReport.follow_up.tests).map((test, idx) => <li key={idx}>{test}</li>)
                  ) : (
                    <li>No follow-up tests specified.</li>
                  )}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 text-blue-600">
                  <CalendarClock className="h-4 w-4" />
                  <p className="font-semibold">When to visit hospital</p>
                </div>
                <p className="mt-1 text-slate-700">{finalReport.follow_up.doctor_visit || "No guidance provided."}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate("/report-diagnosis")}
          >
            Analyze another report
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Back to FeverEase chat
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportResults;


