'use client';

import { CalendarDays, LayoutGrid, List, Loader2, Menu, Search } from 'lucide-react';
import { PresenceStack } from '@/features/presence/components/PresenceStack';
import { UserMenu } from '@/components/layout/UserMenu';
import { AssigneeFilter } from '@/features/board/components/AssigneeFilter';
import { BoardSwitcher } from '@/features/board/components/BoardSwitcher';
import { IconButton } from '@/components/ui/IconButton';
import { useBoardStore } from '@/features/board/store';
import { useFlags } from '@/features/flags/hooks/useFlag';
import type { FlagName } from '@/features/flags/definitions';
import { cn } from '@/lib/utils';

// List and Calendar are placeholders with nothing behind them; each stays hidden
// until its flag is on.
const VIEWS: ReadonlyArray<{
  icon: typeof LayoutGrid;
  label: string;
  active?: boolean;
  flag?: FlagName;
}> = [
  { icon: LayoutGrid, label: 'Board', active: true },
  { icon: List, label: 'List', flag: 'list-view' },
  { icon: CalendarDays, label: 'Calendar', flag: 'calendar-view' },
];

export function TopBar({ searching = false }: { searching?: boolean }) {
  const { search, setSearch, setMobileNavOpen } = useBoardStore();
  const { data: flags } = useFlags();
  const views = VIEWS.filter((view) => !view.flag || flags?.[view.flag] === true);

  return (
    <header className="shrink-0 border-b border-line bg-surface">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton
            label="Open menu"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden"
          >
            <Menu />
          </IconButton>

          <BoardSwitcher />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <PresenceStack />
          <UserMenu />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-3 py-2 sm:px-5 lg:h-12 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
        <div className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1">
          {views.map(({ icon: Icon, label, active }) => {
            return (
              <button
                key={label}
                type="button"
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors',
                  active
                    ? 'bg-surface-muted font-medium text-foreground'
                    : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <AssigneeFilter />

          <div className="relative">
            {searching ? (
              <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary" />
            ) : (
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-subtle" />
            )}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              className="w-full rounded-md border border-line bg-surface-muted py-1.5 pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 sm:w-52"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
