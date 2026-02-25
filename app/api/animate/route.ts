
import { NextRequest, NextResponse } from 'next/server';
import RunwayML from '@runwayml/sdk';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    const client = new RunwayML({
      apiKey: process.env.RUNWAY_API_KEY,   // ← Add this to your .env.local
    });

    const task = await client.imageToVideo.create({
      model: 'gen4.5',                    // best quality in 2026
      promptImage: imageUrl,
      promptText: 'smooth cinematic flythrough over the Fort Collins landscape design, gentle wind rustling through the plants and grasses, subtle water movement in the rain garden, natural daylight, realistic motion, peaceful and relaxing',
      duration: 8,
      ratio: '16:9',
    });

    const result = await task.waitForTaskOutput();   // automatically polls

    return NextResponse.json({
      videoUrl: result.output?.[0] || result.videoUrl,
      status: 'success',
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Runway animation failed' },
      { status: 500 }
    );
  }
}
