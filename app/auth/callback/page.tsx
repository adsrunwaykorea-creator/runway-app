'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const POST_LOGIN_NEXT_KEY = 'post_login_next';

function sanitizeNextPath(path: string | null) {
  if (!path) return null;
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//')) return null;
  return path;
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const callbackError = params.get('error');
      const nextFromQuery = sanitizeNextPath(params.get('next'));
      const nextFromStorage = sanitizeNextPath(window.sessionStorage.getItem(POST_LOGIN_NEXT_KEY));
      const safeNext = nextFromQuery ?? nextFromStorage;
      const destination = safeNext ?? '/mypage';
      const baseLoginPath = safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : '/login';

      try {
        const tryProceedWithExistingSession = async () => {
          await new Promise((resolve) => setTimeout(resolve, 220));
          let result = await supabase.auth.getUser();
          if (!result.data?.user?.id) {
            await new Promise((resolve) => setTimeout(resolve, 280));
            result = await supabase.auth.getUser();
          }
          return result.data?.user?.id ? result : null;
        };

        if (callbackError) {
          const errorDescription = params.get('error_description');
          console.warn('[CALLBACK_PROVIDER_ERROR]', {
            error: callbackError,
            errorCode: params.get('error_code'),
            errorDescription,
          });
          const existingSession = await tryProceedWithExistingSession();
          if (existingSession?.data?.user?.id) {
            window.sessionStorage.removeItem(POST_LOGIN_NEXT_KEY);
            if (!cancelled) router.replace(destination);
            return;
          }
          const loginPathWithError = `${baseLoginPath}${baseLoginPath.includes('?') ? '&' : '?'}authError=${encodeURIComponent(errorDescription || callbackError)}`;
          if (!cancelled) router.replace(loginPathWithError);
          return;
        }

        if (code) {
          let exchangeError: { message?: string } | null = null;
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            exchangeError = error;
          } catch (error) {
            exchangeError =
              error && typeof error === 'object' && 'message' in error
                ? (error as { message?: string })
                : { message: String(error) };
          }

          if (exchangeError) {
            const message = (exchangeError.message || '').toLowerCase();
            const isVerifierMissing =
              message.includes('code verifier') || message.includes('pkce');
            if (isVerifierMissing) {
              console.info('[CALLBACK_EXCHANGE_FALLBACK_PKCE]', exchangeError.message);
            } else {
              console.warn('[CALLBACK_EXCHANGE_ERROR]', exchangeError.message);
            }
            const existingSession = await tryProceedWithExistingSession();
            if (!existingSession?.data?.user?.id && !isVerifierMissing) {
              if (!cancelled) router.replace(baseLoginPath);
              return;
            }
            // In some flows verifier may already be consumed while session exists.
            // Continue to session check fallback instead of immediate login redirect.
          }
        } else {
          // Fallback for implicit/hash callback shape
          const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setSessionError) {
              console.error('[CALLBACK_SET_SESSION_ERROR]', setSessionError);
              if (!cancelled) router.replace(baseLoginPath);
              return;
            }
          } else {
            if (!cancelled) router.replace(baseLoginPath);
            return;
          }
        }

        const userDataResult = await tryProceedWithExistingSession();

        if (!userDataResult?.data?.user?.id) {
          console.error('[CALLBACK_GET_USER_ERROR]', userDataResult?.error);
          if (!cancelled) router.replace(baseLoginPath);
          return;
        }

        window.sessionStorage.removeItem(POST_LOGIN_NEXT_KEY);
        if (!cancelled) router.replace(destination);
      } catch (e) {
        console.error('[CALLBACK_FATAL_ERROR]', e);
        if (!cancelled) router.replace(baseLoginPath);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return <div style={{ padding: 24 }}>로그인 처리 중입니다...</div>;
}