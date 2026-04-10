import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ChatbotApiResponse } from "@/types/chatbot";

export type FaqCategory =
  | "sns"
  | "db"
  | "pricing"
  | "billing"
  | "landing"
  | "business_fit"
  | "consultation"
  | "fallback";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
};

type ModelChatbotPayload = {
  answer?: unknown;
  category?: unknown;
  suggestCta?: unknown;
  actions?: unknown;
};

const DEFAULT_MODEL = process.env.OPENAI_CHATBOT_MODEL || "gpt-4.1-mini";
const DEFAULT_TEMPERATURE = Number(process.env.OPENAI_CHATBOT_TEMPERATURE ?? "0.35");
const DEFAULT_FALLBACK_ANSWER =
  "이 부분은 현재 제공된 정보만으로는 정확하게 안내드리기 어렵습니다.";
const DEFAULT_PARTIAL_PREFIX = "확인 가능한 범위 안에서 말씀드리면, ";

const CTA_KEYWORDS = [
  "비용",
  "가격",
  "얼마",
  "업종",
  "가능",
  "지역",
  "랜딩",
  "제작",
  "상담",
  "문의",
  "전화",
];

const SENSITIVE_KEYWORDS = [
  "비용",
  "가격",
  "얼마",
  "예산",
  "견적",
  "단가",
  "수수료",
  "기간",
  "일정",
  "성과",
  "효과",
  "전환율",
  "매출",
  "정책",
  "규정",
  "보장",
  "확정",
];

const OVERCONFIDENT_PATTERNS = [
  "무조건",
  "반드시",
  "확실히",
  "확정",
  "보장",
  "100%",
  "전혀 문제없",
  "항상",
  "절대 가능합니다",
];

const HEDGING_PATTERNS = [
  "달라질 수",
  "정확하게 안내드리기 어렵",
  "확인 후",
  "범위 안에서",
  "단정해 안내드리기 어렵",
  "상담",
];

const CATEGORY_KEYWORDS: Record<FaqCategory, string[]> = {
  sns: ["sns", "인스타", "인스타그램", "페이스북", "메타", "소셜"],
  db: ["db", "리드", "문의폼", "상담신청", "신청서", "전환"],
  pricing: ["비용", "가격", "얼마", "예산", "견적", "단가"],
  billing: ["광고비", "결제", "플랫폼", "직접 결제", "운영비"],
  landing: ["랜딩", "랜딩페이지", "페이지", "제작", "기획", "디자인"],
  business_fit: ["업종", "가능", "병원", "미용", "필라테스", "교육", "지역"],
  consultation: ["상담", "문의", "전화", "연락", "신청", "도와줘"],
  fallback: [],
};

const promptCache = new Map<string, Promise<string>>();
let faqCache: Promise<FaqItem[]> | null = null;
const FAQ_MATCH_THRESHOLD = 2;

function getPromptPath(filename: string): string {
  return path.join(process.cwd(), "docs", filename);
}

export async function loadPromptFile(filename: string): Promise<string> {
  const cached = promptCache.get(filename);
  if (cached) return cached;

  const pending = readFile(getPromptPath(filename), "utf8");
  promptCache.set(filename, pending);
  return pending;
}

async function loadFaqData(): Promise<FaqItem[]> {
  if (!faqCache) {
    faqCache = readFile(path.join(process.cwd(), "data", "faqData.json"), "utf8").then((raw) =>
      JSON.parse(raw) as FaqItem[],
    );
  }
  return faqCache;
}

export async function loadFaqItems(): Promise<FaqItem[]> {
  return loadFaqData();
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^0-9a-zA-Z가-힣]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function parseFewShotBlocks(markdown: string): Array<{ user: string; assistant: string }> {
  const matches = markdown.matchAll(
    /<user>([\s\S]*?)<\/user>\s*<assistant>([\s\S]*?)<\/assistant>/g,
  );

  return Array.from(matches, (match) => ({
    user: match[1].trim(),
    assistant: match[2].trim(),
  }));
}

export async function buildFewShotMessages(): Promise<ChatCompletionMessageParam[]> {
  const markdown = await loadPromptFile("FewShot.md");
  return parseFewShotBlocks(markdown).flatMap<ChatCompletionMessageParam>((example) => [
    { role: "user", content: example.user },
    { role: "assistant", content: example.assistant },
  ]);
}

function inferCategoryFromMessage(userMessage: string, faqItems: FaqItem[]): FaqCategory {
  const normalizedMessage = normalizeText(userMessage);

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [FaqCategory, string[]]
  >) {
    if (keywords.some((keyword) => normalizedMessage.includes(keyword))) {
      return category;
    }
  }

  const messageTokens = tokenize(userMessage);
  let bestScore = 0;
  let bestCategory: FaqCategory = "fallback";

  for (const item of faqItems) {
    const haystack = `${item.question} ${item.answer}`;
    const normalizedHaystack = normalizeText(haystack);
    let score = 0;

    for (const token of messageTokens) {
      if (normalizedHaystack.includes(token)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = item.category;
    }
  }

  return bestCategory;
}

