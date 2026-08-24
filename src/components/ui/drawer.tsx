"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  position?: "right" | "bottom";
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  className,
  position = "right",
}: DrawerProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const isBottom = position === "bottom";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={
              isBottom
                ? { opacity: 0, y: "100%" }
                : { opacity: 0, x: "100%" }
            }
            animate={isBottom ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
            exit={
              isBottom
                ? { opacity: 0, y: "100%" }
                : { opacity: 0, x: "100%" }
            }
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "relative z-10 bg-white shadow-2xl",
              isBottom
                ? "mt-auto h-[85vh] w-full rounded-t-2xl"
                : "ml-auto h-full w-full max-w-md",
              className
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              {title && (
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="ml-auto"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="overflow-y-auto p-4 pb-24">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
