import "../styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "Neon Quiz Arena",
  description: "Real-time multiplayer quiz game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <html lang="en">
        <body className="min-h-screen bg-black text-white">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
