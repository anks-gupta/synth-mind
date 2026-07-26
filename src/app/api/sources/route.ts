import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { deleteSourceVectors } from '@/lib/qdrant';
import { deleteFileFromS3 } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const notebookId = searchParams.get('notebookId');

    if (!notebookId) {
      return NextResponse.json({ success: false, error: 'notebookId is required' }, { status: 400 });
    }

    // Verify the notebook belongs to this user
    const notebook = await db.notebook.findUnique({ where: { id: notebookId } });
    if (!notebook) {
      return NextResponse.json({ success: false, error: 'Notebook not found' }, { status: 404 });
    }
    if (notebook.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const sources = await db.source.findMany({
      where: { notebookId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, sources });
  } catch (error: any) {
    console.error('GET /api/sources error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get('id');

    if (!sourceId) {
      return NextResponse.json({ success: false, error: 'Source ID is required' }, { status: 400 });
    }

    // Verify ownership through notebook
    const source = await db.source.findUnique({
      where: { id: sourceId },
      include: { notebook: true },
    });
    if (!source) {
      return NextResponse.json({ success: false, error: 'Source not found' }, { status: 404 });
    }
    if (source.notebook.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Step 1: Delete Qdrant vectors FIRST.
    await deleteSourceVectors(sourceId);

    // Step 2: Delete S3 object if present.
    if (source.s3Key) {
      await deleteFileFromS3(source.s3Key);
    }

    // Step 3: Delete the DB record.
    await db.source.delete({ where: { id: sourceId } });

    return NextResponse.json({ success: true, sourceId });
  } catch (error: any) {
    console.error('DELETE /api/sources error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
