import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export interface AuthorizeNotebookResult {
  userId: string;
  notebook: any;
  errorResponse?: NextResponse;
}

/**
 * Encapsulates Clerk user authentication and notebook ownership validation.
 * Returns the authenticated userId and notebook record, or an error NextResponse (401, 400, 404, 403).
 */
export async function authorizeNotebookAccess(notebookId: string): Promise<AuthorizeNotebookResult> {
  const { userId } = await auth();
  if (!userId) {
    return { userId: '', notebook: null, errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!notebookId) {
    return { userId, notebook: null, errorResponse: NextResponse.json({ error: 'notebookId is required' }, { status: 400 }) };
  }

  const notebook = await db.notebook.findUnique({
    where: { id: notebookId },
    include: { sources: true },
  });

  if (!notebook) {
    return { userId, notebook: null, errorResponse: NextResponse.json({ error: 'Notebook not found' }, { status: 404 }) };
  }

  if (notebook.userId !== userId) {
    return { userId, notebook: null, errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { userId, notebook };
}
