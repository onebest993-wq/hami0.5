/**
 * Delete fully unused export declarations (0 external refs, <=1 in-file name hit).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const dels = JSON.parse(
  fs.readFileSync(path.join(ROOT, '.audit/_tmp_lawsuit_delete_candidates.json'), 'utf8'),
);

function stripCommentsForScan(src) {
  // keep positions aligned by replacing comment bodies with spaces
  let out = '';
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '/' && src[i + 1] === '/') {
      out += '  ';
      i += 2;
      while (i < src.length && src[i] !== '\n') {
        out += ' ';
        i++;
      }
      if (i < src.length) out += '\n';
      continue;
    }
    if (src[i] === '/' && src[i + 1] === '*') {
      out += '  ';
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  ';
      i += 1;
      continue;
    }
    out += src[i];
  }
  return out;
}

function findExportSpan(src, name) {
  const scan = stripCommentsForScan(src);
  const patterns = [
    new RegExp(`export\\s+async\\s+function\\s+${name}\\b`),
    new RegExp(`export\\s+function\\s+${name}\\b`),
    new RegExp(`export\\s+type\\s+${name}\\b`),
    new RegExp(`export\\s+interface\\s+${name}\\b`),
    new RegExp(`export\\s+const\\s+${name}\\b`),
    new RegExp(`export\\s+let\\s+${name}\\b`),
    new RegExp(`export\\s+enum\\s+${name}\\b`),
    new RegExp(`export\\s+class\\s+${name}\\b`),
  ];
  let start = -1;
  for (const re of patterns) {
    const m = re.exec(scan);
    if (m) {
      start = m.index;
      break;
    }
  }
  if (start < 0) return null;

  // include preceding JSDoc / blank lines
  let lead = start;
  while (lead > 0 && (src[lead - 1] === ' ' || src[lead - 1] === '\t')) lead--;
  if (lead > 0 && src[lead - 1] === '\n') {
    // check for /** ... */ immediately above
    let probe = lead - 1; // at newline
    while (probe > 0 && (src[probe - 1] === ' ' || src[probe - 1] === '\t' || src[probe - 1] === '\n')) {
      probe--;
    }
    // find end of previous non-ws
    const before = src.slice(0, lead).trimEnd();
    if (before.endsWith('*/')) {
      const docStart = before.lastIndexOf('/**');
      if (docStart >= 0) {
        // include from docStart through leading newline
        const absDoc = src.lastIndexOf('/**', start);
        if (absDoc >= 0 && absDoc < start) lead = absDoc;
      }
    }
  }

  // find end: for type/const without braces use semicolon or end of type expression
  let i = start;
  // skip to first { or ; or = 
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let seenBodyDelim = false;
  let inStr = null;
  let end = -1;

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (inStr) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      i++;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    if (ch === '(') depthParen++;
    else if (ch === ')') depthParen--;
    else if (ch === '[') depthBracket++;
    else if (ch === ']') depthBracket--;
    else if (ch === '{') {
      depthBrace++;
      seenBodyDelim = true;
    } else if (ch === '}') {
      depthBrace--;
      if (seenBodyDelim && depthBrace === 0 && depthParen === 0 && depthBracket === 0) {
        end = i + 1;
        if (src[end] === ';') end++;
        break;
      }
    } else if (ch === ';' && depthBrace === 0 && depthParen === 0 && depthBracket === 0) {
      end = i + 1;
      break;
    }
    i++;
  }

  if (end < 0) return null;

  // eat trailing newline
  while (end < src.length && (src[end] === '\n' || src[end] === '\r')) end++;

  return { lead, end };
}

const byFile = new Map();
for (const d of dels) {
  if (!byFile.has(d.rel)) byFile.set(d.rel, []);
  byFile.get(d.rel).push(d.name);
}

let deleted = 0;
const report = [];
const fails = [];

for (const [rel, names] of byFile) {
  const abs = path.join(ROOT, rel);
  let text = fs.readFileSync(abs, 'utf8');
  // delete from bottom to top by finding spans repeatedly
  for (const name of names) {
    const span = findExportSpan(text, name);
    if (!span) {
      fails.push(`${rel} :: ${name}`);
      continue;
    }
    text = text.slice(0, span.lead) + text.slice(span.end);
    deleted += 1;
    report.push(`${rel} :: ${name}`);
  }
  // tidy triple blank lines
  text = text.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(abs, text);
}

fs.writeFileSync(
  path.join(ROOT, '.audit/_tmp_lawsuit_delete_report.txt'),
  [`deleted=${deleted}`, 'FAILS:', ...fails, 'OK:', ...report].join('\n'),
);
console.log(`deleted=${deleted} fails=${fails.length}`);
if (fails.length) console.log(fails.join('\n'));
