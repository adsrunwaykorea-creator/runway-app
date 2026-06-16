export type CheckoutFormValues = {
  customerName: string;
  customerPhone: string;
  businessName: string;
  businessType: string;
  message: string;
  privacyAgreed: boolean;
  termsAgreed: boolean;
  loading: boolean;
};

export type CheckoutValidationState = {
  nameValid: boolean;
  phoneValid: boolean;
  companyValid: boolean;
  businessTypeValid: boolean;
  privacyAgreed: boolean;
  termsAgreed: boolean;
  canSubmit: boolean;
};

export function getPhoneDigits(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function isValidPhone(phone: string): boolean {
  const digits = getPhoneDigits(phone);
  return digits.length >= 10 && digits.length <= 11 && digits.startsWith('01');
}

export function getCheckoutValidationState(values: CheckoutFormValues): CheckoutValidationState {
  const nameValid = values.customerName.trim().length > 0;
  const phoneValid = isValidPhone(values.customerPhone);
  const companyValid = values.businessName.trim().length > 0;
  const businessTypeValid = values.businessType.trim().length > 0;
  const { privacyAgreed, termsAgreed } = values;

  const canSubmit =
    nameValid &&
    phoneValid &&
    companyValid &&
    businessTypeValid &&
    privacyAgreed &&
    termsAgreed &&
    !values.loading;

  return {
    nameValid,
    phoneValid,
    companyValid,
    businessTypeValid,
    privacyAgreed,
    termsAgreed,
    canSubmit,
  };
}

export function getCheckoutDisabledMessages(state: CheckoutValidationState): string[] {
  const messages: string[] = [];
  if (!state.nameValid) messages.push('이름을 입력해주세요.');
  if (!state.phoneValid) messages.push('올바른 연락처를 입력해주세요.');
  if (!state.companyValid) messages.push('업체명을 입력해주세요.');
  if (!state.businessTypeValid) messages.push('업종을 선택해주세요.');
  if (!state.privacyAgreed || !state.termsAgreed) messages.push('약관에 동의해주세요.');
  return messages;
}
