'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, UserCircle2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useDismissable } from '@/hooks/useDismissable';
import { useDebounced } from '@/hooks/useDebounced';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';

interface AssigneePickerProps {
  users: User[];
  value: number | null;
  assignee: User | null;
  onChange: (userId: number | null) => void;
  showSearch?: boolean;
}

export function AssigneePicker({
  users,
  value,
  assignee,
  onChange,
  showSearch = true,
}: AssigneePickerProps) {
  const { ref, open, toggle, close } = useDismissable();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 150);

  const selected = assignee ?? users.find((user) => user.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        (user.email?.toLowerCase().includes(q) ?? false),
    );
  }, [users, debouncedQuery]);

  const select = (userId: number | null) => {
    onChange(userId);
    close();
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md border border-line bg-surface px-2 py-1.5 text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {selected ? (
          <Avatar name={selected.name} size="lg" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full border border-dashed border-line-strong text-foreground-subtle">
            <UserCircle2 className="h-4 w-4" />
          </span>
        )}
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm',
            selected ? 'text-foreground' : 'text-foreground-subtle',
          )}
        >
          {selected?.name ?? 'Unassigned'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-foreground-subtle" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full animate-fade-in overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          {showSearch && (
            <div className="border-b border-line bg-surface px-2 py-1.5">
              <div className="flex items-center gap-2 rounded-md bg-surface-muted px-2 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search users…"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-subtle"
                />
              </div>
            </div>
          )}

          <ul role="listbox" className="max-h-56 overflow-y-auto p-1">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === null}
                onClick={() => select(null)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-muted"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-line-strong text-foreground-subtle">
                  <UserCircle2 className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground-muted">
                  Unassigned
                </span>
                {value === null && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            </li>

            {filtered.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={user.id === value}
                  onClick={() => select(user.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-muted"
                >
                  <Avatar name={user.name} size="md" ring={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{user.name}</span>
                    {user.email && (
                      <span className="block truncate text-[11px] text-foreground-subtle">
                        {user.email}
                      </span>
                    )}
                  </span>
                  {user.id === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              </li>
            ))}

            {filtered.length === 0 && (
              <li className="px-2 py-3 text-center text-xs text-foreground-subtle">
                No users found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
