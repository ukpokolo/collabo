import { notFound } from 'next/navigation';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { BoardProvider } from '@/features/board/context';
import { MembersPanel } from '@/features/board/components/MembersPanel';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Next 15: route params arrive as a Promise.
export default async function MembersPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId: raw } = await params;
  const boardId = Number(raw);

  if (!Number.isInteger(boardId) || boardId <= 0) notFound();

  return (
    <AuthGuard>
      <BoardProvider boardId={boardId}>
        <AppShell>
          <ErrorBoundary title="Couldn't show this board's members">
            <MembersPanel />
          </ErrorBoundary>
        </AppShell>
      </BoardProvider>
    </AuthGuard>
  );
}
