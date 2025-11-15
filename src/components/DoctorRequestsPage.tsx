import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  requestId: string;
  abhaId: string;
  patientName: string;
  age: number;
  gender: string;
  phone: string;
  symptomsSummary: string;
  history: HistoryEntry[];
  requestedOn: string;
  status: "pending" | "attended" | "rejected";
  attachments: string[];
}

const DUMMY_REQUESTS: DoctorRequest[] = [
  {
    requestId: "REQ-001",
    abhaId: "ABHA-1234-5678-90",
    patientName: "Raj Kumar",
    age: 35,
    gender: "Male",
    phone: "+91-9876543210",
    symptomsSummary: "High fever (39.5°C), severe headache, and body aches",
    history: [
      {
        date: "2025-11-14",
        note: "Prescribed antibiotics and advised bed rest",
        doctor: "Dr. Sarah Johnson",
      },
      {
        date: "2025-11-12",
        note: "Initial consultation - suspected viral infection",
        doctor: "Dr. Amit Patel",
      },
      {
        date: "2025-11-10",
        note: "Follow-up call - fever reduced to 38.2°C",
        doctor: "Dr. Sarah Johnson",
      },
      {
        date: "2025-11-08",
        note: "First consultation - ran basic blood tests",
        doctor: "Dr. Amit Patel",
      },
    ],
    requestedOn: "2025-11-08",
    status: "attended",
    attachments: ["blood_test_report.pdf", "prescription_001.pdf"],
  },
  {
    requestId: "REQ-002",
    abhaId: "ABHA-1234-5678-90",
    patientName: "Priya Sharma",
    age: 28,
    gender: "Female",
    phone: "+91-9876543211",
    symptomsSummary: "Persistent cough for 5 days, mild fever",
    history: [
      {
        date: "2025-11-14",
        note: "Prescription issued for cough syrup",
        doctor: "Dr. Sarah Johnson",
      },
    ],
    requestedOn: "2025-11-13",
    status: "attended",
    attachments: ["chest_xray.pdf"],
  },
  {
    requestId: "REQ-003",
    abhaId: "ABHA-1234-5678-90",
    patientName: "Arjun Verma",
    age: 42,
    gender: "Male",
    phone: "+91-9876543212",
    symptomsSummary: "Severe stomach pain and nausea for 2 days",
    history: [],
    requestedOn: "2025-11-15",
    status: "pending",
    attachments: [],
  },
  {
    requestId: "REQ-004",
    abhaId: "ABHA-1234-5678-90",
    patientName: "Meera Singh",
    age: 31,
    gender: "Female",
    phone: "+91-9876543213",
    symptomsSummary: "Migraine attacks, sensitivity to light and sound",
    history: [
      {
        date: "2025-11-05",
        note: "Issued migraine management plan",
        doctor: "Dr. James Wilson",
      },
    ],
    requestedOn: "2025-11-05",
    status: "rejected",
    attachments: ["ct_scan_report.pdf", "treatment_plan.pdf"],
  },
  {
    requestId: "REQ-005",
    abhaId: "ABHA-1234-5678-90",
    patientName: "Vikram Patel",
    age: 55,
    gender: "Male",
    phone: "+91-9876543214",
    symptomsSummary: "High blood pressure, chest discomfort",
    history: [
      {
        date: "2025-11-15",
        note: "ECG performed - results normal",
        doctor: "Dr. Amit Patel",
      },
      {
        date: "2025-11-14",
        note: "Prescribed hypertension medication",
        doctor: "Dr. Amit Patel",
      },
    ],
    requestedOn: "2025-11-12",
    status: "pending",
    attachments: ["ecg_report.pdf", "blood_pressure_log.pdf"],
  },
  {
    requestId: "REQ-006",
    abhaId: "ABHA-1234-5678-90",
    patientName: "Anjali Gupta",
    age: 26,
    gender: "Female",
    phone: "+91-9876543215",
    symptomsSummary: "Skin rash on arms and legs, itching",
    history: [
      {
        date: "2025-11-13",
        note: "Prescribed topical cream and antihistamine",
        doctor: "Dr. Sarah Johnson",
      },
      {
        date: "2025-11-11",
        note: "Initial consultation - allergy test ordered",
        doctor: "Dr. James Wilson",
      },
    ],
    requestedOn: "2025-11-11",
    status: "attended",
    attachments: ["allergy_test_results.pdf"],
  },
];

function getStatusIcon(status: string) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "attended":
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
    case "attended":
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
              <p className="text-sm text-slate-600">Request ID: {request.requestId}</p>
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
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs font-medium text-slate-600">ABHA ID</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.abhaId}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Symptoms Summary */}
              <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">Symptoms Summary</h3>
                <p className="text-sm text-slate-700">{request.symptomsSummary}</p>
                <p className="text-xs text-slate-600">
                  <Calendar className="mb-0.5 inline h-3 w-3 mr-1" />
                  Requested on {request.requestedOn}
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
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => onMarkAttended(request.requestId)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Attend
                </Button>
              )}
              {request.status === "attended" && (
                <Button
                  variant="secondary"
                  className="flex-1 gap-2"
                  onClick={() => onRejectRequest(request.requestId)}
                >
                  <AlertCircle className="h-4 w-4" />
                  Reject
                </Button>
              )}
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                Reject
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
  const [requests, setRequests] = useState<DoctorRequest[]>(DUMMY_REQUESTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [selectedRequest, setSelectedRequest] = useState<DoctorRequest | null>(
    null
  );

  // Filter and search
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestId.toLowerCase().includes(searchQuery.toLowerCase());

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

  const handleMarkAttended = (requestId: string) => {
    setRequests(
      requests.map((req) =>
        req.requestId === requestId ? { ...req, status: "attended" } : req
      )
    );
    setSelectedRequest(null);
  };

  const handleRejectRequest = (requestId: string) => {
    setRequests(
      requests.map((req) =>
        req.requestId === requestId ? { ...req, status: "rejected" } : req
      )
    );
    setSelectedRequest(null);
  };

  const handleDownloadPDF = (request: DoctorRequest) => {
    // Fallback to window.print() as requested in requirements
    window.print();
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const attendedCount = requests.filter((r) => r.status === "attended").length;
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
                    <SelectItem value="attended">Attended</SelectItem>
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
        {sortedRequests.length === 0 ? (
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
                            {request.requestId} • {request.age} years • {request.gender}
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
