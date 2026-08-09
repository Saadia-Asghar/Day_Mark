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
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
import ProfilePage from '@/pages/profile';

const queryClient = new QueryClient();

// Routes where BottomNav is visible
const BOTTOM_NAV_ROUTES = ['/home', '/calendar', '/gifts', '/people'];

// ── Auth context ──────────────────────────────────────────────────────────
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

// ── SSE reconnection states ───────────────────────────────────────────────
type SSEStatus = 'connected' | 'reconnecting' | 'restored';

function useSSEUpdates(isAuthenticated: boolean) {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<SSEStatus>('connected');

  useEffect(() => {
    if (!isAuthenticated) return;

    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

    function connect() {
      // Prevent duplicate connections
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

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
      es.addEventListener('notification.created', () => invalidate(['listNotifications']));

      es.addEventListener('open', () => {
        if (reconnectTimerRef.current) {
          // We were reconnecting — show "restored" briefly
          setStatus('restored');
          setTimeout(() => setStatus('connected'), 2500);
          // Invalidate all caches on reconnect
          qc.invalidateQueries();
        }
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      });

      es.addEventListener('error', () => {
        // Set a timer — only show banner after 3 seconds of being offline
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            setStatus('reconnecting');
          }, 3000);
        }
        // Browser auto-retries SSE; we just track the state
      });
    }

    connect();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isAuthenticated, qc]);

  return status;
}

// ── SSE status banner ─────────────────────────────────────────────────────
function SSEBanner({ status }: { status: SSEStatus }) {
  const show = status === 'reconnecting' || status === 'restored';
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.3 }}
          className={`fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none`}
        >
          <div className="max-w-[430px] w-full">
            <div
              className={`mx-4 mt-3 px-4 py-2 rounded-full text-xs font-bold text-center shadow-md ${
                status === 'reconnecting'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {status === 'reconnecting' ? '⏳ Reconnecting…' : '✅ Back in sync ✨'}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── App loading ───────────────────────────────────────────────────────────
function AppLoadingScreen() {
  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground font-semibold">Opening your Daymark…</p>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────
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

// ── Route guard ───────────────────────────────────────────────────────────
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAppAuth();

  if (isLoading) return <AppLoadingScreen />;
  if (!isAuthenticated) return <Redirect to="/auth" />;
  return <Component />;
}

// ── Router ────────────────────────────────────────────────────────────────
function Router() {
  const { isAuthenticated, isLoading } = useAppAuth();
  const sseStatus = useSSEUpdates(isAuthenticated);

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <RoutedErrorBoundary>
      <SSEBanner status={sseStatus} />
      <Shell>
        <Switch>
          {/* Public */}
          <Route path="/" component={LandingPage} />
          <Route path="/auth" component={AuthPage} />

          {/* Protected */}
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
          <Route path="/profile">
            <ProtectedRoute component={ProfilePage} />
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
