/**
 * يفشل البناء قبل vite build إن غابت قيم VITE_SUPABASE_* الحقيقية.
 * على Vercel: Project → Settings → Environment Variables (Production + Preview) ثم Redeploy.
 *
 * Usage: node scripts/guard-vite-build-env.mjs
 */
const PLACEHOLDER_RE = /YOUR_PROJECT|eyJ\.\.\.|CHANGE_ME|placeholder|xxxx/i;

/** @param {string} name */
function readEnv(name) {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
}

/** @param {string} url */
function isSupabaseUrl(url) {
  return /^https:\/\/[a-z0-9][a-z0-9-]*\.supabase\.co\/?$/i.test(url);
}

const url = readEnv('VITE_SUPABASE_URL');
const anon = readEnv('VITE_SUPABASE_ANON_KEY');

/** @type {string[]} */
const problems = [];

if (!url) problems.push('VITE_SUPABASE_URL is unset');
else if (PLACEHOLDER_RE.test(url)) problems.push('VITE_SUPABASE_URL is still a placeholder');
else if (!isSupabaseUrl(url)) problems.push('VITE_SUPABASE_URL is not a valid https://*.supabase.co URL');

if (!anon) problems.push('VITE_SUPABASE_ANON_KEY is unset');
else if (PLACEHOLDER_RE.test(anon)) problems.push('VITE_SUPABASE_ANON_KEY is still a placeholder');
else if (anon.length <= 20) problems.push('VITE_SUPABASE_ANON_KEY is too short');

if (problems.length) {
  console.error('[guard-vite-build-env] BLOCKED — client Supabase env missing at build time:\n');
  for (const p of problems) console.error(`  • ${p}`);
  console.error(`
Fix on Vercel:
  1. Project → Settings → Environment Variables
  2. Add (for Production AND Preview):
       VITE_SUPABASE_URL      = https://YOUR_REF.supabase.co
       VITE_SUPABASE_ANON_KEY = eyJ... (anon public key from Supabase → API)
  3. Deployments → … → Redeploy (build must rerun — changing env alone is not enough)

Values come from Supabase Dashboard → Project Settings → API.
`);
  process.exit(1);
}

console.log('[guard-vite-build-env] OK — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY present for build');
