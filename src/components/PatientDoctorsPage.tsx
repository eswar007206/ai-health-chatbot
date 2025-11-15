/**
 * PatientDoctorsPage.tsx
 * Location: src/components/PatientDoctorsPage.tsx
 * 
 * A fully client-side component for displaying nearby doctors and clinics.
 * NO routing is added - integrate this component manually where needed.
 * All data is static/dummy; distances computed client-side using Haversine formula.
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import {
  Search,
  Filter,
  Star,
  MapPin,
  Phone,
  Calendar,
  ArrowUpDown,
  X,
  Navigation,
  User,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AvailableSlot {
  dateTime: string; // ISO 8601 format
  available: boolean;
}

interface DoctorEntry {
  id: string;
  name: string;
  clinicName?: string;
  specialty: string;
  phone: string;
  rating: number; // 0-5
  address: string;
  lat: number;
  lon: number;
  availableSlots: AvailableSlot[];
  abhaLinked?: boolean;
  image?: string;
  bio?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Haversine formula to calculate distance between two coordinates (in km)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
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

/**
 * Format phone with masking (e.g., +91-98765-43210 -> +91-98***-**210)
 */
function maskPhone(phone: string): string {
  if (phone.length <= 5) return phone;
  const start = phone.slice(0, 5);
  const end = phone.slice(-2);
  return start + "***" + end;
}

