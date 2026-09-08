import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve(process.cwd());
const IN_DIR = join(ROOT, '.audit', 'button-full-inventory');
const OUT1 = join(IN_DIR, 'buttons-classification-final.csv');
const OUT2 = join(IN_DIR, 'need-to-fix-b3-no-type.csv');
const OUT3 = join(IN_DIR, 'need-to-fix-r3-role.csv');
const OUT4 = join(IN_DIR, 'wontfix-roster-interim.csv');

function parseCsv(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { header: [], rows: [] };
  const split = (l) => {
    const out = []; let cur = ''; let inQ = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (inQ) {
        if (c === '"' && l[i+1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === ',') { out.push(cur); cur = ''; }
        else if (c === '"') inQ = true;
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  return { header: split(lines[0]), rows: lines.slice(1).map(split) };
}

const inv = parseCsv(join(IN_DIR, 'buttons-inventory.csv'));
const role = parseCsv(join(IN_DIR, 'role-button-candidates.csv'));

const clasRows = [['file','line','has_type','type_value','has_onClick','inside_form_context','class_final','downgrade_reason_or_note','raw_snippet_240chars'].join(',')];
const b3Rows = [['file','line','raw_snippet_240chars'].join(',')];
const wontfixRows = [['category','file','line','downgrade_reason','raw_snippet'].join(',')];

// Counters
let B0 = 0, B1 = 0, B2 = 0, B3 = 0, B4 = 0;
for (const r of inv.rows) {
  const file = r[0] || '', line = r[1] || '';
  const has_type = String(r[2] || '').toLowerCase();
  const type_value = String(r[3] || '').toLowerCase();
  const has_onClick = String(r[4] || '');
  const inside_form = String(r[10] || '') === '1';
  const snippet = String(r[11] || '').replace(/"/g, '""');
  let cls = ''; let reason = '';
  if (has_type === '1') {
    if (type_value === 'button') { cls = 'B0-SAFE-explicit-type-button'; B0++; }
    else if (type_value === 'submit') { cls = 'B1-SAFE-explicit-type-submit'; B1++; reason = 'inside_form=' + inside_form; }
    else if (type_value === 'reset') { cls = 'B4-SAFE-explicit-type-reset'; B4++; }
    else { cls = 'B0-SAFE-explicit-type-other'; B0++; reason = 'type_value=' + type_value; }
  } else {
    // no type - NEEDS-FIX B3 unless inside a form with ZERO explicit type=submit detected within same file (approx escalate to B2 WONTFIX)
    // We'll flag B3 for all no-type. Manual read in T2 decides B3→B2 remap per file context.
    cls = 'B3-NEEDS-FIX-NO-TYPE-IMPLICIT-SUBMIT-RISK';
    reason = inside_form ? 'inside_form_context=1 (manual check in T2 for B2 remap if sole submit)' : 'outside-form (recommend add type="button")';
    B3++;
    b3Rows.push([`"${file.replace(/"/g,'')}"`, line, `"${snippet}"`].join(','));
  }
  clasRows.push([`"${file.replace(/"/g,'')}"`, line, has_type, `"${type_value}"`, has_onClick, inside_form?'1':'0', `"${cls}"`, `"${reason}"`, `"${snippet}"`].join(','));
}

// Role classifier
const r3Rows = [['file','line','element_tag','category_initial','class_final','swap_decision','downgrade_reason','raw_snippet'].join(',')];
let R0 = 0, R1 = 0, R2 = 0, R3 = 0;
for (const r of role.rows) {
  const file = (r[0] || '').replace(/"/g, '');
  const line = r[1] || '';
  const tag = (r[2] || '').replace(/"/g, '');
  const cat_init = (r[10] || '').replace(/"/g, '');
  const snippet = (r[11] || '').replace(/"/g, '""');
  let cls_final = cat_init;
  let decision = 'INSPECT MANUAL IN T3';
  let reason = '';
  if (cat_init.startsWith('R0')) { cls_final = 'R0-WONTFIX-RADIX-asChild'; R0++; decision = 'WONTFIX'; reason = 'Radix primitive handles role + keyboard via asChild'; }
  else if (cat_init.startsWith('R1')) { cls_final = 'R1-WONTFIX-INNER-BUTTON-INPUT'; R1++; decision = 'WONTFIX'; reason = 'descendant <input>|<button> inside — HTML 4.10.8 forbids'; }
  else if (cat_init.startsWith('R2')) { cls_final = 'R2-WONTFIX-DRAG'; R2++; decision = 'WONTFIX'; reason = 'draggable surface UA-activation interferes drag'; }
  else { cls_final = 'R3-NEEDS-FIX-ROLE-BUTTON→NATIVE-BUTTON'; R3++; decision = 'SWAP pending T3 balanced close tag'; }
  if (decision === 'WONTFIX') wontfixRows.push([`"${cls_final}"`, `"${file}"`, line, `"${reason}"`, `"${snippet}"`].join(','));
  if (decision.startsWith('SWAP')) r3Rows.push([`"${file}"`, line, `"${tag}"`, `"${cat_init}"`, `"${cls_final}"`, `"${decision}"`, `"${reason}"`, `"${snippet}"`].join(','));
  clasRows.push([`"${file}"`, line, 'role-only', `""`, '', '', `"${cls_final}"`, `"${reason}"`, `"${snippet}"`].join(','));
}

writeFileSync(OUT1, clasRows.join('\n') + '\n');
writeFileSync(OUT2, b3Rows.join('\n') + '\n');
writeFileSync(OUT3, r3Rows.join('\n') + '\n');
writeFileSync(OUT4, wontfixRows.join('\n') + '\n');

console.log(`[button-04-cls] Inventory: B0=${B0} B1=${B1} B2=${B2} B3=${B3} B4=${B4}`);
console.log(`[button-04-cls] Role: R0=${R0} R1=${R1} R2=${R2} R3=${R3}`);
console.log(`[button-04-cls] need-to-fix-b3=${b3Rows.length-1}  need-to-fix-r3=${r3Rows.length-1}  wontfix-interim=${wontfixRows.length-1}`);
console.log(`[button-04-cls] out: classification-final rows=${clasRows.length-1}`);
process.exit(0);
