import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/sanitize';

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY ?? '',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// In-memory rate limit: 20 messages per session per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const JAILBREAK_PATTERNS = [
  /ignore (all |previous |your )?(instructions|rules|guidelines)/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /act as (if )?you('re| are)/i,
  /forget (everything|all)/i,
  /DAN mode/i,
  /jailbreak/i,
  /override (your|the) (system|safety|rules)/i,
  /do anything now/i,
  /disregard (your|all) (instructions|rules)/i,
];

const HARMFUL_OUTPUT_PATTERNS = [
  /how to (make|build|create) (a )?(bomb|weapon|explosive)/i,
  /instructions? for (killing|murder|suicide|self.harm)/i,
  /step[- ]by[- ]step.*(harm|weapon|explosive)/i,
];

const SYSTEM_PROMPT = `You are EvacuAid Emergency Assistant, an AI helping citizens in Tagum City, Philippines during emergencies.

Your role:
- Help users report emergencies: fire, flood, injury, accident
- Guide them to safety and provide immediate first-aid instructions
- Direct them to emergency services (call 911, local MDRRMO)
- Stay calm, clear, and empathetic at all times

ALERT PROTOCOL — When a user's message clearly indicates an active emergency requiring dispatch (fire, flooding, injury needing medical attention, accident with casualties), output EXACTLY this on its own line BEFORE your response:
[ALERT:type:one-sentence summary]
Where type is one of: fire, flood, injury, accident, other

Example:
[ALERT:fire:House fire with possible trapped persons reported by user]

Then continue with your normal helpful response.

Rules:
- You serve emergency response purposes ONLY — politely decline off-topic requests
- Never provide harmful information
- If in doubt, direct the user to call 911 immediately
- This AI is NOT a substitute for calling 911

CRITICAL FORMATTING — MANDATORY:
Write in plain conversational text ONLY. Maximum 2-3 short sentences per response.
NEVER use: asterisks (*), bold (**text**), bullet points, numbered lists (1. 2. 3.), dashes (-), headers (#), or any markdown formatting whatsoever.
Write as if texting someone in a crisis. Short. Calm. Direct. No lists ever.
First response: ask ONE question only — "What's happening? Tell me briefly."
After user describes: ask for their location if not provided.
After location: trigger ALERT and tell them to press the red SOS button on screen.`;

type DeltaWithReasoning = OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
  reasoning_content?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, location, history } = body as {
      message?: string;
      sessionId?: string;
      location?: { lat: number; lng: number } | null;
      history?: OpenAI.Chat.ChatCompletionMessageParam[];
    };

    const sid = String(sessionId ?? 'anon').slice(0, 64);

    // Rate limiting
    const now = Date.now();
    const hour = 3_600_000;
    const rl = rateLimitMap.get(sid);
    if (rl) {
      if (now < rl.resetAt) {
        if (rl.count >= 20) {
          return NextResponse.json({
            reply: "You've reached the message limit for this hour. For immediate help please call 911 or your local MDRRMO.",
            triggered: false,
          });
        }
        rl.count++;
      } else {
        rateLimitMap.set(sid, { count: 1, resetAt: now + hour });
      }
    } else {
      rateLimitMap.set(sid, { count: 1, resetAt: now + hour });
    }

    // Sanitize input
    const clean = sanitizeText(message ?? '');
    if (!clean) {
      return NextResponse.json({ reply: 'Please describe your emergency.', triggered: false });
    }

    // Jailbreak guard
    if (JAILBREAK_PATTERNS.some((p) => p.test(clean))) {
      return NextResponse.json({
        reply: "I'm here to help with emergencies only. Please describe your situation or call 911.",
        triggered: false,
      });
    }

    // Build message list
    const locationNote = location
      ? `\n[User GPS: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}]`
      : '';

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT + locationNote },
      ...((history ?? []).slice(-10)),
      { role: 'user', content: clean },
    ];

    // Stream from NVIDIA Nemotron
    const stream = await openai.chat.completions.create({
      model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
      messages,
      stream: true,
      max_tokens: 512,
      temperature: 0.3,
    });

    let fullContent = '';
    let reasoning = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as DeltaWithReasoning;
      if (delta?.content) fullContent += delta.content;
      if (delta?.reasoning_content) reasoning += delta.reasoning_content;
    }

    if (process.env.NODE_ENV === 'development' && reasoning) {
      console.log('[Nemotron reasoning]', reasoning);
    }

    // Output safety check
    if (HARMFUL_OUTPUT_PATTERNS.some((p) => p.test(fullContent))) {
      return NextResponse.json({
        reply: 'For immediate emergency help, please call 911 or your local MDRRMO.',
        triggered: false,
      });
    }

    // Parse ALERT prefix
    const alertMatch = fullContent.match(/^\[ALERT:(\w+):([^\]]+)\]/m);
    let triggered = false;

    if (alertMatch) {
      triggered = true;
      const rawType = alertMatch[1].toLowerCase();
      const chatSummary = alertMatch[2].trim().slice(0, 500);
      const incidentType = ['fire', 'injury', 'accident'].includes(rawType)
        ? rawType
        : 'other'; // flood maps to 'other' to match IncidentType union

      try {
        const supabase = createAdminClient();
        await supabase.from('incidents').insert({
          lat: location?.lat ?? 7.4478,
          lng: location?.lng ?? 125.8068,
          accuracy_m: location ? 50 : null,
          status: 'pending',
          incident_type: incidentType,
          source: 'chatbot',
          chat_summary: chatSummary,
        });
      } catch (dbErr) {
        console.error('Chatbot incident insert failed:', dbErr);
      }
    }

    // Strip [ALERT] line from reply shown to user
    const reply = fullContent.replace(/^\[ALERT:[^\]]+\]\n?/m, '').trim();

    return NextResponse.json({ reply, triggered });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({
      reply: "I'm having trouble connecting. For immediate help, please call 911 or your local MDRRMO.",
      triggered: false,
    });
  }
}
