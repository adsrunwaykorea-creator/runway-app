"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("세션 에러:", error);
          router.replace("/login");
          return;
        }

        if (data.session) {
          router.replace("/payment");
        } else {
          router.replace("/login");
        }
      } catch (err) {
        console.error("OAuth 처리 실패:", err);
        router.replace("/login");
      }
    };

    handleAuth();
  }, []);

  return <div>로그인 처리 중입니다...</div>;
}
