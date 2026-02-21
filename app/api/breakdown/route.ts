import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[breakdown] Invalid JSON body:', e);
      return NextResponse.json({ error: 'Invalid request body - not valid JSON' }, { status: 400 });
    }

    const { imageUrl, tier } = body;

    if (!imageUrl) {
      console.error('[breakdown] Missing imageUrl');
      return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[breakdown] OPENAI_API_KEY not set');
      return NextResponse.json({ error: 'Server error: OpenAI API key missing' }, { status: 500 });
    }

    const systemPrompt = `You are a licensed landscape architect and contractor in Fort Collins, Colorado (2026 pricing).
Analyze this xeriscape design image for a homeowner qualifying for the City's Xeriscape Incentive Program.

Provide a realistic, detailed breakdown in clean Markdown format.

Always include:
## Project Summary
- Tier: ${tier || 'Unknown'}
- Estimated total installed cost: $X,XXX – $X,XXX
- Expected City rebate (XIP): $XXX – $1,000
- Rebate eligibility notes

## Phased Installation Strategy
Focus heavily on removing existing grass with a sod cutter, then mulching with shredded cedar wood chip mulch (not rock) for weed suppression and moisture retention. 4-8 weeks total.

1. Phase name – duration – estimated cost – description

## Plant List Recommendation
Heavy on Colorado natives from the official Fort Collins Nature in the City Design Guide. List 8-12 plants with:
- Common name (scientific name)
- Quantity (approx.)
- Purpose/role
- Approx. cost per plant

Be encouraging and practical.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // cheap & good vision, or use 'gpt-4o' for best quality
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this landscape design image:' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[breakdown] OpenAI error:', res.status, errorText);
      return NextResponse.json(
        { error: `OpenAI failed (${res.status}): ${errorText || 'No details'}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'OpenAI returned empty response' }, { status: 500 });
    }

    return NextResponse.json({ breakdown: content });
  } catch (err: any) {
    console.error('[breakdown] Internal error:', err.message, err.stack);
    return NextResponse.json({ error: 'Internal error: ' + (err.message || 'unknown') }, { status: 500 });
  }
}
