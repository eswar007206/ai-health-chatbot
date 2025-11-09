import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Calendar, Phone, Video } from "lucide-react";

const doctorInfo = {
  name: "Dr. Sarah Johnson",
  specialization: "General Physician",
  experience: "15+ years",
  clinic: {
    name: "FeverEase Health Clinic",
    address: "No 394, Shubash Nagar TC Palaya Main Road Battarahalli, near SBI Bank, Subhash Nagar, Krishnarajapuram, Bengaluru, Karnataka 560049",
    areas: "Kithiganur and nearby areas",
    hours: "7:30 AM - 9:00 PM",
    phone: "080738 55116"
  }
};

export function DoctorConsultation() {
  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold mb-8">Doctor Consultation</h2>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{doctorInfo.name}</CardTitle>
            <CardDescription>{doctorInfo.specialization} • {doctorInfo.experience} experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{doctorInfo.clinic.name}</h4>
              <p className="text-sm text-muted-foreground">{doctorInfo.clinic.address}</p>
              <p className="text-sm text-muted-foreground">Areas served: {doctorInfo.clinic.areas}</p>
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Hours: {doctorInfo.clinic.hours}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4" />
                <span className="text-sm">{doctorInfo.clinic.phone}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button className="flex-1">
              <Calendar className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
            <Button className="flex-1" variant="secondary">
              <Video className="mr-2 h-4 w-4" />
              Video Consultation
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}