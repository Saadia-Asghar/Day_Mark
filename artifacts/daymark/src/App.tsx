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
import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, AuthenticateWithRedirectCallback, useAuth, useClerk, useUser } from '@clerk/react';
import AuthPage from '@/pages/auth';
import SignInPage from '@/pages/sign-in';
import SignUpPage from '@/pages/sign-up';
import ForgotPasswordPage from '@/pages/forgot-password';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';

const queryClient = new QueryClient();

// Routes where BottomNav is visible
const BOTTOM_NAV_ROUTES = ['/home', '/calendar', '/gifts', '/people'];

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export function useAppAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();

  // Fetch app-specific data (onboardingCompleted) from server, gated on Clerk being loaded
  const { data: serverUser, isLoading: serverLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/auth/user`, { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json() as { user: { onboardingCompleted: boolean } | null };
      return data.user;
    },
    enabled: isLoaded && !!isSignedIn,
    staleTime: 30_000,
  });

  const user: AppUser | null =
    isLoaded && isSignedIn && clerkUser
      ? {
          id: clerkUser.externalId ?? clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          firstName: clerkUser.firstName ?? null,
          lastName: clerkUser.lastName ?? null,
          profileImageUrl: clerkUser.imageUrl ?? null,
          onboardingCompleted: serverUser?.onboardingCompleted ?? false,
        }
      : null;

  const isLoading = !isLoaded || (!!isSignedIn && serverLoading && !serverUser);
  const isAuthenticated = isLoaded && !!isSignedIn && !!user;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
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
      es.addEventListener('futureGift.unlocked', () => invalidate(['listFutureGifts', 'getFutureGift', 'getHomeSummary']));
      es.addEventListener('person.updated', () => invalidate(['listPeople', 'getPerson']));
      es.addEventListener('notification.created', () => invalidate(['listNotifications']));
      // Social events
      es.addEventListener('connection.requested', () => invalidate(['/api/connections/pending', 'listNotifications']));
      es.addEventListener('connection.accepted', () => invalidate(['/api/connections', 'listPeople', '/api/daylinks']));
      es.addEventListener('memoryDrop.created', () => invalidate(['/api/drops', 'listNotifications']));
      es.addEventListener('memoryDrop.reacted', () => invalidate(['/api/drops']));
      es.addEventListener('daylink.updated', () => invalidate(['/api/daylinks', 'getHomeSummary']));
      es.addEventListener('scheduledMessage.received', () => invalidate(['/api/messages', 'listNotifications']));
      es.addEventListener('sharedMemory.updated', () => invalidate(['listMemories', 'getMemory']));
      es.addEventListener('globe.reaction', () => invalidate(['/api/globe/memories']));

      es.addEventListener('open', () => {
        if (reconnectTimerRef.current) {
          setStatus('restored');
          setTimeout(() => setStatus('connected'), 2500);
          qc.invalidateQueries();
        }
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      });

      es.addEventListener('error', () => {
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            setStatus('reconnecting');
          }, 3000);
        }
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
          <Route path="/sign-in/*?">
            {isAuthenticated ? <Redirect to="/home" /> : <SignInPage />}
          </Route>
          <Route path="/sign-up/*?">
            {isAuthenticated ? <Redirect to="/home" /> : <SignUpPage />}
          </Route>
          <Route path="/forgot-password">
            {isAuthenticated ? <Redirect to="/home" /> : <ForgotPasswordPage />}
          </Route>
          {/* OAuth SSO callback */}
          <Route path="/sso-callback/*?">
            <AuthenticateWithRedirectCallback
              signUpUrl={`${basePath}/sign-up`}
              signInUrl={`${basePath}/sign-in`}
              signUpForceRedirectUrl={`${basePath}/onboarding`}
              signInForceRedirectUrl={`${basePath}/home`}
            />
          </Route>

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

          {/* Capsule */}
          <Route path="/capsule">
            <ProtectedRoute component={CapsulePage} />
          </Route>
          <Route path="/capsule/:year/:month">
            <ProtectedRoute component={CapsulePage} />
          </Route>

          {/* Invite / Join */}
          <Route path="/invite">
            <ProtectedRoute component={InvitePage} />
          </Route>
          <Route path="/join/:slug" component={InvitePage} />

          {/* Public — no auth required */}
          <Route path="/m/:token" component={SharedMemoryPage} />

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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome back to Daymark',
            subtitle: 'Sign in to your memory space',
          },
        },
        signUp: {
          start: {
            title: 'Start your Daymark',
            subtitle: 'Keep the little gifts life gives you',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

interface AppUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  onboardingCompleted: boolean;
}

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#6847F5',
    colorForeground: '#1a1523',
    colorMutedForeground: '#7c6d8a',
    colorDanger: '#e53e3e',
    colorBackground: '#FFF9F5',
    colorInput: '#ffffff',
    colorInputForeground: '#1a1523',
    colorNeutral: '#e5e0f0',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#FFF9F5] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_0_40px_rgba(104,71,245,0.12)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#1a1523] font-extrabold',
    headerSubtitle: 'text-[#7c6d8a]',
    socialButtonsBlockButtonText: 'text-[#1a1523] font-semibold',
    formFieldLabel: 'text-[#1a1523] font-semibold',
    footerActionLink: 'text-[#6847F5] font-bold hover:text-[#5a38e8]',
    footerActionText: 'text-[#7c6d8a]',
    dividerText: 'text-[#7c6d8a]',
    identityPreviewEditButton: 'text-[#6847F5]',
    formFieldSuccessText: 'text-emerald-600',
    alertText: 'text-[#1a1523]',
    logoBox: 'flex justify-center',
    logoImage: 'w-10 h-10',
    socialButtonsBlockButton: 'border border-[#e5e0f0] bg-white hover:bg-[#EAE3FF]/30 transition-colors',
    formButtonPrimary: 'bg-[#6847F5] hover:bg-[#5a38e8] text-white font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)]',
    formFieldInput: 'border-[#e5e0f0] bg-white text-[#1a1523] focus:ring-2 focus:ring-[#6847F5]/30 focus:border-[#6847F5]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#e5e0f0]',
    alert: 'border border-red-200 bg-red-50',
    otpCodeFieldInput: 'border-[#e5e0f0] bg-white',
    formFieldRow: '',
    main: '',
  },
};

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

