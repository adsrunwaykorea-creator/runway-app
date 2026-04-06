import { getSupabaseClient } from "./supabase-client.js";

/**
 * 이메일 형식 검사
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * OAuth 콜백 URL 생성
 * - 정적 사이트에서 signup/login 페이지를 명시적으로 지정
 */
export function buildOAuthRedirectUrl({
  callbackPage = "signup.html",
  provider,
  leadId,
} = {}) {
  const redirectUrl = new URL(callbackPage, window.location.href);
  redirectUrl.searchParams.set("auth_callback", "1");
  if (provider) {
    redirectUrl.searchParams.set("provider", provider);
  }
  if (leadId) {
    redirectUrl.searchParams.set("leadId", leadId);
  }
  return redirectUrl.toString();
}

/**
 * 로그인 요청
 */
export async function signInWithEmail(email, password) {
  const normalizedEmail = (email || "").trim();
  const normalizedPassword = password || "";

  if (!normalizedEmail || !normalizedPassword) {
    return {
      success: false,
      message: "이메일과 비밀번호를 모두 입력해주세요.",
      code: "INVALID_INPUT",
    };
  }

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      message: "올바른 이메일 형식을 입력해주세요.",
      code: "INVALID_EMAIL_FORMAT",
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) {
    const message = (error.message || "").toLowerCase();
    const isInvalidCredential =
      message.includes("invalid login credentials") ||
      message.includes("invalid credentials");

    return {
      success: false,
      message: isInvalidCredential
        ? "이메일 또는 비밀번호가 올바르지 않습니다."
        : "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      code: isInvalidCredential ? "INVALID_CREDENTIALS" : "AUTH_ERROR",
    };
  }

  return {
    success: true,
    userId: data?.user?.id || "",
    message: "로그인에 성공했습니다. 권한 확인 후 이동합니다.",
  };
}

/**
 * 소셜 OAuth 시작
 * provider: "kakao" | "google" | "naver"
 */
export async function signInWithOAuth(provider, redirectTo) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo:
        redirectTo || buildOAuthRedirectUrl({ callbackPage: "signup.html", provider }),
    },
  });

  if (error) {
    return {
      success: false,
      message: `${provider} OAuth 연결 중 오류가 발생했습니다.`,
      code: "OAUTH_ERROR",
    };
  }

  return {
    success: true,
    message: `${provider} 인증 페이지로 이동합니다.`,
  };
}

/**
 * OAuth 콜백 처리
 * - auth.users 세션 유저 정보를 기준으로 profiles 기본 레코드 보장
 * - profiles에 없을 때만 customer row를 생성
 */
export async function handleOAuthCallback({ leadId } = {}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return {
      success: false,
      message: "OAuth 세션 확인 중 오류가 발생했습니다.",
      code: "SESSION_ERROR",
    };
  }

  const user = data?.session?.user;
  if (!user?.id) {
    return {
      success: false,
      message: "로그인 세션을 찾을 수 없습니다. 다시 시도해주세요.",
      code: "NO_SESSION",
    };
  }

  const userMeta = user.user_metadata || {};
  const resolvedName =
    userMeta.name ||
    userMeta.full_name ||
    userMeta.nickname ||
    user.email?.split("@")[0] ||
    "고객";

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id, role, lead_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileLookupError) {
    return {
      success: false,
      message: "프로필 조회 중 오류가 발생했습니다.",
      code: "PROFILE_LOOKUP_FAILED",
    };
  }

  // 이미 프로필이 있으면 중복 생성하지 않음
  if (!existingProfile) {
    const { error: profileInsertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email || null,
      name: resolvedName,
      role: "customer",
      company_name: null,
      phone: null,
      lead_id: leadId || null,
    });

    if (profileInsertError) {
      return {
        success: false,
        message: "소셜 로그인은 성공했지만 프로필 생성에 실패했습니다.",
        code: "PROFILE_CREATE_FAILED",
      };
    }
  }
  // 프로필이 이미 있더라도 leadId가 들어오고 lead_id가 비어 있으면 연결 정보만 보강합니다.
  // TODO: 필요 시 여기에서 consultation_leads를 converted 처리하는 RPC를 추가하세요.
  if (existingProfile && leadId && !existingProfile.lead_id) {
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ lead_id: leadId })
      .eq("id", user.id);

    if (profileUpdateError) {
      return {
        success: false,
        message: "프로필 lead 연결 정보 업데이트에 실패했습니다.",
        code: "PROFILE_LEAD_UPDATE_FAILED",
      };
    }
  }

  return {
    success: true,
    userId: user.id,
    message: "소셜 로그인에 성공했습니다.",
  };
}

