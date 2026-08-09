import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
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
  Redirect,
} from 'wouter';
import { useAuth, type AuthUser } from '@workspace/replit-auth-web';
import { createContext, useContext, useEffect, useRef } from 'react';

// Pages
import LandingPage from '@/pages/landing';
import AuthPage from '@/pages/auth';
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

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/home', '/wrap', '/gifts', '/calendar',
  '/people', '/future-gifts', '/onboarding',
];

// ── Auth context (makes useAuth() available to all children) ──────────────
interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function useAppAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// ── SSE real-time hook ────────────────────────────────────────────────────
function useSSEUpdates(isAuthenticated: boolean) {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
    const es = new EventSource(`${base}/api/events`, { withCredentials: true });
    esRef.current = es;

    const invalidate = (keys: string[]) => {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    };

    es.addEventListener('memory.created', () => invalidate(['listMemories', 'getHomeSummary']));
    es.addEventListener('memory.updated', () => invalidate(['listMemories', 'getMemory', 'getHomeSummary']));
    es.addEventListener('memory.deleted', () => invalidate(['listMemories', 'getHomeSummary']));
    es.addEventListener('futureGift.created', () => invalidate(['listFutureGifts']));
    es.addEventListener('futureGift.unlocked', () => invalidate(['listFutureGifts', 'getFutureGift']));
    es.addEventListener('person.updated', () => invalidate(['listPeople', 'getPerson']));

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [isAuthenticated, qc]);
}

// ── App loading / auth gate ───────────────────────────────────────────────
function AppLoadingScreen() {
  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground font-semibold">Opening your Daymark…</p>
    </div>
  );
}

// ── Shell (mobile frame) ──────────────────────────────────────────────────
function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const showBottomNav = BOTTOM_NAV_ROUTES.some(
    (r) => location === r || location.startsWith(r + '?')
  );

  return (
    <div className="min-h-[100dvh] bg-[#EAE3FF]/40 flex justify-center">
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

// ── Route guard for protected paths ──────────────────────────────────────
function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { isAuthenticated, isLoading } = useAppAuth();

  if (isLoading) return <AppLoadingScreen />;
  if (!isAuthenticated) return <Redirect to="/auth" />;
  return <Component />;
}

// ── Main router ───────────────────────────────────────────────────────────
function Router() {
  const { isAuthenticated, isLoading } = useAppAuth();

  // Hook SSE updates — only when authenticated
  useSSEUpdates(isAuthenticated);

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          {/* Public routes */}
          <Route path="/" component={LandingPage} />
          <Route path="/auth" component={AuthPage} />

          {/* Protected routes */}
          <Route path="/onboarding">
            <ProtectedRoute component={OnboardingPage} />
          </Route>
          <Route path="/home">
            <ProtectedRoute component={HomePage} />
          </Route>
          <Route path="/wrap">
            <ProtectedRoute component={WrapMemoryPage} />
          </Route>
          <Route path="/gifts">
            <ProtectedRoute component={GiftsPage} />
          </Route>
          <Route path="/gifts/:id">
            <ProtectedRoute component={GiftDetailPage} />
          </Route>
          <Route path="/calendar">
            <ProtectedRoute component={CalendarPage} />
          </Route>
          <Route path="/people">
            <ProtectedRoute component={PeoplePage} />
          </Route>
          <Route path="/people/:id">
            <ProtectedRoute component={PersonDetailPage} />
          </Route>
          <Route path="/future-gifts">
            <ProtectedRoute component={FutureGiftsPage} />
          </Route>
          <Route path="/future-gifts/new">
            <ProtectedRoute component={CreateFutureGiftPage} />
          </Route>

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
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
