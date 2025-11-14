import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send, AlertCircle, Mic, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    let finalTranscriptSoFar = "";

    recognition.onstart = () => {
      setIsListening(true);
      finalTranscriptSoFar = "";
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscriptSoFar += transcript.trim() + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // Only show interim if there's no final yet, otherwise just show final
      const displayText = finalTranscriptSoFar ? finalTranscriptSoFar.trim() : interimTranscript;
      setMessage(displayText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      let errorMsg = "Could not understand your speech. Try again.";

      if (event.error === "no-speech") {
        errorMsg = "No speech detected. Please try again.";
      } else if (event.error === "audio-capture") {
        errorMsg = "No microphone found. Check your audio settings.";
      } else if (event.error === "not-allowed") {
        errorMsg = "Microphone permission denied. Allow access in browser settings.";
      } else if (event.error === "network") {
        errorMsg = "Network error. Check your internet connection.";
      }

      toast({
        title: "Voice Recognition Error",
        description: errorMsg,
        variant: "destructive",
      });
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [toast]);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice input. Please use Chrome, Firefox, Safari, or Edge.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setMessage("");
      recognitionRef.current.start();
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
      if (recognitionRef.current) {
        recognitionRef.current.abort();
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
              disabled={disabled || isListening}
              className="min-h-[56px] max-h-[200px] resize-none border-slate-300 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleMicClick}
              disabled={disabled}
              className={`h-[56px] w-[56px] rounded-lg shadow-md hover:shadow-lg transition-all ${
                isListening
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-slate-600 hover:bg-slate-700 text-white"
              }`}
              title={isListening ? "Click to stop listening" : "Click to start voice input"}
            >
              {isListening ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="submit"
              disabled={!message.trim() || disabled || isListening}
              className="h-[56px] w-[56px] shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {isListening && (
          <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
            <div className="h-3 w-3 rounded-full bg-red-600 animate-pulse"></div>
            Listening... Speak now
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
