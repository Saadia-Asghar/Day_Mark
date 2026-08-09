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

// Routes where BottomNav is visible
const BOTTOM_NAV_ROUTES = ['/home', '/calendar', '/gifts', '/people'];

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const showBottomNav = BOTTOM_NAV_ROUTES.some(
    (r) => location === r || location.startsWith(r + '?')
  );

  return (
    // Outer: fills viewport, cream bg shows on desktop around the phone frame
    <div className="min-h-[100dvh] bg-[#EAE3FF]/40 flex justify-center">
      {/* Inner: mobile frame — centered, max 430px, cream bg, shadow on desktop */}
      <div
        className="w-full max-w-[430px] bg-[#FFF9F5] min-h-[100dvh] relative flex flex-col shadow-[0_0_60px_rgba(104,71,245,0.08)] md:shadow-[0_0_80px_rgba(104,71,245,0.14)]"
        style={{ isolation: 'isolate' }}
      >
        <div className={`flex-1 w-full relative ${showBottomNav ? 'pb-[80px]' : ''}`}>
          {children}
        </div>
        {showBottomNav && <BottomNav />}
      </div>
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
