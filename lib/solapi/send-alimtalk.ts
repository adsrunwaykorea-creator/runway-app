import axios, { isAxiosError } from 'axios';
import crypto from 'crypto';
import type { KakaoTemplateCode } from '@/lib/kakao/templateCodes';

/** SOLAPI Messages v4 단건 발송 */
const SOLAPI_SEND_ONE_URL = 'https://api.solapi.com/messages/v4/send';

/**
 * SOLAPI 공식 Node SDK와 동일: HMAC-SHA256, 서명 대상 문자열 = date + salt
 * @see https://unpkg.com/solapi@5.2.0/dist/index.js (createAuthorization)
 */
export function createSolapiAuthorizationHeader(apiKey: string, apiSecret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const date = new Date().toISOString();
  const hmacData = date + salt;
  const signature = crypto.createHmac('sha256', apiSecret).update(hmacData).digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export type SolapiKakaoOptions = {
  pfId: string;
  /** 카카오 검수 템플릿 ID — `KAKAO_TEMPLATE_CODES`에서 선택 */
  templateId: KakaoTemplateCode;
  variables?: Record<string, string>;
  disableSms?: boolean;
  title?: string;
  buttons?: unknown[];
};

export type SendAlimtalkParams = {
  to: string;
  from: string;
  /** 알림톡 실패 시 대체 문자 내용 */
  text: string;
  kakaoOptions: SolapiKakaoOptions;
  /** 알림톡: ATA */
  type?: string;
};

/**
 * SOLAPI 알림톡(ATA) 단건 발송.
 * 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET
 */
export async function sendAlimtalk(params: SendAlimtalkParams): Promise<unknown> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;

  if (!apiKey?.trim() || !apiSecret?.trim()) {
    const err = new Error('SOLAPI_API_KEY and SOLAPI_API_SECRET are required');
    console.error('[sendAlimtalk]', err.message);
    throw err;
  }

  const digitsOnly = (v: string) => v.replace(/\D/g, '');

  const body = {
    message: {
      to: digitsOnly(params.to),
      from: digitsOnly(params.from),
      text: params.text,
      type: params.type ?? 'ATA',
      kakaoOptions: params.kakaoOptions,
    },
    allowDuplicates: false,
    agent: {
      sdkVersion: 'runway-app/renew-notify',
      osPlatform: `node ${process.version}`,
    },
  };

  try {
    const res = await axios.post(SOLAPI_SEND_ONE_URL, body, {
      headers: {
        Authorization: createSolapiAuthorizationHeader(apiKey, apiSecret),
        'Content-Type': 'application/json; charset=utf-8',
      },
      timeout: 30_000,
    });

    return res.data;
  } catch (e) {
    if (isAxiosError(e)) {
      console.error('[sendAlimtalk] axios error', {
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
      });
    } else {
      console.error('[sendAlimtalk] error', e);
    }
    throw e;
  }
}
