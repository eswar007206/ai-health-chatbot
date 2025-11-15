import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, Phone, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  clinic_name?: string;
}

const VideoConsultation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const doctor = (location.state as { doctor?: Doctor } | null)?.doctor;
  
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!doctor) {
      toast({
        title: "Error",
        description: "No doctor selected. Redirecting...",
        variant: "destructive",
      });
      navigate("/doctors");
      return;
    }

    // Start call timer
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Start video call after a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      startVideoCall();
    }, 200);

    return () => {
      clearTimeout(timer);
      stopVideoCall();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle video element ready - use callback ref approach
  const videoElementRef = (element: HTMLVideoElement | null) => {
    if (element && streamRef.current && !isVideoActive) {
      element.srcObject = streamRef.current;
      element.play()
        .then(() => {
          setIsVideoActive(true);
          setIsConnecting(false);
        })
        .catch((err) => {
          console.error("Error playing video:", err);
        });
    }
    videoRef.current = element;
  };

  const startVideoCall = async () => {
    try {
      setIsConnecting(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: true,
      });
      
      streamRef.current = stream;
      
      // Set video source and play
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          setIsVideoActive(true);
          setIsConnecting(false);
          toast({
            title: "Video Call Started",
            description: "Connected to video consultation",
          });
        } catch (playError) {
          console.error("Error playing video:", playError);
          // Video element might not be ready, try again
          setTimeout(() => {
            if (videoRef.current && streamRef.current) {
              videoRef.current.srcObject = streamRef.current;
              videoRef.current.play()
                .then(() => {
                  setIsVideoActive(true);
                  setIsConnecting(false);
                })
                .catch(err => console.error("Retry play error:", err));
            }
          }, 300);
        }
      } else {
        // Video ref not ready, wait a bit
        setTimeout(() => {
          if (videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play()
              .then(() => {
                setIsVideoActive(true);
                setIsConnecting(false);
              })
              .catch(err => console.error("Delayed play error:", err));
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsConnecting(false);
      setIsVideoActive(false);
      toast({
        title: "Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopVideoCall = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoActive(false);
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoActive(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioActive(audioTrack.enabled);
      }
    }
  };

  const endCall = () => {
    stopVideoCall();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    toast({
      title: "Call Ended",
      description: "Video consultation has ended",
    });
    navigate("/doctors");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!doctor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/doctors")}
              className="text-slate-300 hover:text-white"
            >
              ← Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Video Consultation</h1>
              <p className="text-sm text-slate-400">
                Dr. {doctor.name} • {doctor.specialty}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-red-500 text-white">
              {isConnecting ? "Connecting..." : "LIVE"}
            </Badge>
            <div className="text-white font-mono text-lg">
              {formatTime(callDuration)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Doctor's Video (Placeholder - would be remote stream in real implementation) */}
        <div className="absolute inset-0 bg-slate-900">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-slate-400">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
                <span className="text-4xl text-slate-500">
                  {doctor.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-xl font-semibold text-slate-300">Dr. {doctor.name}</p>
              <p className="text-sm text-slate-500">{doctor.specialty}</p>
              {isConnecting && (
                <p className="text-sm text-slate-500 mt-2">Waiting for doctor to join...</p>
              )}
            </div>
          </div>
        </div>

        {/* User's Video (Local stream) */}
        <div className="absolute bottom-4 right-4 w-64 h-48 rounded-lg overflow-hidden border-2 border-slate-600 shadow-2xl bg-slate-800">
          <video
            ref={videoElementRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover bg-slate-800"
          />
          {!isVideoActive && (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center absolute inset-0 z-10">
              <VideoOff className="h-12 w-12 text-slate-500" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs z-20">
            You {isConnecting && "(Connecting...)"}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-t border-slate-700 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            {/* Toggle Video */}
            <Button
              onClick={toggleVideo}
              size="lg"
              variant={isVideoActive ? "default" : "destructive"}
              className="rounded-full w-14 h-14"
            >
              {isVideoActive ? (
                <Video className="h-6 w-6" />
              ) : (
                <VideoOff className="h-6 w-6" />
              )}
            </Button>

            {/* Toggle Audio */}
            <Button
              onClick={toggleAudio}
              size="lg"
              variant={isAudioActive ? "default" : "destructive"}
              className="rounded-full w-14 h-14"
            >
              {isAudioActive ? (
                <Mic className="h-6 w-6" />
              ) : (
                <MicOff className="h-6 w-6" />
              )}
            </Button>

            {/* Settings (Placeholder) */}
            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-14 h-14 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Settings className="h-6 w-6" />
            </Button>

            {/* End Call */}
            <Button
              onClick={endCall}
              size="lg"
              variant="destructive"
              className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
            >
              <Phone className="h-6 w-6 rotate-[135deg]" />
            </Button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="absolute top-20 left-4">
        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700 text-white p-4 max-w-xs">
          <h3 className="font-semibold mb-2">Consultation Details</h3>
          <div className="space-y-1 text-sm text-slate-300">
            <p><strong>Doctor:</strong> Dr. {doctor.name}</p>
            <p><strong>Specialty:</strong> {doctor.specialty}</p>
            {doctor.clinic_name && (
              <p><strong>Clinic:</strong> {doctor.clinic_name}</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              This is a demo video consultation. In a real implementation, this would connect to the doctor's video feed.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VideoConsultation;

