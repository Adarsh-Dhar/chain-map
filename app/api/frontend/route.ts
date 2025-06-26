import { NextRequest, NextResponse } from "next/server";
import { BASE_PROMPT, getSystemPrompt, BASE_FRONTEND_PROMPT, getFrontendSystemPrompt } from "./prompt";

// Helper to call OpenRouter as a Claude/Anthropic stand-in
async function callOpenRouter(messages: any[], system: string, max_tokens: number) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
  const SITE_NAME = process.env.SITE_NAME || "Chain Forge";

  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in your environment variables.");
  }

  try {
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
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    return response.json();
  } catch (error: any) {
    if (error.message.includes('fetch')) {
      throw new Error(`Network error while calling OpenRouter API: ${error.message}`);
    }
    throw error;
  }
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let prompt = body.prompt;
    
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ 
        error: "Missing or invalid prompt",
        details: "The prompt must be a non-empty string"
      }, { status: 400 });
    }

    // Accept optional frontendData (for future extensibility)
    const frontendData = body.frontendData;
    if (frontendData && typeof frontendData === 'object') {
      // You can append frontend-specific instructions here if needed
      // For now, just append a comment
      prompt += `\n\n// Additional frontend data provided.`;
    }

    // Use the Frontend system prompt
    const system = getFrontendSystemPrompt(prompt);
    const messages = [{ role: "user", content: prompt }];
    
    const data = await callOpenRouter(messages, system, 10000);
    
    let frontendArtifact = data.choices?.[0]?.message?.content?.trim();
    if (!frontendArtifact) {
      return NextResponse.json({ 
        error: "No response generated",
        details: "The AI model did not return any content"
      }, { status: 500 });
    }

    // Extract only the <boltArtifact>...</boltArtifact> block
    const artifactMatch = frontendArtifact?.match(/<boltArtifact[\s\S]*?<\/boltArtifact>/);
    let artifact = artifactMatch ? artifactMatch[0] : frontendArtifact;

    // Add type field for React
    let type = undefined;
    if (/react|jsx|tsx|frontend/i.test(prompt)) {
      type = 'react';
    }

    return NextResponse.json({
      artifact,
      type,
      raw: data,
    });
  } catch (error: any) {
    console.error("API Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return NextResponse.json({ 
      error: error.message,
      details: "Check if OPENROUTER_API_KEY is properly configured in your environment variables"
    }, { status: 500 });
  }
}
