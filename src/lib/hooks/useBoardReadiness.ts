"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNutriStore } from "@/lib/store/useNutriStore";
import { deckService } from "@/lib/services/deckService";
import {
  generateBoardReadinessReport,
  resolveCardSubject,
} from "@/lib/services/boardReadinessService";
import {
  applyNDLETagToCard,
  batchClassifyCards,
} from "@/lib/services/ndleClassifierService";
import {
  BoardReadinessReport,
  NDLESubject,
  NDLE_SUBJECT_CONFIGS,
} from "@/types/ndle";
import { StudyLogEntry } from "@/types";

function getStoredCbleAttempts(): Array<{
  subject: string;
  isCorrect: boolean;
  timestamp: string;
}> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("cble_exam_history");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const attempts: Array<{
      subject: string;
      isCorrect: boolean;
      timestamp: string;
    }> = [];

    for (const exam of parsed) {
      const timestamp = exam.completedAt || new Date().toISOString();

      if (exam.categoryBreakdown && typeof exam.categoryBreakdown === "object" && Object.keys(exam.categoryBreakdown).length > 0) {
        for (const [catName, stats] of Object.entries(exam.categoryBreakdown)) {
          const s = stats as { total?: number; correct?: number };
          const total = s?.total || 0;
          const correct = s?.correct || 0;
          for (let i = 0; i < correct; i++) {
            attempts.push({ subject: catName, isCorrect: true, timestamp });
          }
          for (let i = 0; i < Math.max(0, total - correct); i++) {
            attempts.push({ subject: catName, isCorrect: false, timestamp });
          }
        }
      } else if (typeof exam.totalQuestions === "number" && typeof exam.correctCount === "number") {
        const total = exam.totalQuestions;
        const correct = exam.correctCount;
        const subject = exam.subject || "Clinical";
        for (let i = 0; i < correct; i++) {
          attempts.push({ subject, isCorrect: true, timestamp });
        }
        for (let i = 0; i < Math.max(0, total - correct); i++) {
          attempts.push({ subject, isCorrect: false, timestamp });
        }
      } else if (exam.userAnswers && typeof exam.userAnswers === "object") {
        for (const ans of Object.values(exam.userAnswers)) {
          const cast = ans as {
            isCorrect?: boolean;
            subject?: string;
            timestamp?: string;
          };
          if (typeof cast?.isCorrect === "boolean") {
            attempts.push({
              subject: cast.subject || exam.subject || "Clinical",
              isCorrect: cast.isCorrect,
              timestamp: cast.timestamp || timestamp,
            });
          }
        }
      }
    }
    return attempts;
  } catch {
    return [];
  }
}

export function useBoardReadiness() {
  const { decks, loadDecks } = useNutriStore();
  const [reviewLogs, setReviewLogs] = useState<StudyLogEntry[]>([]);
  const [cbleAttempts, setCbleAttempts] = useState<
    Array<{ subject: string; isCorrect: boolean; timestamp: string }>
  >(getStoredCbleAttempts);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizeProgress, setCategorizeProgress] = useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });

  // Initial load
  useEffect(() => {
    let isMounted = true;

    deckService
      .getReviewLogs()
      .then((logs) => {
        if (isMounted) {
          setReviewLogs(logs);
          setIsLoadingLogs(false);
        }
      })
      .catch((e) => {
        console.warn("Failed to load review logs for board readiness:", e);
        if (isMounted) {
          setIsLoadingLogs(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Manual refresh trigger
  const fetchLogs = useCallback(async () => {
    try {
      setIsLoadingLogs(true);
      const logs = await deckService.getReviewLogs();
      setReviewLogs(logs);
      setCbleAttempts(getStoredCbleAttempts());
    } catch (e) {
      console.warn("Failed to reload review logs for board readiness:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  // Real-time report computation whenever decks or reviewLogs change
  const report: BoardReadinessReport = useMemo(() => {
    return generateBoardReadinessReport(decks, reviewLogs, cbleAttempts);
  }, [decks, reviewLogs, cbleAttempts]);

  // Count unclassified cards
  const unclassifiedCardsCount = useMemo(() => {
    let count = 0;
    for (const d of decks) {
      for (const c of d.cards || []) {
        if (
          !c.ndleSubject &&
          !(c.tags || []).some((t) => ["nbcd", "cphn", "ffss"].includes(t.toLowerCase()))
        ) {
          count++;
        }
      }
    }
    return count;
  }, [decks]);

  /**
   * Auto-classifies all unclassified cards across all decks using AI/heuristics
   */
  const autoClassifyAllCards = useCallback(async () => {
    setIsCategorizing(true);
    try {
      const allDecks = await deckService.getDecks();
      const updatedDecks = [...allDecks];

      // Collect unclassified cards
      const targets: Array<{
        deckId: string;
        cardIndex: number;
        card: typeof allDecks[0]["cards"][0];
      }> = [];
      for (let d = 0; d < updatedDecks.length; d++) {
        const deck = updatedDecks[d];
        for (let c = 0; c < (deck.cards || []).length; c++) {
          const card = deck.cards[c];
          if (!card.ndleSubject) {
            targets.push({ deckId: deck.id, cardIndex: c, card });
          }
        }
      }

      if (targets.length === 0) {
        setIsCategorizing(false);
        return { updatedCount: 0 };
      }

      setCategorizeProgress({ current: 0, total: targets.length });

      const classifiedResults = await batchClassifyCards(
        targets.map((t) => t.card),
        (current, total) => setCategorizeProgress({ current, total })
      );

      // Apply subjects to decks
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const res = classifiedResults[i];
        if (res && res.classification) {
          const deck = updatedDecks.find((d) => d.id === target.deckId);
          if (deck && deck.cards[target.cardIndex]) {
            deck.cards[target.cardIndex] = applyNDLETagToCard(
              deck.cards[target.cardIndex],
              res.classification.subject
            );
          }
        }
      }

      // Persist updated decks
      await deckService.setAllDecks(updatedDecks);
      await loadDecks();
      await fetchLogs();

      return { updatedCount: targets.length };
    } finally {
      setIsCategorizing(false);
    }
  }, [fetchLogs, loadDecks]);

  /**
   * Manually override a single card's NDLE subject
   */
  const overrideCardSubject = useCallback(
    async (deckId: string, cardId: string, newSubject: NDLESubject) => {
      const currentDecks = await deckService.getDecks();
      const targetDeck = currentDecks.find((d) => d.id === deckId);
      if (!targetDeck) return;

      const card = targetDeck.cards?.find((c) => c.id === cardId);
      if (!card) return;

      const updatedCard = applyNDLETagToCard(card, newSubject);
      await deckService.updateCard(deckId, cardId, updatedCard);
      await loadDecks();
    },
    [loadDecks]
  );

  return {
    report,
    isLoadingLogs,
    isCategorizing,
    categorizeProgress,
    unclassifiedCardsCount,
    refresh: fetchLogs,
    autoClassifyAllCards,
    overrideCardSubject,
    resolveCardSubject,
    subjectConfigs: NDLE_SUBJECT_CONFIGS,
  };
}
