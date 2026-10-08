import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { BoardView } from '@/features/board/components/BoardView';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function BoardPage() {
  return (
    <AuthGuard>
      <AppShell>
        <ErrorBoundary title="The board failed to render">
          <BoardView />
        </ErrorBoundary>
      </AppShell>
    </AuthGuard>
  );
}
