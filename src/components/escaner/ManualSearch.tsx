"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ManualSearchProps {
  onSearch: (value: string) => void;
  loading?: boolean;
}

export function ManualSearch({ onSearch, loading }: ManualSearchProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSearch(value.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
    >
      <Input
        type="text"
        inputMode="numeric"
        placeholder="Buscar por cédula"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={loading}>
        <Search className="mr-2 h-4 w-4" />
        Validar
      </Button>
    </form>
  );
}
