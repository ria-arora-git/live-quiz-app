import { SignUp } from "@clerk/nextjs";
import NeonBackground from "@/components/NeonBackground";

export default function SignUpPage() {
  return (
    <NeonBackground>
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-black bg-opacity-80 p-8 rounded-lg">
          <SignUp />
        </div>
      </div>
    </NeonBackground>
  );
}
