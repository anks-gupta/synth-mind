import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_S3_BUCKET_NAME;
const endpoint = process.env.AWS_S3_ENDPOINT; // For Cloudflare R2 / MinIO / DigitalOcean Spaces

export function isS3Configured(): boolean {
  return !!(accessKeyId && secretAccessKey && bucketName);
}

function getS3Client(): S3Client | null {
  if (!isS3Configured()) return null;

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
    forcePathStyle: !!endpoint, // Required for custom S3 endpoints like MinIO
  });
}

/**
 * Uploads a file buffer to S3 / S3-compatible bucket
 */
export async function uploadFileToS3(
  key: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<{ key: string; s3Url?: string } | null> {
  const client = getS3Client();
  if (!client || !bucketName) {
    console.warn('[S3] AWS S3 environment variables not configured. Skipping S3 upload.');
    return null;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    const s3Url = endpoint
      ? `${endpoint.replace(/\/$/, '')}/${bucketName}/${key}`
      : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return { key, s3Url };
  } catch (err: any) {
    console.error('[S3] Error uploading file to S3:', err?.message || err);
    return null;
  }
}

/**
 * Generates a secure presigned download/view URL (valid for 15 minutes by default)
 */
export async function getS3PresignedUrl(key: string, expiresInSeconds = 900): Promise<string | null> {
  const client = getS3Client();
  if (!client || !bucketName) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch (err: any) {
    console.error('[S3] Error generating presigned URL:', err?.message || err);
    return null;
  }
}

/**
 * Deletes an object from S3
 */
export async function deleteFileFromS3(key: string): Promise<boolean> {
  const client = getS3Client();
  if (!client || !bucketName) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (err: any) {
    console.error('[S3] Error deleting file from S3:', err?.message || err);
    return false;
  }
}
