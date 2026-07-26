import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { SourceParserFactory } from '@/lib/parsers';
import { indexSourceChunks } from '@/lib/embeddings';
import { SourceType } from '@/lib/types';
import { uploadFileToS3 } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';

    let notebookId = '';
    let type: SourceType = 'text';
    let title = '';
    let urlOrPath = '';
    let fileBuffer: Buffer | null = null;
    let textContent = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      notebookId = formData.get('notebookId') as string;
      type = formData.get('type') as SourceType;
      title = formData.get('title') as string;

      const file = formData.get('file') as File;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        if (!title) title = file.name;
      }
    } else {
      const body = await req.json();
      notebookId = body.notebookId;
      type = body.type;
      title = body.title;
      urlOrPath = body.urlOrPath || body.url || '';
      textContent = body.content || '';
    }

    if (!notebookId) {
      return NextResponse.json({ success: false, error: 'notebookId is required' }, { status: 400 });
    }

    // Safety guardrails: File size limit (5MB) & Text length limit (500,000 chars)
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    const MAX_TEXT_LENGTH_CHARS = 500000; // 500,000 chars (~100k words / ~300 book pages)

    if (fileBuffer && fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds maximum limit of 5MB. Please upload a smaller document.' },
        { status: 400 }
      );
    }

    if (textContent && textContent.length > MAX_TEXT_LENGTH_CHARS) {
      textContent = textContent.slice(0, MAX_TEXT_LENGTH_CHARS);
    }

    // Verify notebook belongs to this user
    const notebook = await db.notebook.findUnique({ where: { id: notebookId } });
    if (!notebook) {
      return NextResponse.json({ success: false, error: 'Notebook not found' }, { status: 404 });
    }
    if (notebook.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // 1. Create Source record with status 'pending'
    const source = await db.source.create({
      data: {
        notebookId,
        title: title || `${type.toUpperCase()} Source`,
        type,
        urlOrPath: urlOrPath || null,
        status: 'pending',
        content: textContent || null,
      },
    });

    // Optional: Stream & persist original binary file to S3 Object Storage or Local Disk
    let s3Key: string | null = null;
    let s3Url: string | null = null;

    if (fileBuffer) {
      const sanitizedFilename = (title || 'document').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const key = `notebooks/${notebookId}/sources/${source.id}/${sanitizedFilename}`;
      const mimeType =
        type === 'pdf'
          ? 'application/pdf'
          : type === 'vtt'
          ? 'text/vtt'
          : 'text/plain';

      const uploadResult = await uploadFileToS3(key, fileBuffer, mimeType);
      if (uploadResult) {
        s3Key = uploadResult.key;
        s3Url = uploadResult.s3Url || null;

        await db.source.update({
          where: { id: source.id },
          data: { s3Key, s3Url },
        });
      } else {
        // Local storage fallback when S3 environment variables are not set
        try {
          const fs = await import('fs');
          const path = await import('path');
          const uploadsDir = path.join(process.cwd(), 'uploads', 'sources');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const localFilePath = path.join(uploadsDir, `${source.id}_${sanitizedFilename}`);
          fs.writeFileSync(localFilePath, fileBuffer);
          urlOrPath = localFilePath;

          await db.source.update({
            where: { id: source.id },
            data: { urlOrPath: localFilePath },
          });
        } catch (localErr) {
          console.error('[Ingest] Failed local file storage fallback:', localErr);
        }
      }
    }

    // Async Ingestion Processing
    (async () => {
      try {
        await db.source.update({
          where: { id: source.id },
          data: { status: 'indexing' },
        });

        let inputPayload: string | Buffer = urlOrPath || textContent;
        if (fileBuffer) {
          if (type === 'pdf') {
            inputPayload = fileBuffer;
          } else {
            inputPayload = fileBuffer.toString('utf-8');
          }
        }

        const parseResult = await SourceParserFactory.parseSource({
          type,
          notebookId,
          sourceId: source.id,
          title: source.title,
          contentOrUrl: inputPayload,
        });

        if (!parseResult.chunks || parseResult.chunks.length === 0) {
          throw new Error('No readable text content extracted from source');
        }

        // Index in Qdrant Cloud
        await indexSourceChunks(parseResult.chunks);

        // Update status to 'ready' and persist auto-extracted title into Neon DB
        await db.source.update({
          where: { id: source.id },
          data: {
            status: 'ready',
            title: parseResult.title || source.title,
          },
        });
      } catch (err: any) {
        console.error(`Ingestion error for source ${source.id}:`, err);
        await db.source.update({
          where: { id: source.id },
          data: {
            status: 'error',
            errorMessage: err.message || 'Failed to process and index source content',
          },
        });
      }
    })();

    return NextResponse.json({ success: true, source }, { status: 202 });
  } catch (error: any) {
    console.error('POST /api/ingest error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
