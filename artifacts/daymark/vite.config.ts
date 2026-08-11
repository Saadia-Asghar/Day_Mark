import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// PORT is only required when running the dev/preview server.
// Production builds (`vite build`) do not need a port — they produce static files.
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : undefined;

if (rawPort !== undefined && (Number.isNaN(port) || (port !== undefined && port <= 0))) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH is required at build time because it determines the `base` URL
// prefix embedded into the compiled JS/CSS asset paths.
const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig({
  base: basePath,
  // Prefer the Replit Supabase integration's authoritative keys (SUPABASE_*) over
  // any manually-set VITE_ duplicates, which can drift out of sync.
  // Both vars are injected at build/dev time — they never reach the server bundle.
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
    ),
  },
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
