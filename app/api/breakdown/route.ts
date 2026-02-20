import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, packageName } = await req.json();

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });

    const systemPrompt = `You are a licensed landscape architect and contractor in Fort Collins, Colorado (2026 pricing).
Analyze the uploaded landscape design image and provide a professional, realistic breakdown in clean Markdown:

## Project Summary
- Chosen package: ${packageName}
- Total estimated cost: $X,XXX – $X,XXX
- Expected City rebate: $XXX–$1,000

## Phased Installation Plan (4–8 weeks)
1. Phase name (duration + cost)

## Plant List (Colorado native heavy)
• Plant name – quantity – price

## Top-Down Landscape Plan Description
Describe the layout in clear bird's eye view terms...

Keep totals realistic for Fort Collins and under the package budget.`;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-vision',   // or grok-2-vision if that's the current vision model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: 'Here is the landscape design:' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]},
        ],
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const breakdownText = data.choices[0].message.content;

    return NextResponse.json({ breakdown: breakdownText });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
