import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { deleteNotebookVectors } from '@/lib/qdrant';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const notebook = await db.notebook.findUnique({ where: { id } });
    if (!notebook) {
      return NextResponse.json({ success: false, error: 'Notebook not found' }, { status: 404 });
    }
    if (notebook.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description } = body;

    const updated = await db.notebook.update({
      where: { id },
      data: {
        title: title?.trim(),
        description: description?.trim(),
      },
      include: {
        _count: {
          select: { sources: true },
        },
      },
    });

    return NextResponse.json({ success: true, notebook: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deletion
    const notebook = await db.notebook.findUnique({ where: { id } });
    if (!notebook) {
      return NextResponse.json({ success: false, error: 'Notebook not found' }, { status: 404 });
    }
    if (notebook.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await db.notebook.delete({ where: { id } });
    // Purge all Qdrant vectors for this notebook (non-fatal if it fails)
    await deleteNotebookVectors(id);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
