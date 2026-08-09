import { Link, useLocation } from "wouter";
import { Home, Calendar, PlusCircle, Gift, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/calendar", icon: Calendar, label: "Dates" },
    { href: "/wrap", icon: PlusCircle, label: "Wrap", special: true },
    { href: "/gifts", icon: Gift, label: "Gifts" },
    { href: "/people", icon: Users, label: "People" },
  ];

  // Don't show nav on landing page or onboarding
  if (location === "/" || location.startsWith("/onboarding")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-lavender/50 pb-safe pt-2 px-4 shadow-[0_-4px_20px_-10px_rgba(109,74,255,0.1)] mx-auto max-w-[500px]">
      <div className="flex justify-between items-center max-w-sm mx-auto w-full relative">
        {navItems.map((item) => {
          const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/home");
          
          if (item.special) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center -mt-6 z-10 group outline-none">
                <div className="bg-primary text-white h-14 w-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transition-transform group-hover:scale-105 group-active:scale-95">
                  <item.icon className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-bold mt-1 text-primary">Wrap</span>
              </Link>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-16 gap-1 group outline-none">
              <div className={cn(
                "p-2 rounded-2xl transition-all duration-300",
                isActive ? "bg-lavender text-primary" : "text-muted-foreground group-hover:bg-lavender/50"
              )}>
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isActive ? "scale-110" : "scale-100"
                )} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] transition-colors duration-300",
                isActive ? "font-bold text-primary" : "font-medium text-muted-foreground"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
