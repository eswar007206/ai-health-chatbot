import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Square, Loader2, ArrowLeft, Waves, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ENDPOINTS } from "@/config/api";

// Removed chunked streaming - now recording full audio as single file

interface TranscriptSegment {
  id: string;
  text: string;
  language: string;
  timestamp: Date;
}

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  language?: string;
  emotion?: "neutral" | "positive" | "concerned";
}

export const NativeVoiceChat = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveLanguage, setLiveLanguage] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [status, setStatus] = useState<string>("Tap record to start speaking.");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const discardRecordingRef = useRef(false);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopRecording(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureMediaSupport = () => {
    if (typeof window === "undefined") return false;
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== "undefined");
  };

  const stopStreamTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopRecording = (discard = false) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      discardRecordingRef.current = discard;
      isRecordingRef.current = false;
      mediaRecorderRef.current.stop();
    } else {
      isRecordingRef.current = false;
      stopStreamTracks();
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    if (!ensureMediaSupport()) {
      toast({
        title: "Microphone not supported",
        description: "Please use the latest Chrome, Edge, Firefox, or Safari.",
        variant: "destructive",
      });
      return;
    }

    if (isUploading) {
      toast({
        title: "Please wait",
        description: "Finishing previous upload...",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setLiveTranscript("");
      setLiveLanguage(null);
      setStatus("Recording... speak naturally in your language. You can speak for as long as you need.");

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      discardRecordingRef.current = false;

      recorder.onstart = () => {
        isRecordingRef.current = true;
        setIsRecording(true);
      };

      // Collect all audio data chunks (no timeslice = single blob at the end)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("Recorder error", event);
        toast({
          title: "Recording error",
          description: "Unable to capture audio. Please retry.",
          variant: "destructive",
        });
        isRecordingRef.current = false;
        setIsRecording(false);
        stopStreamTracks();
      };

      recorder.onstop = async () => {
        isRecordingRef.current = false;
        setIsRecording(false);
        stopStreamTracks();

        const shouldDiscard = discardRecordingRef.current;
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (!shouldDiscard && audioBlob.size > 0) {
          await finalizeTranscription(audioBlob);
        } else {
          setStatus("Recording cancelled.");
        }
      };

      // Start recording without timeslice - will collect all data until stop
      recorder.start();
    } catch (error) {
      console.error("Microphone access error:", error);
      toast({
        title: "Microphone permission denied",
        description: "Enable microphone access in your browser settings.",
        variant: "destructive",
      });
      stopStreamTracks();
    }
  };

  // Removed chunked streaming functions - now using single file upload only

  const finalizeTranscription = async (audioBlob: Blob) => {
    setIsUploading(true);
    setStatus("Processing your complete audio recording...");
    
    // Show file size info for debugging
    const fileSizeMB = (audioBlob.size / (1024 * 1024)).toFixed(2);
    console.log(`Uploading complete audio file: ${fileSizeMB} MB`);
    
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, `speech-${Date.now()}.webm`);

      const response = await fetch(ENDPOINTS.SPEECH_TO_TEXT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || payload.error || "Native speech transcription failed");
      }

      const data = await response.json();
      const transcript = (data.transcript || "").trim();
      const language = data.language || "Unknown";

      if (!transcript) {
        setStatus("We didn't catch that. Try speaking once more.");
        return;
      }

      const segment: TranscriptSegment = {
        id: crypto.randomUUID(),
        text: transcript,
        language,
        timestamp: new Date(),
      };
      setSegments((prev) => [segment, ...prev]);
      setLiveTranscript("");
      setLiveLanguage(null);
      setStatus("Thinking...");
      setIsThinking(true);

      await streamChatResponse(segment);
    } catch (error) {
      console.error("Finalize error:", error);
      toast({
        title: "Speech upload failed",
        description: error instanceof Error ? error.message : "Unable to process speech. Try again.",
        variant: "destructive",
      });
      setStatus("Something went wrong. Please retry.");
    } finally {
      setIsUploading(false);
    }
  };

  const streamChatResponse = async (segment: TranscriptSegment) => {
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: segment.text,
      timestamp: new Date(),
      language: segment.language,
    };
    setConversation((prev) => [...prev, userMessage]);

    try {
      const response = await fetch(ENDPOINTS.CHAT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: segment.text,
          history: conversation.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Bot response failed");
      }

      const data = await response.json();
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "I'm sorry, I couldn't process that.",
        timestamp: new Date(),
        emotion: data.response?.toLowerCase().includes("धन्यवाद") ? "positive" : "neutral",
      };
      setConversation((prev) => [...prev, assistantMessage]);
      setStatus("Ready for your next question.");
      setIsThinking(false);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Bot response failed",
        description: error instanceof Error ? error.message : "Unable to get bot reply.",
        variant: "destructive",
      });
      setStatus("Unable to reach the assistant. Try again.");
      setIsThinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to chat
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Native voice assistant</p>
            <h1 className="text-2xl font-bold text-slate-900">Speak in Your Language</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Card className="border-blue-200 shadow-md">
          <CardContent className="py-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3 text-slate-700">
              <Waves className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-semibold">IVR-style conversation</p>
                <p className="text-sm text-slate-500">Speak naturally. We’ll transcribe, translate, and reply using the full chatbot brain.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                Live transcript
              </Badge>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                AI doctor reply
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="border-emerald-200 shadow-lg">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
              <CardTitle>Voice Console</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="rounded-xl bg-white border border-emerald-100 px-4 py-5 text-center">
                <p className="text-sm text-slate-500 mb-3">Status</p>
                <p className="text-base font-semibold text-slate-900">{status}</p>
              </div>

              <Button
                onClick={() => (isRecording ? stopRecording(false) : startRecording())}
                disabled={isUploading}
                className={`w-full h-14 text-lg font-semibold flex items-center justify-center gap-3 ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-600"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="h-5 w-5" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    Start Recording
                  </>
                )}
              </Button>

              {isRecording && (
                <div className="space-y-2">
                  <p className="text-sm text-center text-red-600 flex items-center gap-2 justify-center">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                    Recording... speak naturally
                  </p>
                  <p className="text-xs text-center text-slate-500">
                    Your complete audio will be processed when you stop recording
                  </p>
                </div>
              )}

              {isUploading && (
                <Button variant="outline" disabled className="w-full h-12 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing audio...
                </Button>
              )}

              <div className="rounded-lg bg-slate-100 p-4 text-sm text-slate-700 space-y-2">
                <p className="font-semibold">Tips for accurate results:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Speak clearly and steadily.</li>
                  <li>Record in a quiet environment.</li>
                  <li>You can record for as long as you need - the complete audio will be processed at once.</li>
                  <li>No need to pause - speak naturally throughout your recording.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 lg:col-span-1">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle>Assistant Conversation</CardTitle>
              <MessageSquare className="h-5 w-5 text-slate-500" />
            </CardHeader>
            <CardContent className="pt-4">
              <ScrollArea className="h-[520px] pr-2">
                <div className="space-y-4">
                  {conversation.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                      Start talking and your conversation with the doctor will appear here.
                    </div>
                  )}
                  {/* Live transcript removed - using single file upload instead of chunked streaming */}
                  {conversation.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl px-4 py-3 shadow-sm border ${
                        msg.role === "assistant"
                          ? "bg-white border-blue-200"
                          : "bg-emerald-50 border-emerald-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span className={msg.role === "assistant" ? "text-blue-600 font-semibold" : "text-emerald-600 font-semibold"}>
                          {msg.role === "assistant" ? "AI Doctor" : "You"}
                        </span>
                        <span>{msg.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.language && (
                        <p className="mt-2 text-xs text-slate-500">
                          Language detected: <span className="font-medium">{msg.language}</span>
                        </p>
                      )}
                    </div>
                  ))}
                  {isThinking && (
                    <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3 shadow-inner flex items-center gap-3 text-sm text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      AI Doctor is preparing a response...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NativeVoiceChat;

