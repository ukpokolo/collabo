import { notFound } from 'next/navigation';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetail } from '@/features/tasks/components/TaskDetail';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Next 15: route params arrive as a Promise.
export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const taskId = Number(raw);

  if (!Number.isInteger(taskId) || taskId <= 0) notFound();

  return (
    <AuthGuard>
      <AppShell>
        <ErrorBoundary title="This task failed to render">
          <TaskDetail taskId={taskId} />
        </ErrorBoundary>
      </AppShell>
    </AuthGuard>
  );
}
