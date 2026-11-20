import { getCBLEExamQuestions } from "@/actions/cble";
import { CBLEExamView } from "@/components/cble/cble-exam-view";
import { CemMettlExamView } from "@/components/cble/CemMettlExamView";
import { MOCK_NMAT_QUESTIONS } from "@/data/nmat-mock-data";

export const dynamic = "force-dynamic";

export default async function CBLEPage({
  searchParams,
}: {
  searchParams?: Promise<{ count?: string; mode?: string; track?: string }> | { count?: string; mode?: string; track?: string };
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const requestedCount = resolvedParams?.count === "200" ? 200 : 100;
  const examMode = (resolvedParams?.mode || (resolvedParams?.track === "nmat" ? "mettl" : "mettl")).toLowerCase();

  // If user requested or is in NMAT mode or requested CEM / Mettl UI:
  if (examMode === "mettl" || examMode === "nmat" || resolvedParams?.track === "nmat") {
    // If NMAT track, use NMAT question set; if general mock test, provide full questions
    const questions = resolvedParams?.track === "nmat" ? MOCK_NMAT_QUESTIONS : await getCBLEExamQuestions(requestedCount);
    const title = resolvedParams?.track === "nmat" 
      ? "Sample Test-copy / NMAT Mock Examination"
      : "Sample Test-copy / PRC-CBLE Licensure Simulation";

    return (
      <CemMettlExamView
        initialQuestions={questions}
        initialItemCount={requestedCount}
        testTitle={title}
      />
    );
  }

  // Classic PRC-CBLE Interface
  const initialQuestions = await getCBLEExamQuestions(requestedCount);
  return <CBLEExamView initialQuestions={initialQuestions} initialItemCount={requestedCount} />;
}
