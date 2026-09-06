/**
 * الخطوة د: التقط تواريخ آخر تعديل لكل ملف تغيّر بين audit-baseline وHEAD
 * بديل bash while loop ليعمل عبر المنصات (win32/posix)
 * المخرجات: ../hami-handoff/00-file-timestamps.txt فرّق tab بين "YYYY-MM-DD HH:mm" و"المسار"
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, '..', 'hami-handoff');
const OUT_FILE = join(OUT_DIR, '00-file-timestamps.txt');
mkdirSync(OUT_DIR, { recursive: true });

const r = spawnSync('git', ['diff', '--name-only', 'audit-baseline', 'HEAD'], {
  cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32'
});
if (r.status !== 0) {
  console.error('git diff name-only failed:', r.stderr);
  process.exit(2);
}
const files = (r.stdout || '').split(/\r?\n/).filter(Boolean);
const lines = [];
for (const f of files) {
  const abs = resolve(ROOT, f);
  if (!existsSync(abs)) continue;
  try {
    const st = statSync(abs);
    const d = st.mtime;
    const pad = (n) => n.toString().padStart(2, '0');
    const ts = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    lines.push(`${ts}\t${f}`);
  } catch {
    /* skip */
  }
}
lines.sort((a,b) => a.localeCompare(b));
writeFileSync(OUT_FILE, lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
console.log(`STEP-D OK — wrote ${lines.length} timestamps → ${relative(ROOT, OUT_FILE)} (${lines.length} files tracked)`);
process.exit(0);
