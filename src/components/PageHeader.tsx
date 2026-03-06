import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children?: ReactNode;
}

export default function PageHeader({ title, subtitle, icon: Icon, children }: PageHeaderProps) {
  return (
    <div className="relative rounded-2xl border border-border/40 bg-gradient-to-r from-card via-card to-accent/30 p-6 mb-6 overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/[0.03] blur-[80px] -translate-y-1/2 translate-x-1/4" />

      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="icon-glow h-11 w-11">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {children && (
          <div className="flex items-center gap-2 flex-wrap">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
