'use client';

import { useEffect } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  Home,
  LayoutGrid,
  Search,
  Settings,
  SquareCheckBig,
  Users,
  X,
} from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useBoardStore } from '@/store/useBoardStore';
import { cn } from '@/lib/utils';

const NAV = [
  { icon: Home, label: 'Home' },
  { icon: SquareCheckBig, label: 'Tasks', active: true },
  { icon: CalendarDays, label: 'Calendar' },
  { icon: Users, label: 'Team' },
  { icon: Bell, label: 'Notifications' },
] as const;

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-14 items-center gap-2.5 px-4">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          C
        </span>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-sidebar-foreground-strong">
            Collabo
          </span>
        )}
        {onNavigate && (
          <IconButton label="Close menu" tone="onDark" onClick={onNavigate} className="ml-auto">
            <X />
          </IconButton>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-md bg-sidebar-hover px-2.5 py-1.5 text-sidebar-foreground">
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search…</span>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV.map(({ icon: Icon, label, ...rest }) => {
          const active = 'active' in rest && rest.active;
          return (
            <button
              key={label}
              type="button"
              title={label}
              onClick={onNavigate}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/20 font-medium text-sidebar-foreground-strong'
                  : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground-strong',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 pb-2">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground">
            Spaces
          </p>
          <div className="flex items-center gap-2 rounded-md bg-sidebar-hover px-2.5 py-2">
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            <span className="truncate text-xs font-medium text-sidebar-foreground-strong">
              Product Board
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-sidebar-hover p-2">
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground-strong',
            collapsed && 'justify-center px-0',
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useBoardStore();

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-sidebar-hover bg-sidebar transition-[width] duration-200 lg:flex',
          sidebarCollapsed ? 'w-[60px]' : 'w-[220px]',
        )}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
        <div className="flex justify-end border-t border-sidebar-hover p-2">
          <IconButton
            label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            tone="onDark"
            onClick={toggleSidebar}
          >
            <ChevronLeft className={cn('transition-transform', sidebarCollapsed && 'rotate-180')} />
          </IconButton>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-foreground/40"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[260px] animate-slide-in flex-col bg-sidebar shadow-xl">
            <SidebarContent collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
