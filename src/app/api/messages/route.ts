import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Citation } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/messages?notebookId=xxx  — load persisted chat history
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

    // Verify notebook ownership
    const notebook = await db.notebook.findUnique({ where: { id: notebookId } });
    if (!notebook || notebook.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const rows = await db.chatMessage.findMany({
      where: { notebookId, userId },
      orderBy: { createdAt: 'asc' },
      take: 200, // cap at 200 messages per notebook
    });

    // Deserialise citationsJson back to Citation[]
    const messages = rows.map((row) => ({
      id: row.id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      citations: row.citationsJson
        ? (JSON.parse(row.citationsJson) as Citation[])
        : undefined,
      createdAt: row.createdAt,
    }));

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/messages?notebookId=xxx  — clear entire chat history for a notebook
export async function DELETE(req: Request) {
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

    // Verify notebook ownership
    const notebook = await db.notebook.findUnique({ where: { id: notebookId } });
    if (!notebook || notebook.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await db.chatMessage.deleteMany({ where: { notebookId, userId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/messages error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
