import type { ChatbotIntent } from "@/types/chatbot";

export type FaqEntry = {
  intent: ChatbotIntent;
  answer: string;
  actions: string[];
};

export const CHATBOT_GREETING =
  "안녕하세요. 런웨이 상담 챗봇입니다.\n\n궁금한 서비스가 있으시면 바로 안내해 드릴게요.\n원하시면 상담 요청도 간단하게 남기실 수 있습니다.";

/** 첫 화면 빠른 선택 — 핵심 4개만 (2×2) */
export const INITIAL_QUICK_ACTIONS: string[] = [
  "SNS 마케팅",
  "DB 마케팅",
  "비용 문의",
  "상담 요청",
];

/** FAQ·에러 등 후속 버튼에서 공통으로 쓰는 상담 진입 라벨 */
export const CONSULTATION_FOLLOWUP_LABEL = "상담 요청하기";

export const LEAD_INTRO_MESSAGE =
  "업종과 지역, 목표에 따라 방향이 달라질 수 있어\n간단한 정보를 남겨주시면 확인 후 맞춤 상담으로 안내드리겠습니다.";

export const LEAD_INTRO_ACTIONS: string[] = ["맞춤 상담 요청 이어서 하기", "더 알아보기"];

export const LEAD_STEP_COPY = {
  ask_business_type: {
    main: "좋습니다.\n먼저 어떤 업종인지 알려주세요.",
    hint: "예: 필라테스 / 미용실 / 병원 / 교육 / 쇼핑몰",
  },
  ask_region: {
    main: "좋습니다.\n주요 고객 지역은 어디인가요?",
    hint: "예: 마포구 / 강남구 / 김포 / 전국 대상",
  },
  ask_budget: {
    main: "확인했습니다.\n월 예산은 어느 정도 생각하고 계신가요?",
    hint: "예: 50만 원 이하 / 100만 원 내외 / 200만 원 이상",
  },
  ask_goal: {
    main: "좋습니다.\n가장 원하는 목표는 무엇인가요?",
    hint: "예: 상담 문의 늘리기 / 예약 늘리기 / 신규 고객 유입 / 랜딩페이지 제작",
  },
  ask_contact: {
    main:
      "마지막으로 연락받으실 성함과 번호를 남겨주시면\n확인 후 순차적으로 안내드리겠습니다.",
    hint: "예: 홍길동 / 010-1234-5678",
  },
} as const;

export const LEAD_COMPLETED_MESSAGE =
  "상담 요청 감사합니다.\n남겨주신 내용을 확인한 후 순차적으로 연락드리겠습니다.\n추가로 궁금한 점이 있다면 이어서 남겨주셔도 됩니다.";

export const LEAD_COMPLETED_ACTIONS: string[] = ["추가 문의 남기기", "카카오 상담 연결", "챗 종료"];

