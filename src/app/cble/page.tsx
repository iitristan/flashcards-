import { getCBLEExamQuestions } from "@/actions/cble";
import { CBLEExamView } from "@/components/cble/cble-exam-view";

export const dynamic = "force-dynamic";

export default async function CBLEPage({
  searchParams,
}: {
  searchParams?: Promise<{ count?: string }> | { count?: string };
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const requestedCount = resolvedParams?.count === "200" ? 200 : 100;
  const initialQuestions = await getCBLEExamQuestions(requestedCount);

  return <CBLEExamView initialQuestions={initialQuestions} initialItemCount={requestedCount} />;
}
