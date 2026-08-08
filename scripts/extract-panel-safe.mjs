import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const ROOT_FILE = path.join(ROOT, 'ActiveOrderFileRoot.tsx');

const RESERVED = new Set([
    'if', 'else', 'return', 'null', 'true', 'false', 'new', 'typeof', 'void', 'case', 'break', 'default', 'switch',
    'async', 'await', 'import', 'export', 'from', 'as', 'key', 'ref', 'className', 'type', 'button', 'motion.div',
    'div', 'span', 'input', 'label', 'select', 'option', 'textarea', 'form', 'a', 'h1', 'h2', 'h3', 'p', 'React',
    'motion', 'AnimatePresence', 'Calendar', 'Plus', 'Check', 'Ban', 'Scale', 'FileText', 'DollarSign', 'Briefcase',
    'Info', 'Pencil', 'FileCheck', 'Printer', 'ArrowLeft', 'X', 'User', 'Building2', 'MapPin', 'Phone', 'AlertTriangle',
    'Briefcase', 'String', 'Number', 'Boolean', 'Array', 'Date', 'Object', 'Math', 'JSON', 'Promise', 'Error',
    'console', 'window', 'document', 'Intl', 'Map', 'Set', 'undefined', 'length', 'map', 'filter', 'find', 'some',
    'every', 'includes', 'trim', 'split', 'join', 'push', 'slice', 'test', 'match', 'isNaN', 'getTime', 'setState',
    'preventDefault', 'stopPropagation', 'currentTarget', 'target', 'files', 'value', 'checked', 'disabled',
    'initial', 'animate', 'exit', 'transition', 'children', 'open', 'min', 'max', 'name', 'id', 'htmlFor', 'aria',
    'hidden', 'accept', 'placeholder', 'dir', 'rel', 'href', 'side', 'align', 'sideOffset', 'size', 'title',
    'stage', 'outcome', 'notes', 'decision', 'color', 'icon', 'text', 'kind', 'file', 'link', 'person', 'company',
    'client', 'opponent', 'filed', 'expired', 'confirmed', 'modified', 'canceled', 'accepted', 'rejected',
    'partially_accepted', 'pending', 'executed', 'grievance', 'cassation', 'adjourn', 'close', 'terminate',
    'pre_decision', 'system', 'action', 'edit', 'unknown', 'green', 'blue', 'purple', 'slate', 'amber', 'rose',
    'emerald', 'cyan', 'violet', 'auto', 'easeInOut', 'ease', 'duration', 'opacity', 'height', 'y', 'flex', 'grid',
    'block', 'inline', 'print', 'keyof', 'in', 'of', 'const', 'let', 'var', 'function', 'interface', 'enum',
    'ValidationBanner', 'DatePickerField', 'PartyCardItem', 'PRE_DECISION_OUTCOME_ADJOURN', 'PRE_DECISION_OUTCOME_CLOSE',
    'PRE_DECISION_OUTCOME_NULLIFY', 'AnimatePresence', 'motion', 'createPortal', 'startTransition', 'useMemo', 'useEffect',
    'useRef', 'useState', 'useAuth', 'uuidv4', 'UrgentActionsDB', 'getActiveDate', 'formatDateText', 'formatDateTimeText',
    'formatTimeText', 'formatRequestNumberText', 'eventKindMeta', 'cassationDecisionText', 'addDaysYmd', 'maxYmd',
    'safeMaxToday', 'todayYmd', 'getDynamicPartyLabels', 'ordinalOf', 'isAdjournReasonValid', 'getPreDecisionHearingOutcome',
    'getPreDecisionSessionOutcome', 'isGrievancePleadingClosedSession', 'isPreDecisionCloseNotes', 'isPreDecisionNullifyNotes',
    'isIqrarRequest', 'actionTypeOptions', 'JUDICIAL_ACKNOWLEDGMENT_PRIMARY', 'URGENT_PETITION_PRIMARY',
]);

