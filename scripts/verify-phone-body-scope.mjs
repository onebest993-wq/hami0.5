/**
 * PhoneBody scope gate — نمط الـ model:
 * ExecutionDashboardPhoneBody يستهلك model من useExecutionDashboardPhoneBodyScope،
 * والمفاتيح الخام تصل عبر pickExecutionPhoneBodyScopeReadBag (قائمة مفاتيح typed).
 *
 * الفحوصات الحقيقية:
 *  1. كل scope.X داخل orchestrator موجود في مفاتيح الحقيبة (يصطاد مفاتيح ميتة مثل _setShowDecisionsModal).
 *  2. كل model.X في PhoneBody/Chrome وكل destructure من model في ScrollContent يوفره الـ orchestrator.
 *  3. كل مفتاح canonical في _phone-body-keys.json (غير passthrough) لا يزال متاحاً عبر الحقيبة أو الـ model.
 *  4. مفاتيح الحقيبة صالحة الأسماء + موجودة كـ bindings في مصادر الـ scope.
 *  5. لا بقايا p.* ولا تلف \= في ملفات الجسم.
 */
import fs from 'fs';
import {
    isPassthroughScopeKey,
    validateScopeKeys,
} from './phone-body-scope-utils.mjs';

const base = 'src/app/components/lawyer/ExecutionDashboard';
const phoneBodyPath = `${base}/components/ExecutionDashboardPhoneBody.tsx`;
const chromePath = `${base}/components/ExecutionDashboardPhoneBodyChrome.tsx`;
const scrollContentPath = `${base}/components/ExecutionDashboardPhoneBodyScrollContent.tsx`;
const orchestratorPath = `${base}/hooks/useExecutionDashboardPhoneBodyScope.ts`;
const pickBagPath = `${base}/hooks/pickExecutionPhoneBodyScopeReadBag.ts`;
const viewPath = `${base}/hooks/useExecutionDashboardView.tsx`;
const keysJsonPath = 'scripts/_phone-body-keys.json';
// عقد التعبئة الفعلي للـ scope ref — assignExecutionDashboardChunkScope ينسخ من هذه القوائم الثلاث
const scopeAssignKeyLists = [
    `${base}/hooks/executionPhoneBodyPropKeys.ts`,
    `${base}/hooks/executionShellOverlayPropKeys.ts`,
    `${base}/followupSnapshotFieldKeys.ts`,
];

const read = (p) => fs.readFileSync(p, 'utf8');
const body = read(phoneBodyPath);
const scrollContent = read(scrollContentPath);
const orchestrator = read(orchestratorPath);
const pickBag = read(pickBagPath);
const view = read(viewPath);
const canonicalKeys = JSON.parse(read(keysJsonPath));

const problems = [];

/* ---------- read-bag keys ---------- */
const bagMatch = pickBag.match(
    /EXECUTION_PHONE_BODY_SCOPE_READ_KEYS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/,
);
if (!bagMatch) {
    problems.push('EXECUTION_PHONE_BODY_SCOPE_READ_KEYS not found in pickExecutionPhoneBodyScopeReadBag.ts');
}
const bagKeys = new Set(
    bagMatch ? [...bagMatch[1].matchAll(/['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g)].map((m) => m[1]) : [],
);

/* ---------- model keys provided by the orchestrator return ---------- */
function extractReturnObjectKeys(hookText) {
    const idx = hookText.lastIndexOf('return {');
    if (idx < 0) return new Set();
    const keys = new Set();
    const block = hookText.slice(idx);
    for (const m of block.matchAll(/^\s{8}(?:\.\.\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*[:,]/gm)) {
        keys.add(m[1]);
    }
    return keys;
}
const modelKeys = extractReturnObjectKeys(orchestrator);
if (modelKeys.size < 50) {
    problems.push(`orchestrator model keys parse suspiciously small (${modelKeys.size})`);
}

/* ---------- 1) scope.X reads must exist in the bag (or scopeRef/props) ---------- */
const scopeMemberAllow = new Set(['scopeRef', 'props', 'executionData', 'id']);
for (const m of orchestrator.matchAll(/\bscope\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
    const key = m[1];
    if (scopeMemberAllow.has(key)) continue;
    if (!bagKeys.has(key)) {
        problems.push(`orchestrator reads scope.${key} but it is not in EXECUTION_PHONE_BODY_SCOPE_READ_KEYS (undefined at runtime)`);
    }
}

/* ---------- 2) model.X consumption must be provided ---------- */
function collectModelMemberRefs(text) {
    const refs = new Set();
    for (const m of text.matchAll(/\bmodel\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) refs.add(m[1]);
    return refs;
}
function collectModelDestructureKeys(text) {
    const keys = new Set();
    const m = text.match(/const \{([\s\S]*?)\} = model;/);
    if (!m) return keys;
    for (const part of m[1].split(',')) {
        const token = part.trim();
        if (!token || token.startsWith('...') || token.startsWith('//')) continue;
        const name = token.split(/[\s:]/)[0]?.trim();
        if (name && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) keys.add(name);
    }
    return keys;
}
const consumedModelKeys = new Set([
    ...collectModelMemberRefs(body),
    ...collectModelDestructureKeys(scrollContent),
    ...collectModelMemberRefs(scrollContent),
]);
for (const key of consumedModelKeys) {
    if (!modelKeys.has(key)) {
        problems.push(`model.${key} consumed by phone body but not returned by useExecutionDashboardPhoneBodyScope`);
    }
}

/* ---------- 3) canonical keys still reachable ---------- */
const reachable = (k) => bagKeys.has(k) || modelKeys.has(k) || isPassthroughScopeKey(k);
const unreachable = canonicalKeys.filter((k) => !reachable(k));
if (unreachable.length) {
    problems.push(
        `canonical keys unreachable via bag/model (${unreachable.length}): ${unreachable.slice(0, 8).join(', ')}…`,
    );
}

/* ---------- 4) bag key hygiene + coverage by the scope-assign contract ---------- */
problems.push(...validateScopeKeys(view, [...bagKeys]));
const assignedScopeKeys = new Set();
for (const listPath of scopeAssignKeyLists) {
    const text = read(listPath);
    const listBody = text.match(/=\s*\[([\s\S]*?)\]\s*as\s*const/);
    if (!listBody) {
        problems.push(`key list not parseable: ${listPath}`);
        continue;
    }
    for (const m of listBody[1].matchAll(/['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g)) {
        assignedScopeKeys.add(m[1]);
    }
}
for (const key of bagKeys) {
    if (key === 'renderFingerprint') continue;
    if (!assignedScopeKeys.has(key)) {
        problems.push(`bag key never copied into the chunk scope (assign contract): ${key}`);
    }
}

/* ---------- 5) corruption guards ---------- */
for (const [label, text] of [
    ['PhoneBody', body],
    ['Chrome', read(chromePath)],
    ['ScrollContent', scrollContent],
]) {
    if (/\bp\.[a-zA-Z_]/.test(text)) {
        problems.push(`${label} still contains p.* references — run repair-phone-body.mjs`);
    }
    if (/\\=/.test(text)) {
        problems.push(`${label} contains corrupted \\= JSX syntax`);
    }
}

if (problems.length) {
    console.error('PhoneBody scope verification failed:\n' + [...new Set(problems)].join('\n'));
    process.exit(1);
}

console.log(
    `PhoneBody scope OK — bag ${bagKeys.size} keys, model ${modelKeys.size} keys, canonical ${canonicalKeys.length} reachable`,
);
