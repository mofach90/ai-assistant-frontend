"use client";

// ---------------------------------------------------------------------------
// Google‑Calendar Assistant – voice version (patched‑5, complete)
// ---------------------------------------------------------------------------
// Backend returns JSON:
//   {
//     text: "<markdown>",
//     audio_b64: "<base64 string or data URI>",
//     mime: "audio/mpeg" // optional
//   }
//
// This component:
//   • Records audio with MediaRecorder.
//   • Sends it to the backend as FormData { audio: Blob }.
//   • Renders the returned TTS mp3 and the markdown summary.
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect } from "react";
import type { FC } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Calendar, Mic, Square, Users, PlayCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

// ‑‑‑ Config ---------------------------------------------------------------
const BACKEND_URL = "http://127.0.0.1:8080/assistant"; // update as needed

// ‑‑‑ Helpers --------------------------------------------------------------
const isSecureContextOrLocal = () =>
  window.isSecureContext || ["localhost", "127.0.0.1"].includes(location.hostname);

async function queryMicPermission(): Promise<PermissionState | "unsupported"> {
  if (!("permissions" in navigator)) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "microphone" });
    return status.state;
  } catch {
    return "unsupported";
  }
}

function base64ToBlob(base64: string, mime = "application/octet-stream"): Blob {
  const cleaned = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ‑‑‑ Component -------------------------------------------------------------
export const AgentAudio: FC = () => {
  const [markdown, setMarkdown] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isLoading, setLoading] = useState(false);
  const [isRecording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Cleanup audio URLs
  // useEffect(() => () => audioUrl && URL.revokeObjectURL(audioUrl), [audioUrl]);

  useEffect(() => {
    if (!isSecureContextOrLocal()) {
      toast.warning("Microphone access requires HTTPS or localhost.");
    }
  }, []);

  const startRecording = async () => {
    if (!isSecureContextOrLocal()) return toast.error("Insecure context.");
    if (!navigator.mediaDevices?.getUserMedia) return toast.error("getUserMedia not supported.");

    const micState = await queryMicPermission();
    if (micState === "denied") return toast.error("Mic permission denied.");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (!blob.size) return toast.error("Recording empty.");
        sendAudio(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setRecording(true);
      toast.success("Recording…", { duration: 1200 });
    } catch (err: any) {
      toast.error(err.message || "Recording failed.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendAudio = async (blob: Blob) => {
    setLoading(true);
    audioUrl && URL.revokeObjectURL(audioUrl);
    setAudioUrl("");

    try {
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");

      const res = await fetch(BACKEND_URL, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);

      if (data.text) setMarkdown(data.text);
      if (data.audio_b64) {
        const mime = data.mime || "audio/mpeg";
        const blobMp3 = base64ToBlob(data.audio_b64, mime);
        setAudioUrl(URL.createObjectURL(blobMp3));
      }
      toast.success("Response ready", { duration: 2000 });
    } catch (err: any) {
      toast.error(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">You AI Voice Assistant</h1>
          </div>
          <p className="text-muted-foreground text-lg">Ask for your events via voice and hear a summary.</p>
        </div>

        {/* Recorder Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" /> Voice Request
            </CardTitle>
            <CardDescription>
              Tap to {isRecording ? "stop" : "start"} recording.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className="rounded-full h-16 w-16 p-0"
              variant={isRecording ? "destructive" : "default"}
            >
              {isRecording ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </Button>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 animate-pulse" /> Processing…
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Audio */}
        {audioUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-green-500" /> Audio Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <audio controls src={audioUrl} className="w-full" />
            </CardContent>
          </Card>
        )}

        {/* Markdown */}
        {markdown && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-500" /> Text Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </CardContent>
          </Card>
        )}

        {/* Initial Hint */}
        {!markdown && !audioUrl && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Press the mic and say:</p>
              <ul className="list-disc list-inside pl-4 space-y-1 text-muted-foreground">
                <li>"Get my events for next week"</li>
                <li>"Show my calendar for today"</li>
                <li>"What meetings do I have tomorrow?"</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AgentAudio;
