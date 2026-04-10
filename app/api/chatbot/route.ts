import { NextResponse } from "next/server";
import { askRunwayChatbot, findFaqResponse } from "@/lib/openai/runwayChatbot";

const FALLBACK_RESPONSE = {
  answer: "이 부분은 현재 제공된 정보만으로는 정확하게 안내드리기 어렵습니다.",
  category: "fallback",
  suggestCta: true,
  actions: ["상담 요청", "다른 질문하기"],
} as const;

export async function POST(request: Request) {
  let body: { sessionKey?: unknown; message?: unknown };

  try {
    body = (await request.json()) as { sessionKey?: unknown; message?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message : "";
  const sessionKey = typeof body.sessionKey === "string" ? body.sessionKey.trim() : "";

  if (!message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (!sessionKey) {
    return NextResponse.json({ error: "sessionKey is required" }, { status: 400 });
  }

  try {
    const faqPayload = await findFaqResponse(message);
    if (faqPayload) {
      return NextResponse.json(faqPayload);
    }

    const payload = await askRunwayChatbot(message);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(FALLBACK_RESPONSE, { status: 200 });
  }
}
