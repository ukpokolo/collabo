'use client';

import { UserCircle2, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useUsers } from '@/hooks/useTask';
import { useBoardStore } from '@/store/useBoardStore';
import { cn } from '@/lib/utils';

export function AssigneeFilter() {
  const { data: users } = useUsers();
  const { assignees, toggleAssignee, clearFilters, search } = useBoardStore();

  const active = assignees.length > 0;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden shrink-0 text-xs font-medium text-foreground-muted xl:inline">
        Assignee
      </span>

      <div className="no-scrollbar flex min-w-0 items-center overflow-x-auto py-1">
        <div className="flex items-center -space-x-2">
          {users?.map((user) => {
            const selected = assignees.includes(user.id);
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleAssignee(user.id)}
                aria-pressed={selected}
                title={`${selected ? 'Remove' : 'Filter by'} ${user.name}`}
                className={cn(
                  'shrink-0 rounded-full transition-transform hover:z-10 hover:-translate-y-0.5',
                  selected && 'z-10 -translate-y-0.5',
                )}
              >
                <Avatar
                  name={user.name}
                  size="lg"
                  className={cn(
                    selected ? 'ring-2 ring-primary' : 'ring-2 ring-surface',
                    !selected && active && 'opacity-40',
                  )}
                />
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => toggleAssignee('unassigned')}
            aria-pressed={assignees.includes('unassigned')}
            title="Filter by unassigned"
            className={cn(
              'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-dashed bg-surface transition-transform hover:z-10 hover:-translate-y-0.5',
              assignees.includes('unassigned')
                ? 'z-10 -translate-y-0.5 border-primary text-primary'
                : 'border-line-strong text-foreground-subtle',
              !assignees.includes('unassigned') && active && 'opacity-40',
            )}
          >
            <UserCircle2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(active || search) && (
        <button
          type="button"
          onClick={clearFilters}
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  );
}
