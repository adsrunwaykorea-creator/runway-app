/**
 * 카카오 알림톡 템플릿 ID(코드) 단일 소스.
 * SOLAPI/카카오에서 실제 코드가 나오면 이 파일의 값만 교체하면 된다.
 */
export const KAKAO_TEMPLATE_CODES = {
  D7_EXPIRE_NOTICE: 'D7_EXPIRE_NOTICE',
  D3_EXPIRE_NOTICE: 'D3_EXPIRE_NOTICE',
  D1_EXPIRE_NOTICE: 'D1_EXPIRE_NOTICE',
  SIGNUP_WELCOME_STATUS: 'SIGNUP_WELCOME_STATUS',
  PROCESS_STATUS_UPDATE: 'PROCESS_STATUS_UPDATE',
} as const;

export type KakaoTemplateKey = keyof typeof KAKAO_TEMPLATE_CODES;

/** SOLAPI `kakaoOptions.templateId`에 넣는 문자열 타입 */
export type KakaoTemplateCode = (typeof KAKAO_TEMPLATE_CODES)[KakaoTemplateKey];
