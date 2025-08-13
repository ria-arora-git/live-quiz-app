'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="text-center space-y-6">
            <div className="text-8xl mb-6">💥</div>
            <h2 className="text-3xl font-bold text-red-400">System Error</h2>
            <p className="text-gray-400 max-w-md">
              A critical error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            <button
              onClick={reset}
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-semibold transition"
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
