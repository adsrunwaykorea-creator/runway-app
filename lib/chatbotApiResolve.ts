import { CONSULTATION_FOLLOWUP_LABEL, FAQ_BY_INTENT, QUICK_LABEL_TO_INTENT } from "@/lib/chatbotAnswers";
import { matchChatbotIntent } from "@/lib/matchChatbotIntent";
import type { ChatbotApiResponse, ChatbotIntent } from "@/types/chatbot";

function normalizeLabelKey(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Resolves a quick-reply label to a known intent when it matches our catalog.
 */
export function resolveIntentFromQuickLabel(label: string): ChatbotIntent | null {
  const key = normalizeLabelKey(label);
  const direct = QUICK_LABEL_TO_INTENT[key as keyof typeof QUICK_LABEL_TO_INTENT];
  if (direct) return direct;
  return null;
}

function buildResponse(intent: ChatbotIntent): ChatbotApiResponse {
  const entry = FAQ_BY_INTENT[intent];
  const suggestCta = intent === "consultation_request";
  return {
    answer: entry.answer,
    category: entry.intent,
    suggestCta,
    actions: [...entry.actions],
  };
}

/**
 * Main FAQ resolver for POST /api/chatbot (intent + canned answers).
 */
export function resolveChatbotMessage(message: string): ChatbotApiResponse {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      answer: "메시지를 입력해 주세요.",
      category: "fallback",
      suggestCta: false,
      actions: [CONSULTATION_FOLLOWUP_LABEL, "다른 질문하기"],
    };
  }

  const fromLabel = resolveIntentFromQuickLabel(trimmed);
  if (fromLabel) {
    return buildResponse(fromLabel);
  }

  const intent = matchChatbotIntent(trimmed);
  return buildResponse(intent);
}
