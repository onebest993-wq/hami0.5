/**
 * Delete fully unused declarations (post-demote: no longer need `export` prefix).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** Extra orphans tied to deleted symbols (same-file-only helpers). */
const EXTRA = [
  {
    rel: 'src/app/components/lawyer/criminal-system/components/JudicialDecisionsLedgerCardShared.tsx',
    name: 'CassationResultMarkProps',
  },
];

const dels = [
  ...JSON.parse(fs.readFileSync(path.join(ROOT, '.audit/_tmp_lawsuit_delete_candidates.json'), 'utf8')),
  ...EXTRA,
];

function stripCommentsForScan(src) {
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

function findDeclSpan(src, name) {
  const scan = stripCommentsForScan(src);
  const patterns = [
    new RegExp(`(?:export\\s+)?async\\s+function\\s+${name}\\b`),
    new RegExp(`(?:export\\s+)?function\\s+${name}\\b`),
    new RegExp(`(?:export\\s+)?type\\s+${name}\\b`),
    new RegExp(`(?:export\\s+)?interface\\s+${name}\\b`),
    new RegExp(`(?:export\\s+)?const\\s+${name}\\b`),
    new RegExp(`(?:export\\s+)?let\\s+${name}\\b`),
    new RegExp(`(?:export\\s+)?enum\\s+${name}\\b`),
    new RegExp(`(?:export\\s+)?class\\s+${name}\\b`),
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

  let lead = start;
  while (lead > 0 && (src[lead - 1] === ' ' || src[lead - 1] === '\t')) lead--;
  if (lead > 0 && src[lead - 1] === '\n') {
    const before = src.slice(0, lead).trimEnd();
    if (before.endsWith('*/')) {
      const absDoc = src.lastIndexOf('/**', start);
      if (absDoc >= 0 && absDoc < start) lead = absDoc;
    }
  }

  let i = start;
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
  // Delete bottom-up by re-finding each time; sort by last occurrence
  const ordered = [...names].sort((a, b) => {
    const ia = text.lastIndexOf(a);
    const ib = text.lastIndexOf(b);
    return ib - ia;
  });
  for (const name of ordered) {
    const span = findDeclSpan(text, name);
    if (!span) {
      fails.push(`${rel} :: ${name}`);
      continue;
    }
    text = text.slice(0, span.lead) + text.slice(span.end);
    deleted += 1;
    report.push(`${rel} :: ${name}`);
  }
  text = text.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(abs, text);
}

fs.writeFileSync(
  path.join(ROOT, '.audit/_tmp_lawsuit_delete_oneshot_report.txt'),
  [`deleted=${deleted}`, 'FAILS:', ...fails, 'OK:', ...report].join('\n'),
);
console.log(`deleted=${deleted} fails=${fails.length}`);
if (fails.length) console.log(fails.join('\n'));
