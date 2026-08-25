"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Asistente } from "@/lib/types";

export function useAsistentes() {
  const [asistentes, setAsistentes] = useState<Asistente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchAsistentes = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("asistentes")
          .select("*")
          .order("apellidos", { ascending: true });

        if (cancelled) return;
        if (error) {
          setError(error.message);
        } else {
          setAsistentes(data || []);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Error al cargar asistentes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAsistentes();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refetch = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return { asistentes, loading, error, refetch };
}
