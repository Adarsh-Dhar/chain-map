import { NextRequest, NextResponse } from "next/server";
import { BASE_FOUNDRY_PROMPT, getFoundrySystemPrompt } from "./prompt";

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

    // Accept optional contractDataFeeds
    const contractDataFeeds = body.contractDataFeeds;
    if (contractDataFeeds && typeof contractDataFeeds === 'object') {
      // For each contract, append data feed info to the prompt
      Object.entries(contractDataFeeds).forEach(([contractName, feeds]) => {
        if (Array.isArray(feeds) && feeds.length > 0) {
          prompt += `\n\nContract '${contractName}' is connected to the following Chainlink Data Feeds:`;
          feeds.forEach((feed: any) => {
            prompt += `\n- ${feed.name} at address ${feed.address}`;
            prompt += `\nInclude an explanation and a Solidity code snippet for reading from this data feed using AggregatorV3Interface at the above address.`;
          });
        }
      });
    }

    // Use the Foundry system prompt
    const system = getFoundrySystemPrompt(prompt);
    const messages = [{ role: "user", content: prompt }];
    
    const data = await callOpenRouter(messages, system, 10000);
    
    let foundryArtifact = data.choices?.[0]?.message?.content?.trim();
    if (!foundryArtifact) {
      return NextResponse.json({ 
        error: "No response generated",
        details: "The AI model did not return any content"
      }, { status: 500 });
    }

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
