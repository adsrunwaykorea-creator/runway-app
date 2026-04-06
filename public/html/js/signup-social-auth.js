import { buildOAuthRedirectUrl, signInWithOAuth } from "./auth-service.js";

/**
 * signup 소셜 인증 시작 모듈
 * - 정적 HTML에서는 이 파일을 signup-page.js에서 호출
 * - 추후 Next.js로 이전 시 동일한 함수 시그니처를 유지하고
 *   내부 구현만 `@supabase/supabase-js` signInWithOAuth로 교체하면 됩니다.
 */

export async function startKakaoSignupOAuth(context = {}) {
  const redirectTo = buildOAuthRedirectUrl({
    callbackPage: "/auth/callback",
    provider: "kakao",
    leadId: context.leadId,
  });
  return signInWithOAuth("kakao", redirectTo);
}

export async function startGoogleSignupOAuth(context = {}) {
  const redirectTo = buildOAuthRedirectUrl({
    callbackPage: "/auth/callback",
    provider: "google",
    leadId: context.leadId,
  });
  return signInWithOAuth("google", redirectTo);
}

/**
 * 네이버는 추후 Supabase Custom OAuth/OIDC provider로 교체 예정
 */
export async function startNaverSignupOAuth(context = {}) {
  return {
    success: false,
    code: "OAUTH_NOT_READY",
    message:
      "네이버 간편가입은 현재 준비 중입니다. 추후 Custom OAuth/OIDC provider로 연결됩니다.",
    context,
  };
}
