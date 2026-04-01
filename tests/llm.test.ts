/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, expect, test } from "vitest";
import { jsonSchema, ModelMessage, tool } from "ai";
import { generateCompletion } from "../src/logic/llm";
import type { ProviderInfoWithName } from "../src/logic/provider";

const TEST_TIMEOUT = 15000;
globalThis.AI_SDK_LOG_WARNINGS = false;

const TEST_MODEL = "openai/gpt-oss-20b";

async function checkEndpoint(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/models`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    const object = await response.json();
    // @ts-expect-error expect array from response
    return (object!.data as unknown[]).some(model => model.id === TEST_MODEL);
  } catch {
    return false;
  }
}

async function findEndpoint(): Promise<string | null> {
  const endpoints = [
    "http://127.0.0.1:1234/v1",
    "http://host.docker.internal:1234/v1",
  ];

  for (const endpoint of endpoints) {
    if (await checkEndpoint(endpoint)) {
      return endpoint;
    }
  }
  return null;
}

const baseURL = await findEndpoint();
const endpointAvailable = baseURL !== null;

const provider: ProviderInfoWithName = {
  name: "test",
  baseURL: baseURL ?? "No endpoint found.",
  apiKey: "",
  model: TEST_MODEL,
  apiType: "openai-compatible",
};

if (!endpointAvailable) {
  const lines = [
    "[LLM Tests] Skipped",
    "  Please ensure an OpenAI-compatible server is running at",
    `  http://127.0.0.1:1234 with model '${TEST_MODEL}' available.`,
  ];
  console.log(lines.join("\n"));
}

const testIf = test.skipIf(!endpointAvailable);

describe("generateCompletion", () => {
  describe("basic streaming", () => {
    testIf(
      "streams text response",
      async () => {
        const messages: ModelMessage[] = [
          { role: "user", content: "Say 'Hello, world!' and nothing else." },
        ];

        const result = generateCompletion(
          provider,
          messages,
          "You are a helpful assistant. Follow instructions exactly.",
        );

        const chunks: string[] = [];
        for await (const chunk of result.textStream) {
          chunks.push(chunk);
        }

        const fullText = await result.text;
        expect(chunks.length).toBeGreaterThan(0);
        expect(fullText.toLowerCase()).toContain("hello");
      },
      TEST_TIMEOUT,
    );
  });

  describe("multi-turn conversation", () => {
    testIf(
      "handles multiple messages",
      async () => {
        const messages: ModelMessage[] = [
          { role: "user", content: "My favorite color is blue." },
          {
            role: "assistant",
            content: "I'll remember that your favorite color is blue.",
          },
          {
            role: "user",
            content: "What is my favorite color? Answer in one word.",
          },
        ];

        const result = generateCompletion(
          provider,
          messages,
          "You are a helpful assistant. Answer concisely.",
        );

        const text = await result.text;
        expect(text.toLowerCase()).toContain("blue");
      },
      TEST_TIMEOUT,
    );
  });

  describe("tool calling", () => {
    testIf(
      "calls tool when requested",
      async () => {
        const tools = {
          get_weather: tool({
            description: "Get the current weather for a location",
            inputSchema: jsonSchema({
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description:
                    "The city and country, e.g. New York City, United States",
                },
              },
              required: ["location"],
            }),
          }),
        };

        const messages: ModelMessage[] = [
          { role: "user", content: "What is the weather in Paris?" },
        ];

        const result = generateCompletion(
          provider,
          messages,
          "You are a helpful assistant. Use the get_weather tool when asked about weather.",
          undefined,
          tools,
        );

        const toolCalls = await result.toolCalls;

        expect(toolCalls.length).greaterThan(0);
        expect(toolCalls[0]?.toolName).toBe("get_weather");
        expect(toolCalls[0]?.input).toHaveProperty("location");
        expect(toolCalls[0]?.input.location).toContain("Paris");
      },
      TEST_TIMEOUT,
    );
  });
});
