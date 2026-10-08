'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';
import { boardChannel } from '@/lib/channels';
import { useBoardId } from '@/features/board/context';
import { useRealtimeStore, type ConnectionState } from '@/features/realtime/store';
import type { Task, TaskUpdatedEvent } from '@/features/tasks/types';
import { taskKeys } from '@/features/tasks/keys';

export function useTaskBroadcast() {
  const client = useQueryClient();
  const boardId = useBoardId();

  useEffect(() => {
    const echo = getEcho();
    const channel = echo.private(boardChannel(boardId));

    // Reverb does not replay events a client missed while offline (laptop sleep,
    // a dropped network, a Reverb restart), so on every reconnect we refetch
    // instead, which also covers anything that changed during the gap.
    const connection = echo.connector.pusher.connection;
    const { setConnection } = useRealtimeStore.getState();
    let reconnecting = connection.state !== 'connected' && useRealtimeStore.getState().hasConnected;

    setConnection(connection.state as ConnectionState);

    const onStateChange = ({ current }: { previous: string; current: string }) => {
      setConnection(current as ConnectionState);

      if (current === 'connected' && reconnecting) {
        reconnecting = false;
        client.invalidateQueries({ queryKey: taskKeys.board(boardId) });
        client.invalidateQueries({ queryKey: ['task'] });
      } else if (current !== 'connected') {
        reconnecting = true;
      }
    };
    connection.bind('state_change', onStateChange);

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
      connection.unbind('state_change', onStateChange);
      channel.stopListening('.task.updated');
      // leaveChannel, not leave: leave() would also drop presence-board.N.
      echo.leaveChannel(`private-${boardChannel(boardId)}`);
    };
  }, [client, boardId]);
}
