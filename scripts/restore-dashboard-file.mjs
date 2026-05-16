import fs from 'fs';
import path from 'path';

const filePath = path.join('src', 'app', 'components', 'lawyer', 'Dashboard_Active_Order_File.tsx');
const patchPath = path.join('scripts', 'recovered-decoded.patch');

let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const FOOTER_LINES = [
    '                                                            <motion.div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">',
    '                                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void clearJudgeDecision(e); }} className="px-3 py-2 text-white/60 hover:text-white transition-colors font-bold">إلغاء</button>',
    '                                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void handleJudgeDecisionSubmit(e); }} disabled={isFinalized} className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">🔒 حفظ قرار القاضي</button>',
    '                                                            </motion.div>',
];

function closeGuaranteeAndForm() {
    return [
        '                                                                    )}',
        '                                                                </motion.div>',
        '                                                            )}',
        ...FOOTER_LINES,
        '                                                        </motion.div>',
        '                                                    ) : null}',
        '                                                </motion.div>',
        '                                                )}',
    ];
}

// --- 1) Fix top decision block corrupted closes (lines ~3129-3147) ---
const topCorruptStart = lines.findIndex(
    (l, i) => i > 3100 && l.includes('تم إيداع الكفالة') && lines[i + 1]?.trim() === '</motion.div>',
);
if (topCorruptStart === -1) throw new Error('top corruption anchor not found');
const topFooterStart = lines.findIndex((l, i) => i > topCorruptStart && l.includes('flex items-center justify-end gap-3 pt-4 border-t'));
if (topFooterStart === -1) throw new Error('top footer not found');
const topBlockEnd = lines.findIndex((l, i) => i > topFooterStart && l.trim() === ')}' && lines[i - 1]?.trim() === '</motion.div>');
if (topBlockEnd === -1) throw new Error('top block end not found');

lines = [
    ...lines.slice(0, topCorruptStart + 1),
    ...closeGuaranteeAndForm(),
    ...lines.slice(topBlockEnd + 1),
];

// --- 2) Remove orphan </div> )} after sessions block ---
lines = lines.filter(
    (l, i, arr) =>
        !(
            l.trim() === '</motion.div>' &&
            arr[i + 1]?.trim() === ')}' &&
            arr[i + 2]?.trim() === '' &&
            arr[i + 3]?.trim() === '' &&
            arr[i + 4]?.trim() === '{showDecisionAtBottom && ('
        ),
);

// --- 3) Fix bottom decision block (incomplete guarantee + missing footer) ---
const bottomIdx = lines.findIndex((l) => l.trim() === '{showDecisionAtBottom && (');
if (bottomIdx === -1) throw new Error('showDecisionAtBottom not found');
const bottomGuaranteeEnd = lines.findIndex(
    (l, i) => i > bottomIdx && l.trim() === ')}' && lines[i - 1]?.trim() === '</motion.div>' && lines[i + 1]?.includes('isStateOrder'),
);
if (bottomGuaranteeEnd === -1) throw new Error('bottom guarantee end not found');
const interventionIdx = lines.findIndex((l, i) => i > bottomGuaranteeEnd && l.includes('{isStateOrder && !isNullified && ('));
lines = [
    ...lines.slice(0, bottomGuaranteeEnd + 1),
    ...closeGuaranteeAndForm().slice(0, -1), // without final `)}` of showDecisionAtTop wrapper — add bottom close
    '                                                </motion.div>',
    '                                                )}',
    ...lines.slice(interventionIdx),
];

// --- 4) Fix judge accordion closing (remove stray `)}`, add </AnimatePresence>) ---
const judgeCloseMotion = lines.findIndex(
    (l, i) => l.trim() === '</motion.div>' && lines[i + 1]?.trim() === ')}' && lines[i + 2]?.trim() === ')}',
);
if (judgeCloseMotion !== -1) {
    lines.splice(judgeCloseMotion + 2, 1); // remove duplicate )}
}
const judgeAnimateClose = lines.findIndex(
    (l, i) => l.trim() === ')}' && lines[i - 1]?.trim() === '</motion.div>' && lines[i + 1]?.trim() === '</motion.div>',
);
if (judgeAnimateClose !== -1) {
    lines.splice(judgeAnimateClose + 1, 0, '                                </AnimatePresence>');
}

// --- 5) Append truncated tail from recovered patch (grievance filed branch + footer) ---
if (lines[lines.length - 1].trim() !== '') lines.push('');
const tailFromPatch = fs
    .readFileSync(patchPath, 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1))
    .join('\n');

// Patch tail starts closing expired branch — file already has content through expired UI
const filedMarker = '                                                        {grievanceData.outcome === \'filed\' ? (';
const filedStart = tailFromPatch.indexOf(filedMarker);
if (filedStart === -1) throw new Error('filed branch not found in patch');
const patchTail = tailFromPatch.slice(filedStart);

// Close open tags at EOF (expired motion.div + AnimatePresence) then append filed→grievance end
const eofClose = `                                                            </motion.div>
                                                        ) : null}
                                                    </AnimatePresence>
`;
lines[lines.length - 1] = lines[lines.length - 1] + '\n' + eofClose + patchTail;

// --- 6) Append cassation + lifecycle close + sidebar sections (minimal faithful structure) ---
const cassationAndRest = fs.readFileSync(path.join('scripts', 'dashboard-tail-cassation.tsx'), 'utf8');
lines.push(cassationAndRest);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Restored', filePath, 'lines:', lines.length);
