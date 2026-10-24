import { CBLEQuestion, CBLEExamineeProfile } from "@/data/cble-mock-data";

export interface CBLEExamReportData {
  examinee: CBLEExamineeProfile;
  questions: CBLEQuestion[];
  userAnswers: Record<number, "A" | "B" | "C" | "D">;
  timeSpentSeconds: number;
  completedAt?: string;
  categoryBreakdown?: Record<string, { total: number; correct: number }>;
}

function escapeHtml(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function escapeCsvField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates an official, beautifully styled, self-contained HTML document
 * containing the full examination summary and the complete answered sheet
 * with all mistakes, correct answers, and rationale.
 */
export function generateCBLEPrintableHtml(data: CBLEExamReportData): string {
  const { examinee, questions, userAnswers, timeSpentSeconds, completedAt } = data;

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const categoryMap: Record<string, { total: number; correct: number; wrong: number }> = {};

  questions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    const cat = q.category || q.subject || "General Nutrition";
    if (!categoryMap[cat]) {
      categoryMap[cat] = { total: 0, correct: 0, wrong: 0 };
    }
    categoryMap[cat].total++;

    if (userAns === q.correctAnswer) {
      correctCount++;
      categoryMap[cat].correct++;
    } else if (userAns !== undefined) {
      wrongCount++;
      categoryMap[cat].wrong++;
    } else {
      unansweredCount++;
    }
  });

  const total = questions.length || 1;
  const percentage = Math.round((correctCount / total) * 100);
  const isPassed = percentage >= 80;
  const examDate = completedAt
    ? new Date(completedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
    : new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });

  const categoryRows = Object.entries(categoryMap)
    .map(([cat, stats]) => {
      const catPct = Math.round((stats.correct / stats.total) * 100);
      const catStatus = catPct >= 80 ? "Proficient (Passed)" : catPct >= 60 ? "Moderate" : "Needs Review";
      const statusColor = catPct >= 80 ? "#15803d" : catPct >= 60 ? "#b45309" : "#b91c1c";
      return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${escapeHtml(cat)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${stats.total}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #15803d; font-weight: bold;">${stats.correct}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #b91c1c; font-weight: bold;">${stats.wrong}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${catPct}%</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${statusColor}; font-weight: 600;">${catStatus}</td>
      </tr>
    `;
    })
    .join("");

  const questionSheets = questions
    .map((q, idx) => {
      const userAns = userAnswers[idx];
      const isCorrect = userAns === q.correctAnswer;
      const isUnanswered = userAns === undefined;

      let badgeBg = "#fee2e2";
      let badgeBorder = "#fca5a5";
      let badgeColor = "#991b1b";
      let badgeText = "✕ MISTAKE / INCORRECT";

      if (isCorrect) {
        badgeBg = "#dcfce7";
        badgeBorder = "#86efac";
        badgeColor = "#166534";
        badgeText = "✓ CORRECT";
      } else if (isUnanswered) {
        badgeBg = "#fef3c7";
        badgeBorder = "#fde68a";
        badgeColor = "#92400e";
        badgeText = "⚠️ UNANSWERED";
      }

      const optionsHtml = q.options
        .map((opt) => {
          const isSelected = userAns === opt.key;
          const isTheCorrectOption = q.correctAnswer === opt.key;

          let optBoxStyle = "border: 1px solid #cbd5e1; background-color: #ffffff; color: #1e293b;";
          let markerHtml = "";

          if (isSelected && isTheCorrectOption) {
            // User picked right
            optBoxStyle = "border: 2px solid #16a34a; background-color: #f0fdf4; color: #14532d; font-weight: 600;";
            markerHtml = '<span style="float: right; font-size: 11px; background: #16a34a; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: 700;">✓ Your Choice (Correct)</span>';
          } else if (isSelected && !isTheCorrectOption) {
            // User made a mistake
            optBoxStyle = "border: 2px solid #dc2626; background-color: #fef2f2; color: #7f1d1d; font-weight: 600;";
            markerHtml = '<span style="float: right; font-size: 11px; background: #dc2626; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: 700;">✕ Your Choice (Mistake)</span>';
          } else if (!isSelected && isTheCorrectOption) {
            // The actual correct answer when user was wrong or unanswered
            optBoxStyle = "border: 2px solid #16a34a; background-color: #f0fdf4; color: #14532d; font-weight: 600;";
            markerHtml = '<span style="float: right; font-size: 11px; background: #16a34a; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: 700;">✓ Correct Answer</span>';
          }

          return `
          <div style="margin-bottom: 6px; padding: 8px 12px; border-radius: 6px; font-size: 13px; line-height: 1.4; ${optBoxStyle}">
            ${markerHtml}
            <strong style="margin-right: 6px;">${opt.key}.</strong> ${escapeHtml(opt.text)}
          </div>
        `;
        })
        .join("");

      return `
      <div class="question-block" style="margin-bottom: 24px; padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
          <div>
            <span style="font-size: 14px; font-weight: 800; color: #0f172a;">Item ${idx + 1} of ${total}</span>
            <span style="margin-left: 8px; font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${escapeHtml(q.category || q.subject)}</span>
          </div>
          <span style="font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeColor};">
            ${badgeText}
          </span>
        </div>

        <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; line-height: 1.5;">
          ${escapeHtml(q.question)}
        </div>

        <div style="margin-bottom: 12px;">
          ${optionsHtml}
        </div>

        <div style="background: #f8fafc; border-left: 4px solid #00838f; padding: 10px 14px; border-radius: 0 6px 6px 0; font-size: 12px; line-height: 1.5; color: #334155;">
          <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Rationalization & Answer Key:</strong>
          <div><strong>Correct Key:</strong> ${q.correctAnswer} &nbsp;|&nbsp; <strong>Your Response:</strong> ${userAns || "None (Omitted)"}</div>
          <div style="margin-top: 4px; color: #475569;">${escapeHtml(q.explanation)}</div>
        </div>
      </div>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PRC CBLE Mock Exam Answer Sheet & Result - ${escapeHtml(examinee.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 32px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      margin: -24px -24px 24px -24px;
      border-bottom: 1px solid #334155;
    }
    .btn {
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      transition: background 0.15s;
    }
    .btn-primary {
      background: #00838f;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #006978;
    }
    .btn-secondary {
      background: #334155;
      color: #ffffff;
      margin-left: 8px;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .question-block {
        page-break-inside: avoid !important;
      }
      @page {
        margin: 15mm;
        size: A4;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">
      PRC-CBLE Official Evaluation Sheet & Summary
    </div>
    <div>
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="container">
    <!-- Header -->
    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #475569; text-transform: uppercase;">
        Republic of the Philippines • Professional Regulation Commission
      </div>
      <div style="font-size: 13px; font-weight: 700; color: #334155; margin-top: 2px;">
        PROFESSIONAL REGULATORY BOARD OF NUTRITION AND DIETETICS
      </div>
      <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 8px 0 2px 0;">
        COMPUTER-BASED LICENSURE EXAMINATION (CBLE)
      </h1>
      <div style="font-size: 13px; font-weight: 600; color: #00838f;">
        ${escapeHtml(examinee.examinationName)} — OFFICIAL EXAMINATION RESULT & ANSWER SHEET
      </div>
    </div>

    <!-- Candidate & Session Table -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 12px;">
      <div>
        <div style="margin-bottom: 4px;"><strong>Examinee Name:</strong> ${escapeHtml(examinee.name)}</div>
        <div style="margin-bottom: 4px;"><strong>Examinee Number:</strong> ${escapeHtml(examinee.examineeNumber)}</div>
        <div style="margin-bottom: 4px;"><strong>Application Number:</strong> ${escapeHtml(examinee.applicationNumber)}</div>
        <div><strong>School:</strong> ${escapeHtml(examinee.school)}</div>
      </div>
      <div>
        <div style="margin-bottom: 4px;"><strong>Testing Center:</strong> ${escapeHtml(examinee.testingCenter)}</div>
        <div style="margin-bottom: 4px;"><strong>Room / Seat:</strong> ${escapeHtml(examinee.roomNumber)} / ${escapeHtml(examinee.seatNumber)}</div>
        <div style="margin-bottom: 4px;"><strong>Examination Date:</strong> ${examDate}</div>
        <div><strong>Total Time Elapsed:</strong> ${formatDuration(timeSpentSeconds)}</div>
      </div>
    </div>

    <!-- Score Summary Banner -->
    <div style="display: flex; align-items: center; justify-content: space-between; background: ${isPassed ? "#f0fdf4" : "#fef2f2"}; border: 2px solid ${isPassed ? "#86efac" : "#fca5a5"}; border-radius: 8px; padding: 18px 24px; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 20px;">
        <div style="width: 72px; height: 72px; border-radius: 50%; background: ${isPassed ? "#16a34a" : "#dc2626"}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${percentage}%
        </div>
        <div>
          <span style="display: inline-block; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; background: ${isPassed ? "#dcfce7" : "#fee2e2"}; color: ${isPassed ? "#166534" : "#991b1b"}; text-transform: uppercase;">
            ${isPassed ? "PASSED (PRC Standard ≥ 80%)" : "NEEDS IMPROVEMENT (< 80% passing)"}
          </span>
          <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px;">
            ${correctCount} Correct / ${wrongCount} Mistakes / ${unansweredCount} Unanswered
          </div>
          <div style="font-size: 12px; color: #64748b;">
            Official Passing Mark: 80.00% General Weighted Average (GWA)
          </div>
        </div>
      </div>

      <div style="text-align: right; font-size: 12px;">
        <div><strong>Total Items:</strong> ${total}</div>
        <div><strong>Time Taken:</strong> ${formatDuration(timeSpentSeconds)}</div>
        <div><strong>Status:</strong> <span style="color: ${isPassed ? "#16a34a" : "#dc2626"}; font-weight: 800;">${isPassed ? "QUALIFIED" : "DID NOT MEET THRESHOLD"}</span></div>
      </div>
    </div>

    <!-- Category Performance Table -->
    <div style="margin-bottom: 28px;">
      <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
        Competency & Domain Performance Breakdown
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; text-align: left;">
            <th style="padding: 10px 12px;">Domain / Subject Category</th>
            <th style="padding: 10px 12px; text-align: center;">Total Items</th>
            <th style="padding: 10px 12px; text-align: center;">Correct</th>
            <th style="padding: 10px 12px; text-align: center;">Mistakes</th>
            <th style="padding: 10px 12px; text-align: center;">Rating</th>
            <th style="padding: 10px 12px; text-align: right;">Assessment</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
        </tbody>
      </table>
    </div>

    <!-- Answer Sheet Section Header -->
    <div style="border-top: 2px solid #e2e8f0; padding-top: 24px; margin-bottom: 16px;">
      <h2 style="font-size: 16px; font-weight: 900; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
        Complete Item-by-Item Answer Sheet & Mistakes Diagnostic
      </h2>
      <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">
        All questions answered during the mock examination session. Review mistakes marked in red alongside the official correct answer and rationalization.
      </p>
    </div>

    <!-- Questions Sheet -->
    ${questionSheets}

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #cbd5e1; padding-top: 16px; margin-top: 32px; font-size: 11px; color: #94a3b8;">
      Philippine Nutritionist-Dietitian Licensure Examination (NDLE) Computer-Based Licensure Examination (CBLE) Simulator. Generated on ${examDate}.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers a direct browser download of the full HTML examination summary report.
 */
export function downloadCBLEHtmlReport(data: CBLEExamReportData): void {
  const html = generateCBLEPrintableHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `PRC_NDLE_Mock_Exam_Report_${dateStr}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens a print dialog in a pop-up window formatted for saving as PDF or physical print.
 */
export function openCBLEPrintDialog(data: CBLEExamReportData): void {
  const html = generateCBLEPrintableHtml(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    // If popups blocked, fallback to html download
    downloadCBLEHtmlReport(data);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}

/**
 * Downloads a spreadsheet (CSV) containing the complete answer sheet:
 * Item #, Category, Question, Choices, User Answer, Correct Answer, Result, and Rationale.
 */
export function downloadCBLECsvReport(data: CBLEExamReportData): void {
  const { questions, userAnswers } = data;

  const headers = [
    "Item Number",
    "Subject",
    "Category",
    "Question",
    "Option A",
    "Option B",
    "Option C",
    "Option D",
    "Examinee Answer",
    "Correct Answer",
    "Result Status",
    "Rationalization",
  ];

  const rows = questions.map((q, idx) => {
    const userAns = userAnswers[idx];
    const isCorrect = userAns === q.correctAnswer;
    const isUnanswered = userAns === undefined;

    const optA = q.options.find((o) => o.key === "A")?.text || "";
    const optB = q.options.find((o) => o.key === "B")?.text || "";
    const optC = q.options.find((o) => o.key === "C")?.text || "";
    const optD = q.options.find((o) => o.key === "D")?.text || "";

    const status = isCorrect ? "CORRECT" : isUnanswered ? "UNANSWERED" : "MISTAKE";

    return [
      escapeCsvField(idx + 1),
      escapeCsvField(q.subject),
      escapeCsvField(q.category),
      escapeCsvField(q.question),
      escapeCsvField(optA),
      escapeCsvField(optB),
      escapeCsvField(optC),
      escapeCsvField(optD),
      escapeCsvField(userAns || "UNANSWERED"),
      escapeCsvField(q.correctAnswer),
      escapeCsvField(status),
      escapeCsvField(q.explanation),
    ].join(",");
  });

  // UTF-8 BOM for Microsoft Excel compatibility
  const csvContent = "\uFEFF" + [headers.map(escapeCsvField).join(","), ...rows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `PRC_NDLE_Mock_Exam_Sheet_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a CSV formatted specifically for flashcard / Anki import containing ONLY mistakes,
 * allowing examinees to immediately turn their weak areas into spaced repetition decks!
 */
export function downloadCBLEMistakesFlashcardsCsv(data: CBLEExamReportData): void {
  const { questions, userAnswers } = data;

  const mistakes = questions.filter((q, idx) => {
    const userAns = userAnswers[idx];
    return userAns !== q.correctAnswer;
  });

  if (mistakes.length === 0) {
    alert("Congratulations! You got 100% correct items. No mistakes to export.");
    return;
  }

  const headers = ["Front (Question & Options)", "Back (Answer & Rationale)", "Tags"];

  const rows = mistakes.map((q) => {
    const optionsText = q.options.map((o) => `${o.key}) ${o.text}`).join("\n");
    const front = `${q.question}\n\n${optionsText}`;
    const back = `Correct Answer: [${q.correctAnswer}]\n\nRationale:\n${q.explanation}`;
    const tags = `NDLE_PRC_MISTAKE ${q.category ? q.category.replace(/\s+/g, "_") : "General_Nutrition"}`;

    return [escapeCsvField(front), escapeCsvField(back), escapeCsvField(tags)].join(",");
  });

  const csvContent = "\uFEFF" + [headers.map(escapeCsvField).join(","), ...rows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `PRC_NDLE_Mistakes_Flashcards_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
