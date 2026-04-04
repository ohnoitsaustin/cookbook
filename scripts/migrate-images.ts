/**
 * One-time script: download recipe images from Cloudinary, upload to S3,
 * and update the image_url column in RDS to the new CloudFront URL.
 *
 * Prerequisites — set these in .env.local (or export them):
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *   AWS_S3_BUCKET, CLOUDFRONT_URL, AWS_REGION
 *   APP_AWS_ACCESS_KEY_ID, APP_AWS_SECRET_ACCESS_KEY
 *
 * Run:
 *   npx tsx scripts/migrate-images.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'cookbook',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET!;
const CLOUDFRONT_URL = (process.env.CLOUDFRONT_URL ?? '').replace(/\/$/, '');

async function uploadToS3(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${imageUrl} — HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentType.split('/')[1]?.split('+')[0] ?? 'jpg';
  const key = `recipes/${randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `${CLOUDFRONT_URL}/${key}`;
}

async function main() {
  if (!BUCKET || !CLOUDFRONT_URL) {
    console.error('AWS_S3_BUCKET and CLOUDFRONT_URL must be set');
    process.exit(1);
  }

  const { rows } = await pool.query<{ id: string; image_url: string }>(
    `SELECT id, image_url FROM recipes
     WHERE image_url IS NOT NULL AND image_url LIKE '%cloudinary.com%'`,
  );

  console.log(`Found ${rows.length} recipe(s) with Cloudinary image URLs`);

  let ok = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      process.stdout.write(`  [${row.id}] ${row.image_url} → `);
      const newUrl = await uploadToS3(row.image_url);
      await pool.query('UPDATE recipes SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
      console.log(newUrl);
      ok++;
    } catch (err) {
      console.log('FAILED');
      console.error(`    ${err}`);
      failed++;
    }
  }

  console.log(`\nDone: ${ok} migrated, ${failed} failed`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
