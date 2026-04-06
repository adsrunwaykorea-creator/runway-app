import {
  buildOAuthRedirectUrl,
  getUserRole,
  handleOAuthCallback,
  mapPathForStaticSite,
  resolveRedirectPathByRole,
  signInWithEmail,
} from "./auth-service.js";
import { getSupabaseClient } from "./supabase-client.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const submitButton = document.getElementById("submitButton");
const kakaoLoginButton = document.getElementById("kakaoLoginButton");
const googleLoginButton = document.getElementById("googleLoginButton");
const naverLoginButton = document.getElementById("naverLoginButton");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const queryParams = new URLSearchParams(window.location.search);
const leadIdFromQuery = queryParams.get("leadId")?.trim();
const DEFAULT_NEXT_PATH = "/payment";
const nextPathFromQuery = queryParams.get("next")?.trim() || DEFAULT_NEXT_PATH;
const loginContext = {
  // 소셜 로그인 진입 시 전달된 리드 식별자를 내부 상태로 보관
  leadId: leadIdFromQuery || "",
};

function getSafeNextPath(path) {
  if (!path) return "";
  if (!path.startsWith("/")) return "";
  if (path.startsWith("//")) return "";
  return path;
}

function getNextDestination(fallbackPath) {
  const safeNext = getSafeNextPath(nextPathFromQuery) || DEFAULT_NEXT_PATH;
  return safeNext || fallbackPath;
}

function setMessage(type, message) {
  errorMessage.className = "auth-feedback";
  successMessage.className = "auth-feedback";
  errorMessage.textContent = "";
  successMessage.textContent = "";

  if (!message) return;

  if (type === "error") {
    errorMessage.className = "auth-feedback error";
    errorMessage.textContent = message;
  } else {
    successMessage.className = "auth-feedback success";
    successMessage.textContent = message;
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  if (kakaoLoginButton) kakaoLoginButton.disabled = isLoading;
  if (googleLoginButton) googleLoginButton.disabled = isLoading;
  if (naverLoginButton) naverLoginButton.disabled = isLoading;
  emailInput.disabled = isLoading;
  passwordInput.disabled = isLoading;
  passwordToggle.disabled = isLoading;
  submitButton.textContent = isLoading ? "로그인 중..." : "로그인";
}

function handleKakaoLogin() {
  handleKakaoOAuth();
}

function handleGoogleLogin() {
  handleSocialLogin("google", "구글");
}

function handleNaverLogin() {
  // TODO: 추후 Supabase Custom OAuth/OIDC provider로 교체
  // signup 페이지와 동일하게 네이버는 확장 지점으로 유지합니다.
  console.log("[NAVER_OIDC_PLACEHOLDER] login custom provider 연결 예정");
  setMessage(
    "success",
    "네이버 간편로그인은 현재 준비 중입니다. 추후 Custom OAuth/OIDC provider로 연결됩니다."
  );
}

if (kakaoLoginButton) {
  kakaoLoginButton.addEventListener("click", handleKakaoLogin);
}

if (googleLoginButton) {
  googleLoginButton.addEventListener("click", handleGoogleLogin);
}

if (naverLoginButton) {
  naverLoginButton.addEventListener("click", handleNaverLogin);
}

async function handleKakaoOAuth() {
  setMessage("", "");
  setLoading(true);

  try {
    const safeNext = getSafeNextPath(nextPathFromQuery) || DEFAULT_NEXT_PATH;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      setMessage(
        "error",
        error?.message || "카카오 로그인 연결에 실패했습니다."
      );
      return;
    }

    const topWindow = window.top && window.top !== window ? window.top : window;
    topWindow.location.href = data.url;
  } catch (error) {
    console.error("[KAKAO_LOGIN_ERROR]", error);
    setMessage("error", "카카오 로그인 연결 중 오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
}

async function handleSocialLogin(provider, label) {
  setMessage("", "");
  setLoading(true);
  const safeNext = getSafeNextPath(nextPathFromQuery) || DEFAULT_NEXT_PATH;
  const redirectTo = buildOAuthRedirectUrl({
    callbackPage: `/auth/callback?next=${encodeURIComponent(safeNext)}`,
    provider,
    leadId: loginContext.leadId,
  });

  try {
    const result = await signInWithOAuth(provider, redirectTo);
    if (!result.success) {
      setMessage("error", result.message || `${label} 로그인 연결에 실패했습니다.`);
      return;
    }
    setMessage("success", `${label} 인증 페이지로 이동합니다.`);
  } catch (error) {
    console.error("[SOCIAL_LOGIN_ERROR]", { provider, error });
    setMessage("error", `${label} 로그인 연결 중 오류가 발생했습니다.`);
  } finally {
    setLoading(false);
  }
}

async function processOAuthCallbackIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("auth_callback") !== "1") return;

  setMessage("", "");
  setLoading(true);

  try {
    const callbackResult = await handleOAuthCallback({
      // leadId가 있으면 profiles.lead_id 연결(없을 때만 업데이트) 구조를 사용
      leadId: loginContext.leadId,
    });
    if (!callbackResult.success) {
      setMessage("error", callbackResult.message);
      return;
    }

    const roleResult = await getUserRole(callbackResult.userId);
    const routePath = resolveRedirectPathByRole(roleResult.role);
    const destination = getNextDestination(mapPathForStaticSite(routePath));

    setMessage("success", "소셜 로그인에 성공했습니다. 이동합니다.");
    setTimeout(() => {
      window.location.href = destination;
    }, 500);
  } catch (error) {
    console.error("[LOGIN_OAUTH_CALLBACK_ERROR]", error);
    setMessage("error", "OAuth 콜백 처리 중 예기치 못한 오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
}

processOAuthCallbackIfNeeded();

passwordToggle.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  passwordToggle.textContent = isPassword ? "숨기기" : "보기";
  passwordToggle.setAttribute(
    "aria-label",
    isPassword ? "비밀번호 숨기기" : "비밀번호 보기"
  );
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("", "");
  setLoading(true);

  try {
    const loginResult = await signInWithEmail(
      emailInput.value,
      passwordInput.value
    );

    if (!loginResult.success) {
      setMessage("error", loginResult.message);
      return;
    }

    setMessage("success", loginResult.message);

    const roleResult = await getUserRole(loginResult.userId);
    const routePath = resolveRedirectPathByRole(roleResult.role);
    const destination = getNextDestination(mapPathForStaticSite(routePath));

    // role 조회 실패 시에도 고객 경로로 이동하도록 구조 유지
    if (roleResult.error) {
      console.error("[ROLE_LOOKUP_FAILED]", {
        userId: loginResult.userId,
        detail: roleResult.error,
      });
    }

    setTimeout(() => {
      window.location.href = destination;
    }, 500);
  } catch (error) {
    console.error("[LOGIN_PAGE_ERROR]", error);
    setMessage("error", "로그인 처리 중 예기치 못한 오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
});
