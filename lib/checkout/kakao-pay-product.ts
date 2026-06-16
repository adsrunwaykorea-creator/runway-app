/** 결제 페이지 UI · 카카오페이 심사 · DB 저장용 상품명 */
export const CHECKOUT_PRODUCT_NAME = '런웨이 SNS 광고관리 베이직';

export const KAKAO_PAY_CHECKOUT_PRODUCT = {
  id: 'runway-basic',
  name: CHECKOUT_PRODUCT_NAME,
  displayName: CHECKOUT_PRODUCT_NAME,
  amount: 499_000,
  vatIncluded: true,
  servicePeriodDays: 30,
  description: '광고 세팅, 소재 기획, 캠페인 운영관리, 월간 리포트 제공',
} as const;
