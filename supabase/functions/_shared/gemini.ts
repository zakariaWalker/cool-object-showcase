/**
 * Shared Gemini API helper for all edge functions.
 * Uses GEMINI_API_KEY directly with Google's Generative Language API.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiMessage {
  role: "user" | "model";
  parts: GeminiPart[];
}

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiConfig {
  model?: string;
  temperature?: number;
  systemInstruction?: string;
  tools?: any[];
  toolConfig?: any;
}

export interface GeminiResponse {
  text: string;
  toolCalls?: { name: string; args: any }[];
  raw: any;
}

export function getGeminiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

export async function callGemini(
  messages: GeminiMessage[],
  config: GeminiConfig = {}
): Promise<GeminiResponse> {
  const apiKey = getGeminiKey();
  const model = config.model || "gemini-2.5-flash";
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: messages,
    generationConfig: {
      temperature: config.temperature ?? 0.2,
    },
  };

  if (config.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: config.systemInstruction }],
    };
  }

  if (config.tools) {
    body.tools = config.tools;
    if (config.toolConfig) {
      body.toolConfig = config.toolConfig;
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 429) {
      throw new GeminiError("RATE_LIMIT", "تم تجاوز حد الطلبات. حاول لاحقاً.", 429);
    }
    if (response.status === 402 || response.status === 403) {
      throw new GeminiError("QUOTA", "حصة API منتهية. تحقق من مفتاح Gemini.", 402);
    }
    throw new GeminiError("API_ERROR", `Gemini error ${response.status}: ${errText.slice(0, 300)}`, response.status);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  if (!candidate?.content?.parts) {
    throw new GeminiError("EMPTY", "Empty Gemini response", 500);
  }

  const textParts = candidate.content.parts
    .filter((p: any) => p.text)
    .map((p: any) => p.text);

  const toolCalls = candidate.content.parts
    .filter((p: any) => p.functionCall)
    .map((p: any) => ({
      name: p.functionCall.name,
      args: p.functionCall.args,
    }));

  return {
    text: textParts.join(""),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    raw: data,
  };
}

export class GeminiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Extract JSON from text that may contain markdown fences */
export function extractJSON(text: string): any {
  // Strip markdown fences
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Find JSON boundaries
  const jsonStart = cleaned.search(/[\{\[]/);
  if (jsonStart === -1) throw new Error("No JSON found in AI response");
  const opener = cleaned[jsonStart];
  const closer = opener === '[' ? ']' : '}';
  const jsonEnd = cleaned.lastIndexOf(closer);
  if (jsonEnd === -1) throw new Error("Truncated JSON response from AI");

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  // Check for truncation
  const openBraces = (cleaned.match(/{/g) || []).length;
  const closeBraces = (cleaned.match(/}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;

  if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
    // Auto-close truncated JSON
    let fix = cleaned;
    for (let i = 0; i < openBrackets - closeBrackets; i++) fix += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) fix += '}';
    cleaned = fix;
  }

  // Attempt parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fix common LLM issues
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, " ")
      .replace(/\\'/g, "'");
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Could not parse JSON from AI response: ${(e as Error).message?.slice(0, 100)}`);
    }
  }
}
