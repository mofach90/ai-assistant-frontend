"use client";

// ---------------------------------------------------------------------------
// Google‑Calendar Assistant – minimal version
// ---------------------------------------------------------------------------
// 👉 Sole purpose: **render whatever Markdown the backend returns** – no fancy
//    parsing, just show it nicely with ReactMarkdown.
// ---------------------------------------------------------------------------

import { useState } from "react";
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
import { Calendar, Clock, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const AgentImproved: FC = () => {
  const [input, setInput] = useState<string>(
    "Get my Google Calendar events for the next week"
  );
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    setMarkdown("");

    try {
      // const res = await fetch("http://localhost:4000/api/calendar-events", {
            // const res = await fetch("https://voice-agent-api-194275636901.europe-west3.run.app/assistant", {
      const res = await fetch("http://127.0.0.1:8080/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });

      const contentType = res.headers.get("content-type") || "";
      let text: string;

      if (contentType.includes("application/json")) {
        const data = await res.json();
        // Most backends send either { result: "...md..." } or { output: "..." }
        text =
          data.result ?? data.output ?? data.message ?? JSON.stringify(data, null, 2);
      } else {
        text = await res.text();
      }

      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setMarkdown(text);
      toast.success("Calendar events retrieved successfully", { duration: 3000 });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to fetch events", { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return toast.error("Please enter a request");
    fetchEvents();
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Google Calendar Assistant</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Ask me to retrieve your Google Calendar events for any date range
          </p>
        </div>

        {/* Input */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Calendar Request
            </CardTitle>
            <CardDescription>
              Enter your request (e.g. "Get my events for next week" or "Show my
              calendar for January 15-22, 2024")
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Get my Google Calendar events for the next week…"
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? "Loading…" : "Get Events"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 animate-pulse" /> Retrieving Calendar
                Events…
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Markdown Output */}
        {!isLoading && markdown && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-500" /> Calendar Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactMarkdown >
                {markdown}
              </ReactMarkdown>
            </CardContent>
          </Card>
        )}

        {/* Initial examples */}
        {!isLoading && !markdown && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Example Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                "Get my Google Calendar events for the next week",
                "Show my calendar for today",
                "What meetings do I have tomorrow?",
              ].map((ex) => (
                <Button
                  key={ex}
                  variant="outline"
                  onClick={() => setInput(ex)}
                  className="justify-start h-auto p-3"
                >
                  {ex}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AgentImproved;
