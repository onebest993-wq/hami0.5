import fs from 'fs';

const D = '</div>';
const filePath = 'src/app/components/lawyer/Dashboard_Active_Order_File.tsx';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const FOOTER = [
    '                                                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">',
    '                                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void clearJudgeDecision(e); }} className="px-3 py-2 text-white/60 hover:text-white transition-colors font-bold">إلغاء</button>',
    '                                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void handleJudgeDecisionSubmit(e); }} disabled={isFinalized} className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">🔒 حفظ قرار القاضي</button>',
    '                                                            ' + D,
];

function closeFormBlock() {
    return [
        '                                                                    )}',
        '                                                                ' + D,
        '                                                            )}',
        ...FOOTER,
        '                                                        ' + D,
        '                                                    ) : null}',
        '                                                ' + D,
        '                                                )}',
    ];
}

const depositIdx = lines.findIndex((l) => l.includes('تم إيداع الكفالة') && l.includes('</label>'));
let gridClose = depositIdx + 1;
while (gridClose < lines.length && !lines[gridClose].trim().startsWith('</')) gridClose++;

const topEndIdx = lines.findIndex((l, i) => i > gridClose && l.trim() === ')}' && lines[i + 1]?.includes('showPreDecisionHearings'));
if (topEndIdx === -1) throw new Error('top end not found');

lines = [...lines.slice(0, gridClose + 1), ...closeFormBlock(), ...lines.slice(topEndIdx + 1)];

const orphanIdx = lines.findIndex(
    (l, i) => l.trim() === D && lines[i + 1]?.trim() === ')}' && lines[i + 3]?.trim() === '{showDecisionAtBottom && (',
);
if (orphanIdx !== -1) lines.splice(orphanIdx, 2);

const bottomStart = lines.findIndex((l) => l.trim() === '{showDecisionAtBottom && (');
const bottomDeposit = lines.findIndex((l, i) => i > bottomStart && l.includes('تم إيداع الكفالة'));
let bottomGridClose = bottomDeposit + 1;
while (bottomGridClose < lines.length && !lines[bottomGridClose].trim().startsWith('</')) bottomGridClose++;
const interventionIdx = lines.findIndex((l, i) => i > bottomGridClose && l.includes('{isStateOrder && !isNullified && ('));

lines = [
    ...lines.slice(0, bottomGridClose + 1),
    ...closeFormBlock().slice(0, -1),
    '                                                ' + D,
    '                                                )}',
    ...lines.slice(interventionIdx),
];

const interEnd = lines.findIndex((l, i) => i > interventionIdx && l.trim() === ')}' && lines[i - 1]?.trim() === D);
const grievanceIdx = lines.findIndex((l, i) => i > interEnd && l.includes('{showGrievanceStep &&'));

lines = [
    ...lines.slice(0, interEnd + 1),
    '                                                ' + D,
    '                                            ' + D,
    '                                        </motion.div>',
    '                                    )}',
    '                                </AnimatePresence>',
    '                            ' + D,
    '',
    ...lines.slice(grievanceIdx),
];

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Fixed judge JSX, lines:', lines.length);