/**
 * Render star rating
 */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300"
          }`}
        />
      ))}
      <span className="text-xs font-medium text-slate-600">({rating.toFixed(1)})</span>
    </div>
  );
}

// ============================================================================
// REAL DATA - Loaded from Supabase
// ============================================================================

// Sample user coordinates (Bengaluru, India - Indiranagar area)
const SAMPLE_USER_LAT = 12.972;
const SAMPLE_USER_LON = 77.6421;

// Empty array - will be populated from database
const DUMMY_DOCTORS: DoctorEntry[] = [];

// ============================================================================
// DETAIL VIEW (SLIDE-OVER / MODAL)
// ============================================================================

interface DoctorDetailViewProps {
  doctor: DoctorEntry;
  onClose: () => void;
  onBookAppointment: (doctorId: string, slot: AvailableSlot) => void;
}

function DoctorDetailView({
  doctor,
  onClose,
  onBookAppointment,
}: DoctorDetailViewProps) {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const { toast } = useToast();

  const handleConfirmBooking = () => {
    if (!selectedSlot) {
      toast({
        title: "Please select a slot",
        description: "Choose an available time slot to book.",
        variant: "destructive",
      });
      return;
    }

    onBookAppointment(doctor.id, selectedSlot);
    setSelectedSlot(null);
  };

  const formattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 md:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity md:bg-transparent"
          onClick={onClose}
        />

        {/* Modal/Slide-over */}
        <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl md:rounded-lg md:shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 md:rounded-t-lg">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {doctor.name}
              </h2>
              {doctor.clinicName && (
                <p className="text-sm text-slate-600">{doctor.clinicName}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(100vh-200px)] md:h-auto md:max-h-[70vh]">
            <div className="space-y-6 px-6 py-6">
              {/* Specialty & Rating */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-100 text-blue-800">
                    {doctor.specialty}
                  </Badge>
                  {doctor.abhaLinked && (
                    <Badge className="bg-green-100 text-green-800">
                      ABHA Linked
                    </Badge>
                  )}
                </div>
                <StarRating rating={doctor.rating} />
              </div>

              {/* Bio */}
              {doctor.bio && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-900">About</h3>
                  <p className="text-sm text-slate-700">{doctor.bio}</p>
                </div>
              )}

              {/* Address */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">Address</h3>
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 flex-shrink-0 text-slate-400" />
                  <p className="text-sm text-slate-700">{doctor.address}</p>
                </div>
                <p className="text-xs text-slate-500 ml-8">
                  Coordinates: {doctor.lat.toFixed(4)}, {doctor.lon.toFixed(4)}
                </p>
              </div>

              {/* Contact */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">Contact</h3>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a
                    href={`tel:${doctor.phone}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {doctor.phone}
                  </a>
                </div>
              </div>

              {/* Available Slots */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Available Slots</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {doctor.availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        slot.available && setSelectedSlot(slot)
                      }
                      disabled={!slot.available}
                      className={`rounded-lg border-2 p-3 text-left text-sm transition ${
                        selectedSlot === slot
                          ? "border-blue-600 bg-blue-50"
                          : slot.available
                          ? "border-slate-200 hover:border-blue-400"
                          : "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          {formattedDate(slot.dateTime)}
                        </span>
                      </div>
                      {!slot.available && (
                        <span className="text-xs text-slate-500">Booked</span>
                      )}
                      {slot.available && selectedSlot === slot && (
                        <span className="text-xs font-medium text-blue-600">
                          Selected
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">Location</h3>
                <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                  <div>
                    <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                    <p className="text-sm font-medium text-slate-700">
                      Map View
                    </p>
                    <p className="text-xs text-slate-600">
                      {doctor.address}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Lat: {doctor.lat.toFixed(4)} | Lon:{" "}
                      {doctor.lon.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 md:rounded-b-lg">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                onClick={handleConfirmBooking}
              >
                <Calendar className="h-4 w-4" />
                Confirm Booking
              </Button>
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PatientDoctorsPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorEntry[]>(DUMMY_DOCTORS);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [distanceFilter, setDistanceFilter] = useState<string>("any");
  const [sortBy, setSortBy] = useState<string>("distance");
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorEntry | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const { toast } = useToast();

  // Load patient's requests to show status
  useEffect(() => {
    if (!user) return;

    const loadMyRequests = async () => {
      const { data, error } = await supabase
        .from("doctor_requests")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setMyRequests(data);
      }
    };

    loadMyRequests();

    // Set up real-time subscription for status updates
    const subscription = supabase
      .channel("doctor_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doctor_requests",
          filter: `patient_id=eq.${user.id}`,
        },
        (payload) => {
          loadMyRequests();
          if (payload.eventType === "UPDATE" && payload.new.status === "rejected") {
            toast({
              title: "Request Rejected",
              description: "Your appointment request was rejected by the doctor.",
              variant: "destructive",
            });
          } else if (payload.eventType === "UPDATE" && payload.new.status === "accepted") {
            toast({
              title: "Request Accepted!",
              description: "Your appointment request has been accepted by the doctor.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, toast]);

  // Compute distances and filter
  const doctorsWithDistance = useMemo(() => {
    return doctors.map((doctor) => ({
      ...doctor,
      distanceKm: calculateDistance(
        SAMPLE_USER_LAT,
        SAMPLE_USER_LON,
        doctor.lat,
        doctor.lon
      ),
    }));
  }, [doctors]);

  // Get unique specialties
  const specialties = useMemo(() => {
    return Array.from(new Set(doctors.map((d) => d.specialty))).sort();
  }, [doctors]);

  // Filter
  const filteredDoctors = useMemo(() => {
    return doctorsWithDistance.filter((doctor) => {
      const matchesSearch =
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.clinicName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSpecialty =
        specialtyFilter === "all" || doctor.specialty === specialtyFilter;

      const maxDistance =
        distanceFilter === "any"
          ? Infinity
          : distanceFilter === "1km"
          ? 1
          : distanceFilter === "5km"
          ? 5
          : distanceFilter === "10km"
          ? 10
          : Infinity;

      const matchesDistance = doctor.distanceKm <= maxDistance;

      return matchesSearch && matchesSpecialty && matchesDistance;
    });
  }, [doctorsWithDistance, searchQuery, specialtyFilter, distanceFilter]);

  // Sort
  const sortedDoctors = useMemo(() => {
    const sorted = [...filteredDoctors];
    if (sortBy === "distance") {
      sorted.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === "rating") {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [filteredDoctors, sortBy]);

  // Handle booking - Create real request in database
  const handleBookAppointment = async (doctorId: string, slot: AvailableSlot) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book an appointment.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get patient profile data
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Get doctor user ID (for now, we'll use a mapping or get from doctor list)
      // In a real system, doctorId would map to actual user IDs
      // For now, we'll create a request with the doctor's email or ID from the doctor list
      const selectedDoctor = doctors.find(d => d.id === doctorId);
      if (!selectedDoctor) {
        toast({
          title: "Error",
          description: "Doctor not found.",
          variant: "destructive",
        });
        return;
      }

      // Get or create doctor entry in doctors table
      let doctorEntry = null;
      const { data: existingDoctor } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", doctorId)
        .single();

      if (!existingDoctor) {
        // Create doctor entry if it doesn't exist
        const { data: newDoctor, error: createError } = await supabase
          .from("doctors")
          .insert({
            id: doctorId,
            name: selectedDoctor.name,
            clinic_name: selectedDoctor.clinicName,
            specialty: selectedDoctor.specialty,
            phone: selectedDoctor.phone,
            address: selectedDoctor.address,
            lat: selectedDoctor.lat,
            lon: selectedDoctor.lon,
            rating: selectedDoctor.rating,
            abha_linked: selectedDoctor.abhaLinked || false,
            bio: selectedDoctor.bio,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating doctor entry:", createError);
        } else {
          doctorEntry = newDoctor;
        }
      } else {
        doctorEntry = existingDoctor;
      }

      // Get doctor user ID - try to find a doctor user or use the first available
      let doctorUserId: string | null = doctorEntry?.user_id || null;

      if (!doctorUserId) {
        // If no user_id linked, find any doctor user
        const { data: doctorUsers } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("role", "doctor")
          .limit(1)
          .single();

        if (doctorUsers) {
          doctorUserId = doctorUsers.id;
          // Link the doctor entry to the user
          if (doctorEntry) {
            await supabase
              .from("doctors")
              .update({ user_id: doctorUserId })
              .eq("id", doctorId);
          }
        }
      }

      if (!doctorUserId) {
        toast({
          title: "Error",
          description: "No doctors available. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      // Create the request
      const { data: request, error } = await supabase
        .from("doctor_requests")
        .insert({
          patient_id: user.id,
          doctor_id: doctorUserId,
          doctor_entry_id: doctorId,
          patient_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Patient",
          patient_email: user.email || "",
          patient_phone: profile?.phone || user.user_metadata?.phone || "",
          patient_age: null, // Can be added later
          patient_gender: null, // Can be added later
          abha_id: profile?.abha_id || user.user_metadata?.abha_id || "",
          symptoms_summary: `Appointment requested for ${selectedDoctor.name} at ${new Date(slot.dateTime).toLocaleString()}`,
          appointment_date: slot.dateTime,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating request:", error);
        toast({
          title: "Booking Failed",
          description: error.message || "Failed to create booking request.",
          variant: "destructive",
        });
        return;
      }

      const slotKey = `${doctorId}-${slot.dateTime}`;
      setBookedSlots([...bookedSlots, slotKey]);

      toast({
        title: "Request Sent!",
        description: `Your appointment request has been sent to ${selectedDoctor.name}. You'll be notified when they respond.`,
      });

      setSelectedDoctor(null);
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Name",
      "Specialty",
      "Clinic",
      "Rating",
      "Address",
      "Distance (km)",
      "Phone",
    ];
    const rows = sortedDoctors.map((d) => [
      d.name,
      d.specialty,
      d.clinicName || "—",
      d.rating,
      d.address,
      d.distanceKm.toFixed(1),
      maskPhone(d.phone),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `nearby-doctors-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Nearby Doctors & Clinics
              </h1>
              <p className="text-sm text-slate-600">
                Doctors near you — shown using your ABHA ID.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm">
              <span className="text-slate-600">Your ABHA ID:</span>
              <span className="font-semibold text-slate-900">
                {user?.abhaId || "ABHA-1234-5678-90"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* My Requests Status Section */}
        {myRequests.length > 0 && (
          <Card className="mb-6 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                My Appointment Requests
              </CardTitle>
              <CardDescription>
                Track the status of your appointment requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myRequests.slice(0, 3).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">
                          {request.symptoms_summary?.split(" for ")[1]?.split(" at ")[0] || "Doctor"}
                        </p>
                        <Badge
                          variant={
                            request.status === "accepted"
                              ? "secondary"
                              : request.status === "rejected"
                              ? "destructive"
                              : "default"
                          }
                          className="gap-1"
                        >
                          {request.status === "pending" && <Clock className="h-3 w-3" />}
                          {request.status === "accepted" && <CheckCircle2 className="h-3 w-3" />}
                          {request.status === "rejected" && <AlertCircle className="h-3 w-3" />}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        {request.appointment_date
                          ? new Date(request.appointment_date).toLocaleString()
                          : "Date TBD"}
                      </p>
                      {request.rejection_reason && (
                        <p className="mt-1 text-xs text-red-600">
                          Reason: {request.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <Card className="mb-6 border-slate-200">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-5 md:items-end">
              {/* Search */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 md:col-span-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search doctor, clinic, specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Specialty Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="All Specialties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    {specialties.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Distance Filter */}
              <Select value={distanceFilter} onValueChange={setDistanceFilter}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Distance</SelectItem>
                  <SelectItem value="1km">Within 1 km</SelectItem>
                  <SelectItem value="5km">Within 5 km</SelectItem>
                  <SelectItem value="10km">Within 10 km</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-slate-400" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Export Button */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export as CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {sortedDoctors.length === 0 ? (
          <Card className="border-slate-200 text-center">
            <CardContent className="py-12">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <p className="text-slate-600">
                No doctors found matching your filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedDoctors.map((doctor) => (
              <Card
                key={doctor.id}
                className="cursor-pointer border-slate-200 transition-all hover:border-blue-300 hover:shadow-md"
              >
                <CardContent className="p-0">
                  <div className="grid gap-4 p-4 md:grid-cols-3 md:items-center">
                    {/* Left: Info */}
                    <div className="md:col-span-2 space-y-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {doctor.name}
                        </h3>
                        {doctor.clinicName && (
                          <p className="text-xs text-slate-600">
                            {doctor.clinicName}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 md:gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            {doctor.specialty}
                          </Badge>
                          {doctor.abhaLinked && (
                            <Badge className="bg-green-100 text-green-800">
                              ABHA Linked
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <StarRating rating={doctor.rating} />
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-1">
                        {doctor.address}
                      </p>
                    </div>

                    {/* Right: Distance & Actions */}
                    <div className="flex flex-col gap-2 md:col-span-1 md:items-end">
                      <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {doctor.distanceKm.toFixed(1)} km
                      </div>

                      <div className="flex flex-wrap gap-2 md:flex-col md:w-full">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 text-xs md:w-full"
                          onClick={() => setSelectedDoctor(doctor)}
                        >
                          <Calendar className="h-3 w-3" />
                          Book
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 gap-1 text-xs md:w-full"
                          onClick={() => window.open(`tel:${doctor.phone}`)}
                        >
                          <Phone className="h-3 w-3" />
                          Call
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 gap-1 text-xs md:w-full"
                          onClick={() =>
                            window.open(
                              `https://maps.google.com/maps?saddr=${SAMPLE_USER_LAT},${SAMPLE_USER_LON}&daddr=${doctor.lat},${doctor.lon}`,
                              "_blank"
                            )
                          }
                        >
                          <Navigation className="h-3 w-3" />
                          Directions
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700 text-xs md:w-full"
                          onClick={() => setSelectedDoctor(doctor)}
                        >
                          <User className="h-3 w-3" />
                          Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results Count */}
        <div className="mt-6 text-center text-sm text-slate-600">
          Showing {sortedDoctors.length} of {doctorsWithDistance.length} doctors
        </div>
      </main>

      {/* Detail Modal */}
      {selectedDoctor && (
        <DoctorDetailView
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onBookAppointment={handleBookAppointment}
        />
      )}
    </div>
  );
}
