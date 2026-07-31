import { notFound } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetail } from '@/components/task/TaskDetail';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const taskId = Number(params.id);

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
