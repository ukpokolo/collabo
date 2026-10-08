'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';
import { CHANNELS, QUERY_KEYS } from '@/lib/constants';
import type { Task, TaskUpdatedEvent } from '@/lib/types';

export function useTaskBroadcast() {
  const client = useQueryClient();

  useEffect(() => {
    const echo = getEcho();
    const channel = echo.private(CHANNELS.board);

    // The leading dot is required, otherwise Echo prefixes the app namespace.
    channel.listen('.task.updated', (event: TaskUpdatedEvent) => {
      if (event.type === 'deleted') {
        client.removeQueries({ queryKey: QUERY_KEYS.task(event.task.id) });
      } else {
        client.setQueryData<Task>(QUERY_KEYS.task(event.task.id), event.task);
      }

      client.setQueriesData<Task[]>({ queryKey: QUERY_KEYS.tasks }, (current) => {
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
      echo.leaveChannel(`private-${CHANNELS.board}`);
    };
  }, [client]);
}
