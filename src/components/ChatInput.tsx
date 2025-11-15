import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send, AlertCircle, Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ENDPOINTS } from "@/config/api";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const STREAM_TIMESLICE_MS = 1500;
const MIN_STREAM_CHUNK_BYTES = 2000;

export const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isInstantListening, setIsInstantListening] = useState(false);
  const [isNativeRecording, setIsNativeRecording] = useState(false);
  const [isNativeUploading, setIsNativeUploading] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [lastVoiceReply, setLastVoiceReply] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveLanguage, setLiveLanguage] = useState<string | null>(null);

  const instantRecognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const discardRecordingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const partialQueueRef = useRef<Promise<void>>(Promise.resolve());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { toast } = useToast();

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
      setIsNativeRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      stopRecording(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API not available in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onstart = () => {
      setIsInstantListening(true);
      finalTranscript = "";
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += `${transcript.trim()} `;
        } else {
          interimTranscript += transcript;
        }
      }
      const displayText = finalTranscript.trim() || interimTranscript;
      setMessage(displayText);
    };

    recognition.onerror = (event: any) => {
      console.error("Instant speech recognition error:", event.error);
      let description = "Unable to capture speech. Please try again.";
      if (event.error === "no-speech") description = "No speech detected. Try again.";
      if (event.error === "audio-capture") description = "No microphone found.";
      if (event.error === "not-allowed") description = "Microphone permission denied.";

      toast({
        title: "Voice Input Error",
        description,
        variant: "destructive",
      });
      setIsInstantListening(false);
    };

    recognition.onend = () => {
      setIsInstantListening(false);
    };

    instantRecognitionRef.current = recognition;

    return () => {
      recognition.stop();
      instantRecognitionRef.current = null;
    };
  }, [toast]);

  const ensureVoiceSupport = () => {
    if (typeof window === "undefined") return false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    if (typeof MediaRecorder === "undefined") return false;
    return true;
  };

  const handleInstantMicClick = () => {
    if (!instantRecognitionRef.current) {
      toast({
        title: "Voice Not Supported",
        description: "Real-time English transcription needs Chrome, Edge, Firefox, or Safari.",
        variant: "destructive",
      });
      return;
    }

    if (isInstantListening) {
      instantRecognitionRef.current.stop();
      setIsInstantListening(false);
    } else {
      setMessage("");
      instantRecognitionRef.current.start();
    }
  };

  const startRecording = async () => {
    if (!ensureVoiceSupport()) {
      toast({
        title: "Microphone not available",
        description: "Your browser does not support MediaRecorder. Please try the latest Chrome, Edge, Firefox, or Safari.",
        variant: "destructive",
      });
      return;
    }

    if (isNativeUploading) {
      toast({
        title: "Please wait",
        description: "We're still processing your previous recording.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      partialQueueRef.current = Promise.resolve();
      setLiveTranscript("");
      setLiveLanguage(null);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      discardRecordingRef.current = false;
      chunksRef.current = [];

      recorder.onstart = () => {
        isRecordingRef.current = true;
        setIsNativeRecording(true);
        setMessage("");
        setLastTranscript(null);
        setDetectedLanguage(null);
        setLastVoiceReply(null);
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          if (isRecordingRef.current && !discardRecordingRef.current) {
            enqueuePartialTranscription(event.data);
          }
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error", event);
        toast({
          title: "Recording error",
          description: "Unable to capture audio. Please try again.",
          variant: "destructive",
        });
        isRecordingRef.current = false;
        setIsNativeRecording(false);
        stopStreamTracks();
      };

      recorder.onstop = async () => {
        isRecordingRef.current = false;
        await partialQueueRef.current.catch(() => undefined);
        stopStreamTracks();
        setIsNativeRecording(false);

        const shouldDiscard = discardRecordingRef.current;
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (!shouldDiscard && audioBlob.size > 0) {
          await uploadAudio(audioBlob);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(STREAM_TIMESLICE_MS);
    } catch (error) {
      console.error("Microphone access error:", error);
      toast({
        title: "Microphone permission denied",
        description: "Please allow microphone access in your browser settings and try again.",
        variant: "destructive",
      });
      stopStreamTracks();
      setIsNativeRecording(false);
      isRecordingRef.current = false;
    }
  };

  const enqueuePartialTranscription = (audioChunk: Blob) => {
    if (audioChunk.size < MIN_STREAM_CHUNK_BYTES) return;
    partialQueueRef.current = partialQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (!isRecordingRef.current || discardRecordingRef.current) return;
        await transcribePartialChunk(audioChunk);
      });
  };

  const transcribePartialChunk = async (audioChunk: Blob) => {
    try {
      const formData = new FormData();
      formData.append("file", audioChunk, `chunk-${Date.now()}.webm`);

      const response = await fetch(ENDPOINTS.SPEECH_STREAM, {
        method: "POST",
        body: formData,
      });

      const rawBody = await response.text();
      let payload: { transcript?: string; language?: string; detail?: string; error?: string } | null = null;
      try {
        payload = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload) {
        console.warn("Live transcription failed", payload?.detail || payload?.error || rawBody);
        return;
      }

      const chunkText = (payload.transcript || "").trim();
      if (!chunkText) return;

      setLiveTranscript((prev) => {
        if (!prev) return chunkText;
        if (prev.endsWith(chunkText)) return prev;
        return `${prev} ${chunkText}`.replace(/\s+/g, " ").trim();
      });
      const chunkLanguage = (payload.language || "").trim();
      if (chunkLanguage) {
        setLiveLanguage((prev) => prev ?? chunkLanguage);
      }
    } catch (error) {
      console.warn("Partial transcription error:", error);
    }
  };

  const uploadAudio = async (audioBlob: Blob) => {
    setIsNativeUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, `speech-${Date.now()}.webm`);

      const response = await fetch(ENDPOINTS.SPEECH_TO_TEXT, {
        method: "POST",
        body: formData,
      });

      const rawBody = await response.text();
      let payload: { transcript?: string; language?: string; reply?: string; detail?: string; error?: string } | null = null;
      try {
        payload = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload) {
        throw new Error(payload?.detail || payload?.error || "Speech transcription failed");
      }

      const data = payload as { transcript: string; language: string; reply?: string };

      setMessage(data.transcript || "");
      setLastTranscript(data.transcript || "");
      setDetectedLanguage(data.language || null);
      setLastVoiceReply(data.reply || null);
      setLiveTranscript("");
      setLiveLanguage(null);
      textareaRef.current?.focus();

      toast({
        title: "Transcription ready",
        description: data.language
          ? `Detected language: ${data.language}. You can edit the text before sending.`
          : "You can edit the transcribed text before sending.",
      });
    } catch (error) {
      console.error("Speech upload error:", error);
      toast({
        title: "Speech analysis failed",
        description: error instanceof Error ? error.message : "Unable to transcribe your recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsNativeUploading(false);
    }
  };

  const handleMicClick = () => {
    if (isNativeRecording) {
      stopRecording(false);
    } else {
      startRecording();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && !isNativeUploading && !isInstantListening) {
      onSendMessage(message.trim());
      setMessage("");
      setLastTranscript(null);
      setDetectedLanguage(null);
      setLastVoiceReply(null);
      setLiveTranscript("");
      setLiveLanguage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="flex flex-col gap-3">
          {/* Main input area */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your symptoms or ask a health question..."
                disabled={disabled || isNativeRecording || isNativeUploading || isInstantListening}
                className="min-h-[56px] max-h-[200px] resize-none border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-base transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex gap-2 shrink-0 items-end">
              <Button
                type="button"
                onClick={handleInstantMicClick}
                disabled={disabled || isNativeRecording || isNativeUploading}
                className={`h-12 w-12 rounded-xl transition-all duration-200 flex items-center justify-center shadow-sm ${
                  isInstantListening
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 border-2 border-emerald-500 shadow-md"
                    : "bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
                title={isInstantListening ? "Stop instant English mic" : "Instant English mic"}
              >
                {isInstantListening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                type="submit"
                disabled={!message.trim() || disabled || isNativeRecording || isNativeUploading || isInstantListening}
                className="h-12 w-12 shrink-0 rounded-xl bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 shadow-sm hover:shadow-md flex items-center justify-center"
              >
                {isNativeUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Status indicators */}
          {isInstantListening && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium px-1 animate-in fade-in duration-300">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse"></div>
              <span>Listening for English speech...</span>
            </div>
          )}

          {isNativeRecording && (
            <div className="flex items-center gap-2 text-sm text-red-600 font-medium px-1 animate-in fade-in duration-300">
              <div className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse"></div>
              <span>Recording... speak now</span>
            </div>
          )}

          {isNativeUploading && (
            <div className="flex items-center gap-2 text-sm text-blue-600 font-medium px-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing audio...</span>
            </div>
          )}

          {/* Live transcript */}
          {liveTranscript && isNativeRecording && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 backdrop-blur-sm px-4 py-3 text-sm text-blue-900 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-blue-700 font-semibold mb-1">
                Live transcript {liveLanguage ? `(${liveLanguage})` : ""}
              </div>
              <p className="text-blue-900">{liveTranscript}</p>
            </div>
          )}

          {/* Final transcript */}
          {lastTranscript && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                Transcription {detectedLanguage ? `(${detectedLanguage})` : ""}
              </div>
              <p className="text-slate-800">{lastTranscript}</p>
            </div>
          )}

          {/* Voice reply */}
          {lastVoiceReply && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 backdrop-blur-sm px-4 py-3 text-sm text-emerald-900 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-emerald-600 font-semibold mb-1">
                Gemini reply (same language)
              </div>
              <p className="text-emerald-900">{lastVoiceReply}</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 text-xs text-slate-500 px-1 pt-1">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p>This tool provides general health information. Always consult with healthcare professionals for medical decisions.</p>
          </div>
        </div>
      </div>
    </form>
  );
};
