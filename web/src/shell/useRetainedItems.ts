import { useState } from 'react';

export function useRetainedItems<T>(items: readonly T[], keyOf: (item: T) => string) {
  const [retained, setRetained] = useState<ReadonlyMap<string, T>>(() => new Map());
  const [order, setOrder] = useState<readonly string[]>([]);
  let refreshed: Map<string, T> | undefined;
  for (const item of items) {
    const key = keyOf(item);
    if (retained.has(key) && retained.get(key) !== item) {
      refreshed ??= new Map(retained);
      refreshed.set(key, item);
    }
  }
  if (refreshed !== undefined) setRetained(refreshed);
  const visible = [...items];
  for (const [key, item] of refreshed ?? retained) {
    if (!items.some((current) => keyOf(current) === key)) visible.push(item);
  }
  if (retained.size > 0) {
    const positions = new Map(order.map((key, index) => [key, index]));
    visible.sort((a, b) =>
      (positions.get(keyOf(a)) ?? Number.MAX_SAFE_INTEGER) - (positions.get(keyOf(b)) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  function retain(item: T, open: boolean): void {
    if (open) {
      setOrder((current) => retained.size === 0
        ? items.map(keyOf)
        : [...current, ...items.map(keyOf).filter((key) => !current.includes(key))],
      );
    }
    setRetained((current) => {
      const next = new Map(current);
      if (open) next.set(keyOf(item), item);
      else next.delete(keyOf(item));
      return next;
    });
  }

  return { items: visible, retain, retaining: retained.size > 0 };
}
