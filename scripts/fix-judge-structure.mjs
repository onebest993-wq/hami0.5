import fs from 'fs';

const path = 'src/app/components/lawyer/Dashboard_Active_Order_File.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const footer = [
    '                                                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">',
    '                                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void clearJudgeDecision(e); }} className="px-3 py-2 text-white/60 hover:text-white transition-colors font-bold">إلغاء</button>',
    '                                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void handleJudgeDecisionSubmit(e); }} disabled={isFinalized} className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">🔒 حفظ قرار القاضي</button>',
    '                                                            </div>',
    '                                                        </div>',
    '                                                    ) : null}',
    '                                                </motion.div>',
    '                                                )}',
].map((l) => l.replace(/<\/motion\.div>/g, '</div>'));

// 1) extract bottom block
const bottomStart = lines.findIndex((l) => l.trim() === '{showDecisionAtBottom && (');
let bottomEnd = -1;
if (bottomStart !== -1) {
    for (let i = bottomStart + 1; i < lines.length; i++) {
        if (lines[i].trim() === ')}' && lines[i - 1]?.trim() === '</div>') {
            bottomEnd = i;
            break;
        }
    }
}
const bottomBlock = bottomStart !== -1 && bottomEnd !== -1 ? lines.slice(bottomStart, bottomEnd + 1) : [];
if (bottomStart !== -1 && bottomEnd !== -1) {
    lines = [...lines.slice(0, bottomStart), ...lines.slice(bottomEnd + 1)];
}

// 2) remove orphan clearJudgeDecision blocks outside top/bottom
const interventionIdx = () => lines.findIndex((l) => l.includes('{isStateOrder && !isNullified && ('));
for (let pass = 0; pass < 5; pass++) {
    const idx = interventionIdx();
    const hit = lines.findIndex(
        (l, i) => i < idx && i > 3000 && l.includes('void clearJudgeDecision'),
    );
    if (hit === -1) break;
    let start = hit;
    while (start > 0 && !lines[start].includes('flex items-center justify-end gap-3')) start--;
    let end = hit;
    while (end < lines.length && lines[end].trim() !== ')}') end++;
    if (lines[end + 1]?.trim() === '</div>') end++;
    if (lines[end + 1]?.trim() === ')}') end++;
    lines = [...lines.slice(0, start), ...lines.slice(end + 1)];
}

// 3) complete top block if missing footer
const topStart = lines.findIndex((l) => l.trim() === '{showDecisionAtTop && (');
const sessionsStart = lines.findIndex((l, i) => i > topStart && l.includes('{showPreDecisionHearings && ('));
if (topStart !== -1 && sessionsStart !== -1) {
    const slice = lines.slice(topStart, sessionsStart);
    if (!slice.some((l) => l.includes('void clearJudgeDecision'))) {
        let gEnd = sessionsStart - 1;
        while (gEnd > topStart && lines[gEnd].trim() !== ')}') gEnd--;
        const head = lines.slice(topStart, gEnd + 1);
        const tail = [
            '                                                                    )}',
            '                                                                </motion.div>',
            '                                                            )}',
            ...footer,
        ].map((l) => l.replace(/<\/motion\.div>/g, '</div>'));
        lines = [...lines.slice(0, topStart), ...head, ...tail, ...lines.slice(sessionsStart)];
    }
}

// 4) insert bottom before intervention
const intIdx = interventionIdx();
if (intIdx !== -1 && bottomBlock.length) {
    lines = [...lines.slice(0, intIdx), ...bottomBlock, ...lines.slice(intIdx)];
}

// 5) remove stray </AnimatePresence> before grievance
const gIdx = lines.findIndex((l) => l.includes('{showGrievanceStep &&'));
if (gIdx !== -1) {
    for (let i = gIdx - 1; i > 2900; i--) {
        if (lines[i].trim() === '</AnimatePresence>') {
            lines = [...lines.slice(0, i), ...lines.slice(i + 1)];
            break;
        }
    }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('lines', lines.length);
