import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  AlertTriangle,
  Stethoscope,
  Utensils,
  CalendarClock,
  Activity,
  Bed,
  Pill,
  ShieldAlert,
} from "lucide-react";

interface BioBertAnswers {
  diagnosis?: string;
  diseases?: string[];
  medications?: string[];
  symptoms?: string[];
  lab_tests?: string[];
}

interface ReportAnalysisResult {
  success?: boolean;
  biobert?: BioBertAnswers;
  final_report?: {
    diagnosis?: string;
    patient_summary?: string | {
      condition_explanation?: string;
      why_treatment?: string;
      lifestyle_impact?: string;
      prognosis?: string;
      resume_normal_activities?: string;
    };
    danger_alerts?: string[];
    treatment_plan?: {
      medications?: Array<any>;
      home_care?: string[];
      diet?: string[];
      lifestyle?: string[];
    };
    all_findings?: any[];
    abnormal_values?: any[];
    warning_signs?: string[];
    follow_up?: any;
  };
  comprehensive_analysis?: {
    diagnosis?: {
      primary?: string | { name?: string; icd_code?: string; severity?: string };
      differential?: Array<{ diagnosis: string }>;
    };
    treatment_plan?: {
      medications?: Array<{
        name?: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        route?: string;
        timing?: string;
        purpose?: string;
        side_effects_to_watch?: string[];
      } | string>;
      non_pharmacological?: {
        rest?: string;
        activity_restrictions?: string;
        physical_therapy?: string;
        wound_care?: string;
        precautions?: string[];
      };
      lifestyle_modifications?: {
        diet?: {
          foods_to_eat?: string[];
          foods_to_avoid?: string[];
          meal_timing?: string;
          caloric_intake?: string;
        };
        hydration?: string;
        sleep?: string;
        exercise?: string;
        stress_management?: string;
        occupational_restrictions?: string;
      };
      monitoring?: {
        parameters?: string[];
        frequency?: string;
        action_if_abnormal?: string;
      };
    };
    danger_signs?: Array<{
      sign?: string;
      action?: string;
      when_to_call_911?: boolean;
    }>;
    warning_signs?: string[];
    follow_up?: {
      visit_timing?: string;
      visit_type?: string;
      specialist_needed?: string;
      repeat_tests?: Array<{ test?: string; timing?: string }>;
      recovery_timeline?: string;
      return_to_work?: string;
    };
    patient_education?: string | {
      condition_explanation?: string;
      why_treatment?: string;
      lifestyle_impact?: string;
      prognosis?: string;
      resume_normal_activities?: string;
    };
  };
}

// Helper to safely convert any value to string
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    if ('name' in value) return safeString(value.name);
    if (Array.isArray(value)) return value.map(safeString).join(', ');
    return JSON.stringify(value);
  }
  return String(value);
};

