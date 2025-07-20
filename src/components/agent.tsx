"use client";

// ---------------------------------------------------------------------------
// Google‑Calendar Assistant – unified voice ✚ text interface (final)
// ---------------------------------------------------------------------------
// Features
//   • Mode toggle (🎤 Voice / ⌨️ Text)
//   • Voice mode: records audio and POSTs FormData { audio: Blob }
//   • Text mode: POSTs JSON { query: string }
//   • Unified JSON response handler { text, audio_b64, mime }
//   • Renders streamed TTS audio and Markdown summary side‑by‑side
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Calendar,
  Mic,
  Square,
  Users,
  PlayCircle,
  Keyboard,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// ‑‑‑ Config ---------------------------------------------------------------
const BACKEND_URL = "http://127.0.0.1:8080/assistant"; // update for prod

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
  const dataPart = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(dataPart);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ‑‑‑ Component -------------------------------------------------------------
export const AgentAudio: FC = () => {
  type Mode = "voice" | "text";
  const [mode, setMode] = useState<Mode>("voice");

  const [markdown, setMarkdown] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isLoading, setLoading] = useState(false);
  const [isRecording, setRecording] = useState(false);
  const [textQuery, setTextQuery] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (!isSecureContextOrLocal()) {
      toast.warning("Microphone requires HTTPS or localhost.");
    }
  }, []);

  /* ----- Voice recording helpers ----- */
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("getUserMedia not supported in this browser.");
      return;
    }
    const micState = await queryMicPermission();
    if (micState === "denied") {
      toast.error("Microphone permission denied.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (!blob.size) return toast.error("Empty recording, try again.");
        sendAudio(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setRecording(true);
      toast("Recording…", { duration: 1000 });
    } catch (err: any) {
      toast.error(err.message || "Cannot start recording.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  /* ----- Network helpers ----- */
  const handleBackendJson = (data: any) => {
    if (data.text) setMarkdown(data.text);
    if (data.audio_b64) {
      const mime = data.mime || "audio/mpeg";
      const blob = base64ToBlob(data.audio_b64, mime);
      setAudioUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    }
  };

  const sendAudio = async (blob: Blob) => {
    setLoading(true);
    setAudioUrl("");
    const fd = new FormData();
    fd.append("audio", blob, "recording.webm");

    try {
      const res = await fetch(BACKEND_URL, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      handleBackendJson(data);
    } catch (err: any) {
      toast.error(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const sendText = async () => {
    if (!textQuery.trim()) {
      toast.error("Please enter a request.");
      return;
    }
    setLoading(true);
    setAudioUrl("");
    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      handleBackendJson(data);
    } catch (err: any) {
      toast.error(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  /* ----- JSX ----- */
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">AI Voice Assistant</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Ask for your events by voice or text.
          </p>
        </header>

        {/* Mode selector */}
        <div className="flex justify-center gap-2">
          <Button
            variant={mode === "voice" ? "default" : "outline"}
            onClick={() => setMode("voice")}
          >
            🎤 Voice
          </Button>
          <Button
            variant={mode === "text" ? "default" : "outline"}
            onClick={() => setMode("text")}
          >
            ⌨️ Text
          </Button>
        </div>

        {/* Voice controls */}
        {mode === "voice" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" /> Voice Request
              </CardTitle>
              <CardDescription>
                Tap the mic to {isRecording ? "stop" : "start"} recording.
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
        )}

        {/* Text controls */}
        {mode === "text" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" /> Text Request
              </CardTitle>
              <CardDescription>Type your request and hit Send.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendText()}
                  placeholder="Get my events for next week…"
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={sendText} disabled={isLoading || !textQuery.trim()}>
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 animate-pulse" /> Processing…
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Audio output */}
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

        {/* Markdown output */}
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

        {/* Initial guidance */}
        {!markdown && !audioUrl && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Examples:</p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li>"Get my events for the next week"</li>
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
