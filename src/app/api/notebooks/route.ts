import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const notebooks = await db.notebook.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { sources: true, notes: true },
        },
      },
    });

    return NextResponse.json({ success: true, notebooks });
  } catch (error: any) {
    console.error('GET /api/notebooks error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description } = body;

    if (!title || title.trim() === '') {
      return NextResponse.json({ success: false, error: 'Notebook title is required' }, { status: 400 });
    }

    const notebook = await db.notebook.create({
      data: {
        userId,
        title: title.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, notebook }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/notebooks error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
