'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';
import { AssigneePicker } from '@/components/ui/AssigneePicker';
import { StatusSelect } from '@/components/ui/StatusSelect';
import { PresenceStack } from '@/components/layout/PresenceStack';
import { Button } from '@/components/ui/Button';
import { SectionLabel, Skeleton } from '@/components/ui/Surface';
import { ErrorState } from '@/components/ui/ErrorState';
import { useTask, useUsers } from '@/hooks/useTask';
import { useDeleteTask, useUpdateTask } from '@/hooks/useTasks';
import { useTaskBroadcast } from '@/hooks/useTaskBroadcast';
import { usePresence } from '@/hooks/usePresence';
import { ApiError } from '@/lib/api/http';
import { relativeTime } from '@/lib/utils';
import type { TaskStatus, UpdateTaskInput } from '@/lib/types';

function DetailHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-3 sm:px-5">
      {children}
    </header>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground-muted transition-colors hover:bg-surface-muted"
    >
      <ArrowLeft className="h-4 w-4" />
      Board
    </Link>
  );
}

export function TaskDetail({ taskId }: { taskId: number }) {
  const router = useRouter();
  const { data: task, isLoading, isError, error, refetch } = useTask(taskId);
  const { data: users } = useUsers();
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask();

  useTaskBroadcast();
  usePresence();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
  }, [task?.id, task?.title, task?.description]);

  const commit = (patch: UpdateTaskInput) => {
    updateTask({ id: taskId, input: patch });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  if (isLoading) {
    return (
      <>
        <DetailHeader>
          <BackLink />
        </DetailHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto grid w-full max-w-5xl gap-6 p-4 sm:p-8 lg:grid-cols-[1fr_260px] lg:gap-8">
            <div className="min-w-0 space-y-6">
              <Skeleton className="h-9 w-2/3" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-48" />
              </div>
            </div>
            <aside className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-11" />
              </div>
              <div className="space-y-2 border-t border-line pt-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </aside>
          </div>
        </div>
      </>
    );
  }

  if (isError || !task) {
    const gone = error instanceof ApiError && error.status === 404;
    return (
      <>
        <DetailHeader>
          <BackLink />
        </DetailHeader>
        <div className="mx-auto w-full max-w-2xl p-4 sm:p-8">
          <ErrorState
            title={gone ? `Task #${taskId} no longer exists` : "Couldn't load this task"}
            error={gone ? undefined : error}
            onRetry={gone ? undefined : () => refetch()}
            action={
              <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                Back to board
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <DetailHeader>
        <div className="flex min-w-0 items-center gap-3">
          <BackLink />
          <span className="font-mono text-xs text-foreground-subtle">#{task.id}</span>
          {saved && (
            <span className="flex animate-fade-in items-center gap-1 text-xs font-medium text-success-foreground">
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Saved</span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <PresenceStack />
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              deleteTask(task.id);
              router.push('/');
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </DetailHeader>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-5xl gap-6 p-4 sm:p-8 lg:grid-cols-[1fr_260px] lg:gap-8">
          <div className="min-w-0 space-y-6">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => title.trim() && title !== task.title && commit({ title: title.trim() })}
              aria-label="Task title"
              className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-xl font-semibold text-foreground outline-none transition-colors hover:border-line focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 sm:text-2xl"
            />

            <section>
              <SectionLabel className="mb-2 px-2">Description</SectionLabel>
              <textarea
                rows={10}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={() =>
                  description !== (task.description ?? '') &&
                  commit({ description: description.trim() || null })
                }
                placeholder="Add a more detailed description…"
                aria-label="Task description"
                className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 px-2 text-[11px] text-foreground-subtle">
                Changes save when you click away.
              </p>
            </section>
          </div>

          <aside className="space-y-6">
            <section>
              <SectionLabel className="mb-2">Status</SectionLabel>
              <StatusSelect
                value={task.status}
                onChange={(status: TaskStatus) => commit({ status })}
              />
            </section>

            <section>
              <SectionLabel className="mb-2">Assignee</SectionLabel>
              <AssigneePicker
                users={users ?? []}
                value={task.assigned_to}
                assignee={task.assignee}
                onChange={(assigned_to) => commit({ assigned_to })}
              />
            </section>

            <section className="space-y-2 border-t border-line pt-4 text-xs text-foreground-muted">
              <div className="flex justify-between gap-2">
                <span>Created</span>
                <span className="text-foreground">{relativeTime(task.created_at)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Updated</span>
                <span className="text-foreground">{relativeTime(task.updated_at)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>ID</span>
                <span className="font-mono text-foreground">#{task.id}</span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
