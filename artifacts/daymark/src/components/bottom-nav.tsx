import { Link, useLocation } from "wouter";
import { Home, Calendar, Plus, Gift, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/calendar", icon: Calendar, label: "Dates" },
    { href: "/wrap", icon: Plus, label: "Wrap", special: true },
    { href: "/gifts", icon: Gift, label: "Gifts" },
    { href: "/people", icon: User, label: "You" },
  ];

  // Don't show nav on landing page or onboarding
  if (location === "/" || location.startsWith("/onboarding")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-4 mb-safe md:mx-auto md:max-w-[468px] transform -translate-y-4">
      <div className="bg-white/80 backdrop-blur-md border border-border/50 rounded-[2rem] shadow-lg shadow-primary/10 px-2 py-3 flex justify-between items-center relative">
        {navItems.map((item) => {
          const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/home");
          
          if (item.special) {
            return (
              <div key={item.href} className="relative z-10 w-16 flex flex-col items-center justify-center">
                <Link href={item.href} className="absolute -top-10 flex items-center justify-center bg-primary text-white h-[52px] w-[52px] rounded-full shadow-[0_0_24px_rgba(104,71,245,0.35)] transition-transform hover:scale-105 active:scale-95">
                  <item.icon className="w-6 h-6" strokeWidth={2.5} />
                </Link>
                <span className="text-[10px] font-semibold mt-[26px] text-muted-foreground opacity-0">Wrap</span>
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-16 gap-1 group outline-none">
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground group-hover:bg-muted"
              )}>
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isActive ? "scale-110" : "scale-100"
                )} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] transition-colors duration-300",
                isActive ? "font-semibold text-primary" : "font-semibold text-muted-foreground"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
