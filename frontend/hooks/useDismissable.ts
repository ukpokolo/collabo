'use client';

import { useEffect, useRef, useState } from 'react';

export function useDismissable<T extends HTMLElement = HTMLDivElement>(initial = false) {
  const [open, setOpen] = useState(initial);
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return {
    ref,
    open,
    setOpen,
    toggle: () => setOpen((value) => !value),
    close: () => setOpen(false),
  };
}
