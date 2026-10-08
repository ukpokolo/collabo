import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { BoardsHome } from '@/features/board/components/BoardsHome';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function HomePage() {
  return (
    <AuthGuard>
      <AppShell>
        <ErrorBoundary title="Couldn't open your boards">
          <BoardsHome />
        </ErrorBoundary>
      </AppShell>
    </AuthGuard>
  );
}
