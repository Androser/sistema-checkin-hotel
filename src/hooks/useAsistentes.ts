"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Asistente } from "@/lib/types";

export function useAsistentes() {
  const [asistentes, setAsistentes] = useState<Asistente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchAsistentes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("asistentes")
      .select("*")
      .order("apellidos", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setAsistentes(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAsistentes();
  }, [fetchAsistentes]);

  return { asistentes, loading, error, refetch: fetchAsistentes };
}
