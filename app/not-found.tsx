import Link from 'next/link';
import NeonButton from '@/components/NeonButton';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="text-9xl font-bold text-neonPink mb-6">404</div>
        <h2 className="text-4xl font-bold neon-text mb-4">Page Not Found</h2>
        <p className="text-gray-400 text-lg mb-8 max-w-md">
          The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
        </p>
        <div className="space-y-4">
          <Link href="/">
            <NeonButton className="inline-block">
              Go Home
            </NeonButton>
          </Link>
          <div>
            <Link href="/dashboard" className="text-neonCyan hover:underline">
              Or go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
