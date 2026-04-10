/** Top-level chatbot conversation mode. */
export type ChatbotMode = "idle" | "faq" | "lead_collecting" | "completed";

/** Steps inside lead (상담) collection. */
export type LeadStep =
  | "lead_intro"
  | "ask_business_type"
  | "ask_region"
  | "ask_budget"
  | "ask_goal"
  | "ask_contact"
  | "confirm_submission";

export type ChatRole = "user" | "bot";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  /** Quick-reply labels shown under this message (bot only). */
  actions?: string[];
};

export type LeadForm = {
  businessType: string;
  region: string;
  monthlyBudget: string;
  goal: string;
  contact: string;
};

export type LeadDraft = Partial<LeadForm>;

/** Intent labels used for FAQ routing & analytics. */
export type ChatbotIntent =
  | "sns_service"
  | "sns_pricing"
  | "db_service"
  | "db_pricing"
  | "cost_structure"
  | "ad_budget_structure"
  | "landing_page"
  | "business_fit"
  | "local_marketing"
  | "consultation_request"
  | "fallback";

export type ChatbotApiResponse = {
  answer: string;
  category: string;
  suggestCta: boolean;
  actions: string[];
};

export type ConsultationLeadPayload = {
  source: "chatbot" | "contact_us";
  sessionKey: string;
  businessType: string;
  region: string;
  monthlyBudget: string;
  goal: string;
  contact: string;
  name?: string;
  company?: string;
  phone?: string;
  serviceType?: string;
  payload?: Record<string, unknown>;
};

export type ConsultationLeadApiResponse = {
  success: boolean;
  message: string;
};
