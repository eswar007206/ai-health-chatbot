import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send, AlertCircle, Mic, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config/api";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Cleanup function for recording
  const stopRecordingSession = async (shouldSend: boolean = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setRecordingTime(0);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Send audio if requested
    if (shouldSend && audioChunksRef.current.length > 0) {
      await sendAudioToBackend();
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        // Audio will be sent in stopRecordingSession if shouldSend=true
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start recording timer
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Auto-stop after 10 seconds
          if (newTime >= 10) {
            stopRecordingSession(true);
          }
          return newTime;
        });
      }, 1000);

      // Reset silence timer on audio activity
      const analyser = new AudioContext().createAnalyser();
      analyser.fftSize = 2048;
      const microphone = new AudioContext().createMediaStreamAudioSource(stream);
      microphone.connect(analyser);

      // Optional: Implement silence detection
      // (simplified - just using the 10s timeout above)
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast({
          title: "Permission Denied",
          description: "Microphone permission denied. Please allow microphone access in your browser settings.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Microphone Error",
          description: "Could not access microphone. Please check your browser settings.",
          variant: "destructive",
        });
      }
      setIsRecording(false);
    }
  };

  // Stop recording and send audio to backend
  const handleMicClick = () => {
    if (isRecording) {
      stopRecordingSession(true);
    } else {
      startRecording();
    }
  };

  // Send audio to backend
  const sendAudioToBackend = async () => {
    if (audioChunksRef.current.length === 0) {
      toast({
        title: "No Audio",
        description: "No audio detected. Try again.",
        variant: "destructive",
      });
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

    // Validate audio size
    if (audioBlob.size < 100) {
      toast({
        title: "Audio Too Short",
        description: "No audio detected. Try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/api/speech-to-text`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Speech recognition failed");
      }

      const data = await response.json();
      const transcribedText = data.text;

      // Insert transcribed text into message input
      setMessage(transcribedText);

      // Auto-send the message
      if (transcribedText.trim()) {
        onSendMessage(transcribedText.trim());
        setMessage("");
      }
    } catch (error) {
      console.error("Error sending audio:", error);
      const errorMsg = error instanceof Error ? error.message : "Speech recognition failed";

      if (errorMsg.includes("GEMINI_API_KEY")) {
        toast({
          title: "Service Error",
          description: "Speech recognition service not configured. Please contact support.",
          variant: "destructive",
        });
      } else if (errorMsg.includes("No audio")) {
        toast({
          title: "No Audio",
          description: "No audio detected. Try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Transcription Failed",
          description: "Speech recognition failed — please try again or type your message.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-gradient-to-t from-slate-50 to-white p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your symptoms or ask a health question... (Press Enter to send, Shift+Enter for new line)"
              disabled={disabled || isRecording}
              className="min-h-[56px] max-h-[200px] resize-none border-slate-300 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleMicClick}
              disabled={disabled}
              className={`h-[56px] w-[56px] rounded-lg shadow-md hover:shadow-lg transition-all ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-slate-600 hover:bg-slate-700 text-white"
              }`}
              title={isRecording ? "Click to stop recording" : "Click to start recording"}
            >
              {isRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="submit"
              disabled={!message.trim() || disabled || isRecording}
              className="h-[56px] w-[56px] shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {isRecording && (
          <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
            <div className="h-3 w-3 rounded-full bg-red-600 animate-pulse"></div>
            Recording... {recordingTime}s (max 10s)
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <p>This tool provides general health information. Always consult with healthcare professionals for medical decisions.</p>
        </div>
      </div>
    </form>
  );
};
