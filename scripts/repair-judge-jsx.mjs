import fs from 'fs';

const path = 'src/app/components/lawyer/Dashboard_Active_Order_File.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find misplaced bottom block start (inside top block)
const misplacedBottom = lines.findIndex((l) => l.trim() === '{showDecisionAtBottom && (');
if (misplacedBottom === -1) throw new Error('misplaced bottom not found');

// Find sessions start after misplaced bottom
const sessionsStart = lines.findIndex((l, i) => i > misplacedBottom && l.includes('{showPreDecisionHearings && ('));
if (sessionsStart === -1) throw new Error('sessions not found');

// Extract bottom block from misplaced to just before sessions
const bottomBlockInner = lines.slice(misplacedBottom + 1, sessionsStart);

// Find top block start
const topStart = lines.findIndex((l) => l.trim() === '{showDecisionAtTop && (');
if (topStart === -1) throw new Error('top start not found');

// Content from top inner start to misplacedBottom should get proper footer
const footerStart = lines.findIndex((l, i) => i > 3200 && l.includes('flex items-center justify-end gap-3 pt-4 border-t border-white/10'));
const footerEnd = lines.findIndex((l, i) => i > footerStart && l.trim() === ')}' && lines[i - 1]?.trim() === '</motion.div>');
// use orphan footer at 3548+
let footerStart2 = lines.findIndex((l, i) => i > 3540 && l.includes('flex items-center justify-end gap-3 pt-4 border-t'));
let footerEnd2 = -1;
for (let i = footerStart2; i < lines.length; i++) {
    if (lines[i].trim() === ')}' && lines[i - 1]?.trim() === '</div>' && lines[i - 2]?.includes('حفظ قرار القاضي')) {
        footerEnd2 = i;
        break;
    }
}

const footer = footerStart2 !== -1 && footerEnd2 !== -1 ? lines.slice(footerStart2, footerEnd2 + 1) : [];

// Build top block close: from line before misplacedBottom, we need to close guarantee + form
// Find line with `)}` at 3130 that wrongly closes - replace section from 3129 to sessionsStart-1

const beforeMisplaced = lines.slice(0, misplacedBottom);
// Fix incomplete top: last lines should close guarantee conditional from 3059
const topClose = [
    '                                                                    )}',
    '                                                                </motion.div>',
    '                                                            )}',
    ...footer,
    '                                                        </motion.div>',
    '                                                    ) : null}',
    '                                                </motion.div>',
    '                                                )}',
];

// Remove duplicate footer orphan later
const sessionsEnd = lines.findIndex(
    (l, i) => i > sessionsStart && l.trim() === ')}' && lines[i - 1]?.trim() === '</motion.div>' && lines[i + 1]?.trim() === '',
);
// sessions closes at `)}` after `</motion.div>` - find showPreDecisionHearings close
let sessEnd = -1;
for (let i = sessionsStart; i < lines.length; i++) {
    if (lines[i].trim() === ')}' && lines[i - 1]?.trim() === '</motion.div>') {
        sessEnd = i;
        break;
    }
}

const afterSessions = lines.slice(sessEnd + 1);

// Remove orphan chunk from afterSessions until isStateOrder
const orphanStart = afterSessions.findIndex((l) => l.trim() === '</motion.div>' && l.includes('                    '));
const stateOrderIdx = afterSessions.findIndex((l) => l.includes('{isStateOrder && !isNullified && ('));
const cleanedAfter = [...afterSessions.slice(0, orphanStart), ...afterSessions.slice(stateOrderIdx)];

const bottomWrapped = ['                                                {showDecisionAtBottom && (', ...bottomBlockInner, '                                                )}'];

const result = [...beforeMisplaced, ...topClose, ...lines.slice(sessionsStart, sessEnd + 1), ...bottomWrapped, ...cleanedAfter];

fs.writeFileSync(path, result.join('\n'));
console.log('Repaired:', { misplacedBottom: misplacedBottom + 1, sessionsStart: sessionsStart + 1, sessEnd: sessEnd + 1 });
