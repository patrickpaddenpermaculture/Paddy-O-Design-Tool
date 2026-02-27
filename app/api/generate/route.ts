import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 });
    }

    // Rookie Tip: We define defaults here to ensure Vercel knows these aren't "empty"
    const { prompt, isEdit = false, imageBase64 = null, aspect = '1.0', n = 1 } = body;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error('[generate] Missing XAI_API_KEY env var');
      return NextResponse.json({ error: 'Server misconfigured - no API key' }, { status: 500 });
    }

    // Correcting the endpoint logic
    const endpoint = 'https://api.x.ai/v1/images/generations';

    // Building a strictly typed request object
    const requestBody: any = {
      model: 'grok-beta', // Ensure this matches the exact xAI model name
      prompt: isEdit ? `Landscape design edit: ${prompt}` : prompt,
      n: Number(n), // Force it to be a number
      response_format: 'url',
    };

    // Note: aspect_ratio for Grok is often '1:1' or '16:9' as a string
    if (aspect) {
      requestBody.aspect_ratio = aspect;
    }

    if (isEdit && imageBase64) {
      // If doing an edit, we send the image as a reference
      requestBody.image = imageBase64; 
    }

    const xaiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!xaiRes.ok) {
      const errorText = await xaiRes.text();
      console.error('[generate] xAI error:', xaiRes.status, errorText);
      return NextResponse.json(
        { error: `xAI API error: ${errorText}` },
        { status: xaiRes.status }
      );
    }

    const data = await xaiRes.json();
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('[generate] Proxy crash:', err);
    return NextResponse.json({ error: 'Internal error: ' + (err.message || 'unknown') }, { status: 500 });
  }
}
