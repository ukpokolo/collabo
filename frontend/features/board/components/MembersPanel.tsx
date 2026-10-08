'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Alert';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge, Card, SectionLabel, Skeleton } from '@/components/ui/Surface';
import { useSession } from '@/features/auth/hooks/useSession';
import { useBoardId } from '@/features/board/context';
import {
  useAddMember,
  useBoardMembers,
  useCurrentBoard,
  useDeleteBoard,
  useRemoveMember,
  useRenameBoard,
  useSetMemberRole,
} from '@/features/board/hooks/useBoards';
import type { BoardRole } from '@/features/board/types';
import { ApiError } from '@/lib/http';

type AssignableRole = Exclude<BoardRole, 'owner'>;

const ROLE_HELP: Record<AssignableRole, string> = {
  member: 'Can create and edit tasks',
  viewer: 'Can only view',
};

function RoleSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: AssignableRole;
  onChange: (role: AssignableRole) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as AssignableRole)}
      className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
    >
      {(Object.keys(ROLE_HELP) as AssignableRole[]).map((role) => (
        <option key={role} value={role}>
          {role === 'member' ? 'Member' : 'Viewer'}
        </option>
      ))}
    </select>
  );
}

/** Roster, invitations and settings for the current board. */
export function MembersPanel() {
  const router = useRouter();
  const boardId = useBoardId();
  const { user } = useSession();
  const { data: board, isError: boardError, error: boardErr } = useCurrentBoard();
  const { data: members, isLoading, isError, error, refetch } = useBoardMembers();

  const setRole = useSetMemberRole();
  const remove = useRemoveMember();
  const isOwner = board?.role === 'owner';

  if (boardError || isError) {
    const missing = boardErr instanceof ApiError && boardErr.status === 404;
    return (
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-8">
        <ErrorState
          title={missing ? "This board doesn't exist, or you aren't on it" : "Couldn't load members"}
          error={missing ? undefined : (boardErr ?? error)}
          onRetry={missing ? undefined : () => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-8 p-4 sm:p-8">
        <div>
          <Link
            href={`/boards/${boardId}`}
            className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to board
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-foreground">{board?.name ?? 'Board'}</h1>
          <p className="text-sm text-foreground-muted">Members &amp; settings</p>
        </div>

        <section>
          <SectionLabel className="mb-2">People</SectionLabel>
          <Card className="divide-y divide-line">
            {isLoading || !members ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
              </div>
            ) : (
              members.map((member) => {
                const self = member.id === user?.id;
                return (
                  <div key={member.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                    <Avatar name={member.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {member.name}
                        {self && <span className="ml-1.5 text-xs text-foreground-subtle">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-foreground-muted">{member.email}</p>
                    </div>

                    {member.role === 'owner' ? (
                      <Badge tone="primary">Owner</Badge>
                    ) : isOwner ? (
                      <RoleSelect
                        label={`Role for ${member.name}`}
                        value={member.role as AssignableRole}
                        disabled={setRole.isPending}
                        onChange={(role) => setRole.mutate({ userId: member.id, role })}
                      />
                    ) : (
                      <Badge>{member.role}</Badge>
                    )}

                    {member.role !== 'owner' && (isOwner || self) && (
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => {
                          const ask = self ? 'Leave this board?' : `Remove ${member.name} from this board?`;
                          if (!window.confirm(ask)) return;
                          remove.mutate(member.id, { onSuccess: () => self && router.replace('/') });
                        }}
                      >
                        {self ? 'Leave' : 'Remove'}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </Card>
        </section>

        {isOwner && (
          <>
            <AddMember />
            <Settings />
          </>
        )}
      </div>
    </div>
  );
}

function AddMember() {
  const add = useAddMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('member');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate({ email: email.trim(), role }, { onSuccess: () => setEmail('') });
  };

  const emailError = add.error instanceof ApiError ? add.error.fieldError('email') : undefined;

  return (
    <section>
      <SectionLabel className="mb-2">Add someone</SectionLabel>
      <Card className="p-4">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              hint="They need a Collabo account first."
              error={emailError}
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-foreground">Role</span>
            <RoleSelect label="Role for new member" value={role} onChange={setRole} />
          </div>
          <Button type="submit" loading={add.isPending} disabled={!email.trim()}>
            Add
          </Button>
        </form>
        <p className="mt-3 text-xs text-foreground-subtle">{ROLE_HELP[role]}.</p>
      </Card>
    </section>
  );
}

function Settings() {
  const router = useRouter();
  const { data: board } = useCurrentBoard();
  const rename = useRenameBoard();
  const del = useDeleteBoard();
  const [name, setName] = useState<string | null>(null);

  const value = name ?? board?.name ?? '';
  const nameError = rename.error instanceof ApiError ? rename.error.fieldError('name') : undefined;

  return (
    <section className="space-y-3">
      <SectionLabel className="mb-2">Settings</SectionLabel>
      <Card className="space-y-4 p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            rename.mutate(value.trim(), { onSuccess: () => setName(null) });
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Field label="Board name" value={value} maxLength={80} onChange={(event) => setName(event.target.value)} error={nameError} />
          </div>
          <Button type="submit" variant="secondary" loading={rename.isPending} disabled={!value.trim() || value.trim() === board?.name}>
            Rename
          </Button>
        </form>

        {rename.isSuccess && name === null && <Alert tone="success">Board renamed.</Alert>}

        <div className="border-t border-line pt-4">
          <p className="text-sm font-medium text-foreground">Delete this board</p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            Permanently removes the board, all of its tasks and every membership. This can&apos;t be undone.
          </p>
          <Button
            className="mt-3"
            variant="danger"
            size="sm"
            loading={del.isPending}
            onClick={() => {
              if (!window.confirm(`Delete "${board?.name}" and all of its tasks?`)) return;
              del.mutate(undefined, { onSuccess: () => router.replace('/') });
            }}
          >
            Delete board
          </Button>
        </div>
      </Card>
    </section>
  );
}
