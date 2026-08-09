import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { BottomNav } from '@/components/bottom-nav';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

// Pages
import LandingPage from '@/pages/landing';
import OnboardingPage from '@/pages/onboarding';
import HomePage from '@/pages/home';
import WrapMemoryPage from '@/pages/wrap';
import GiftsPage from '@/pages/gifts';
import GiftDetailPage from '@/pages/gift-detail';
import CalendarPage from '@/pages/calendar';
import PeoplePage from '@/pages/people';
import PersonDetailPage from '@/pages/person-detail';
import FutureGiftsPage from '@/pages/future-gifts';
import CreateFutureGiftPage from '@/pages/future-gift-new';

const queryClient = new QueryClient();

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isLanding = location === "/";
  const isOnboarding = location.startsWith("/onboarding");
  
  // Only Landing page is truly full-width responsive.
  // The app screens (and onboarding) stay constrained to a mobile aspect ratio on desktop.
  if (isLanding) {
    return (
      <div className="w-full min-h-[100dvh] bg-background">
        {children}
      </div>
    );
  }
  
  return (
    <div className="mx-auto bg-background min-h-[100dvh] max-w-[500px] shadow-2xl relative overflow-hidden flex flex-col md:border-x md:border-border">
      <div className="flex-1 w-full relative">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          
          <Route path="/home" component={HomePage} />
          <Route path="/wrap" component={WrapMemoryPage} />
          <Route path="/gifts" component={GiftsPage} />
          <Route path="/gifts/:id" component={GiftDetailPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/people" component={PeoplePage} />
          <Route path="/people/:id" component={PersonDetailPage} />
          <Route path="/future-gifts" component={FutureGiftsPage} />
          <Route path="/future-gifts/new" component={CreateFutureGiftPage} />
          
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
