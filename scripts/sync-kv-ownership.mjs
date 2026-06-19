/**
 * Copies canonical KV ownership rules to Supabase Edge bundle.
 * Run after editing src/app/security/kvProxyKeyOwnership.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src/app/security/kvProxyKeyOwnership.ts');
const target = path.join(root, 'supabase/functions/server/kvProxyKeyOwnership.ts');

const banner = `/** @generated — do not edit. Source: src/app/security/kvProxyKeyOwnership.ts */\n`;
const body = fs.readFileSync(source, 'utf8');
const withoutModuleComment = body.replace(/^\/\*\*[\s\S]*?\*\/\s*\n/, '');
fs.writeFileSync(target, banner + withoutModuleComment, 'utf8');
console.log('[sync-kv-ownership] updated', path.relative(root, target));
