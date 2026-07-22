"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        router.replace("/sign-in");
        return;
      }

      if (!data.session.user.user_metadata?.onboarded && pathname !== "/onboarding") {
        router.replace("/onboarding");
        return;
      }

      setSession(data.session);
    };

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (!mounted) return;

      if (!newSession) {
        router.replace("/sign-in");
        return;
      }

      const onboarded = Boolean(newSession.user.user_metadata?.onboarded);
      const isOnboardingPage = pathname === "/onboarding";

      if (!onboarded && !isOnboardingPage) {
        router.replace("/onboarding");
        return;
      }

      if (onboarded && isOnboardingPage) {
        router.replace("/dashboard");
        return;
      }

      setSession(newSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 px-8 py-6 text-center shadow-xl shadow-slate-950/20">
          <p className="text-lg font-semibold">Checking your session...</p>
          <p className="mt-2 text-sm text-slate-400">Please wait while we verify your account.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
