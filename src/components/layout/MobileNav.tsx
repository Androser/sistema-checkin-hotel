"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ScanLine, Building2, Bed } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/constants";

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-5 w-5" />,
  Building2: <Building2 className="h-5 w-5" />,
  Bed: <Bed className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  ScanLine: <ScanLine className="h-5 w-5" />,
};

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-100 bg-white/90 backdrop-blur-md lg:hidden safe-area-pb">
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
              active ? "text-primary" : "text-slate-500 hover:text-slate-900"
            )}
          >
            {iconMap[link.icon]}
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
