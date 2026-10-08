'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';
import { boardChannel } from '@/lib/channels';
import { useBoardId } from '@/features/board/context';
import type { Task, TaskUpdatedEvent } from '@/features/tasks/types';
import { taskKeys } from '@/features/tasks/keys';

export function useTaskBroadcast() {
  const client = useQueryClient();
  const boardId = useBoardId();

  useEffect(() => {
    const echo = getEcho();
    const channel = echo.private(boardChannel(boardId));

    // The leading dot is required, otherwise Echo prefixes the app namespace.
    channel.listen('.task.updated', (event: TaskUpdatedEvent) => {
      if (event.type === 'deleted') {
        client.removeQueries({ queryKey: taskKeys.detail(event.task.id) });
      } else {
        client.setQueryData<Task>(taskKeys.detail(event.task.id), event.task);
      }

      client.setQueriesData<Task[]>({ queryKey: taskKeys.board(boardId) }, (current) => {
        if (!Array.isArray(current)) return current;

        switch (event.type) {
          case 'created':
            return current.some((task) => task.id === event.task.id)
              ? current
              : [event.task, ...current];

          case 'updated':
            return current.map((task) => (task.id === event.task.id ? event.task : task));

          case 'deleted':
            return current.filter((task) => task.id !== event.task.id);

          default:
            return current;
        }
      });
    });

    return () => {
      channel.stopListening('.task.updated');
      // leaveChannel, not leave: leave() would also drop presence-board.N.
      echo.leaveChannel(`private-${boardChannel(boardId)}`);
    };
  }, [client, boardId]);
}
