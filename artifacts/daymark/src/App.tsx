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
import { motion, AnimatePresence } from 'framer-motion';

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
import ProfilePage from '@/pages/profile';
import ConnectionsPage from '@/pages/connections';
import MessagesPage from '@/pages/messages';
import GlobePage from '@/pages/globe';
import PrivacySettingsPage from '@/pages/settings-privacy';
import NotificationSettingsPage from '@/pages/settings-notifications';
import SharedMemoryPage from '@/pages/shared-memory';
import CapsulePage from '@/pages/capsule';
import InvitePage from '@/pages/invite';
import PrivacyPage from '@/pages/privacy';
import TermsPage from '@/pages/terms';
import AuthPage from '@/pages/auth';
import SignInPage from '@/pages/sign-in';
import SignUpPage from '@/pages/sign-up';
import ForgotPasswordPage from '@/pages/forgot-password';
import AuthCallbackPage from '@/pages/auth-callback';
import ResetPasswordPage from '@/pages/reset-password';

import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, syncAuthCookie } from '@/lib/supabase';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import type { Session } from '@supabase/supabase-js';

const queryClient = new QueryClient();

// Wire api-client-react hooks to use the Supabase Bearer token
setAuthTokenGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
});

// Routes where BottomNav is visible
const BOTTOM_NAV_ROUTES = ['/home', '/calendar', '/gifts', '/people'];

interface AppUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  onboardingCompleted: boolean;
}

interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
});

