import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    // 'images' is now an array of base64 strings
    const { prompt, images = [], isEdit = false, aspect = '1:1' } = body;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key missing' }, { status: 500 });

    const endpoint = 'https://api.x.ai/v1/images/generations';

    // We build the request. If there are multiple images, 
    // we provide them as a context array for the vision model.
    const requestBody: any = {
      model: 'grok-beta', 
      prompt: prompt,
      n: 1,
      response_format: 'url',
      aspect_ratio: aspect
    };

    // If images are provided, we attach them. 
    // Grok-beta handles these as reference inputs.
    if (images && images.length > 0) {
      // For a single image (Phase 1)
      if (images.length === 1) {
        requestBody.image = images[0];
      } 
      // For multiple images (Phase 2 - The Merge)
      else {
        requestBody.image = images[0]; // Primary reference (Design)
        requestBody.mask = images[1];  // Secondary reference (Satellite/Map)
        // Note: Check xAI documentation for 'mask' vs 'image_reference' 
        // depending on their latest Beta schema.
      }
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
      return NextResponse.json({ error: errorText }, { status: xaiRes.status });
    }

    const data = await xaiRes.json();
    return NextResponse.json(data);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}