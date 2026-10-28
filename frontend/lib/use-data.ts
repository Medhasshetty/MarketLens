"use client";

import { useEffect, useState } from "react";

export function useData<T>(load: () => Promise<{ data: T; live: boolean }>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; live: boolean; loading: boolean }>({
    data: null,
    live: false,
    loading: true,
  });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    load().then((r) => alive && setState({ data: r.data, live: r.live, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
