'use client';

import { CalendarDays, ChevronRight, LayoutGrid, List, Loader2, Menu, Search } from 'lucide-react';
import { PresenceStack } from '@/components/layout/PresenceStack';
import { UserMenu } from '@/components/layout/UserMenu';
import { AssigneeFilter } from '@/components/board/AssigneeFilter';
import { IconButton } from '@/components/ui/IconButton';
import { useBoardStore } from '@/store/useBoardStore';
import { cn } from '@/lib/utils';

const VIEWS = [
  { icon: LayoutGrid, label: 'Board', active: true },
  { icon: List, label: 'List' },
  { icon: CalendarDays, label: 'Calendar' },
] as const;

export function TopBar({ searching = false }: { searching?: boolean }) {
  const { search, setSearch, setMobileNavOpen } = useBoardStore();

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

          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="hidden text-foreground-muted sm:inline">Product Board</span>
            <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-foreground-subtle sm:inline" />
            <h1 className="truncate font-semibold text-foreground">Sprint 12</h1>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <PresenceStack />
          <UserMenu />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-3 py-2 sm:px-5 lg:h-12 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
        <div className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1">
          {VIEWS.map(({ icon: Icon, label, ...rest }) => {
            const active = 'active' in rest && rest.active;
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
