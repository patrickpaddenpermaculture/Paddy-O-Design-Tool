import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 });
    }

    const { prompt, isEdit = false, imageBase64 = null, aspect = '16:9', n = 3 } = body;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error('[generate] Missing XAI_API_KEY env var');
      return NextResponse.json({ error: 'Server misconfigured - no API key' }, { status: 500 });
    }

    const endpoint = isEdit ? 'https://api.x.ai/v1/images/edits' : 'https://api.x.ai/v1/images/generations';

    const requestBody: any = {
      prompt: isEdit ? `Transform the uploaded yard photo into: ${prompt}` : prompt,
      model: 'grok-imagine-image',
      response_format: 'url',
      n,
      aspect_ratio: aspect,
    };

    if (isEdit && imageBase64) {
      requestBody.image = { url: `data:image/jpeg;base64,${imageBase64}` };
    }

    const xaiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const rawResponse = await xaiRes.text();

    if (!xaiRes.ok) {
      console.error('[generate] xAI error:', xaiRes.status, rawResponse);
      return NextResponse.json(
        { error: `xAI API error (${xaiRes.status}): ${rawResponse || '(no details)'}` },
        { status: xaiRes.status }
      );
    }

    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch (parseErr) {
      console.error('[generate] JSON parse failed:', parseErr, rawResponse);
      return NextResponse.json({ error: 'xAI returned invalid response' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[generate] Proxy crash:', err);
    return NextResponse.json({ error: 'Internal error: ' + (err.message || 'unknown') }, { status: 500 });
  }
}
