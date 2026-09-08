import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve(process.cwd());
const SRC_APP = join(ROOT, 'src', 'app');
const OUT_DIR = join(ROOT, '.audit', 'button-full-inventory');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const OUTFILE = join(OUT_DIR, 'role-button-candidates.csv');

function walk(dir, files = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith('.tsx')) files.push(p);
  }
  return files;
}

const files = walk(SRC_APP).filter(f => !f.match(/(\\|\/)(__tests__|tests)(\\|\/)/) && !f.match(/\.(test|spec)\./));
const rows = [['file','line','element_tag','class_name','has_onClick','has_onPointerDown','has_onKeyDown','has_descendant_button_or_input','has_draggable','is_radix_asChild_context','category_initial','raw_snippet_200chars'].join(',')];

let count = 0;

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const lines = text.split(/\r?\n/);
  const relF = relative(ROOT, f).replace(/\\/g, '/');
  for (let i = 0; i < lines.length; i++) {
    if (!/role\s*=\s*(['"])button\1/.test(lines[i])) continue;

    let lineNoOpen = i;
    let startLine = i;
    let startCol = lines[i].lastIndexOf('<', lines[i].indexOf('role'));
    for (let j = i; j >= Math.max(0, i - 6) && startCol < 0; j--) {
      const candidate = lines[j];
      const candidateCol = candidate.lastIndexOf('<');
      if (candidateCol >= 0) {
        startLine = j;
        startCol = candidateCol;
        lineNoOpen = j;
        break;
      }
    }
    if (startCol < 0) continue;

    let tagBuffer = lines[startLine].slice(startCol);
    let endLine = startLine;
    let braceDepth = 0;
    let foundClose = false;
    for (let j = startLine; j < Math.min(lines.length, startLine + 20) && !foundClose; j++) {
      const segment = j === startLine ? lines[j].slice(startCol) : lines[j];
      if (j !== startLine) tagBuffer += '\n' + segment;
      for (const ch of segment) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
        else if (ch === '>' && braceDepth === 0) {
          foundClose = true;
          endLine = j;
          break;
        }
      }
    }
    if (!foundClose) continue;

    const tagNameMatch = tagBuffer.match(/^<\s*([A-Za-z0-9.]+)/);
    const tagName = tagNameMatch?.[1] || '';
    if (!tagName) continue;

    count++;
    let category = 'R3-ELIGIBLE-PENDING-INSPECTION';
    const classNameMatch = tagBuffer.match(/\bclassName\s*=\s*(['"])([^'"]*)\1/);
    const className = classNameMatch ? classNameMatch[2].slice(0, 140) : '';
    const localContext = lines.slice(Math.max(0, startLine - 3), Math.min(lines.length, endLine + 12)).join('\n');
    const hasOnClick = /\bonClick\s*=/.test(tagBuffer);
    const hasOnPD = /\bonPointerDown\s*=/.test(tagBuffer);
    const hasOnKD = /\bonKeyDown\s*=/.test(tagBuffer);
    const hasInputOrBtnInside = /<(input|button|textarea|select)\b/i.test(localContext);
    const hasDraggable = /\bdraggable\b(?:\s*=\s*{?true}?|\s*=\s*['"]true['"])?/i.test(tagBuffer);
    const isRadixAsChild = /\basChild\b/.test(localContext) || /(DropdownMenuItem|ToolbarButton|ToggleGroupItem|DialogClose|ContextMenuItem|MenubarItem|SelectItem|NavigationMenuItem)/i.test(localContext);

    if (isRadixAsChild) category = 'R0-RADIX-asChild';
    else if (hasInputOrBtnInside) category = 'R1-HAS-INNER-BUTTON-INPUT';
    else if (hasDraggable) category = 'R2-DRAG-HANDLE';

    const snippet = tagBuffer.replace(/\s+/g, ' ').replace(/"/g, '""').slice(0, 200);
    rows.push([
      `"${relF}"`, (lineNoOpen + 1), `"${tagName}"`, `"${className.replace(/"/g, '""')}"`,
      hasOnClick ? '1' : '0', hasOnPD ? '1' : '0', hasOnKD ? '1' : '0',
      hasInputOrBtnInside ? '1' : '0', hasDraggable ? '1' : '0',
      isRadixAsChild ? '1' : '0',
      `"${category}"`, `"${snippet}"`,
    ].join(','));
  }
}

writeFileSync(OUTFILE, rows.join('\n') + '\n');
console.log(`[button-03-role] files=${files.length} role=button candidates=${count} rows=${rows.length-1} out=${relative(ROOT, OUTFILE)}`);
process.exit(0);
