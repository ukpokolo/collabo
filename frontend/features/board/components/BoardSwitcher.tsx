'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Plus, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/Surface';
import { useDismissable } from '@/hooks/useDismissable';
import {
  useBoards,
  useCreateBoardUnscoped,
  useCurrentBoard,
} from '@/features/board/hooks/useBoards';
import { useBoardId } from '@/features/board/context';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/utils';

/** Breadcrumb-style board name that opens a menu of the user's boards. */
export function BoardSwitcher() {
  const router = useRouter();
  const boardId = useBoardId();
  const { data: current } = useCurrentBoard();
  const { data: boards } = useBoards();
  const { ref, open, toggle, close } = useDismissable();

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="truncate">{current?.name ?? 'Board'}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-1.5 w-72 animate-fade-in rounded-lg border border-line bg-surface p-1 shadow-lg"
        >
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-subtle">
            Your boards
          </p>
          <ul className="max-h-64 overflow-y-auto">
            {boards?.map((board) => (
              <li key={board.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    if (board.id !== boardId) router.push(`/boards/${board.id}`);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted',
                    board.id === boardId && 'font-medium',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{board.name}</span>
                  {board.role !== 'owner' && <Badge>{board.role}</Badge>}
                  {board.id === boardId && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-1 border-t border-line pt-1">
            <Link
              href={`/boards/${boardId}/members`}
              onClick={close}
              role="menuitem"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
            >
              <Settings2 className="h-4 w-4" />
              Members &amp; settings
            </Link>
            <NewBoard onCreated={(id) => { close(); router.push(`/boards/${id}`); }} />
          </div>
        </div>
      )}
    </div>
  );
}

function NewBoard({ onCreated }: { onCreated: (id: number) => void }) {
  const create = useCreateBoardUnscoped();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(name.trim(), {
      onSuccess: (board) => {
        setName('');
        setEditing(false);
        onCreated(board.id);
      },
    });
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
      >
        <Plus className="h-4 w-4" />
        New board
      </button>
    );
  }

  const error = create.error instanceof ApiError ? create.error.fieldError('name') : undefined;

  return (
    <form onSubmit={submit} className="space-y-1 p-2">
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={80}
        placeholder="Board name"
        aria-label="New board name"
        className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {error && <p className="text-xs text-danger-foreground">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-foreground-muted hover:underline">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || create.isPending}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </form>
  );
}
