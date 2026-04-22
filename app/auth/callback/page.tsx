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

        if (!data.session) {
          router.replace("/login");
          return;
        }

        const userId = data.session.user.id;
        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("프로필 role 조회 실패:", profileError);
          router.replace("/");
          return;
        }

        const role = (profileRow?.role ?? "").toString().toLowerCase();
        if (role === "admin" || role === "manager") {
          router.replace("/admin");
          return;
        }

        // 관리자 권한이 없는 계정은 관리자 페이지 대신 홈으로 이동
        router.replace("/");
      } catch (err) {
        console.error("OAuth 처리 실패:", err);
        router.replace("/login");
      }
    };

    handleAuth();
  }, []);

  return <div>로그인 처리 중입니다...</div>;
}
