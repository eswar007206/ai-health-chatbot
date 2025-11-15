import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  ArrowUpDown,
  X,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  FileText,
  ChevronRight,
} from "lucide-react";

interface HistoryEntry {
  date: string;
  note: string;
  doctor: string;
}

interface DoctorRequest {
  id: string;
  requestId?: string;
  abhaId?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  age?: number;
  gender?: string;
  phone?: string;
  symptomsSummary: string;
  history?: HistoryEntry[];
  requestedOn: string;
  appointmentDate?: string;
  status: "pending" | "accepted" | "rejected";
  rejectionReason?: string;
  attachments?: string[];
}

// Real data will be loaded from Supabase doctor_requests table
const DUMMY_REQUESTS: DoctorRequest[] = [];

function getStatusIcon(status: string) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "accepted":
      return <CheckCircle2 className="h-4 w-4" />;
    case "rejected":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return null;
  }
}

function getStatusColor(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "default";
    case "accepted":
      return "secondary";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

interface RequestDetailViewProps {
  request: DoctorRequest;
  onClose: () => void;
  onMarkAttended: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onDownloadPDF: (request: DoctorRequest) => void;
}

function RequestDetailView({
  request,
  onClose,
  onMarkAttended,
  onRejectRequest,
  onDownloadPDF,
}: RequestDetailViewProps) {
  const detailRef = useRef<HTMLDivElement>(null);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 md:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity md:bg-transparent"
          onClick={onClose}
        />

        {/* Modal/Slide-over */}
        <div
          ref={detailRef}
          className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl md:rounded-lg md:shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 md:rounded-t-lg">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {request.patientName}
              </h2>
              <p className="text-sm text-slate-600">Request ID: {request.requestId || request.id.substring(0, 8).toUpperCase()}</p>
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
              {/* Patient Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Patient Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <span className="text-sm font-semibold text-blue-600">
                        {request.age}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600">Age</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.age} years
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <span className="text-sm font-semibold text-purple-600">
                        {request.gender[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600">Gender</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.gender}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs font-medium text-slate-600">Phone</p>
                      <a
                        href={`tel:${request.phone}`}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        {request.phone}
                      </a>
                    </div>
                  </div>
                  {request.abhaId && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-600">ABHA ID</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {request.abhaId}
                        </p>
                      </div>
                    </div>
                  )}
                  {request.patientEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-600">Email</p>
                        <a
                          href={`mailto:${request.patientEmail}`}
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          {request.patientEmail}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Symptoms Summary */}
              <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">Symptoms Summary</h3>
                <p className="text-sm text-slate-700">{request.symptomsSummary}</p>
                <p className="text-xs text-slate-600">
                  <Calendar className="mb-0.5 inline h-3 w-3 mr-1" />
                  Requested on {request.requestedOn}
                  {request.appointmentDate && (
                    <> • Appointment: {new Date(request.appointmentDate).toLocaleString()}</>
                  )}
                </p>
              </div>

              {/* History Timeline */}
              {request.history.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Consultation History</h3>
                  <div className="space-y-3">
                    {request.history.map((entry, idx) => (
                      <div key={idx} className="flex gap-4 pb-3">
                        <div className="flex flex-col items-center">
                          <div className="h-3 w-3 rounded-full bg-blue-600" />
                          {idx < request.history.length - 1 && (
                            <div className="mt-1 h-8 w-0.5 bg-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {entry.doctor}
                          </p>
                          <p className="text-xs text-slate-600">{entry.date}</p>
                          <p className="mt-1 text-sm text-slate-700">{entry.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {request.attachments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">Attachments</h3>
                  <div className="space-y-2">
                    {request.attachments.map((attachment, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-600" />
                          <span className="text-sm font-medium text-slate-700">
                            {attachment}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(`data:application/pdf;base64,`, "_blank")
                          }
                          className="gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="text-xs">Download</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 md:rounded-b-lg">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => onDownloadPDF(request)}
              >
                <Download className="h-4 w-4" />
                Download PDF History
              </Button>
              {request.status === "pending" && (
                <>
                  <Button
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => onMarkAttended(request.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={() => {
                      const reason = prompt("Please provide a reason for rejection (optional):");
                      onRejectRequest(request.id, reason || undefined);
                    }}
                  >
                    <AlertCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </>
              )}
              {request.status === "accepted" && (
                <div className="flex-1 rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-sm font-medium text-green-800">Request Accepted</p>
                </div>
              )}
              {request.status === "rejected" && (
                <div className="flex-1 rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-sm font-medium text-red-800">Request Rejected</p>
                  {request.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">{request.rejectionReason}</p>
                  )}
                </div>
              )}
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DoctorRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DoctorRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [selectedRequest, setSelectedRequest] = useState<DoctorRequest | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load requests from database
  useEffect(() => {
    if (!user) return;

    const loadRequests = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("doctor_requests")
          .select("*")
          .eq("doctor_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading requests:", error);
          toast({
            title: "Error",
            description: "Failed to load requests.",
            variant: "destructive",
          });
        } else if (data) {
          // Transform database data to component format
          const transformedRequests: DoctorRequest[] = data.map((req: any) => ({
            id: req.id,
            requestId: req.id.substring(0, 8).toUpperCase(),
            abhaId: req.abha_id,
            patientName: req.patient_name,
            patientEmail: req.patient_email,
            patientPhone: req.patient_phone,
            age: req.patient_age,
            gender: req.patient_gender,
            phone: req.patient_phone,
            symptomsSummary: req.symptoms_summary || "No symptoms provided",
            history: [], // Can be loaded separately if needed
            requestedOn: new Date(req.created_at).toLocaleDateString(),
            appointmentDate: req.appointment_date,
            status: req.status,
            rejectionReason: req.rejection_reason,
            attachments: [],
          }));
          setRequests(transformedRequests);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();

    // Set up real-time subscription
    const subscription = supabase
      .channel("doctor_requests_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doctor_requests",
          filter: `doctor_id=eq.${user.id}`,
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, toast]);

  // Filter and search
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.requestId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.abhaId || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.requestedOn).getTime() - new Date(a.requestedOn).getTime();
    } else if (sortBy === "oldest") {
      return new Date(a.requestedOn).getTime() - new Date(b.requestedOn).getTime();
    } else if (sortBy === "name") {
      return a.patientName.localeCompare(b.patientName);
    }
    return 0;
  });

  const handleMarkAttended = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("doctor_requests")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) {
        console.error("Error accepting request:", error);
        toast({
          title: "Error",
          description: "Failed to accept request.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Request Accepted",
        description: "The patient has been notified of your acceptance.",
      });

      setSelectedRequest(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (requestId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from("doctor_requests")
        .update({
          status: "rejected",
          rejection_reason: reason || "Request rejected by doctor",
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) {
        console.error("Error rejecting request:", error);
        toast({
          title: "Error",
          description: "Failed to reject request.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Request Rejected",
        description: "The patient has been notified of the rejection.",
        variant: "destructive",
      });

      setSelectedRequest(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = (request: DoctorRequest) => {
    // Fallback to window.print() as requested in requirements
    window.print();
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const attendedCount = requests.filter((r) => r.status === "accepted").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Requests</h1>
              <p className="text-sm text-slate-600">
                Requests raised by patients via ABHA ID.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm">
              <span className="text-slate-600">Doctor ID:</span>
              <span className="font-semibold text-slate-900">
                {user?.hprId || user?.id || "DOC-001"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600">Pending</p>
                  <p className="mt-1 text-2xl font-bold text-amber-900">
                    {pendingCount}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600">Attended</p>
                  <p className="mt-1 text-2xl font-bold text-green-900">
                    {attendedCount}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600">Rejected</p>
                  <p className="mt-1 text-2xl font-bold text-red-900">
                    {rejectedCount}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6 border-slate-200">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Search */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by patient name or request ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-slate-400" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Patient Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        {isLoading ? (
          <Card className="border-slate-200 text-center">
            <CardContent className="py-12">
              <Clock className="mx-auto mb-4 h-12 w-12 text-slate-400 animate-spin" />
              <p className="text-slate-600">Loading requests...</p>
            </CardContent>
          </Card>
        ) : sortedRequests.length === 0 ? (
          <Card className="border-slate-200 text-center">
            <CardContent className="py-12">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <p className="text-slate-600">No requests found matching your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedRequests.map((request) => (
              <Card
                key={request.requestId}
                className="cursor-pointer border-slate-200 transition-all hover:border-blue-300 hover:shadow-md"
                onClick={() => setSelectedRequest(request)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {request.patientName}
                          </h3>
                          <p className="text-xs text-slate-600">
                            {request.requestId || request.id.substring(0, 8).toUpperCase()}
                            {request.age && ` • ${request.age} years`}
                            {request.gender && ` • ${request.gender}`}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2">
                        {request.symptomsSummary}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Requested on {request.requestedOn}
                      </p>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <Badge
                        variant={getStatusColor(request.status)}
                        className="gap-1"
                      >
                        {getStatusIcon(request.status)}
                        {request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
                      </Badge>
                      <div className="flex items-center gap-2 text-slate-400">
                        {request.attachments.length > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{request.attachments.length}</span>
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedRequest && (
        <RequestDetailView
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onMarkAttended={handleMarkAttended}
          onRejectRequest={handleRejectRequest}
          onDownloadPDF={handleDownloadPDF}
        />
      )}
    </div>
  );
}
