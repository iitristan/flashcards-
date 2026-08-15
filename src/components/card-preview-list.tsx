"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedFlashcard } from "@/types/gemini";

export interface PreviewCard extends GeneratedFlashcard {
  id: string;
  selected: boolean;
}

interface CardPreviewListProps {
  cards: PreviewCard[];
  onChange: (cards: PreviewCard[]) => void;
}

export function CardPreviewList({ cards, onChange }: CardPreviewListProps) {
  function updateCard(id: string, field: "front" | "back", value: string) {
    onChange(
      cards.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function toggleSelected(id: string) {
    onChange(
      cards.map((c) =>
        c.id === id ? { ...c, selected: !c.selected } : c
      )
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Preview ({cards.filter((c) => c.selected).length} selected)</h3>
      <div className="space-y-3">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="rounded-lg border bg-card p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                id={`select-${card.id}`}
                checked={card.selected}
                onCheckedChange={() => toggleSelected(card.id)}
              />
              <Label htmlFor={`select-${card.id}`} className="font-medium">
                Card {index + 1}
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`front-${card.id}`}>Front</Label>
              <Input
                id={`front-${card.id}`}
                value={card.front}
                onChange={(e) => updateCard(card.id, "front", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`back-${card.id}`}>Back</Label>
              <Textarea
                id={`back-${card.id}`}
                value={card.back}
                onChange={(e) => updateCard(card.id, "back", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
