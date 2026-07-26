import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getS3PresignedUrl } from '@/lib/s3';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const sourceId = resolvedParams.id;

    const source = await db.source.findUnique({
      where: { id: sourceId },
      include: { notebook: true },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (source.notebook.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. If stored in S3 Object Storage, generate 15-minute secure presigned URL and redirect
    if (source.s3Key) {
      const presignedUrl = await getS3PresignedUrl(source.s3Key, 900);
      if (presignedUrl) {
        return NextResponse.redirect(presignedUrl, { status: 307 });
      }
    }

    // 2. If stored locally on disk
    if (source.urlOrPath && fs.existsSync(source.urlOrPath)) {
      const fileBuffer = fs.readFileSync(source.urlOrPath);
      const mimeType =
        source.type === 'pdf'
          ? 'application/pdf'
          : source.type === 'vtt'
          ? 'text/vtt'
          : 'text/plain';
      const sanitizedTitle = (source.title || 'source').replace(/[^a-zA-Z0-9_.-]/g, '_');

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${sanitizedTitle}.${source.type === 'pdf' ? 'pdf' : 'txt'}"`,
        },
      });
    }

    // 3. If external Web URL or YouTube link, redirect directly to original link
    if (source.urlOrPath && /^https?:\/\//i.test(source.urlOrPath)) {
      return NextResponse.redirect(source.urlOrPath, { status: 307 });
    }

    // 4. Fallback: Return raw text content as a downloadable text file attachment
    if (source.content) {
      const sanitizedTitle = (source.title || 'source').replace(/[^a-zA-Z0-9_.-]/g, '_');
      return new Response(source.content, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `inline; filename="${sanitizedTitle}.txt"`,
        },
      });
    }

    return NextResponse.json({ error: 'Original source file content unavailable' }, { status: 404 });
  } catch (error: any) {
    console.error('GET /api/sources/[id]/download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
