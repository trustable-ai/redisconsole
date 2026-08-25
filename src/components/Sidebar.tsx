import { useState } from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { SECTIONS } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { Database } from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-500 text-primary-foreground">
              <Database className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Redis Console</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Nuvolaris / OpenServerless
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.id}
              to={s.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )
              }
            >
              <s.icon className="h-4 w-4 shrink-0" />
              <span>{s.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
          Keys are namespaced per app via the configured Redis prefix.
        </div>
      </aside>
    </>
  );
}

export function useSidebar() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}