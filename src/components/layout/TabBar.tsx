import { useRef, useEffect } from "react";
import { useTabContext, type Tab } from "@/contexts/TabContext";
import { useTheme } from "@/hooks/useTheme";
import { icons, X } from "lucide-react";
import { cn } from "@/lib/utils";

function TabIcon({ name }: { name: string }) {
  const Icon = (icons as any)[name];
  if (!Icon) return null;
  return <Icon size={13} strokeWidth={1.5} />;
}

export default function TabBar() {
  const { tabs, activeTabId, activateTab, closeTab } = useTabContext();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector('[data-active="true"]') as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activeTabId]);

  if (tabs.length <= 1) return null; // Don't show bar with only one tab

  return (
    <div
      className={cn(
        "flex items-end h-[36px] min-h-[36px] overflow-hidden select-none",
        isDark
          ? "bg-[#0b1222] border-b border-white/[0.05]"
          : "bg-[#f0f0f5] border-b border-[#e4e4e9]"
      )}
    >
      <div
        ref={scrollRef}
        className="flex items-end gap-0 overflow-x-auto flex-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              data-active={isActive}
              onClick={() => activateTab(tab.id)}
              className={cn(
                "group relative flex items-center gap-1.5 px-3 h-[32px] rounded-t-lg text-[12px] tracking-[-0.1px] transition-all",
                "max-w-[160px] min-w-[80px] shrink-0",
                isActive
                  ? isDark
                    ? "bg-[#0e1525] text-[#fafafa] font-medium"
                    : "bg-white text-[#0a0a0a] font-medium shadow-sm"
                  : isDark
                    ? "text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.03]"
                    : "text-[#71717a] hover:text-[#3f3f46] hover:bg-[#eaeaf0]"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#4969FF]" />
              )}

              <span className={cn(
                "shrink-0",
                isActive
                  ? "text-[#4969FF]"
                  : isDark ? "text-[#52525b]" : "text-[#a1a1aa]"
              )}>
                <TabIcon name={tab.icon} />
              </span>
              <span className="truncate flex-1 text-left">{tab.label}</span>

              {tab.closable && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={cn(
                    "shrink-0 w-[16px] h-[16px] flex items-center justify-center rounded-sm transition-colors",
                    "opacity-0 group-hover:opacity-100",
                    isDark
                      ? "hover:bg-white/10 text-[#52525b] hover:text-[#a1a1aa]"
                      : "hover:bg-black/5 text-[#c4c4c7] hover:text-[#71717a]"
                  )}
                >
                  <X size={10} strokeWidth={2} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
