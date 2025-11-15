import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { CheckCircle2, XCircle, Clock, User, Calendar, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingRequest {
  id: string;
  doctor_id: string;
  patient_id: string;
  slot_datetime: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  reason_for_visit: string;
  created_at: string;
  doctor: {
    name: string;
    specialty: string;
    clinic_name: string;
    phone: string;
  };
  patient: {
    email: string;
  };
}

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export function DoctorRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const userRole = user?.user_metadata?.role || "patient";
  const isDoctorView = userRole === "doctor";

  useEffect(() => {
    loadRequests();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel("booking_requests_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_requests" },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const loadRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from("booking_requests")
        .select("*");

      if (isDoctorView) {
        // For doctor view, just get all requests (no filtering)
        // The RLS policy will handle what they can see
      } else {
        // Patient view - see their own booking requests
        query = query.eq("patient_id", user.id);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading requests:", error);
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    requestId: string,
    newStatus: "accepted" | "rejected"
  ) => {
    try {
      const { error } = await supabase
        .from("booking_requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Appointment ${newStatus}`,
      });

      await loadRequests();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "all") return true;
    return req.status === filterStatus;
  });

  if (loading) {
    return <div className="p-8 text-center">Loading requests...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-gradient-to-b from-white to-slate-50">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {isDoctorView ? "Appointment Requests" : "My Bookings"}
        </h1>
        <p className="text-slate-600 mt-1">
          {isDoctorView
            ? "Manage appointment requests from patients"
            : "Track your appointment bookings and status"}
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "pending", "accepted", "rejected", "completed"].map(
          (status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              onClick={() => setFilterStatus(status)}
              className="capitalize"
            >
              {status}
            </Button>
          )
        )}
      </div>

      {/* Requests List */}
      <div className="grid gap-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              No {filterStatus !== "all" ? filterStatus : ""} requests found
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {isDoctorView ? "Patient Booking" : "Doctor Appointment"}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Request ID: {request.id.slice(0, 8)}...
                    </p>
                  </div>
                  <Badge
                    className={
                      STATUS_COLORS[
                        request.status as keyof typeof STATUS_COLORS
                      ]
                    }
                  >
                    {request.status.charAt(0).toUpperCase() +
                      request.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-slate-600 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Appointment Date
                    </p>
                    <p className="font-medium text-slate-900 mt-1">
                      {new Date(request.slot_datetime).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Booked On
                    </p>
                    <p className="font-medium text-slate-900 mt-1">
                      {new Date(request.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  {isDoctorView ? (
                    <div>
                      <p className="text-slate-600 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Patient ID
                      </p>
                      <p className="font-medium text-slate-900 mt-1">
                        {request.patient_id.slice(0, 8)}...
                      </p>
                    </div>
                  ) : null}
                </div>

                {request.reason_for_visit && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700">
                      Reason for visit:
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {request.reason_for_visit}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {isDoctorView && request.status === "pending" && (
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        handleStatusUpdate(request.id, "accepted")
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() => handleStatusUpdate(request.id, "rejected")}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}

                {!isDoctorView && request.status === "pending" && (
                  <div className="text-sm text-amber-600 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Waiting for doctor confirmation...
                  </div>
                )}

                {request.status === "accepted" && (
                  <div className="text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {isDoctorView
                      ? "You have accepted this appointment"
                      : "Doctor has accepted your appointment"}
                  </div>
                )}

                {request.status === "rejected" && (
                  <div className="text-sm text-red-600 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {isDoctorView
                      ? "You rejected this appointment"
                      : "Doctor has rejected your appointment request"}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
