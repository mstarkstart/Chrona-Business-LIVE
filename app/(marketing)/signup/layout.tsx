import { InteractiveBackground } from "@/components/ui/InteractiveBackground";

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-mesh relative flex flex-col justify-center overflow-hidden py-10">
      <InteractiveBackground />
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-grid mask-fade opacity-35 z-0" />
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
