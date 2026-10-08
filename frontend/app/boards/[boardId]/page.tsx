import { notFound } from 'next/navigation';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { BoardProvider } from '@/features/board/context';
import { BoardView } from '@/features/board/components/BoardView';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Next 15: route params arrive as a Promise.
export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId: raw } = await params;
  const boardId = Number(raw);

  if (!Number.isInteger(boardId) || boardId <= 0) notFound();

  return (
    <AuthGuard>
      <BoardProvider boardId={boardId}>
        <AppShell>
          <ErrorBoundary title="The board failed to render">
            <BoardView />
          </ErrorBoundary>
        </AppShell>
      </BoardProvider>
    </AuthGuard>
  );
}
