import React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

// --- DmButton ---
interface DmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  glow?: boolean;
}

export const DmButton = React.forwardRef<HTMLButtonElement, DmButtonProps>(
  ({ className, variant = "primary", glow = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "rounded-full px-6 py-3 font-bold transition-all active:scale-95 inline-flex items-center justify-center",
          {
            "bg-primary text-white hover:bg-primary/90": variant === "primary",
            "shadow-[0_0_20px_rgba(104,71,245,0.3)]": variant === "primary" && glow,
            "bg-secondary text-white hover:bg-secondary/90": variant === "secondary",
            "bg-transparent text-foreground hover:bg-muted": variant === "ghost",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DmButton.displayName = "DmButton";

// --- DmCard ---
export const DmCard = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-white rounded-[20px] shadow-sm border border-border p-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// --- DmLargeCard ---
export const DmLargeCard = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-white rounded-[24px] shadow-md border border-border overflow-hidden",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// --- DmMemoryCard ---
interface DmMemoryCardProps {
  title: string;
  date: string;
  category: string;
  giftColor: string;
  photoUrl?: string;
  people?: { id: number; name: string; avatarUrl?: string | null }[];
  isKeptClose?: boolean;
}

export const DmMemoryCard = ({ title, date, category, giftColor, photoUrl, people, isKeptClose }: DmMemoryCardProps) => {
  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-border flex flex-col h-full hover:shadow-md transition-shadow relative">
      <div className="relative aspect-[4/3] w-full flex-shrink-0">
        {photoUrl ? (
          <img src={photoUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div 
            className="w-full h-full flex flex-col justify-end p-4 text-white" 
            style={{ 
              background: `linear-gradient(135deg, ${giftColor} 0%, ${giftColor}cc 100%)`
            }} 
          >
            <h4 className="font-bold text-lg leading-tight line-clamp-3 drop-shadow-md">{title}</h4>
          </div>
        )}
        {/* Ribbon overlay top */}
        <div className="absolute top-0 left-0 right-0 h-2 opacity-80" style={{ backgroundColor: giftColor }} />
        {/* Left thin ribbon */}
        <div className="absolute top-0 bottom-0 left-0 w-1" style={{ backgroundColor: giftColor }} />
        
        {isKeptClose && (
          <div className="absolute top-3 right-3 text-accent bg-white/80 backdrop-blur-sm w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-xs">❤️</span>
          </div>
        )}
      </div>
      <div className="p-3 py-2 flex flex-col flex-1 relative bg-white">
        <div className="mb-1">
          <span className="bg-muted px-2 py-0.5 rounded-sm text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            {category}
          </span>
        </div>
        {photoUrl && (
          <h4 className="text-sm font-bold leading-tight line-clamp-2 text-foreground">{title}</h4>
        )}
        <p className="text-xs text-muted-foreground mt-1">{date}</p>
        
        {people && people.length > 0 && (
          <div className="flex -space-x-1 mt-2">
            {people.slice(0, 3).map((person, i) => (
              <div key={i} className="w-5 h-5 rounded-full border border-white bg-[#EAE3FF] flex items-center justify-center overflow-hidden">
                {person.avatarUrl ? (
                  <img src={person.avatarUrl} className="w-full h-full object-cover" alt={person.name} />
                ) : (
                  <span className="text-[8px] font-bold text-primary">{person.name.charAt(0)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- DmPersonAvatar ---
interface DmPersonAvatarProps {
  name: string;
  avatarUrl?: string | null;
  count?: number;
  size?: number; // fallback to w-14
}

export const DmPersonAvatar = ({ name, avatarUrl, count, size = 60 }: DmPersonAvatarProps) => {
  return (
    <div className="flex flex-col items-center gap-1.5 w-[72px]">
      <div className="relative">
        <div 
          className="rounded-full bg-[#EAE3FF] flex items-center justify-center overflow-hidden border-2 border-white shadow-sm"
          style={{ width: size, height: size }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-primary text-xl">{name.charAt(0)}</span>
          )}
        </div>
        {count !== undefined && (
          <div className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold px-1.5 min-w-[18px] rounded-full text-center border-2 border-white shadow-sm">
            {count}
          </div>
        )}
      </div>
      <span className="text-xs font-bold text-center w-full truncate">{name}</span>
    </div>
  );
};

// --- DmDatePill ---
interface DmDatePillProps {
  emoji: string;
  title: string;
  subtitle: string;
  colorClass: string;
}

export const DmDatePill = ({ emoji, title, subtitle, colorClass }: DmDatePillProps) => {
  return (
    <div className={cn("rounded-full px-4 py-2.5 min-w-fit flex items-center gap-3", colorClass)}>
      <span className="text-xl">{emoji}</span>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-bold">{title}</span>
        <span className="text-[10px] font-bold opacity-80 mt-0.5">{subtitle}</span>
      </div>
    </div>
  );
};

// --- DmCategoryTag ---
export const DmCategoryTag = ({ category, color }: { category: string; color: string }) => (
  <span 
    className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white inline-block shadow-sm"
    style={{ backgroundColor: color }}
  >
    {category}
  </span>
);

// --- DmMoodChip ---
export const DmMoodChip = ({ emoji, label, colorClass }: { emoji: string; label: string; colorClass: string }) => (
  <div className={cn("inline-flex flex-col items-center justify-center rounded-2xl px-4 py-3 min-w-[80px]", colorClass)}>
    <span className="text-2xl mb-1">{emoji}</span>
    <span className="text-sm font-semibold">{label}</span>
  </div>
);

// --- DmPageHeader ---
interface DmPageHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  backHref?: string;
}

export const DmPageHeader = ({ title, subtitle, leftAction, rightAction, backHref }: DmPageHeaderProps) => {
  return (
    <div className="flex items-center justify-between py-4 mb-4">
      <div className="flex items-center gap-3">
        {backHref ? (
          <Link href={backHref} className="w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
        ) : leftAction}
        <div>
          <h1 className="text-lg font-bold font-sans">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
};

// --- DmErrorState ---
export function DmErrorState({ message = "Something went wrong.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
      <div className="text-4xl mb-3">😔</div>
      <p className="font-semibold text-foreground mb-1">{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-3 text-sm font-bold text-primary underline">Try again</button>}
    </div>
  );
}

// --- DmBottomSafeArea ---
export const DmBottomSafeArea = () => <div className="h-28 w-full" />;

// --- DmSectionHeading ---
export const DmSectionHeading = ({ title, linkText, href }: { title: string; linkText?: string; href?: string }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-base font-bold font-sans tracking-wide text-foreground">{title}</h2>
    {linkText && href && (
      <Link href={href} className="text-sm font-bold text-primary hover:underline">
        {linkText}
      </Link>
    )}
  </div>
);