/** FAQ copy keyed by intent (single source for server + future client hints). */
export const FAQ_BY_INTENT: Record<ChatbotIntent, FaqEntry> = {
  sns_service: {
    intent: "sns_service",
    answer:
      "런웨이 SNS 마케팅은 인스타그램, 페이스북 등 SNS 광고를 통해 상담 문의, 예약, 방문 전환을 만드는 서비스입니다.\n업종과 지역, 목표에 따라 운영 방식이 달라질 수 있습니다.",
    actions: ["비용이 궁금해요", "우리 업종도 가능한가요?", CONSULTATION_FOLLOWUP_LABEL],
  },
  sns_pricing: {
    intent: "sns_pricing",
    answer:
      "비용은 업종, 지역, 목표, 제작 범위에 따라 달라질 수 있습니다.\n광고비는 직접 플랫폼에 결제하고, 런웨이는 운영 관리비만 받는 구조입니다.",
    actions: ["SNS 마케팅", CONSULTATION_FOLLOWUP_LABEL, "더 질문하기"],
  },
  db_service: {
    intent: "db_service",
    answer:
      "DB 마케팅은 광고를 통해 상담 신청, 문의 접수, 신청서 작성처럼 고객 정보를 확보하는 방식입니다.\n랜딩페이지 제작부터 광고 운영, 전환 구조 설계까지 함께 진행할 수 있습니다.",
    actions: ["비용이 궁금해요", "랜딩페이지도 필요한가요?", CONSULTATION_FOLLOWUP_LABEL],
  },
  db_pricing: {
    intent: "db_pricing",
    answer:
      "비용은 업종, 지역, 목표, 제작 범위에 따라 달라질 수 있습니다.\n광고비는 직접 플랫폼에 결제하고, 런웨이는 운영 관리비만 받는 구조입니다.",
    actions: ["DB 마케팅", CONSULTATION_FOLLOWUP_LABEL, "더 질문하기"],
  },
  cost_structure: {
    intent: "cost_structure",
    answer:
      "비용은 업종, 지역, 목표, 제작 범위에 따라 달라질 수 있습니다.\n광고비는 직접 플랫폼에 결제하고, 런웨이는 운영 관리비만 받는 구조입니다.",
    actions: ["SNS 마케팅 비용", "DB 마케팅 비용", CONSULTATION_FOLLOWUP_LABEL],
  },
  ad_budget_structure: {
    intent: "ad_budget_structure",
    answer:
      "광고비는 직접 각 플랫폼에 결제하고, 런웨이는 운영 관리비만 받는 구조입니다.\n예산 흐름을 투명하게 보고 싶은 경우 특히 잘 맞습니다.",
    actions: [CONSULTATION_FOLLOWUP_LABEL, "더 질문하기"],
  },
  landing_page: {
    intent: "landing_page",
    answer:
      "네, 가능합니다.\n광고 성과를 높이기 위한 랜딩페이지 기획, 카피, 디자인, 제작까지 함께 진행할 수 있습니다.\n기존 페이지가 있다면 개선 방향도 검토할 수 있습니다.",
    actions: ["비용이 궁금해요", "DB 마케팅과 같이 하고 싶어요", CONSULTATION_FOLLOWUP_LABEL],
  },
  business_fit: {
    intent: "business_fit",
    answer:
      "상담, 예약, 방문 전환이 중요한 업종이라면 잘 맞는 편입니다.\n병원, 미용, 필라테스, 교육, 지역 서비스업처럼 고객 문의가 중요한 업종은 특히 적합합니다.\n업종과 지역에 따라 방향이 달라질 수 있어 원하시면 맞춤 상담으로 안내드릴 수 있습니다.",
    actions: [CONSULTATION_FOLLOWUP_LABEL, "더 질문하기"],
  },
  local_marketing: {
    intent: "local_marketing",
    answer:
      "지역과 업종에 따라 노출·전환 구조가 달라질 수 있습니다.\n희망 지역과 목표를 알려주시면 방향을 짚어드릴 수 있습니다.",
    actions: [CONSULTATION_FOLLOWUP_LABEL, "더 질문하기"],
  },
  consultation_request: {
    intent: "consultation_request",
    answer: LEAD_INTRO_MESSAGE,
    actions: LEAD_INTRO_ACTIONS,
  },
  fallback: {
    intent: "fallback",
    answer:
      "이 부분은 업종과 상황에 따라 달라질 수 있어 간단한 정보를 남겨주시면 확인 후 안내드리겠습니다.",
    actions: [CONSULTATION_FOLLOWUP_LABEL, "다른 질문하기"],
  },
};

/** Synthetic labels that map to intents without calling the model. */
export const QUICK_LABEL_TO_INTENT: Record<string, ChatbotIntent> = {
  "SNS 마케팅": "sns_service",
  "DB 마케팅": "db_service",
  "비용 문의": "cost_structure",
  "상담 요청": "consultation_request",
  "상담 요청하기": "consultation_request",
  /* 이전 세션·긴 문구 호환 */
  "SNS 마케팅 알아보기": "sns_service",
  "DB 마케팅 알아보기": "db_service",
  "비용 구조 확인하기": "cost_structure",
  "맞춤 상담 요청하기": "consultation_request",
  "우리 업종도 가능한가요?": "business_fit",
  "랜딩페이지 제작 문의": "landing_page",
  "SNS 마케팅 비용": "sns_pricing",
  "DB 마케팅 비용": "db_pricing",
  "비용이 궁금해요": "cost_structure",
  "랜딩페이지도 필요한가요?": "landing_page",
  "DB 마케팅과 같이 하고 싶어요": "db_service",
};
