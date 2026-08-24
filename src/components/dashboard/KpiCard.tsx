"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
  index?: number;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend = "neutral",
  className,
  index = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-shadow hover:shadow-md",
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            {title}
          </CardTitle>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              {
                "bg-blue-50 text-blue-600": trend === "neutral",
                "bg-emerald-50 text-emerald-600": trend === "up",
                "bg-amber-50 text-amber-600": trend === "down",
              }
            )}
          >
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
