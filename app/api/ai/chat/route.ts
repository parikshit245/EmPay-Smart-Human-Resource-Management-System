import { NextRequest, NextResponse } from "next/server";
import { getTokenPayload } from "@/lib/auth";
import { fetchAIContext } from "@/lib/ai-context";
import { buildSystemPrompt, isHRQuestion } from "@/lib/ai-prompts";
import {
  validateMessage,
  sanitizeMessage,
  checkRateLimit,
  sanitizeAIResponse,
  logSecurityEvent,
} from "@/lib/ai-security";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = getTokenPayload(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SECURITY: Check rate limiting
    if (!checkRateLimit(user.id)) {
      logSecurityEvent(user.id, "RATE_LIMIT_EXCEEDED", "Too many requests");
      return NextResponse.json(
        {
          error:
            "Too many requests. Please wait a moment before sending another message.",
        },
        { status: 429 }
      );
    }

    // Get request body
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // SECURITY: Sanitize message to prevent injection
    const sanitizedMessage = sanitizeMessage(message);

    // SECURITY: Validate message against attack patterns
    const validation = validateMessage(sanitizedMessage);
    if (!validation.valid) {
      logSecurityEvent(user.id, "INVALID_MESSAGE", validation.reason || "");
      return NextResponse.json({
        response:
          "I can only help with HR-related questions. Please rephrase your question.",
        isHRQuestion: false,
      });
    }

    // Check if it's an HR question (enhanced check)
    if (!isHRQuestion(sanitizedMessage)) {
      return NextResponse.json({
        response:
          "I'm here to help with HR-related questions like attendance, leaves, payroll, and employee matters. How can I assist you with that?",
        isHRQuestion: false,
      });
    }

    // Fetch role-based context
    const context = await fetchAIContext(user.id, user.role);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(context);

    // Call Groq API
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error("GROQ_API_KEY is not set");
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: sanitizedMessage,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Groq API error:", errorData);
      return NextResponse.json(
        {
          error:
            "Failed to get response from AI service. Please try again later.",
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract response
    let aiResponse =
      data.choices?.[0]?.message?.content ||
      "I couldn't generate a response. Please try again.";

    // SECURITY: Sanitize AI response to prevent information leakage
    aiResponse = sanitizeAIResponse(aiResponse);

    return NextResponse.json({
      response: aiResponse,
      isHRQuestion: true,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your message" },
      { status: 500 }
    );
  }
}
