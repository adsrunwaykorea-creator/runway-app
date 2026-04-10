import type { ChatbotIntent } from "@/types/chatbot";

const SNS_RE = /sns|인스타|페이스북|페북|instagram|facebook/i;
const DB_RE = /\bdb\b|디비|리드|문의\s*접수|신청서/i;
const BUDGET_WORD_RE = /비용|가격|얼마|예산|견적/i;
const AD_BUDGET_RE = /광고비|광고\s*비/i;
const LANDING_RE = /랜딩|랜딩페이지|페이지\s*제작|웹페이지|사이트\s*제작/i;
const BUSINESS_FIT_RE = /업종|가능한가|가능\?|우리\s*업종|되는지|될까/i;
const LOCAL_RE = /지역|동네|근처|로컬|근방/i;
const CONSULT_RE = /상담|문의|연락|전화|신청|접수|예약\s*요청/i;

export type MatchContext = {
  normalized: string;
  tokens: string[];
};

export function normalizeUserMessage(raw: string): MatchContext {
  const normalized = raw.trim().replace(/\s+/g, " ");
  const tokens = normalized.split(" ").filter(Boolean);
  return { normalized, tokens };
}

function hasSnsSignal(ctx: MatchContext): boolean {
  return SNS_RE.test(ctx.normalized);
}

function hasDbSignal(ctx: MatchContext): boolean {
  return DB_RE.test(ctx.normalized);
}

function hasBudgetWords(ctx: MatchContext): boolean {
  return BUDGET_WORD_RE.test(ctx.normalized);
}

/**
 * Keyword-based intent routing (FAQ). Order matters: compound rules first.
 */
export function matchChatbotIntent(raw: string): ChatbotIntent {
  const ctx = normalizeUserMessage(raw);
  if (!ctx.normalized) return "fallback";

  if (AD_BUDGET_RE.test(ctx.normalized) && !LANDING_RE.test(ctx.normalized)) {
    return "ad_budget_structure";
  }

  if (hasBudgetWords(ctx) && hasSnsSignal(ctx) && !hasDbSignal(ctx)) {
    return "sns_pricing";
  }

  if (hasBudgetWords(ctx) && hasDbSignal(ctx) && !hasSnsSignal(ctx)) {
    return "db_pricing";
  }

  if (hasBudgetWords(ctx) && /비용\s*구조|구조|운영비|관리비/.test(ctx.normalized)) {
    return "cost_structure";
  }

  if (LANDING_RE.test(ctx.normalized)) {
    return "landing_page";
  }

  if (BUSINESS_FIT_RE.test(ctx.normalized)) {
    return "business_fit";
  }

  if (LOCAL_RE.test(ctx.normalized)) {
    return "local_marketing";
  }

  if (hasSnsSignal(ctx)) {
    return "sns_service";
  }

  if (hasDbSignal(ctx)) {
    return "db_service";
  }

  if (hasBudgetWords(ctx)) {
    return "cost_structure";
  }

  if (CONSULT_RE.test(ctx.normalized)) {
    return "consultation_request";
  }

  return "fallback";
}

/** Returns true when the user message strongly suggests starting or continuing a lead. */
export function isHighConsultationIntent(raw: string): boolean {
  const ctx = normalizeUserMessage(raw);
  if (!ctx.normalized) return false;
  if (matchChatbotIntent(raw) === "consultation_request") {
    return ctx.normalized.length < 48;
  }
  return false;
}