export function useAppAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    // Initialise from whatever is already stored
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      syncAuthCookie(s?.access_token ?? null, s?.expires_in);
      setSessionLoading(false);
    });

    // Keep session + cookie in sync on every auth event (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      syncAuthCookie(s?.access_token ?? null, s?.expires_in);
      if (!s) {
        // Clear all cached queries on sign-out
        qc.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [qc]);

  // Fetch DB user row (onboardingCompleted, firstName, lastName, profileImageUrl, etc.)
  const { data: serverUser, isLoading: serverLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/auth/user`, { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json() as { user: Record<string, unknown> | null };
      return data.user;
    },
    enabled: !!session,
    staleTime: 30_000,
  });

  const user: AppUser | null = session
    ? {
        id: session.user.id,
        email: session.user.email ?? null,
        firstName: (serverUser?.firstName as string | null) ?? null,
        lastName: (serverUser?.lastName as string | null) ?? null,
        profileImageUrl: (serverUser?.profileImageUrl as string | null) ?? null,
        onboardingCompleted: (serverUser?.onboardingCompleted as boolean) ?? false,
      }
    : null;

  const isLoading = sessionLoading || (!!session && serverLoading && !serverUser);
  const isAuthenticated = !!session;

  const signOut = async () => {
    await supabase.auth.signOut();
    syncAuthCookie(null);
    qc.clear();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAuthenticated, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── SSE reconnection states ───────────────────────────────────────────────
type SSEStatus = 'connected' | 'reconnecting' | 'restored';

function useSSEUpdates(isAuthenticated: boolean) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<SSEStatus>('connected');
  // Only show "Reconnecting…" if SSE had a successful open before —
  // avoids the banner firing on first-ever 401 (e.g. during onboarding).
  const hasEverConnected = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (es) { es.close(); es = null; }

      es = new EventSource(`${base}/api/events`, { withCredentials: true });

      const invalidate = (keys: string[]) => {
        keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      };

      es.addEventListener('memory.created', () => invalidate(['listMemories', 'getHomeSummary']));
      es.addEventListener('memory.updated', () => invalidate(['listMemories', 'getMemory', 'getHomeSummary']));
      es.addEventListener('memory.deleted', () => invalidate(['listMemories', 'getHomeSummary']));
      es.addEventListener('futureGift.created', () => invalidate(['listFutureGifts']));
      es.addEventListener('futureGift.unlocked', () => invalidate(['listFutureGifts', 'getFutureGift', 'getHomeSummary']));
      es.addEventListener('person.updated', () => invalidate(['listPeople', 'getPerson']));
      es.addEventListener('notification.created', () => invalidate(['listNotifications']));
      es.addEventListener('connection.requested', () => invalidate(['/api/connections/pending', 'listNotifications']));
      es.addEventListener('connection.accepted', () => invalidate(['/api/connections', 'listPeople', '/api/daylinks']));
      es.addEventListener('memoryDrop.created', () => invalidate(['/api/drops', 'listNotifications']));
      es.addEventListener('memoryDrop.reacted', () => invalidate(['/api/drops']));
      es.addEventListener('daylink.updated', () => invalidate(['/api/daylinks', 'getHomeSummary']));
      es.addEventListener('scheduledMessage.received', () => invalidate(['/api/messages', 'listNotifications']));
      es.addEventListener('sharedMemory.updated', () => invalidate(['listMemories', 'getMemory']));
      es.addEventListener('globe.reaction', () => invalidate(['/api/globe/memories']));

      es.addEventListener('open', () => {
        hasEverConnected.current = true;
        if (reconnectTimer) {
          setStatus('restored');
          setTimeout(() => setStatus('connected'), 2500);
          qc.invalidateQueries();
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      });

      es.addEventListener('error', () => {
        // Only surface the banner if we had a real connection before.
        // A first-ever error (e.g. 401 on onboarding) should be silent.
        if (!reconnectTimer && hasEverConnected.current) {
          reconnectTimer = setTimeout(() => setStatus('reconnecting'), 5000);
        }
      });
    }

    connect();

    return () => {
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
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
          className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none"
        >
          <div className="max-w-[430px] w-full">
            <div
              className={`mx-4 mt-3 px-4 py-2 rounded-full text-xs font-bold text-center shadow-md ${
                status === 'reconnecting'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {status === 'reconnecting' ? 'Reconnecting…' : 'Back in sync'}
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
function ProtectedRoute({
  component: Component,
  requireOnboarding = true,
}: {
  component: React.ComponentType;
  requireOnboarding?: boolean;
}) {
  const { isAuthenticated, isLoading, user } = useAppAuth();

  if (isLoading) return <AppLoadingScreen />;
  if (!isAuthenticated) return <Redirect to="/auth" />;

  // Authenticated user who hasn't completed onboarding → send to /onboarding
  if (requireOnboarding && user?.onboardingCompleted === false) {
    return <Redirect to="/onboarding" />;
  }

  return <Component />;
}

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
          {/* Public — redirect signed-in users away from landing/auth */}
          <Route path="/">
            {isAuthenticated ? <Redirect to="/home" /> : <LandingPage />}
          </Route>
          <Route path="/auth">
            {isAuthenticated ? <Redirect to="/home" /> : <AuthPage />}
          </Route>
          <Route path="/sign-in">
            {isAuthenticated ? <Redirect to="/home" /> : <SignInPage />}
          </Route>
          <Route path="/sign-up">
            {isAuthenticated ? <Redirect to="/home" /> : <SignUpPage />}
          </Route>
          <Route path="/forgot-password">
            {isAuthenticated ? <Redirect to="/home" /> : <ForgotPasswordPage />}
          </Route>

          {/* Auth callbacks — always accessible */}
          <Route path="/auth/callback" component={AuthCallbackPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />

          {/* Protected */}
          <Route path="/onboarding">
            <ProtectedRoute component={OnboardingPage} requireOnboarding={false} />
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
          <Route path="/connections">
            <ProtectedRoute component={ConnectionsPage} />
          </Route>
          <Route path="/messages">
            <ProtectedRoute component={MessagesPage} />
          </Route>
          <Route path="/globe">
            <ProtectedRoute component={GlobePage} />
          </Route>
          <Route path="/settings/privacy">
            <ProtectedRoute component={PrivacySettingsPage} />
          </Route>
          <Route path="/settings/notifications">
            <ProtectedRoute component={NotificationSettingsPage} />
          </Route>
          <Route path="/capsule">
            <ProtectedRoute component={CapsulePage} />
          </Route>
          <Route path="/capsule/:year/:month">
            <ProtectedRoute component={CapsulePage} />
          </Route>
          <Route path="/invite">
            <ProtectedRoute component={InvitePage} />
          </Route>
          <Route path="/join/:slug" component={InvitePage} />

          {/* Public — no auth required */}
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/m/:token" component={SharedMemoryPage} />

          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  // Use React's built-in key prop to reset error boundary on navigation
  return <ErrorBoundary key={location}>{children}</ErrorBoundary>;
}

function AppWithProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <AppWithProviders />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
