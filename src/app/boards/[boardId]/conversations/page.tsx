"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useBoardContext } from "@/components/board/board-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TimeAgo } from "@/components/common/time-ago";
import type { ConversationImportType } from "@/lib/types";

type FormState = {
  title: string;
  sourceSystem: string;
  importType: ConversationImportType;
  occurredAt: string;
  importedAt: string;
  recordingUrls: string;
  transcript: string;
  sourceReference: string;
  metadataJson: string;
};

const initialForm: FormState = {
  title: "",
  sourceSystem: "",
  importType: "transcript",
  occurredAt: "",
  importedAt: "",
  recordingUrls: "",
  transcript: "",
  sourceReference: "",
  metadataJson: "",
};

export default function ConversationsPage() {
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const { conversations, refresh } = useBoardContext();
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) =>
        (b.occurredAt || b.createdAt).localeCompare(a.occurredAt || a.createdAt),
      ),
    [conversations],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    let metadata: Record<string, unknown> = {};
    if (form.metadataJson.trim()) {
      try {
        metadata = JSON.parse(form.metadataJson) as Record<string, unknown>;
      } catch {
        setError("Metadata must be valid JSON");
        setSaving(false);
        return;
      }
    }

    const recordingUrls = form.recordingUrls
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      title: form.title,
      sourceType: "imported" as const,
      sourceSystem: form.sourceSystem || "manual-import",
      importType: form.importType,
      occurredAt: form.occurredAt || null,
      importedAt: form.importedAt || null,
      sourceReference: form.sourceReference || null,
      transcript: form.transcript,
      recordingUrls,
      metadata,
    };

    const response = await fetch(`/api/boards/${boardId}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json();

    if (!json.ok) {
      setError(json.error?.message || "Unable to import conversation");
      setSaving(false);
      return;
    }

    setForm(initialForm);
    setSaving(false);
    refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import third-party conversation</CardTitle>
          <CardDescription>
            Bring transcript and recording data from Zoom, Gong, Google Meet, or manual notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <div className="grid gap-1.5">
              <label htmlFor="title" className="text-sm font-medium">Title</label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Customer discovery interview - ACME"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="grid gap-1.5">
                <label htmlFor="sourceSystem" className="text-sm font-medium">Source system</label>
                <Input
                  id="sourceSystem"
                  value={form.sourceSystem}
                  onChange={(event) => setForm((prev) => ({ ...prev, sourceSystem: event.target.value }))}
                  placeholder="zoom / gong / google-meet"
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="importType" className="text-sm font-medium">Import type</label>
                <Input
                  id="importType"
                  value={form.importType}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, importType: event.target.value as ConversationImportType }))
                  }
                  placeholder="transcript | recording | mixed"
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="sourceReference" className="text-sm font-medium">Source reference</label>
                <Input
                  id="sourceReference"
                  value={form.sourceReference}
                  onChange={(event) => setForm((prev) => ({ ...prev, sourceReference: event.target.value }))}
                  placeholder="Call ID / meeting URL"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="occurredAt" className="text-sm font-medium">Conducted at</label>
                <Input
                  id="occurredAt"
                  type="datetime-local"
                  value={form.occurredAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="importedAt" className="text-sm font-medium">Imported at (override)</label>
                <Input
                  id="importedAt"
                  type="datetime-local"
                  value={form.importedAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, importedAt: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="recordingUrls" className="text-sm font-medium">Recording URLs (one per line)</label>
              <Textarea
                id="recordingUrls"
                value={form.recordingUrls}
                onChange={(event) => setForm((prev) => ({ ...prev, recordingUrls: event.target.value }))}
                placeholder={"https://zoom.us/rec/share/...\nhttps://gong.io/call/..."}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="transcript" className="text-sm font-medium">Transcript</label>
              <Textarea
                id="transcript"
                className="min-h-40"
                value={form.transcript}
                onChange={(event) => setForm((prev) => ({ ...prev, transcript: event.target.value }))}
                placeholder="Paste transcript text here"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="metadataJson" className="text-sm font-medium">Extra metadata (JSON)</label>
              <Textarea
                id="metadataJson"
                value={form.metadataJson}
                onChange={(event) => setForm((prev) => ({ ...prev, metadataJson: event.target.value }))}
                placeholder='{"interviewer":"3rd party recruiter","language":"en"}'
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Importing..." : "Import conversation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sortedConversations.map((conversation) => (
          <Card key={conversation.id}>
            <CardHeader className="gap-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{conversation.title}</CardTitle>
                <Badge variant="outline">{conversation.sourceType}</Badge>
                <Badge variant="secondary">{conversation.importType}</Badge>
                <Badge variant="outline">{conversation.sourceSystem}</Badge>
              </div>
              <CardDescription className="flex flex-wrap gap-x-3 gap-y-1">
                <span>Imported <TimeAgo date={conversation.importedAt || conversation.createdAt} /></span>
                {conversation.occurredAt && <span>Conducted at {new Date(conversation.occurredAt).toLocaleString()}</span>}
                {conversation.sourceReference && <span>Ref: {conversation.sourceReference}</span>}
              </CardDescription>
            </CardHeader>
            {(conversation.transcript || conversation.recordingUrls.length > 0) && (
              <CardContent className="space-y-2">
                {conversation.recordingUrls.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium">Recordings</p>
                    <ul className="list-disc pl-5">
                      {conversation.recordingUrls.map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {conversation.transcript && (
                  <div className="text-sm">
                    <p className="font-medium">Transcript</p>
                    <p className="whitespace-pre-wrap rounded-md border p-3 text-muted-foreground">{conversation.transcript}</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
