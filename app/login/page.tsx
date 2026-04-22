"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const POST_LOGIN_NEXT_KEY = "post_login_next";

function getSafeNextFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  const next = params.get("next");
  if (!next) return "/admin";
  if (!next.startsWith("/")) return "/admin";
  if (next.startsWith("//")) return "/admin";
  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const recoverSessionFromHashOrExisting = async () => {
      const supabase = getSupabaseBrowserClient();

      // Fallback for implicit/hash callback:
      // /login#access_token=...&refresh_token=...
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      // Normal /login visit should stay on login screen.
      // Only recover-and-redirect when OAuth tokens are returned in hash.
      if (!accessToken || !refreshToken) {
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error && !cancelled) {
          // Remove token fragment from URL after restoring session.
          window.history.replaceState({}, "", "/auth/callback");
          router.replace("/auth/callback");
          return;
        }
      }
    };

    void recoverSessionFromHashOrExisting();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    if (!authError) return;
    const cleanError = authError.replace(/\s+/g, " ").trim();
    console.warn("[LOGIN_AUTH_ERROR]", cleanError);
    setMessage("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }, []);

  const handleKakaoLogin = async () => {
    setMessage("");
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const safeNext = getSafeNextFromSearch(window.location.search);
      // Keep redirect URI fixed for provider validation and carry `next`
      // through browser storage to avoid provider-side redirect URI errors.
      window.sessionStorage.setItem(POST_LOGIN_NEXT_KEY, safeNext);
      const redirectTo = `${window.location.origin}/auth/callback`;
      console.log("[LOGIN_REDIRECT_TO]", redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      console.log("[LOGIN_OAUTH_RESULT]", { data, error });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data?.url) {
        setMessage("카카오 로그인 URL을 받지 못했습니다.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("[LOGIN_KAKAO_ERROR]", error);
      setMessage("카카오 로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
          <h1 className="mb-2 text-[1.8rem] font-extrabold text-slate-900">관리자 로그인</h1>
          <p className="mb-6 text-sm text-zinc-600">
            관리자 전용 페이지 접근을 위해 카카오 계정으로 로그인하세요.
          </p>

          <button
            type="button"
            onClick={() => void handleKakaoLogin()}
            disabled={loading}
            className="h-11 w-full rounded-[10px] border border-[#f1d900] bg-[#fee500] text-[0.92rem] font-bold text-[#181600] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "카카오 로그인 중..." : "카카오로 관리자 로그인"}
          </button>

          {message ? <p className="mt-3 text-sm font-semibold text-red-600">{message}</p> : null}

          <div className="mt-4 text-center text-sm text-zinc-600">
            <p>
              고객 신청/결제는 로그인 없이{" "}
              <Link href="/payment" className="font-semibold text-zinc-900 hover:underline">
                결제 안내
              </Link>
              에서 진행할 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
