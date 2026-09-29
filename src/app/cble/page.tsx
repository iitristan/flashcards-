import { getCBLEExamQuestions } from "@/actions/cble";
import { CBLEExamView } from "@/components/cble/cble-exam-view";

export const dynamic = "force-dynamic";

export default async function CBLEPage() {
  const initialQuestions = await getCBLEExamQuestions();

  return <CBLEExamView initialQuestions={initialQuestions} />;
}
