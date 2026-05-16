import fs from 'fs';

const path = 'src/app/components/lawyer/Dashboard_Active_Order_File.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const decisionStart = lines.findIndex((l) => l.includes('(showDecisionAtTop || showDecisionAtBottom) && ('));
if (decisionStart === -1) throw new Error('decision block not found');

let decisionEnd = -1;
for (let i = decisionStart + 1; i < lines.length; i++) {
    if (lines[i].trim() === ')}' && lines[i - 1]?.trim() === '</div>') {
        decisionEnd = i;
        break;
    }
}
if (decisionEnd === -1) throw new Error('decision end not found');

const block = lines.slice(decisionStart, decisionEnd + 1);
const inner = block.slice(1, -1).map((l) => {
    if (l.includes('decision-block border')) {
        return '                                                <div className="decision-block border border-white/10 bg-white/5 rounded-xl p-4">';
    }
    return l;
});

const topBlock = ['                                                {showDecisionAtTop && (', ...inner, '                                                )}'];
const bottomBlock = ['                                                {showDecisionAtBottom && (', ...inner, '                                                )}'];

const sessionsStart = lines.findIndex(
    (l, i) => i > decisionStart - 500 && l.includes('{showPreDecisionHearings && ('),
);
if (sessionsStart === -1) throw new Error('sessions start not found');

// remove order from sessions card
for (let i = sessionsStart; i < decisionStart; i++) {
    if (lines[i].includes('border border-white/10 bg-white/5 rounded-xl p-4')) {
        lines[i] = '                                                <div className="border border-white/10 bg-white/5 rounded-xl p-4">';
        break;
    }
}

// remove old decision block
const withoutDecision = [...lines.slice(0, decisionStart), ...lines.slice(decisionEnd + 1)];

// re-find sessions after removal
const sessionsStart2 = withoutDecision.findIndex((l) => l.includes('{showPreDecisionHearings && ('));
const newLines = [
    ...withoutDecision.slice(0, sessionsStart2),
    ...topBlock,
    ...withoutDecision.slice(sessionsStart2),
];

// append bottom block before closing `</div>` of flex col - find after sessions close `)}` for showPreDecisionHearings
const sessionsEnd = newLines.findIndex(
    (l, i) => i > sessionsStart2 && l.trim() === ')}' && newLines[i - 1]?.trim() === '</div>',
);
const insertAt = sessionsEnd + 1;
const finalLines = [...newLines.slice(0, insertAt), ...bottomBlock, ...newLines.slice(insertAt)];

// fix save hearing onclick
const out = finalLines
    .join('\n')
    .replace(/onClick={addHearing}/g, 'onClick={() => void addHearing()}')
    .replace(
        /hearingDraft\.open && hearingDraft\.stage === 'pre_decision'/g,
        "hearingDraft.open && hearingDraft.stage === 'pre_decision' && !isCaseTerminated",
    )
    .replace(
        /\{isStateOrder && \(/g,
        '{isStateOrder && !isNullified && (',
    );

fs.writeFileSync(path, out);
console.log('Reordered decision block:', decisionStart + 1, '-', decisionEnd + 1);
