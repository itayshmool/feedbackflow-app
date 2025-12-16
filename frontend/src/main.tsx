// frontend/src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster, toast, ToastBar } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'

// ============================================================================
// Chunk Load Error Handler
// ============================================================================
// After deployment, browsers may have cached old JS chunks that no longer exist.
// This causes "Failed to fetch dynamically imported module" errors.
// The handler automatically refreshes once to load the new chunks.

const RELOAD_KEY = 'chunk_reload_attempted';

const handleChunkError = () => {
  const lastReload = sessionStorage.getItem(RELOAD_KEY);
  const now = Date.now();

  // Only reload if we haven't tried in the last 10 seconds (prevents infinite loop)
  if (!lastReload || now - parseInt(lastReload) > 10000) {
    console.warn('[ChunkLoadError] Detected stale chunks after deployment, reloading...');
    sessionStorage.setItem(RELOAD_KEY, now.toString());
    window.location.reload();
  } else {
    console.error('[ChunkLoadError] Reload already attempted recently, not reloading again.');
  }
};

// Listen for chunk load errors from script tags
window.addEventListener('error', (event) => {
  const message = event.message || '';
  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError') ||
    (event.target && (event.target as HTMLElement).tagName === 'SCRIPT')
  ) {
    handleChunkError();
  }
}, true);

// Listen for unhandled promise rejections (dynamic imports return promises)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (
    reason?.message?.includes('Failed to fetch dynamically imported module') ||
    reason?.message?.includes('Loading chunk') ||
    reason?.name === 'ChunkLoadError'
  ) {
    handleChunkError();
  }
});

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) {
          return false // Don't retry on auth errors
        }
        return failureCount < 3
      },
    },
  },
})

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const isGoogleOAuthEnabled = Boolean(googleClientId && googleClientId.trim() !== '')

// Wrap app with GoogleOAuthProvider only if client ID is configured
const AppWithProviders = () => {
  const appContent = (
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => t.type !== 'loading' && toast.dismiss(t.id)}
                title="Click to dismiss"
              >
                {icon}
                {message}
                {t.type !== 'loading' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.dismiss(t.id);
                    }}
                    className="ml-2 text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>
    </QueryClientProvider>
  )

  if (isGoogleOAuthEnabled) {
    return <GoogleOAuthProvider clientId={googleClientId}>{appContent}</GoogleOAuthProvider>
  }

  return appContent
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>,
)
