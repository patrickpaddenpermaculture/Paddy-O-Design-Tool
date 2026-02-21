import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conceptUrl, satelliteReference, tier } = body;

    if (!conceptUrl) {
      return NextResponse.json({ error: 'Missing concept image URL' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 });
    }

    const endpoint = process.env.OPENAI_API_KEY ? 'https://api.openai.com/v1/chat/completions' : 'https://api.x.ai/v1/chat/completions';
    const model = process.env.OPENAI_API_KEY ? 'gpt-4o' : 'grok-vision';

    // Always start content as an ARRAY so .push() is safe
    const userContent: any[] = [
      { type: 'text', text: `Tier: ${tier || 'Unknown'}. Concept design:` },
      { type: 'image_url', image_url: { url: conceptUrl } },
    ];

    // Add satellite reference if provided
    if (satelliteReference) {
      userContent.push({
        type: 'image_url',
        image_url: { url: satelliteReference },
      });
    }

    const systemPrompt = `You are a landscape architect in Fort Collins, CO.
Given the concept design and satellite/top-view reference (if provided), create:
- A top-down 2D landscape plan image (architectural style, labeled features, estimated sq ft for mulch/hardscape/plants)
- Accurate cost estimate, installation strategy (sod cutter + shredded cedar mulch), plant list (Colorado natives heavy)

Output Markdown with top-down image URL first (if generated), then breakdown.`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('API error:', res.status, err);
      return NextResponse.json({ error: `API error (${res.status}): ${err || 'No details'}` }, { status: res.status });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || 'No response content';

    return NextResponse.json({
      breakdown: content,
      topDownUrl: 'https://via.placeholder.com/640x640?text=Top-Down+Plan+Generated', // Replace with real image gen later
    });
  } catch (err: any) {
    console.error('Internal error:', err.message, err.stack);
    return NextResponse.json({ error: 'Internal error: ' + (err.message || 'unknown') }, { status: 500 });
  }
}
