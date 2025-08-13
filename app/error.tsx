'use client';

import { useEffect } from 'react';
import NeonButton from '@/components/NeonButton';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
      <div className="max-w-md text-center space-y-6">
        <div className="text-8xl mb-6">⚠️</div>
        <h2 className="text-4xl font-bold text-red-400 mb-4">Oops!</h2>
        <p className="text-gray-300 text-lg mb-6">
          Something unexpected happened. Don't worry, our team has been notified.
        </p>
        <div className="space-y-4">
          <NeonButton onClick={reset} className="w-full">
            Try Again
          </NeonButton>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-transparent border border-neonCyan text-neonCyan px-6 py-3 rounded-lg font-semibold hover:bg-neonCyan hover:text-black transition"
          >
            Go Home
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left bg-gray-800 p-4 rounded-lg border border-gray-700">
            <summary className="cursor-pointer text-red-400 font-medium">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 text-xs text-gray-400 overflow-auto">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
