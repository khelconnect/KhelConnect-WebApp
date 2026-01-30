"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileSlideCardProps {
  theme: {
    bg: string;
    border?: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    subTextColor: string;
    arrowColor: string;
    glass?: boolean;
  };
  icon: React.ReactNode;
  title: string;
  subContent: React.ReactNode;
  rightContent?: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
}

export function MobileSlideCard({ theme, icon, title, subContent, rightContent, onClick }: MobileSlideCardProps) {
  return (
    <div 
        className={cn(
            "rounded-2xl p-4 flex justify-between items-center cursor-pointer shadow-lg relative overflow-hidden transition-all active:scale-[0.98]",
            theme.bg,
            theme.border ? `border ${theme.border}` : "",
            theme.glass ? "backdrop-blur-md" : ""
        )} 
        onClick={onClick}
    >
        {theme.glass && (
            <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none", theme.bg.replace('/10', '/20'))} />
        )}

        <div className="flex items-center gap-3 relative z-10 min-w-0 flex-1">
            <div className={cn("p-2 rounded-full shrink-0", theme.iconBg)}>
                <div className={theme.iconColor}>{icon}</div>
            </div>
            <div className="min-w-0">
                <p className={cn("font-bold text-sm truncate", theme.titleColor)}>{title}</p>
                <div className={cn("text-xs flex items-center gap-2", theme.subTextColor)}>
                    {subContent}
                </div>
            </div>
        </div>

        {rightContent ? (
            <div className="relative z-10 shrink-0 ml-3">
                {rightContent}
            </div>
        ) : (
            <ChevronRight className={cn("h-5 w-5 shrink-0 relative z-10", theme.arrowColor)} />
        )}
    </div>
  );
}