"use client";

import { useState, useEffect, useCallback } from "react";

interface UseFetchDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useFetchData<T = unknown>(
  url: string,
  deps: React.DependencyList = [],
): UseFetchDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Erro ${res.status} ao buscar ${url}`);
      }
      const json = await res.json();
      setData(json as unknown as T);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}
