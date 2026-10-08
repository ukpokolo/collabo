'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card } from '@/components/ui/Surface';
import { useBoards, useCreateBoardUnscoped } from '@/features/board/hooks/useBoards';
import { getLastBoardId } from '@/features/board/lastBoard';
import { ApiError } from '@/lib/http';

/**
 * "/" has no board of its own: it sends you to the one you used last, or to
 * the first you belong to, or asks you to create your first.
 */
export function BoardsHome() {
  const router = useRouter();
  const { data: boards, isLoading, isError, error, refetch } = useBoards();

  useEffect(() => {
    if (!boards?.length) return;
    const last = getLastBoardId();
    const target = boards.find((board) => board.id === last) ?? boards[0];
    router.replace(`/boards/${target.id}`);
  }, [boards, router]);

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-md p-6">
        <ErrorState title="Couldn't load your boards" error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || boards?.length) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-foreground-muted">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading boards" />
      </div>
    );
  }

  return <CreateFirstBoard />;
}

function CreateFirstBoard() {
  const router = useRouter();
  const create = useCreateBoardUnscoped();
  const [name, setName] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(name.trim(), { onSuccess: (board) => router.replace(`/boards/${board.id}`) });
  };

  const fieldError = create.error instanceof ApiError ? create.error.fieldError('name') : undefined;

  return (
    <div className="grid flex-1 place-items-center p-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Create your first board</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Boards hold your tasks. You can invite teammates to a board later.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field
            label="Board name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            autoFocus
            error={fieldError}
          />
          <Button type="submit" fullWidth loading={create.isPending} disabled={!name.trim()}>
            Create board
          </Button>
        </form>
      </Card>
    </div>
  );
}
