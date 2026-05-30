import OpenAI from "openai";
import { UsageError } from "./errors.js";
import type { TriageProvider } from "./types.js";

export function createOpenAIProvider(apiKey?: string): TriageProvider {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new UsageError("OPENAI_API_KEY is required unless you run with --dry-run.");
  }

  const client = new OpenAI({ apiKey: key });

  return {
    async complete(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message.content;
      if (!content) {
        throw new UsageError("OpenAI returned an empty response.");
      }

      return content;
    },
  };
}
