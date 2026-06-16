import fs from "node:fs";
import path from "node:path";
import pg from "pg";

let setupSucceeded = false;

function projectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

export function getDbConnectionStrings(): string[] {
  const strings: string[] = [];
  if (process.env.DATABASE_URL) {
    strings.push(process.env.DATABASE_URL);
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!password || !projectRef) {
    return strings;
  }

  const encoded = encodeURIComponent(password);
  strings.push(`postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`);
  strings.push(
    `postgresql://postgres.${projectRef}:${encoded}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
  );
  return strings;
}

function loadSetupSql(): string {
  const sqlPath = path.join(process.cwd(), "supabase", "sql", "014_setup_consultation_leads_complete.sql");
  return fs.readFileSync(sqlPath, "utf8");
}

async function runSetupSql(connectionString: string): Promise<void> {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(loadSetupSql());
  } finally {
    await client.end();
  }
}

/** Creates consultation_leads when DATABASE_URL or SUPABASE_DB_PASSWORD is configured. */
export async function ensureConsultationLeadsTable(): Promise<boolean> {
  if (setupSucceeded) return true;

  const connectionStrings = getDbConnectionStrings();
  if (connectionStrings.length === 0) {
    return false;
  }

  let lastError: Error | null = null;

  for (const connectionString of connectionStrings) {
    try {
      await runSetupSql(connectionString);
      setupSucceeded = true;
      console.log("[consultation-leads-setup] table ready");
      return true;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn("[consultation-leads-setup] connection failed", lastError.message);
    }
  }

  console.error("[consultation-leads-setup] all connections failed", lastError?.message);
  return false;
}

export function isMissingTableError(code: string | undefined): boolean {
  return code === "PGRST205" || code === "42P01";
}
