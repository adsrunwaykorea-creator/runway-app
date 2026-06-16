/**
 * Apply consultation_leads schema to Supabase.
 *
 * Usage (set DB password from Supabase Dashboard → Settings → Database):
 *   $env:SUPABASE_DB_PASSWORD="your-db-password"
 *   node scripts/setup-consultation-leads.mjs
 *
 * Or with full connection string:
 *   $env:DATABASE_URL="postgresql://postgres.[ref]:[password]@..."
 *   node scripts/setup-consultation-leads.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function getConnectionString(env) {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  const url = env.NEXT_PUBLIC_SUPABASE_URL || '';
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!password || !match) {
    throw new Error(
      'Set SUPABASE_DB_PASSWORD or DATABASE_URL. Password: Supabase Dashboard → Settings → Database',
    );
  }

  const projectRef = match[1];
  return `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;
}

async function main() {
  const env = loadEnvLocal();
  const sqlPath = path.join(__dirname, '..', 'supabase', 'sql', '014_setup_consultation_leads_complete.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const connectionString = getConnectionString(env);

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log('✓ consultation_leads table is ready.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Setup failed:', error.message);
  process.exit(1);
});