const ReportResults = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const result = (location.state as { result?: ReportAnalysisResult } | null)?.result;

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">No report data found</h1>
          <p className="text-sm text-slate-600">
            Please upload a report first so we can analyze it.
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

  // Extract data from multiple sources
  const comprehensive = result?.comprehensive_analysis;
  const finalReport = result?.final_report;
  const biobert = result?.biobert;
  
  // Get treatment plan from both sources - handle different structures
  const comprehensiveTreatmentPlan = comprehensive?.treatment_plan;
  const finalReportTreatmentPlan = finalReport?.treatment_plan;
  const treatmentPlan = comprehensiveTreatmentPlan || finalReportTreatmentPlan;

  // Extract diagnosis
  let diagnosis = '';
  if (comprehensive?.diagnosis?.primary) {
    diagnosis = safeString(comprehensive.diagnosis.primary);
  } else if (finalReport?.diagnosis) {
    diagnosis = safeString(finalReport.diagnosis);
  } else if (biobert?.diagnosis) {
    diagnosis = safeString(biobert.diagnosis);
  } else {
    diagnosis = 'Diagnosis analysis in progress...';
  }

  // Extract medications from multiple sources
  const medications = (comprehensiveTreatmentPlan?.medications || finalReportTreatmentPlan?.medications || []) as any[];
  const biobertMeds = biobert?.medications || [];
  const hasMedications = medications.length > 0 || biobertMeds.length > 0;

  // Extract patient summary/education - handle both string and object
  let patientSummaryText = '';
  let patientEducationObj: any = null;
  
  // Check final_report.patient_summary first
  if (finalReport?.patient_summary) {
    if (typeof finalReport.patient_summary === 'string') {
      patientSummaryText = finalReport.patient_summary;
    } else if (typeof finalReport.patient_summary === 'object') {
      patientEducationObj = finalReport.patient_summary;
    }
  }
  
  // Check comprehensive_analysis.patient_education
  if (!patientSummaryText && !patientEducationObj && comprehensive?.patient_education) {
    if (typeof comprehensive.patient_education === 'string') {
      patientSummaryText = comprehensive.patient_education;
    } else if (typeof comprehensive.patient_education === 'object') {
      patientEducationObj = comprehensive.patient_education;
    }
  }
  
  // Format patient education object
  if (patientEducationObj && typeof patientEducationObj === 'object') {
    const parts: string[] = [];
    if (patientEducationObj.condition_explanation) parts.push(`Condition: ${safeString(patientEducationObj.condition_explanation)}`);
    if (patientEducationObj.why_treatment) parts.push(`Treatment: ${safeString(patientEducationObj.why_treatment)}`);
    if (patientEducationObj.lifestyle_impact) parts.push(`Lifestyle: ${safeString(patientEducationObj.lifestyle_impact)}`);
    if (patientEducationObj.prognosis) parts.push(`Prognosis: ${safeString(patientEducationObj.prognosis)}`);
    if (patientEducationObj.resume_normal_activities) parts.push(`Resume Activities: ${safeString(patientEducationObj.resume_normal_activities)}`);
    if (parts.length > 0) {
      patientSummaryText = parts.join('\n\n');
    }
  }

  // Extract diet information - check comprehensive first, then final_report
  const dietInfo = comprehensiveTreatmentPlan?.lifestyle_modifications?.diet;
  const hydration = comprehensiveTreatmentPlan?.lifestyle_modifications?.hydration;
  const sleep = comprehensiveTreatmentPlan?.lifestyle_modifications?.sleep;
  const exercise = comprehensiveTreatmentPlan?.lifestyle_modifications?.exercise;
  const stressManagement = comprehensiveTreatmentPlan?.lifestyle_modifications?.stress_management;
  const finalReportDiet = Array.isArray(finalReportTreatmentPlan?.diet) ? finalReportTreatmentPlan.diet : undefined;

  // Extract non-pharmacological treatment
  const nonPharma = comprehensiveTreatmentPlan?.non_pharmacological;
  const activityRestrictions = nonPharma?.activity_restrictions;
  const rest = nonPharma?.rest;
  const precautions = nonPharma?.precautions || [];

  // Extract monitoring instructions
  const monitoring = comprehensiveTreatmentPlan?.monitoring;

  // Extract danger signs and warnings
  const dangerSigns = comprehensive?.danger_signs || [];
  const dangerAlerts = finalReport?.danger_alerts || [];
  const warningSigns = comprehensive?.warning_signs || finalReport?.warning_signs || [];

  // Extract follow-up information
  const followUp = comprehensive?.follow_up || finalReport?.follow_up;

  // Extract issues found
  const issuesFound = finalReport?.all_findings || (comprehensive as any)?.issues_found || [];
  const abnormalValues = finalReport?.abnormal_values || (comprehensive as any)?.abnormal_values || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-emerald-50/30 py-10 px-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b-2 border-slate-300 pb-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.3em]">
            Medical Diagnostic Report
          </p>
          <h1 className="text-4xl font-bold text-slate-900">Complete Medical Report</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Comprehensive analysis of your medical report. Please follow all instructions carefully and consult with your healthcare provider for final medical advice.
          </p>
        </div>

        {/* DIAGNOSIS - MAIN FOCUS */}
        <Card className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6 shadow-lg rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-blue-900 mb-3">Diagnosis</h2>
              <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-2xl font-bold text-slate-900">
                  {diagnosis}
                </p>
              </div>
              
              {/* BioBERT Extracted Entities */}
              {biobert && (biobert.diseases?.length > 0 || biobert.medications?.length > 0 || biobert.symptoms?.length > 0) && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Extracted Information</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {biobert.diseases && biobert.diseases.length > 0 && (
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <p className="font-semibold text-blue-700">Diseases:</p>
                        <p className="text-slate-600">{biobert.diseases.join(', ')}</p>
                      </div>
                    )}
                    {biobert.medications && biobert.medications.length > 0 && (
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <p className="font-semibold text-blue-700">Medications:</p>
                        <p className="text-slate-600">{biobert.medications.join(', ')}</p>
                      </div>
                    )}
                    {biobert.symptoms && biobert.symptoms.length > 0 && (
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <p className="font-semibold text-blue-700">Symptoms:</p>
                        <p className="text-slate-600">{biobert.symptoms.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* PATIENT SUMMARY / EDUCATION */}
        {patientSummaryText && (
          <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-md rounded-2xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-3">
              Understanding Your Condition
            </h2>
            <div className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">
              {patientSummaryText}
            </div>
          </Card>
        )}

        {/* MEDICATIONS - DETAILED */}
        {hasMedications && (
          <Card className="rounded-2xl border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-white p-6 shadow-md">
            <div className="flex items-center gap-3 text-blue-600 mb-5">
              <Pill className="h-6 w-6" />
              <h3 className="text-2xl font-bold">Medications & Tablets</h3>
            </div>
            <div className="space-y-4">
              {medications.length > 0 && medications.map((med: any, idx: number) => {
                if (typeof med === 'string') {
                  return (
                    <div key={idx} className="bg-white p-4 rounded-lg border-l-4 border-blue-400">
                      <p className="font-semibold text-slate-900 text-base">{med}</p>
                    </div>
                  );
                }
                if (typeof med === 'object' && med !== null) {
                  const medName = med.name || med.medication || med.drug || '';
                  if (!medName) return null;
                  
                  return (
                    <div key={idx} className="bg-white p-5 rounded-lg border-l-4 border-blue-500 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-lg font-bold text-slate-900">{safeString(medName)}</h4>
                        {med.purpose && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {safeString(med.purpose)}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {med.dosage && (
                          <div>
                            <p className="font-semibold text-slate-700">Dosage:</p>
                            <p className="text-slate-900">{safeString(med.dosage)}</p>
                          </div>
                        )}
                        {med.frequency && (
                          <div>
                            <p className="font-semibold text-slate-700">Frequency:</p>
                            <p className="text-slate-900">{safeString(med.frequency)}</p>
                          </div>
                        )}
                        {med.duration && (
                          <div>
                            <p className="font-semibold text-slate-700">Duration:</p>
                            <p className="text-slate-900">{safeString(med.duration)}</p>
                          </div>
                        )}
                        {med.route && (
                          <div>
                            <p className="font-semibold text-slate-700">Route:</p>
                            <p className="text-slate-900">{safeString(med.route)}</p>
                          </div>
                        )}
                        {med.timing && (
                          <div className="md:col-span-2">
                            <p className="font-semibold text-slate-700">Special Instructions:</p>
                            <p className="text-slate-900">{safeString(med.timing)}</p>
                          </div>
                        )}
                      </div>
                      {med.side_effects_to_watch && med.side_effects_to_watch.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-amber-200">
                          <p className="font-semibold text-amber-700 mb-2">⚠️ Side Effects to Watch:</p>
                          <ul className="space-y-1">
                            {med.side_effects_to_watch.map((effect: string, i: number) => (
                              <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                                <span className="text-amber-600 mt-1">•</span>
                                <span>{safeString(effect)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
              {biobertMeds.length > 0 && medications.length === 0 && (
                <div className="space-y-2">
                  {biobertMeds.map((med: string, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-lg border-l-4 border-blue-400">
                      <p className="font-semibold text-slate-900">{med}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* DIET & NUTRITION - DETAILED */}
        <Card className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-md">
          <div className="flex items-center gap-3 text-emerald-600 mb-5">
            <Utensils className="h-6 w-6" />
            <h3 className="text-2xl font-bold">Diet & Nutrition Guidelines</h3>
          </div>
          <div className="space-y-4">
            {dietInfo?.foods_to_eat && dietInfo.foods_to_eat.length > 0 && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-emerald-500">
                <p className="font-semibold text-emerald-800 mb-2">✅ Foods to Eat:</p>
                <ul className="space-y-1">
                  {dietInfo.foods_to_eat.map((food: string, idx: number) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-emerald-500 mt-1">•</span>
                      <span>{safeString(food)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {dietInfo?.foods_to_avoid && dietInfo.foods_to_avoid.length > 0 && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-red-400">
                <p className="font-semibold text-red-800 mb-2">❌ Foods to Avoid:</p>
                <ul className="space-y-1">
                  {dietInfo.foods_to_avoid.map((food: string, idx: number) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{safeString(food)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(dietInfo?.meal_timing || dietInfo?.caloric_intake) && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-emerald-400">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {dietInfo.meal_timing && (
                    <div>
                      <p className="font-semibold text-slate-700">Meal Timing:</p>
                      <p className="text-slate-900">{dietInfo.meal_timing}</p>
                    </div>
                  )}
                  {dietInfo.caloric_intake && (
                    <div>
                      <p className="font-semibold text-slate-700">Caloric Intake:</p>
                      <p className="text-slate-900">{dietInfo.caloric_intake}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {hydration && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-blue-400">
                <p className="font-semibold text-slate-700 mb-1">💧 Hydration:</p>
                <p className="text-slate-900">{safeString(hydration)}</p>
              </div>
            )}
            {finalReportDiet && Array.isArray(finalReportDiet) && finalReportDiet.length > 0 && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-emerald-400">
                <p className="font-semibold text-emerald-800 mb-2">Diet Recommendations:</p>
                <ul className="space-y-1">
                  {finalReportDiet.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-emerald-500 mt-1">•</span>
                      <span>{safeString(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(!dietInfo && !hydration && (!finalReportDiet || finalReportDiet.length === 0)) && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-emerald-400">
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Stay hydrated - drink plenty of water (8-10 glasses per day)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Eat light, nutritious meals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Avoid spicy, oily, or heavy foods</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Include fresh fruits and vegetables in your diet</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* LIFESTYLE MODIFICATIONS */}
        {(sleep || exercise || stressManagement || activityRestrictions || rest || precautions.length > 0) && (
          <Card className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-md">
            <div className="flex items-center gap-3 text-purple-600 mb-5">
              <Bed className="h-6 w-6" />
              <h3 className="text-2xl font-bold">Lifestyle & Activity Guidelines</h3>
            </div>
            <div className="space-y-4">
              {rest && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-purple-400">
                  <p className="font-semibold text-slate-700 mb-1">🛌 Rest:</p>
                  <p className="text-slate-900">{safeString(rest)}</p>
                </div>
              )}
              {sleep && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-purple-400">
                  <p className="font-semibold text-slate-700 mb-1">😴 Sleep:</p>
                  <p className="text-slate-900">{safeString(sleep)}</p>
                </div>
              )}
              {activityRestrictions && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-orange-400">
                  <p className="font-semibold text-slate-700 mb-1">🚫 Activity Restrictions:</p>
                  <p className="text-slate-900">{safeString(activityRestrictions)}</p>
                </div>
              )}
              {exercise && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-green-400">
                  <p className="font-semibold text-slate-700 mb-1">🏃 Exercise:</p>
                  <p className="text-slate-900">{safeString(exercise)}</p>
                </div>
              )}
              {stressManagement && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-blue-400">
                  <p className="font-semibold text-slate-700 mb-1">🧘 Stress Management:</p>
                  <p className="text-slate-900">{safeString(stressManagement)}</p>
                </div>
              )}
              {precautions.length > 0 && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-amber-400">
                  <p className="font-semibold text-amber-800 mb-2">⚠️ Precautions:</p>
                  <ul className="space-y-1">
                    {precautions.map((precaution: string, idx: number) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="text-amber-600 mt-1">•</span>
                        <span>{safeString(precaution)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* MONITORING INSTRUCTIONS */}
        {monitoring && (
          <Card className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-md">
            <div className="flex items-center gap-3 text-amber-600 mb-5">
              <Activity className="h-6 w-6" />
              <h3 className="text-2xl font-bold">What to Monitor</h3>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-amber-400 space-y-3">
              {monitoring.parameters && monitoring.parameters.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 mb-2">Monitor These Parameters:</p>
                  <ul className="space-y-1">
                    {monitoring.parameters.map((param: string, idx: number) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{safeString(param)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {monitoring.frequency && (
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Frequency:</p>
                  <p className="text-slate-900">{safeString(monitoring.frequency)}</p>
                </div>
              )}
              {monitoring.action_if_abnormal && (
                <div>
                  <p className="font-semibold text-red-700 mb-1">⚠️ If Abnormal:</p>
                  <p className="text-red-900">{safeString(monitoring.action_if_abnormal)}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ISSUES FOUND */}
        {issuesFound.length > 0 && (
          <Card className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 shadow-md">
            <h3 className="text-lg font-bold text-rose-700 mb-4">Issues Found</h3>
            <div className="space-y-2">
              {issuesFound.map((issue: any, idx: number) => (
                <div key={idx} className="bg-white p-3 rounded-lg border-l-4 border-rose-400">
                  <p className="text-slate-900">
                    {typeof issue === 'string' ? issue : safeString(issue.issue || issue)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ABNORMAL VALUES */}
        {abnormalValues.length > 0 && (
          <Card className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-md">
            <h3 className="text-lg font-bold text-amber-700 mb-4">Abnormal Values</h3>
            <div className="space-y-2">
              {abnormalValues.map((value: any, idx: number) => (
                <div key={idx} className="bg-white p-3 rounded-lg border-l-4 border-amber-400">
                  <p className="text-slate-900">{safeString(value)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* DANGER SIGNS & WHEN TO CONSULT DOCTOR */}
        {(dangerSigns.length > 0 || dangerAlerts.length > 0 || warningSigns.length > 0 || followUp) && (
          <Card className="rounded-2xl border-2 border-red-400 bg-red-50 p-6 shadow-md">
            <div className="flex items-center gap-3 text-red-600 mb-5">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-2xl font-bold">Emergency Warning Signs & Follow-up</h3>
            </div>
            <div className="space-y-4">
              {dangerSigns.length > 0 && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                  <p className="font-bold text-red-800 mb-3">🚨 Seek Immediate Medical Attention If:</p>
                  <ul className="space-y-2">
                    {dangerSigns.map((sign: any, idx: number) => (
                      <li key={idx} className="text-sm text-red-900">
                        <div className="flex items-start gap-2">
                          <span className="text-red-600 mt-1 font-bold">⚠</span>
                          <div className="flex-1">
                            <p className="font-semibold">{safeString(sign.sign || sign)}</p>
                            {sign.action && (
                              <p className="text-red-800 mt-1">{safeString(sign.action)}</p>
                            )}
                            {sign.when_to_call_911 && (
                              <p className="text-red-700 font-bold mt-1">→ Call 911 immediately!</p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {warningSigns.length > 0 && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
                  <p className="font-bold text-orange-800 mb-2">⚠️ Warning Signs:</p>
                  <ul className="space-y-1">
                    {warningSigns.map((sign: string, idx: number) => (
                      <li key={idx} className="text-sm text-orange-900 flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        <span>{safeString(sign)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {dangerAlerts.length > 0 && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                  <p className="font-bold text-red-800 mb-2">⚠️ Important Alerts:</p>
                  <ul className="space-y-1">
                    {dangerAlerts.map((alert: string, idx: number) => (
                      <li key={idx} className="text-sm text-red-900 flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>{safeString(alert)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {followUp && (
                <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                  <p className="font-bold text-blue-800 mb-3">📅 Follow-up Instructions:</p>
                  <div className="space-y-2 text-sm">
                    {followUp.visit_timing && (
                      <div>
                        <p className="font-semibold text-slate-700">Next Visit:</p>
                        <p className="text-slate-900">{safeString(followUp.visit_timing)}</p>
                      </div>
                    )}
                    {followUp.visit_type && (
                      <div>
                        <p className="font-semibold text-slate-700">Visit Type:</p>
                        <p className="text-slate-900">{safeString(followUp.visit_type)}</p>
                      </div>
                    )}
                    {followUp.specialist_needed && (
                      <div>
                        <p className="font-semibold text-slate-700">Specialist Consultation:</p>
                        <p className="text-slate-900">{safeString(followUp.specialist_needed)}</p>
                      </div>
                    )}
                    {followUp.recovery_timeline && (
                      <div>
                        <p className="font-semibold text-slate-700">Expected Recovery Timeline:</p>
                        <p className="text-slate-900">{safeString(followUp.recovery_timeline)}</p>
                      </div>
                    )}
                    {followUp.return_to_work && (
                      <div>
                        <p className="font-semibold text-slate-700">Return to Work:</p>
                        <p className="text-slate-900">{safeString(followUp.return_to_work)}</p>
                      </div>
                    )}
                    {followUp.repeat_tests && Array.isArray(followUp.repeat_tests) && followUp.repeat_tests.length > 0 && (
                      <div>
                        <p className="font-semibold text-slate-700 mb-2">Repeat Tests:</p>
                        <ul className="space-y-1">
                          {followUp.repeat_tests.map((test: any, idx: number) => (
                            <li key={idx} className="text-slate-700 flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>
                                {safeString(test.test || test)}
                                {test.timing && ` - ${safeString(test.timing)}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
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
