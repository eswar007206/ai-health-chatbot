import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Star, MapPin, Phone, Calendar, X, Search, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  clinic_name: string;
  phone: string;
  rating: number;
  address: string;
  latitude: number;
  longitude: number;
  bio: string;
  abha_linked: boolean;
  image_url?: string;
}

interface AvailableSlot {
  id: string;
  slot_datetime: string;
  is_available: boolean;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function PatientDoctorsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [userLocation, setUserLocation] = useState({ lat: 12.972, lon: 77.6421 });

  // Load doctors from database
  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("is_available", true);

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error("Error loading doctors:", error);
      toast({
        title: "Error",
        description: "Failed to load doctors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from("doctor_slots")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("is_available", true)
        .gt("slot_datetime", new Date().toISOString());

      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      console.error("Error loading slots:", error);
      toast({
        title: "Error",
        description: "Failed to load available slots",
        variant: "destructive",
      });
    }
  };

  const handleDoctorSelect = async (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    await loadSlots(doctor.id);
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedSlot || !user) {
      toast({
        title: "Error",
        description: "Please select a slot",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("booking_requests").insert({
        doctor_id: selectedDoctor.id,
        patient_id: user.id,
        slot_id: selectedSlot.id,
        slot_datetime: selectedSlot.slot_datetime,
        status: "pending",
        reason_for_visit: "General consultation",
      });

      if (error) throw error;

      // Mark slot as unavailable
      await supabase
        .from("doctor_slots")
        .update({ is_available: false })
        .eq("id", selectedSlot.id);

      toast({
        title: "Success",
        description: "Appointment request sent! Doctor will review shortly.",
      });

      setSelectedDoctor(null);
      setSelectedSlot(null);
      await loadSlots(selectedDoctor.id);
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast({
        title: "Error",
        description: "Failed to book appointment",
        variant: "destructive",
      });
    }
  };

  const startVideoConsultation = () => {
    if (!selectedDoctor) {
      toast({
        title: "Error",
        description: "Please select a doctor first",
        variant: "destructive",
      });
      return;
    }
    
    navigate("/video-consultation", {
      state: { doctor: selectedDoctor },
    });
  };

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch =
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterSpecialty === "all" || doctor.specialty === filterSpecialty;
    return matchesSearch && matchesFilter;
  });

  const doctorsWithDistance = filteredDoctors.map((doctor) => ({
    ...doctor,
    distance: calculateDistance(
      userLocation.lat,
      userLocation.lon,
      doctor.latitude,
      doctor.longitude
    ),
  }));

  const sortedDoctors = doctorsWithDistance.sort(
    (a, b) => a.distance - b.distance
  );

  if (loading) {
    return <div className="p-8 text-center">Loading doctors...</div>;
  }

  return (
    <div className="flex h-screen gap-4 p-6 bg-gradient-to-b from-white to-slate-50">
      {/* Left Panel - Doctors List */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Find Doctors</h2>
          <Input
            placeholder="Search by name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-slate-300"
          />
          <select
            className="w-full p-2 border border-slate-300 rounded-lg"
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
          >
            <option value="all">All Specialties</option>
            <option value="General Physician">General Physician</option>
            <option value="Cardiologist">Cardiologist</option>
            <option value="Neurologist">Neurologist</option>
          </select>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {sortedDoctors.map((doctor) => (
              <Card
                key={doctor.id}
                className={`cursor-pointer transition-all ${
                  selectedDoctor?.id === doctor.id
                    ? "border-blue-500 bg-blue-50"
                    : "hover:border-blue-300"
                }`}
                onClick={() => handleDoctorSelect(doctor)}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900">{doctor.name}</h3>
                  <p className="text-sm text-slate-600">{doctor.specialty}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {doctor.distance.toFixed(1)} km
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(doctor.rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-slate-600">
                      {doctor.rating.toFixed(1)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Doctor Details & Booking */}
      {selectedDoctor ? (
        <div className="w-2/3 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedDoctor.name}</CardTitle>
                  <p className="text-sm text-slate-600">
                    {selectedDoctor.specialty}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDoctor(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">
                  About the Doctor
                </h4>
                <p className="text-slate-600">{selectedDoctor.bio}</p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Contact</h4>
                <div className="space-y-1 text-slate-600">
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {selectedDoctor.phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedDoctor.address}
                  </p>
                </div>
              </div>

              {selectedDoctor.abha_linked && (
                <Badge className="bg-green-100 text-green-800">
                  ABHA Linked
                </Badge>
              )}

              <div>
                <h4 className="font-semibold text-slate-900 mb-3">
                  Available Slots
                </h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2 pr-4">
                    {slots.length === 0 ? (
                      <p className="text-slate-500">No available slots</p>
                    ) : (
                      slots.map((slot) => (
                        <Button
                          key={slot.id}
                          variant={
                            selectedSlot?.id === slot.id ? "default" : "outline"
                          }
                          className="w-full justify-start"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(slot.slot_datetime).toLocaleString(
                            "en-IN"
                          )}
                        </Button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleBookAppointment}
                  disabled={!selectedSlot}
                >
                  Confirm Booking
                </Button>
                
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={startVideoConsultation}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Start Video Consultation (Demo)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="w-2/3 flex items-center justify-center text-slate-500">
          <p>Select a doctor to view details and book an appointment</p>
        </div>
      )}
    </div>
  );
}
