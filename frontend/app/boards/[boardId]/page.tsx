import { notFound } from 'next/navigation';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { BoardProvider } from '@/features/board/context';
import { BoardView } from '@/features/board/components/BoardView';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function BoardPage({ params }: { params: { boardId: string } }) {
  const boardId = Number(params.boardId);

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
