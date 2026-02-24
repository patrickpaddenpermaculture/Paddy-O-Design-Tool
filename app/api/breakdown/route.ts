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

    const { imageUrl, originalImageBase64, tier } = body;

    if (!imageUrl) {
      console.error('[breakdown] Missing imageUrl (generated design)');
      return NextResponse.json({ error: 'Missing generated design image URL' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[breakdown] OPENAI_API_KEY not set');
      return NextResponse.json({ error: 'Server error: OpenAI API key missing' }, { status: 500 });
    }

    const systemPrompt = `You are a licensed landscape architect and contractor in Fort Collins, Colorado with 2026 pricing knowledge.

Analyze TWO images if both are provided:
1. The ORIGINAL yard photo – use this to estimate the actual grass/sod area to be removed (in square feet).
2. The GENERATED xeriscape design image – this is the proposed final look.

If only the generated image is provided, use 800–1,500 sq ft as a typical small-medium Fort Collins yard.

Provide a realistic, detailed cost & installation breakdown in clean, well-structured Markdown format.
Use the following REAL Fort Collins-area pricing (2026 estimates):

- Sod cutter / grass removal: $2.00 per sq ft (labor + disposal)
- Shredded cedar mulch: $35–$45 per cubic yard (installed 2–3" deep)
- Native perennials/grasses (1-gallon): $8–$18 per plant
- Shrubs (1–5 gallon): $20–$80 each
- Small trees / fruit trees: $80–$250 each
- Permeable pavers or natural stone walkway/patio: $12–$25 per sq ft installed
- Rain garden / infiltration basin: $8–$15 per sq ft (plants + soil amendments)
- Edible guild additions (herbs/veggies/fruit): $10–$40 per plant
- Drip irrigation system: $1.50–$3 per sq ft
- Miscellaneous (soil amendments, edging, tools): 10–15% of total

Rules:
- First, estimate the grass/sod area from the ORIGINAL photo (if provided).
- Base ALL costs on that sq ft number (e.g. sod removal = sq ft × $2).
- Assume 80%+ native coverage if native planting is selected.
- Rebate: Base $0.75/sq ft (max $750), + $0.25/sq ft native bonus (total max $1,000) if ≥80% natives and good coverage.
- Installation: 4–10 weeks total, phased, focus on sod removal first, then mulch, then planting.
- Output ONLY clean Markdown – no extra commentary outside the structure.

Always include exactly these sections:

## Project Summary
- Estimated grass/sod area removed: X sq ft (from photo or assumed)
- Tier / Style: ${tier || 'Custom Landscape'}
- Estimated total installed cost: $X,XXX – $X,XXX
- Expected City rebate (XIP): $XXX – $1,000
- Rebate eligibility notes

## Phased Installation Strategy
1. Phase name – Duration – Estimated Cost – Description

## Plant List Recommendation
Table format with columns: Common Name (Scientific Name) | Quantity (approx.) | Purpose/Role | Approx. Cost per Plant

Be encouraging, practical, and specific to Colorado natives from Fort Collins Nature in the City guidelines.`;

    const userContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
      { type: 'text', text: 'Analyze these images for a realistic Fort Collins xeriscape estimate:' },
      { type: 'image_url', image_url: { url: imageUrl } },
    ];

    if (originalImageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${originalImageBase64}` },
      });
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.6,
        max_tokens: 2500,
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
