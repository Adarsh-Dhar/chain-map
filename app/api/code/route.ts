import { NextRequest, NextResponse } from "next/server";
import { BASE_FOUNDRY_PROMPT, getFoundrySystemPrompt } from "./prompt";

// Helper to call OpenRouter as a Claude/Anthropic stand-in
async function callOpenRouter(messages: any[], system: string, max_tokens: number) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
  const SITE_NAME = process.env.SITE_NAME || "Chain Forge";

  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OpenRouter API key");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": SITE_URL,
      "X-Title": SITE_NAME,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1:free",
      messages,
      max_tokens,
      system,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing or invalid prompt" }, { status: 400 });
    }
    // Use the Foundry system prompt
    const system = getFoundrySystemPrompt(prompt);
    const messages = [{ role: "user", content: prompt }];
    const data = await callOpenRouter(messages, system, 10000);
    let foundryArtifact = data.choices?.[0]?.message?.content?.trim();
    // Extract only the <boltArtifact>...</boltArtifact> block
    const artifactMatch = foundryArtifact?.match(/<boltArtifact[\s\S]*?<\/boltArtifact>/);
    let artifact = artifactMatch ? artifactMatch[0] : foundryArtifact;
    // Add type field for CCIP
    let type = undefined;
    if (/chainlink ccip|ccip/i.test(prompt)) {
      type = 'ccip';
    }
    return NextResponse.json({
      artifact,
      type,
      raw: data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
