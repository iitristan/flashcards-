"use client";

import { useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { bulkCreateCards } from "@/actions/cards";
import {
  CardPreviewList,
  type PreviewCard,
} from "@/components/card-preview-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AiGeneratorFormProps {
  decks: { id: string; name: string }[];
}

export function AiGeneratorForm({ decks }: AiGeneratorFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [activeTab, setActiveTab] = useState("topic");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "txt" && ext !== "md" && ext !== "pdf") {
      toast.error("Only .txt, .md, and .pdf files are supported.");
      e.target.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File must be under 15MB.");
      e.target.value = "";
      return;
    }

    if (ext === "pdf") {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/extract-pdf", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          throw new Error("Failed to extract PDF content");
        }
        const data = await res.json();
        setFileName(file.name);
        setFileContent(data.text || "");
        toast.success(`Extracted text from ${data.numPages || 1} pages of ${file.name}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "PDF extraction failed";
        toast.error(msg);
        e.target.value = "";
      }
      return;
    }

    const text = await file.text();
    setFileName(file.name);
    setFileContent(text);
  }

  async function handleGenerate() {
    setLoading(true);
    setPreviewCards([]);

    try {
      const body: Record<string, unknown> = { count };

      if (activeTab === "topic") {
        if (!topic.trim()) {
          toast.error("Enter a topic to generate cards.");
          return;
        }
        body.topic = topic;
      } else if (activeTab === "text") {
        if (!rawText.trim()) {
          toast.error("Paste some text to generate cards.");
          return;
        }
        body.rawText = rawText;
      } else {
        if (!fileContent.trim()) {
          toast.error("Upload a .txt or .md file first.");
          return;
        }
        body.fileContent = fileContent;
      }

      const res = await fetch("/api/generate-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate cards");
      }

      setPreviewCards(
        data.cards.map(
          (card: { front: string; back: string }, i: number) => ({
            ...card,
            id: `preview-${i}`,
            selected: true,
          })
        )
      );
      toast.success(`Generated ${data.cards.length} cards`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!deckId) {
      toast.error("Create a deck first before saving cards.");
      return;
    }

    const selected = previewCards.filter((c) => c.selected);
    if (selected.length === 0) {
      toast.error("Select at least one card to save.");
      return;
    }

    setSaving(true);
    try {
      const result = await bulkCreateCards(
        deckId,
        selected.map(({ front, back }) => ({ front, back }))
      );
      toast.success(`Saved ${result.count} cards`);
      setPreviewCards([]);
      setTopic("");
      setRawText("");
      setFileContent("");
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save cards");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate flashcards
          </CardTitle>
          <CardDescription>
            Use Gemini AI to create cards from a topic, text, or file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {decks.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              Create a deck first on the Decks page before saving generated cards.
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Save to deck</Label>
              <Select
                value={deckId}
                onValueChange={(value) => value && setDeckId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select deck" />
                </SelectTrigger>
                <SelectContent>
                  {decks.map((deck) => (
                    <SelectItem key={deck.id} value={deck.id}>
                      {deck.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="count">Number of cards</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={30}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-32"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="topic">Topic</TabsTrigger>
              <TabsTrigger value="text">Paste text</TabsTrigger>
              <TabsTrigger value="file">Upload file</TabsTrigger>
            </TabsList>
            <TabsContent value="topic" className="space-y-2 pt-4">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g. Photosynthesis, World War II causes"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </TabsContent>
            <TabsContent value="text" className="space-y-2 pt-4">
              <Label htmlFor="rawText">Source text</Label>
              <Textarea
                id="rawText"
                placeholder="Paste notes, article text, or study material..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={8}
              />
            </TabsContent>
            <TabsContent value="file" className="space-y-2 pt-4">
              <Label htmlFor="file">Upload .txt, .md, or .pdf (max 15MB)</Label>
              <Input
                id="file"
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
                onChange={handleFileChange}
              />
              {fileName && (
                <p className="text-sm text-muted-foreground">
                  Loaded: {fileName} ({fileContent.length} characters)
                </p>
              )}
            </TabsContent>
          </Tabs>

          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate cards
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <CardPreviewList cards={previewCards} onChange={setPreviewCards} />

      {previewCards.length > 0 && (
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving || !deckId}>
            {saving ? "Saving..." : "Save selected to deck"}
          </Button>
          <Button variant="outline" onClick={() => setPreviewCards([])}>
            Discard
          </Button>
        </div>
      )}
    </div>
  );
}
