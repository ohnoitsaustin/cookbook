export const dynamic = 'force-dynamic';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.type.split('/')[1] || 'jpg';
    const key = `recipes/${randomUUID()}.${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    );

    const url = `${process.env.CLOUDFRONT_URL}/${key}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