/**
 * 회원가입 요청
 * - signUp만 수행하고 프로필 insert는 /auth/callback에서 처리합니다.
 */
export async function signUpWithEmail({
  name,
  companyName,
  email,
  phone,
  password,
  leadId,
}) {
  const normalizedName = (name || "").trim();
  const normalizedCompanyName = (companyName || "").trim();
  const normalizedEmail = (email || "").trim();
  const normalizedPhone = (phone || "").trim();
  const normalizedPassword = password || "";
  const normalizedLeadId = (leadId || "").trim();

  if (
    !normalizedName ||
    !normalizedCompanyName ||
    !normalizedEmail ||
    !normalizedPassword
  ) {
    return {
      success: false,
      message: "이름, 회사명, 이메일, 비밀번호를 모두 입력해주세요.",
      code: "INVALID_INPUT",
    };
  }

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      message: "올바른 이메일 형식을 입력해주세요.",
      code: "INVALID_EMAIL_FORMAT",
    };
  }

  if (normalizedPassword.length < 8) {
    return {
      success: false,
      message: "비밀번호는 8자 이상으로 입력해주세요.",
      code: "INVALID_PASSWORD",
    };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: normalizedPassword,
    options: {
      data: {
        name: normalizedName,
        company_name: normalizedCompanyName,
        lead_id: normalizedLeadId || null,
        phone: normalizedPhone || null,
      },
    },
  });

  if (error) {
    const message = (error.message || "").toLowerCase();
    const isEmailRateLimited =
      message.includes("email rate limit exceeded") ||
      message.includes("rate limit");

    return {
      success: false,
      message: isEmailRateLimited
        ? "잠시 후 다시 시도해주세요"
        : error.message || "회원가입 중 오류가 발생했습니다.",
      code: isEmailRateLimited ? "RATE_LIMIT" : "AUTH_ERROR",
    };
  }

  // 개발 단계에서는 이메일 인증 전제를 두지 않고
  // 세션이 없으면 즉시 비밀번호 로그인으로 세션 확보를 시도합니다.
  let userId = data?.user?.id || null;
  if (!data?.session) {
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

    if (signInError) {
      return {
        success: false,
        message: "잠시 후 다시 시도해주세요",
        code: "AUTO_LOGIN_FAILED",
      };
    }

    userId = signInData?.user?.id || userId;
  }

  return {
    success: true,
    userId,
    needsEmailVerification: false,
    message: "회원가입이 완료되었습니다. 이동합니다.",
  };
}

/**
 * profiles 테이블에서 사용자 role 조회
 */
export async function getUserRole(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    return {
      role: null,
      error: "권한 정보를 불러오지 못했습니다.",
    };
  }

  return {
    role: data?.role || null,
    error: null,
  };
}

/**
 * 역할별 라우팅 규칙
 */
export function resolveRedirectPathByRole(role) {
  if (role === "admin" || role === "manager") return "/admin";
  return "/mypage";
}

/**
 * 정적 사이트에서 동작 가능하도록 실제 파일 경로로 보정
 * - 추후 Next.js/App Router로 이전 시에는 이 함수 제거 가능
 */
export function mapPathForStaticSite(routePath) {
  if (routePath === "/admin") return "admin.html";
  if (routePath === "/mypage") return "mypage.html";
  return "mypage.html";
}
