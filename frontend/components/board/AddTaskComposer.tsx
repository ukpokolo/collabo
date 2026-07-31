'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useBoardStore } from '@/store/useBoardStore';
import type { TaskStatus } from '@/lib/types';

interface AddTaskComposerProps {
  status: TaskStatus;
  onCreate: (title: string, status: TaskStatus) => void;
}

export function AddTaskComposer({ status, onCreate }: AddTaskComposerProps) {
  const { composerColumn, openComposer, closeComposer } = useBoardStore();
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const open = composerColumn === status;

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      closeComposer();
      return;
    }
    onCreate(trimmed, status);
    setTitle('');
    inputRef.current?.focus();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => openComposer(status)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-sm text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Add task
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/40 bg-surface p-2 shadow-sm ring-2 ring-primary/20">
      <textarea
        ref={inputRef}
        rows={2}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
          if (event.key === 'Escape') {
            setTitle('');
            closeComposer();
          }
        }}
        onBlur={submit}
        placeholder="Task name…"
        aria-label="New task name"
        className="w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-subtle"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="hidden text-[10px] text-foreground-subtle sm:inline">
          Enter to save · Esc to cancel
        </span>
        <Button
          size="sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={submit}
          className="ml-auto"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
