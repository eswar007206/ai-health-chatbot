import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Calendar, Phone, Video, MapPin, Clock, Award, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const doctorInfo = {
  name: "Dr. Sarah Johnson",
  specialization: "General Physician",
  experience: "15+ years",
  qualification: "MBBS, MD",
  clinic: {
    name: "FeverEase Health Clinic",
    address: "No 394, Shubash Nagar TC Palaya Main Road Battarahalli, near SBI Bank, Subhash Nagar, Krishnarajapuram, Bengaluru, Karnataka 560049",
    areas: "Kithiganur and nearby areas",
    hours: "7:30 AM - 9:00 PM",
    phone: "080738 55116"
  }
};

export function DoctorConsultation() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Professional Doctor Consultation</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl p-6 md:p-8">
        <div className="grid gap-6">
          {/* Doctor Card */}
          <Card className="border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-3xl text-slate-900">{doctorInfo.name}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    <span className="font-semibold text-slate-700">{doctorInfo.specialization}</span> • {doctorInfo.experience} clinical experience
                  </CardDescription>
                </div>
                <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Verified
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Qualifications */}
              <div className="border-b border-slate-200 pb-6">
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  Qualifications
                </h4>
                <p className="text-slate-700">{doctorInfo.qualification}</p>
              </div>

              {/* Clinic Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900">Clinic Information</h4>
                
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h5 className="font-bold text-slate-900 mb-3">{doctorInfo.clinic.name}</h5>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Address</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{doctorInfo.clinic.address}</p>
                        <p className="text-sm text-slate-600 mt-1">Service Areas: {doctorInfo.clinic.areas}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Operating Hours</p>
                        <p className="text-sm text-slate-600">{doctorInfo.clinic.hours}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      <Phone className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Contact</p>
                        <a href={`tel:${doctorInfo.clinic.phone}`} className="text-sm text-blue-600 hover:underline">
                          {doctorInfo.clinic.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-slate-900 mb-3">Why Consult with Our Doctor?</h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    Licensed and verified medical professional
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    Personalized medical consultation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    Professional diagnosis and treatment plans
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    Prescription and follow-up care
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-slate-200 gap-3 p-6">
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg h-11 text-base gap-2"
                onClick={() => window.open(`tel:${doctorInfo.clinic.phone}`)}
              >
                <Phone className="h-4 w-4" />
                Call to Book
              </Button>
              <Button 
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-md hover:shadow-lg h-11 text-base gap-2"
              >
                <Video className="h-4 w-4" />
                Video Consultation
              </Button>
            </CardFooter>
          </Card>

          {/* Disclaimer */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="text-amber-600 flex-shrink-0 mt-0.5">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900">Important Notice</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    Always consult with a licensed healthcare provider for medical advice, diagnosis, or treatment. In case of emergency, call your local emergency services immediately.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}