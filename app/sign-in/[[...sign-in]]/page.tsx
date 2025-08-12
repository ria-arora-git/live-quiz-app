import { SignIn } from "@clerk/nextjs";
import NeonBackground from "@/components/NeonBackground";

export default function SignInPage() {
  return (
    <NeonBackground>
      <div className="flex items-center justify-center min-h-screen">
        <div className=" bg-opacity-80 p-8 rounded-lg">
          <SignIn />
        </div>
      </div>
    </NeonBackground>
  );
}
