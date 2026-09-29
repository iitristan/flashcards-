import { NextRequest, NextResponse } from "next/server";
import {
  classifyCardWithAI,
  batchClassifyCards,
} from "@/lib/services/ndleClassifierService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Batch classification
    if (Array.isArray(body.cards)) {
      const results = await batchClassifyCards(body.cards);
      return NextResponse.json({ success: true, results });
    }

    // Single card classification
    if (body.card && typeof body.card.front === "string") {
      const result = await classifyCardWithAI(body.card);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { success: false, error: "Invalid payload: 'card' or 'cards' array required." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
