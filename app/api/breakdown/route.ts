import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conceptUrl, satelliteUrl, tier } = body;

    if (!conceptUrl) {
      return NextResponse.json({ error: 'Missing concept image URL' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 });
    }

    const endpoint = process.env.OPENAI_API_KEY ? 'https://api.openai.com/v1/chat/completions' : 'https://api.x.ai/v1/chat/completions';
    const model = process.env.OPENAI_API_KEY ? 'gpt-4o' : 'grok-vision';

    const systemPrompt = `You are a landscape architect in Fort Collins, Colorado.
Given the concept design image and satellite/top-view reference (if provided), create:
1. A clean 2D top-down landscape plan image (architectural style, labeled features, estimated square footage for mulch/hardscape/plant areas)
2. Detailed cost breakdown, installation strategy (sod cutter for grass removal + shredded cedar mulch), and plant list (Colorado natives heavy).

Output in Markdown with the top-down image URL first.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Tier: ${tier || 'Unknown'}. Concept design:` },
          { type: 'image_url', image_url: { url: conceptUrl } },
        ],
      },
    ];

    if (satelliteUrl) {
      messages[1].content.push({
        type: 'image_url',
        image_url: { url: satelliteUrl },
      });
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const content = data.choices[0].message.content;

    // Assume the response includes a generated image URL or description; in practice you may need to parse or generate separately
    // For simplicity, we return the text breakdown + placeholder for top-down
    return NextResponse.json({
      breakdown: content,
      topDownUrl: 'placeholder-topdown-url-from-ai-or-generate-separately', // in real use, you'd chain another image gen call if needed
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
