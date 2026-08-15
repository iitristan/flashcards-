import { NextResponse } from "next/server";
import { generateFlashcards } from "@/lib/gemini";
import { PDFParse } from 'pdf-parse';
import { z } from "zod";

const requestSchema = z.object({
  topic: z.string().optional(),
  rawText: z.string().optional(),
  fileContent: z.string().optional(),
  count: z.number().int().min(1).max(30).optional(),
});

const ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf"];

export async function POST(request: Request) {
  try {

    const contentType = request.headers.get("content-type") ?? "";

    let payload: z.infer<typeof requestSchema>;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (file instanceof File) {
        const name = file.name.toLowerCase();
        const ext = name.slice(name.lastIndexOf("."));

        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return NextResponse.json(
            { error: "Only .txt, .md, and .pdf files are supported." },
            { status: 400 }
          );
        }

        if (file.size > 15 * 1024 * 1024) {
          return NextResponse.json(
            { error: "File must be under 15MB." },
            { status: 400 }
          );
        }

        let fileContent = "";
        if (ext === ".pdf") {
          const ab = await file.arrayBuffer();
          const parser = new PDFParse({ data: Buffer.from(ab) });
          const pdfData = await parser.getText();
          fileContent = pdfData.text || '';
        } else {
          fileContent = await file.text();
        }

        payload = {
          fileContent,
          count: Number(formData.get("count") ?? 10),
        };
      } else {
        payload = requestSchema.parse({
          topic: formData.get("topic")?.toString(),
          rawText: formData.get("rawText")?.toString(),
          fileContent: formData.get("fileContent")?.toString(),
          count: Number(formData.get("count") ?? 10),
        });
      }
    } else {
      const body = await request.json();
      payload = requestSchema.parse(body);
    }

    const cards = await generateFlashcards(payload);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error("generate-cards error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to generate cards";

    const status = message.includes("rate limit") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
