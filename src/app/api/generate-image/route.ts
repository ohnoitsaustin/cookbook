import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Recipe name is required' }, { status: 400 });
    }

    const prompt = `A beautiful professional food photograph of ${name}, appetizing plating, natural lighting, top-down view, clean background, high resolution`;

    // Call Hugging Face Inference API
    const hfResponse = await fetch(
      `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!hfResponse.ok) {
      const error = await hfResponse.text();
      console.error('HuggingFace error:', error);
      return NextResponse.json({ error: 'Image generation failed' }, { status: 502 });
    }

    const imageBuffer = Buffer.from(await hfResponse.arrayBuffer());

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'recipes' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(imageBuffer);
    });

    return NextResponse.json({ url: (result as any).secure_url });
  } catch (error) {
    console.error('Generate image error:', error);
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
  }
}
