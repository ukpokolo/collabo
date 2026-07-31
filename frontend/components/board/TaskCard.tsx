'use client';

import { useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, Paperclip, Trash2, UserCircle2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { AssigneePicker } from '@/components/ui/AssigneePicker';
import { IconButton } from '@/components/ui/IconButton';
import { cn, relativeTime } from '@/lib/utils';
import type { Task, User } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  users?: User[];
  onDelete?: (id: number) => void;
  onOpen?: (id: number) => void;
  onAssigneeChange?: (id: number, assigned_to: number | null) => void;
}

export function TaskCardView({
  task,
  users = [],
  onDelete,
  onAssigneeChange,
  dragging,
  overlay,
}: TaskCardProps & { dragging?: boolean; overlay?: boolean }) {
  const pending = task.id < 0;

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-line bg-surface p-3 shadow-sm transition-shadow',
        !overlay && 'hover:border-line-strong hover:shadow-md',
        dragging && 'opacity-30',
        overlay && 'rotate-2 cursor-grabbing shadow-xl ring-2 ring-primary',
        pending && 'opacity-60',
      )}
    >
      <p className="pr-6 text-sm font-medium leading-snug text-foreground">{task.title}</p>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-foreground-subtle">{task.description}</p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5 text-foreground-subtle">
          <span className="font-mono text-[10px]">{pending ? '…' : `#${task.id}`}</span>
          <span className="flex items-center gap-1 text-[10px]">
            <MessageSquare className="h-3 w-3" />0
          </span>
          <span className="flex items-center gap-1 text-[10px]">
            <Paperclip className="h-3 w-3" />0
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[10px] text-foreground-subtle sm:inline">
            {relativeTime(task.updated_at)}
          </span>
          {onAssigneeChange && !overlay && !pending ? (
            <div
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              className="w-32"
            >
              <AssigneePicker
                users={users}
                value={task.assigned_to}
                assignee={task.assignee}
                onChange={(assigned_to) => onAssigneeChange(task.id, assigned_to)}
                showSearch={users.length > 4}
              />
            </div>
          ) : task.assignee ? (
            <Avatar name={task.assignee.name} size="xs" />
          ) : (
            <span className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-line-strong text-foreground-subtle">
              <UserCircle2 className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      {onDelete && !overlay && !pending && (
        <IconButton
          label={`Delete ${task.title}`}
          tone="danger"
          size="sm"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(task.id);
          }}
          className="absolute right-2 top-2 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 />
        </IconButton>
      )}
    </div>
  );
}

export function TaskCard({ task, users, onDelete, onOpen, onAssigneeChange }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: task.id < 0,
  });

  // A pointerup after a drag still fires onClick, which would open the detail
  // page every time a card is dropped. Swallow exactly one click.
  const justDragged = useRef(false);

  useEffect(() => {
    if (isDragging) justDragged.current = true;
  }, [isDragging]);

  const handleClick = () => {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    onOpen?.(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="cursor-grab touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:cursor-grabbing"
    >
      <TaskCardView
        task={task}
        users={users}
        onDelete={onDelete}
        onAssigneeChange={onAssigneeChange}
        dragging={isDragging}
      />
    </div>
  );
}
