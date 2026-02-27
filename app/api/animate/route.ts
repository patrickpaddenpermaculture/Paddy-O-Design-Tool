import { NextRequest, NextResponse } from 'next/server';
import RunwayML from '@runwayml/sdk';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    const client = new RunwayML({
      apiKey: process.env.RUNWAY_API_KEY, // Set this in .env.local or Vercel env vars
    });

    // Create the task
    const task = await client.imageToVideo.create({
      model: 'gen4.5',
      promptImage: imageUrl,
      promptText:
        'smooth cinematic flythrough over the Fort Collins landscape design, gentle wind rustling through the plants and grasses, subtle water movement in the rain garden, natural daylight, realistic motion, peaceful and relaxing',
      duration: 8,
      ratio: '1280:720', // Valid ratio
    });

    console.log('Runway task created:', task.id);

    // Return only the task ID - no status access to avoid type error
    return NextResponse.json({
      taskId: task.id,
      message: `Task created successfully. Poll status at /api/poll-task?id=${task.id} or check Runway dashboard.`,
    });
  } catch (err: any) {
    console.error('Runway API error:', err);
    return NextResponse.json(
      { error: err.message || 'Runway task creation failed' },
      { status: 500 }
    );
  }
}