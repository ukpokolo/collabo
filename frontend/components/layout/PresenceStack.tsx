'use client';

import { AvatarStack } from '@/components/ui/Avatar';
import { usePresenceStore } from '@/store/usePresenceStore';
import { useSession } from '@/hooks/useSession';

export function PresenceStack() {
  const { members, status } = usePresenceStore();
  const { user: self } = useSession();

  if (status === 'unauthorized') {
    return (
      <span
        className="hidden rounded-md bg-warning-soft px-2 py-1 text-xs font-medium text-warning-foreground ring-1 ring-warning/30 sm:inline"
        title="Presence could not authorize. Task updates still sync."
      >
        Presence offline
      </span>
    );
  }

  if (status !== 'online') {
    return (
      <div className="hidden items-center gap-2 text-xs text-foreground-subtle sm:flex">
        <span className="h-2 w-2 animate-pulse rounded-full bg-line-strong" />
        Connecting…
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <AvatarStack names={members.map((member) => member.name)} highlight={self?.name} />
      <span className="hidden text-xs font-medium text-foreground-muted lg:inline">
        {members.length} online
      </span>
    </div>
  );
}
