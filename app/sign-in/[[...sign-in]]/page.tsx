import { SignIn } from "@clerk/nextjs";
import NeonBackground from "@/components/NeonBackground";

export default function SignInPage() {
  return (
    <NeonBackground>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold neon-text mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to continue your quiz journey</p>
          </div>
          <div className="bg-black bg-opacity-50 backdrop-blur-lg p-8 rounded-lg border border-white border-opacity-10">
            <SignIn />
          </div>
        </div>
      </div>
    </NeonBackground>
  );
}
