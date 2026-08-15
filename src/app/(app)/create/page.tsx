import { getDeckNames } from "@/actions/decks";
import { AiGeneratorForm } from "@/components/ai-generator-form";

export default async function CreatePage() {
  const decks = await getDeckNames();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create with AI</h1>
        <p className="text-muted-foreground">
          Generate flashcards from a topic, notes, or uploaded file
        </p>
      </div>
      <AiGeneratorForm decks={decks} />
    </div>
  );
}
