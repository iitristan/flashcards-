import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();

    return NextResponse.json({
      text: pdfData.text || '',
      numPages: pdfData.total || pdfData.pages?.length || 1
    });
  } catch (error: unknown) {
    console.error('PDF extraction error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to extract text from PDF';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
