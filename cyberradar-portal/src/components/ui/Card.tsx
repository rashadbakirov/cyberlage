// © 2025 CyberLage
// UI: Kartenkomponente
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
}

export default function Card({ children, className, hover, style }: CardProps) {
  return (
    <div
      style={style}
      className={cn(
        "bg-card border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5",
        hover && "hover:bg-hover transition-colors cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}


