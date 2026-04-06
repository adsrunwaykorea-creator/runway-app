import {
  signUpWithEmail,
} from "./auth-service.js";
import {
  startGoogleSignupOAuth,
  startKakaoSignupOAuth,
  startNaverSignupOAuth,
} from "./signup-social-auth.js";

const form = document.getElementById("signupForm");
const nameInput = document.getElementById("name");
const companyNameInput = document.getElementById("companyName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const submitButton = document.getElementById("submitButton");
const kakaoSignupButton = document.getElementById("kakaoSignupButton");
const googleSignupButton = document.getElementById("googleSignupButton");
const naverSignupButton = document.getElementById("naverSignupButton");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const leadIdFromQuery = new URLSearchParams(window.location.search)
  .get("leadId")
  ?.trim();
const signupContext = {
  // 사용자가 직접 입력하지 않고 URL 쿼리에서만 주입되는 내부 상태
  leadId: leadIdFromQuery || "",
};

function handleKakaoSignup() {
  handleSocialSignup("kakao", "카카오");
}

function handleGoogleSignup() {
  handleSocialSignup("google", "구글");
}

function handleNaverSignup() {
  // TODO: 추후 Supabase Custom OAuth/OIDC provider로 교체
  // 예시:
  // 1) Supabase 대시보드에 naver OIDC provider 등록
  // 2) 여기서 signInWithOAuth("naver_custom_provider") 또는 전용 시작 함수 호출
  // 3) redirectTo는 buildOAuthRedirectUrl(...) 규칙 재사용
  startNaverCustomOAuthPlaceholder();
}

if (kakaoSignupButton) {
  kakaoSignupButton.addEventListener("click", handleKakaoSignup);
}

if (googleSignupButton) {
  googleSignupButton.addEventListener("click", handleGoogleSignup);
}

if (naverSignupButton) {
  naverSignupButton.addEventListener("click", handleNaverSignup);
}

function startNaverCustomOAuthPlaceholder() {
  console.log("[NAVER_OIDC_PLACEHOLDER] Custom OAuth/OIDC provider 연결 예정");
  setMessage(
    "success",
    "네이버 간편가입은 현재 준비 중입니다. 추후 Custom OAuth/OIDC provider로 연결됩니다."
  );
}

async function handleSocialSignup(provider, label) {
  setMessage("", "");
  setLoading(true);

  try {
    let result;
    if (provider === "kakao") {
      result = await startKakaoSignupOAuth(signupContext);
    } else if (provider === "google") {
      result = await startGoogleSignupOAuth(signupContext);
    } else {
      result = await startNaverSignupOAuth(signupContext);
    }

    if (!result.success) {
      setMessage("error", result.message || `${label} 로그인 연결에 실패했습니다.`);
      return;
    }
    setMessage("success", `${label} 인증 페이지로 이동합니다.`);
  } catch (error) {
    console.error("[SOCIAL_SIGNUP_ERROR]", { provider, error });
    setMessage("error", `${label} 로그인 연결 중 오류가 발생했습니다.`);
  } finally {
    setLoading(false);
  }
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
  if (kakaoSignupButton) kakaoSignupButton.disabled = isLoading;
  if (googleSignupButton) googleSignupButton.disabled = isLoading;
  if (naverSignupButton) naverSignupButton.disabled = isLoading;
  nameInput.disabled = isLoading;
  companyNameInput.disabled = isLoading;
  emailInput.disabled = isLoading;
  phoneInput.disabled = isLoading;
  passwordInput.disabled = isLoading;
  confirmPasswordInput.disabled = isLoading;
  submitButton.textContent = isLoading ? "가입 처리 중..." : "회원가입";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("", "");

  if (passwordInput.value !== confirmPasswordInput.value) {
    setMessage("error", "비밀번호와 비밀번호 확인이 일치하지 않습니다.");
    return;
  }

  setLoading(true);

  try {
    const signUpResult = await signUpWithEmail({
      name: nameInput.value,
      companyName: companyNameInput.value,
      email: emailInput.value,
      phone: phoneInput.value,
      leadId: signupContext.leadId,
      // leadId가 있으면 complete_customer_signup에서 profiles.lead_id 및 상담 리드 연결 처리 가능
      password: passwordInput.value,
    });

    if (!signUpResult.success) {
      setMessage("error", signUpResult.message);
      return;
    }

    setMessage("success", signUpResult.message);

    setTimeout(() => {
      window.location.href = "/auth/callback";
    }, 700);
  } catch (error) {
    console.error("[SIGNUP_PAGE_ERROR]", error);
    setMessage("error", "회원가입 처리 중 예기치 못한 오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
});
