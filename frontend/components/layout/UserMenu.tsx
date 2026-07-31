'use client';

import { ChevronDown, LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useDismissable } from '@/hooks/useDismissable';
import { useLogout, useSession } from '@/hooks/useSession';

export function UserMenu() {
  const { user } = useSession();
  const logout = useLogout();
  const { ref, open, toggle } = useDismissable();

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md p-1 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Avatar name={user.name} size="lg" />
        <ChevronDown className="hidden h-3.5 w-3.5 text-foreground-subtle sm:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-56 animate-fade-in rounded-lg border border-line bg-surface p-1 shadow-lg"
        >
          <div className="border-b border-line px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-foreground-muted">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-danger-soft hover:text-danger-foreground disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
