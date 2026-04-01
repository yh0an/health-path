import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';
import type { Express } from 'express';

function getClient(): S3Client {
  if (!process.env.R2_ACCOUNT_ID) throw new Error('R2_ACCOUNT_ID is not configured');
  if (!process.env.R2_ACCESS_KEY_ID) throw new Error('R2_ACCESS_KEY_ID is not configured');
  if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error('R2_SECRET_ACCESS_KEY is not configured');
  if (!process.env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is not configured');
  if (!process.env.R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL is not configured');

  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadFile(file: Express.Multer.File, folder = 'meals'): Promise<string> {
  const client = getClient();
  const ext = path.extname(file.originalname);
  const filename = `${folder}/${randomUUID()}${ext}`;
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: filename,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));
  return `${process.env.R2_PUBLIC_URL}/${filename}`;
}

export async function deleteFile(url: string): Promise<void> {
  if (!process.env.R2_PUBLIC_URL || !url.startsWith(process.env.R2_PUBLIC_URL)) return;
  const client = getClient();
  const filename = url.replace(`${process.env.R2_PUBLIC_URL}/`, '');
  await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: filename }));
}
