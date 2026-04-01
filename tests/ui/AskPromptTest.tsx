import { AskPrompt } from "../../src/components/ask/AskPrompt";
import { renderWithColor } from "../../src/utils";
import type { Question } from "../../src/tools/ask";

const sampleQuestions: Question[] = [
  {
    title: "Target environment",
    question: "Which environment do you want to deploy to?",
    choices: [
      { label: "Production", description: "Live environment for end users" },
      { label: "Staging", description: "Pre-production testing environment" },
      { label: "Development", description: "Local or shared dev environment" },
    ],
  },
  {
    title: "Database type",
    question: "Which database should the project use?",
    choices: [
      { label: "PostgreSQL", description: "Advanced relational database" },
      { label: "SQLite", description: "Lightweight file-based database" },
      { label: "MongoDB", description: "Document-oriented NoSQL database" },
      { label: "Redis", description: "In-memory key-value store" },
    ],
  },
  {
    title: "Auth strategy",
    question: "What authentication method do you prefer?",
    choices: [
      { label: "JWT tokens" },
      { label: "Session cookies" },
      { label: "OAuth 2.0" },
    ],
  },
];

async function testAskPrompt() {
  const { waitUntilExit } = await renderWithColor(
    <AskPrompt
      modelInput={{ questions: sampleQuestions }}
      onSubmit={responses => {
        console.log("Responses:", JSON.stringify(responses, null, 2));
      }}
    />,
  );
  await waitUntilExit();
}

await testAskPrompt();
