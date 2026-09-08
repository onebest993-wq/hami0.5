import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';

const ROOT = resolve(process.cwd());
const SRC_APP = join(ROOT, 'src', 'app');
const OUT_DIR = join(ROOT, '.audit', 'button-full-inventory');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const OUTFILE = join(OUT_DIR, 'buttons-inventory.csv');

function walk(dir, files = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith('.tsx')) files.push(p);
  }
  return files;
}

const files = walk(SRC_APP).filter(f => !f.match(/(\\|\/)(__tests__|tests)(\\|\/)/) && !f.match(/\.(test|spec)\./));
const rows = [['file','line','has_type','type_value','has_onClick','has_onPointerDown','has_onKeyDown','has_disabled','has_aria_disabled','has_role_attr','inside_form_context','raw_html_snippet_240chars'].join(',')];

let totalButtons = 0;
let noType = 0;

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const relF = relative(ROOT, f).replace(/\\/g, '/');
  // find <form or <Form > line boundaries to detect inside-form context for each button
  const formOpenLines = new Set();
  const formCloseLines = new Set();
  const flines = text.split(/\r?\n/);
  let formDepth = 0;
  const lineHasFormOpen = flines.map(l => {
    const opens = (l.match(/<(Form|form)\b/g) || []).length;
    formDepth += opens;
    const closes = (l.match(/<\/(Form|form)\b/g) || []).length + (l.match(/\bform\s*>\s*$/g) || []).length;
    const hasOpenClose = formDepth > 0;
    formDepth = Math.max(0, formDepth - closes);
    return hasOpenClose;
  });

  // match each <button ... > possibly multiline by finding start line then scan forward until unbalanced >
  const lines = flines;
  const len = lines.length;
  for (let i = 0; i < len; i++) {
    const btnIdx = lines[i].indexOf('<button');
    if (btnIdx < 0) continue;
    // find closing > of the opening tag (brace-aware { })
    let j = i;
    let pos = btnIdx + 7;
    let depthBrace = 0;
    let tagBuffer = lines[i].slice(btnIdx);
    let foundClose = false;
    let safety = 0;
    while (!foundClose && j < len && safety < 80) {
      safety++;
      const lineS = (j === i) ? lines[i].slice(pos) : lines[j];
      for (let k = 0; k < lineS.length; k++) {
        const ch = lineS[k];
        if (ch === '{') depthBrace++;
        else if (ch === '}') depthBrace--;
        else if (ch === '>' && depthBrace === 0) { foundClose = true; break; }
      }
      if (!foundClose) {
        j++;
        if (j < len) tagBuffer += '\n' + lines[j];
      }
    }
    totalButtons++;
    const tagOneLine = tagBuffer.replace(/\s+/g, ' ').trim();
    const hasType = /\btype\s*=\s*(['"]?)([a-z]+)\1/i.test(tagBuffer);
    let typeValue = '';
    const tm = tagBuffer.match(/\btype\s*=\s*(['"]?)([a-z]+)\1/i);
    if (tm) typeValue = tm[2].toLowerCase();
    const hasOnClick = /\bonClick\s*=/.test(tagBuffer);
    const hasOnPDown = /\bonPointerDown\s*=/.test(tagBuffer);
    const hasOnKDown = /\bonKeyDown\s*=/.test(tagBuffer);
    const hasDisabled = /\bdisabled\b(?!\s*=|:)/.test(tagBuffer) || /\bdisabled\s*=\s*(['"]?)(true|{|['"])/.test(tagBuffer);
    const hasAriaDisabled = /\baria-disabled\s*=/.test(tagBuffer);
    const hasRoleAttr = /\brole\s*=\s*['"][^'"]+['"]/.test(tagBuffer);
    const insideForm = lineHasFormOpen[i] ? '1' : '0';
    if (!hasType) noType++;
    const snippet = tagOneLine.replace(/"/g, '""').slice(0, 240);
    rows.push([
      `"${relF}"`, (i+1), hasType ? '1' : '0',
      `"${typeValue}"`,
      hasOnClick ? '1' : '0', hasOnPDown ? '1' : '0', hasOnKDown ? '1' : '0',
      hasDisabled ? '1' : '0', hasAriaDisabled ? '1' : '0',
      hasRoleAttr ? '1' : '0',
      insideForm,
      `"${snippet}"`
    ].join(','));
  }
}

writeFileSync(OUTFILE, rows.join('\n') + '\n');
console.log(`[button-02-inv] files=${files.length} buttons=${totalButtons} no-type=${noType} rows=${rows.length-1} out=${relative(ROOT, OUTFILE)}`);
process.exit(0);