function scoreFaqMatch(userMessage: string, item: FaqItem): number {
  const trimmed = userMessage.trim();
  const normalizedMessage = normalizeText(trimmed);
  const normalizedQuestion = normalizeText(item.question);
  const normalizedAnswer = normalizeText(item.answer);
  const messageTokens = tokenize(userMessage);
  let score = 0;

  if (normalizedMessage === normalizedQuestion) {
    score += 8;
  } else if (
    normalizedQuestion.includes(normalizedMessage) ||
    normalizedMessage.includes(normalizedQuestion)
  ) {
    score += 5;
  }

  for (const token of messageTokens) {
    if (normalizedQuestion.includes(token)) {
      score += 2;
      continue;
    }
    if (normalizedAnswer.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function findBestFaqMatch(userMessage: string, faqItems: FaqItem[]): FaqItem | null {
  const [best] = faqItems
    .map((item) => ({
      item,
      score: scoreFaqMatch(userMessage, item),
    }))
    .sort((a, b) => b.score - a.score);

  if (!best || best.score < FAQ_MATCH_THRESHOLD) {
    return null;
  }

  return best.item;
}

function pickRelevantFaqs(userMessage: string, faqItems: FaqItem[], inferred: FaqCategory): FaqItem[] {
  const scored = faqItems
    .map((item) => ({
      item,
      score: scoreFaqMatch(userMessage, item) + (item.category === inferred ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored.filter((entry) => entry.score > 0).slice(0, 5).map((entry) => entry.item);
  if (top.length > 0) return top;

  return faqItems.filter((item) => item.category === inferred).slice(0, 4);
}

function hasConsultationSignal(userMessage: string): boolean {
  const normalizedMessage = normalizeText(userMessage);
  return CTA_KEYWORDS.some((keyword) => normalizedMessage.includes(keyword));
}

function normalizeCategory(value: unknown, fallback: FaqCategory): FaqCategory {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase() as FaqCategory;
  if (
    normalized === "sns" ||
    normalized === "db" ||
    normalized === "pricing" ||
    normalized === "billing" ||
    normalized === "landing" ||
    normalized === "business_fit" ||
    normalized === "consultation" ||
    normalized === "fallback"
  ) {
    return normalized;
  }

  return fallback;
}

function stripCodeFence(raw: string): string {
  return raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function parseModelPayload(raw: string): ModelChatbotPayload | null {
  try {
    return JSON.parse(stripCodeFence(raw)) as ModelChatbotPayload;
  } catch {
    return null;
  }
}

function sanitizeAnswer(value: unknown, fallbackAnswer = DEFAULT_FALLBACK_ANSWER): string {
  if (typeof value !== "string") return fallbackAnswer;

  const cleaned = value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return fallbackAnswer;
  return cleaned;
}

function extractNumericTokens(text: string): string[] {
  const matches = text.match(/\d[\d.,]*(?:%|원|만원|천원|건|일|주|개월|년)?/g);
  return matches ?? [];
}

function isSensitiveQuestion(userMessage: string): boolean {
  const normalizedMessage = normalizeText(userMessage);
  return SENSITIVE_KEYWORDS.some((keyword) => normalizedMessage.includes(keyword));
}

function hasOverconfidentClaim(answer: string): boolean {
  const normalizedAnswer = normalizeText(answer);
  return OVERCONFIDENT_PATTERNS.some((pattern) => normalizedAnswer.includes(normalizeText(pattern)));
}

function hasHedging(answer: string): boolean {
  const normalizedAnswer = normalizeText(answer);
  return HEDGING_PATTERNS.some((pattern) => normalizedAnswer.includes(normalizeText(pattern)));
}

function hasUnsupportedNumericClaim(answer: string, references: string[]): boolean {
  const answerNumbers = extractNumericTokens(answer);
  if (answerNumbers.length === 0) return false;

  const referenceText = references.join(" ");
  return answerNumbers.some((token) => !referenceText.includes(token));
}

function maybeConvertToPartialAnswer(answer: string, relevantFaqs: FaqItem[]): string | null {
  const safeSource = relevantFaqs[0]?.answer?.trim();
  if (!safeSource) return null;
  return `${DEFAULT_PARTIAL_PREFIX}${safeSource} 다만 그 외 부분은 여기서 단정해 안내드리기 어렵습니다.`;
}

function enforceAccuracyGuard(
  answer: string,
  userMessage: string,
  relevantFaqs: FaqItem[],
): string | null {
  if (!answer.trim()) {
    return DEFAULT_FALLBACK_ANSWER;
  }

  if (hasOverconfidentClaim(answer)) {
    return maybeConvertToPartialAnswer(answer, relevantFaqs) ?? DEFAULT_FALLBACK_ANSWER;
  }

  const references = [userMessage, ...relevantFaqs.map((item) => `${item.question} ${item.answer}`)];
  if (hasUnsupportedNumericClaim(answer, references)) {
    return maybeConvertToPartialAnswer(answer, relevantFaqs) ?? DEFAULT_FALLBACK_ANSWER;
  }

  if (isSensitiveQuestion(userMessage) && !hasHedging(answer)) {
    return maybeConvertToPartialAnswer(answer, relevantFaqs) ?? DEFAULT_FALLBACK_ANSWER;
  }

  return null;
}

function buildActions(category: FaqCategory, suggestCta: boolean): string[] {
  const actionMap: Record<FaqCategory, string[]> = {
    sns: ["비용 문의", "상담 요청"],
    db: ["비용 문의", "상담 요청"],
    pricing: ["상담 요청", "SNS 마케팅 비용", "DB 마케팅 비용"],
    billing: ["상담 요청", "비용 문의"],
    landing: ["상담 요청", "DB 마케팅 안내"],
    business_fit: ["상담 요청", "비용 문의"],
    consultation: ["상담 요청"],
    fallback: ["상담 요청", "다른 질문하기"],
  };

  const base = [...actionMap[category]];
  if (suggestCta && !base.includes("상담 요청")) {
    base.unshift("상담 요청");
  }
  return base.slice(0, 3);
}

function buildFallbackResponse(
  category: FaqCategory,
  suggestCta: boolean,
  answer = DEFAULT_FALLBACK_ANSWER,
): ChatbotApiResponse {
  return {
    answer,
    category,
    suggestCta,
    actions: buildActions(category, suggestCta),
  };
}

function buildFaqResponse(item: FaqItem, userMessage: string): ChatbotApiResponse {
  const suggestCta = hasConsultationSignal(userMessage) || item.category === "consultation";

  return {
    answer: sanitizeAnswer(item.answer),
    category: item.category,
    suggestCta,
    actions: buildActions(item.category, suggestCta),
  };
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

function buildSystemMessages(
  systemPrompt: string,
  knowledge: string,
  relevantFaqs: FaqItem[],
  inferredCategory: FaqCategory,
  suggestCta: boolean,
): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "system", content: knowledge },
    {
      role: "system",
      content:
        "참고 FAQ JSON입니다. 답변은 이 범위를 우선 참고하되, 가격이나 성과를 임의 생성하지 마세요.\n" +
        JSON.stringify(relevantFaqs, null, 2),
    },
    {
      role: "system",
      content:
        `추정 카테고리: ${inferredCategory}\n` +
        `상담 유도 필요성 추정: ${suggestCta ? "true" : "false"}\n` +
        `정확성 우선 fallback 문구: ${DEFAULT_FALLBACK_ANSWER}\n` +
        `부분 답변 문구 시작: ${DEFAULT_PARTIAL_PREFIX}[확실한 정보]` +
        "\n질문 전체를 확실히 답할 수 없으면 확인 가능한 부분만 말하고 나머지는 단정하지 마세요.\n" +
        "반드시 JSON 객체만 반환하세요.",
    },
  ];
}

export async function askRunwayChatbot(userMessage: string): Promise<ChatbotApiResponse> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return buildFallbackResponse("fallback", false, "메시지를 입력해 주세요.");
  }

  const [systemPrompt, knowledge, faqItems, fewShotMessages] = await Promise.all([
    loadPromptFile("System Prompt.md"),
    loadPromptFile("Knowledge.md"),
    loadFaqData(),
    buildFewShotMessages(),
  ]);

  const inferredCategory = inferCategoryFromMessage(trimmed, faqItems);
  const suggestCtaByRule = hasConsultationSignal(trimmed);
  const relevantFaqs = pickRelevantFaqs(trimmed, faqItems, inferredCategory);

  const messages: ChatCompletionMessageParam[] = [
    ...buildSystemMessages(systemPrompt, knowledge, relevantFaqs, inferredCategory, suggestCtaByRule),
    ...fewShotMessages,
    { role: "user", content: trimmed },
  ];

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: Number.isFinite(DEFAULT_TEMPERATURE) ? DEFAULT_TEMPERATURE : 0.35,
      max_completion_tokens: 300,
      messages,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseModelPayload(raw);
    if (!parsed) {
      return buildFallbackResponse(inferredCategory, suggestCtaByRule);
    }

    const category = normalizeCategory(parsed.category, inferredCategory);
    const suggestCta = Boolean(parsed.suggestCta) || suggestCtaByRule || category === "consultation";
    const sanitizedAnswer = sanitizeAnswer(parsed.answer);
    const guardedAnswer = enforceAccuracyGuard(sanitizedAnswer, trimmed, relevantFaqs);

    return {
      answer: guardedAnswer ?? sanitizedAnswer,
      category,
      suggestCta,
      actions: buildActions(category, suggestCta),
    };
  } catch {
    return buildFallbackResponse(inferredCategory, suggestCtaByRule);
  }
}

export async function findFaqResponse(userMessage: string): Promise<ChatbotApiResponse | null> {
  const trimmed = userMessage.trim();
  if (!trimmed) return null;

  const faqItems = await loadFaqData();
  const match = findBestFaqMatch(trimmed, faqItems);
  if (!match) return null;

  return buildFaqResponse(match, trimmed);
}
