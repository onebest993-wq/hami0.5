#!/usr/bin/env node
/**
 * ترحيل سجلات lawyer-verification في KV إلى active للمحامين المعتمدين حالياً.
 * يمنع قطع المنتدى بعد fail-closed على الحسابات القديمة بلا سجل KV.
 *
 * Dry-run افتراضياً. للكتابة:
 *   node scripts/migrate-lawyer-verification-active.mjs --apply
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   KV_STORE_TABLE (اختياري — افتراضي kv_store_f09713ba)
 */
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const table = (process.env.KV_STORE_TABLE || 'kv_store_f09713ba').trim();

if (!url || !key) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function keyFor(userId) {
  return `lawyer-verification:${userId}`;
}

function buildActiveRecord(userId, existing) {
  const now = new Date().toISOString();
  const base = existing && typeof existing === 'object' ? existing : {};
  return {
    ...base,
    userId,
    status: 'active',
    submittedAt: typeof base.submittedAt === 'string' ? base.submittedAt : now,
    updatedAt: now,
    email: String(base.email ?? ''),
    fullName: String(base.fullName ?? ''),
    familyName: String(base.familyName ?? ''),
    phone: String(base.phone ?? ''),
    governorate: String(base.governorate ?? ''),
    lawyerBarRoom: String(base.lawyerBarRoom ?? ''),
    faceAssistOptedIn: Boolean(base.faceAssistOptedIn),
    hasIdFront: Boolean(base.hasIdFront),
    hasIdBack: Boolean(base.hasIdBack),
    hasFaceSelfie: Boolean(base.hasFaceSelfie),
    migratedBy: 'migrate-lawyer-verification-active',
    migratedAt: now,
  };
}

const { data: profiles, error: profilesError } = await admin
  .from('profiles')
  .select('id, role, is_banned, is_active, is_deleted')
  .in('role', ['lawyer', 'moderator', 'admin'])
  .eq('is_banned', false)
  .eq('is_active', true)
  .eq('is_deleted', false);

if (profilesError) {
  console.error('profiles query failed:', profilesError.message);
  process.exit(1);
}

const rows = profiles ?? [];
console.log(`Eligible profiles: ${rows.length}`);
console.log(APPLY ? 'Mode: APPLY (writes)' : 'Mode: DRY-RUN (no writes)');

let createCount = 0;
let upgradeCount = 0;
let skipActive = 0;
let skipRejected = 0;
let errors = 0;

for (const profile of rows) {
  const userId = profile.id;
  const kvKey = keyFor(userId);
  const { data: kvRow, error: kvErr } = await admin
    .from(table)
    .select('key, value')
    .eq('key', kvKey)
    .maybeSingle();

  if (kvErr) {
    console.error(`KV read failed for ${userId}:`, kvErr.message);
    errors += 1;
    continue;
  }

  const existing = kvRow?.value ?? null;
  const status =
    existing && typeof existing === 'object' && typeof existing.status === 'string'
      ? existing.status
      : null;

  if (status === 'active') {
    skipActive += 1;
    continue;
  }
  if (status === 'rejected') {
    skipRejected += 1;
    console.log(`skip rejected: ${userId}`);
    continue;
  }

  const next = buildActiveRecord(userId, existing);
  if (!status) createCount += 1;
  else upgradeCount += 1;

  console.log(`${status ? 'upgrade' : 'create'} → active: ${userId}`);

  if (APPLY) {
    const { error: upErr } = await admin.from(table).upsert({ key: kvKey, value: next });
    if (upErr) {
      console.error(`upsert failed ${userId}:`, upErr.message);
      errors += 1;
    }
  }
}

console.log('\nSummary');
console.log({ createCount, upgradeCount, skipActive, skipRejected, errors, apply: APPLY });
if (!APPLY) {
  console.log('\nRe-run with --apply to write changes.');
}
if (errors > 0) process.exit(1);