function collectScopeNames(bodyLines) {
    const names = new Set();
    for (const line of bodyLines) {
        let m = line.match(/^\s*const \[(\w+), (\w+)\]/);
        if (m) {
            names.add(m[1]);
            names.add(m[2]);
            continue;
        }
        m = line.match(/^\s*const (\w+) =/);
        if (m) names.add(m[1]);
        m = line.match(/^\s*function (\w+)\s*\(/);
        if (m) names.add(m[1]);
    }
    return names;
}

/** استبدال معرّفات داخل JSX فقط (خارج النصوص بين علامات اقتباس) */
function prefixIdentifiers(code, scopeNames, prefix = 'p.') {
    let out = '';
    let i = 0;
    while (i < code.length) {
        const ch = code[i];
        if (ch === '"' || ch === "'" || ch === '`') {
            const quote = ch;
            out += ch;
            i++;
            while (i < code.length) {
                if (code[i] === '\\') {
                    out += code[i] + (code[i + 1] || '');
                    i += 2;
                    continue;
                }
                if (code[i] === quote) {
                    out += code[i];
                    i++;
                    break;
                }
                out += code[i++];
            }
            continue;
        }
        const rest = code.slice(i);
        const word = rest.match(/^([A-Za-z_$][\w$]*)/);
        if (word) {
            const w = word[1];
            if (scopeNames.has(w) && !RESERVED.has(w)) {
                out += prefix + w;
                i += w.length;
                continue;
            }
        }
        out += ch;
        i++;
    }
    return out;
}

function extractPanel({ name, startMarker, endMarker, componentImports, rootReplace }) {
    const lines = fs.readFileSync(ROOT_FILE, 'utf8').split(/\r?\n/);
    const startIdx = lines.findIndex(startMarker);
    const endIdx = lines.findIndex((l, i) => i > startIdx && endMarker(l, i, lines));
    if (startIdx < 0 || endIdx < 0) {
        console.error(`${name}: markers not found`, startIdx, endIdx);
        process.exit(1);
    }

    const bodyStart = lines.findIndex((l) => l.includes('const fd = fileData'));
    const confirmLine = lines.findIndex((l) => l.includes('const confirmPortal = ('));
    const bodyLines = lines.slice(bodyStart, confirmLine);
    const scopeNames = collectScopeNames(bodyLines);

    const chunk = lines.slice(startIdx, endIdx).join('\n');
    const used = new Set();
    for (const n of scopeNames) {
        if (new RegExp(`\\b${n}\\b`).test(chunk)) used.add(n);
    }

    const prefixed = prefixIdentifiers(chunk, used, 'p.');
    const sortedUsed = [...used].sort();

    const propsType = `export type ${name}Props = {\n${sortedUsed.map((k) => `    ${k}: unknown;`).join('\n')}\n};\n`;

    const component = `${componentImports}
import { ValidationBanner } from '../components/ValidationBanner';
import { DatePickerField } from '../components/DatePickerField';
import type { ${name}Props } from './${name}Props';

export function ${name}(p: ${name}Props) {
    return (
${prefixed}
    );
}
`;

    fs.writeFileSync(path.join(ROOT, `layout/${name}Props.ts`), propsType);
    fs.writeFileSync(path.join(ROOT, `layout/${name}.tsx`), component);

    const pickEntries = sortedUsed.map((k) => `            ${k},`).join('\n');
    const pickFn = `export function pick${name}Props(src: Record<string, unknown>): ${name}Props {
    return {
${pickEntries}
    } as ${name}Props;
}
`;

    const newLines = [
        ...lines.slice(0, startIdx),
        `                        <${name} {...pick${name}Props(lifecycleScope)} />`,
        ...lines.slice(endIdx),
    ];
    fs.writeFileSync(ROOT_FILE, newLines.join('\n'));

    return { name, sortedUsed, pickFn, lines: endIdx - startIdx };
}

// Will run lifecycle then admin in sequence - need to update root file once
console.log('Use extract-lifecycle and extract-admin separately');
