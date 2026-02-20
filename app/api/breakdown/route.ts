import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.imageUrl) {
      return NextResponse.json({ error: 'Missing image URL in request' }, { status: 400 });
    }

    const { imageUrl, tier } = body;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error('[breakdown] Missing XAI_API_KEY env var');
      return NextResponse.json({ error: 'Server misconfigured - no API key' }, { status: 500 });
    }

    const systemPrompt = `You are a licensed landscape architect and contractor in Fort Collins, Colorado (2026 local pricing).
You are looking at a generated xeriscape design image for a homeowner trying to qualify for the City's Xeriscape Incentive Program.

Analyze the image carefully and provide a professional, realistic project breakdown in clean, readable Markdown format.

Always include:
## Project Summary
- Chosen tier: ${tier || 'Unknown'}
- Total estimated installed cost: $X,XXX – $X,XXX
- Expected City rebate (XIP): $XXX – $1,000
- Notes on rebate eligibility

## Phased Installation Plan (typically 4–8 weeks total)
1. Phase name – duration – estimated cost – brief description

## Plant List (heavy on Colorado natives from Fort Collins Nature in the City Design Guide)
• Common name (scientific name) – approximate quantity – role/purpose – approx. cost per plant

## Top-Down Landscape Plan Description
Describe the layout as a clear bird's-eye view plan (e.g., "Central dry creek bed with native grasses on either side... seating area in the back right corner...").

Keep estimates realistic for Fort Collins market rates. Use mostly plants from the official Fort Collins native plant list where possible. Be encouraging and practical.`;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-vision-preview',   // or grok-vision-latest / grok-2-vision — use whatever vision model is currently active in 2026
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Here is the landscape design image to analyze:' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.65,
        max_tokens: 1800,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[breakdown] xAI error:', res.status, errText);
      return NextResponse.json({ error: `xAI API error (${res.status}): ${errText || '(no details)'}` }, { status: res.status });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || 'No response content received.';

    return NextResponse.json({ breakdown: content });
  } catch (err: any) {
    console.error('[breakdown] Proxy crash:', err.message, err.stack);
    return NextResponse.json({ error: 'Internal server error: ' + (err.message || 'unknown') }, { status: 500 });
  }
}
