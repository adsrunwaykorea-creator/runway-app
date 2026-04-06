import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 공개용 키만 사용하는 클라이언트 초기화
 * service role key는 절대 브라우저에 두지 않습니다.
 */
const SUPABASE_URL = "https://mipktdybnzuwgrrhiews.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pcGt0ZHlibnp1d2dycmhpZXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDYwODYsImV4cCI6MjA5MDM4MjA4Nn0.jU5_SHVjW0nx9_hncQ26J07kxnG4w1BLLpdzEEEYTmc";

let supabaseClient = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_URL === "YOUR_SUPABASE_URL" ||
    SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY"
  ) {
    throw new Error(
      "Supabase 설정값이 비어 있습니다. js/supabase-client.js의 URL/ANON KEY를 입력해주세요."
    );
  }

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}
