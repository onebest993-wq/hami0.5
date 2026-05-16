import fs from 'fs';

const p = 'src/app/components/lawyer/Dashboard_Active_Order_File/ActiveOrderFileRoot.tsx';
let s = fs.readFileSync(p, 'utf8');

const pairs = [
    ['isPreDecisionNullifyNotep.s', 'isPreDecisionNullifyNotes'],
    ['isPreDecisionCloseNotep.s', 'isPreDecisionCloseNotes'],
    ['formatDateTexp.t', 'formatDateText'],
    ['ValidationBanner texp.t=', 'ValidationBanner text='],
    ['{b.texp.t}', '{b.text}'],
    ['heighp.t', 'height'],
    ['exip.t', 'exit'],
    ['DatePickerFielp.d', 'DatePickerField'],
    ['undefinep.d', 'undefined'],
    ['checkep.d', 'checked'],
    ['targep.t', 'target'],
    ['includep.s', 'includes'],
    ['caseData ap.s', 'caseData as'],
    ['consp.t', 'const'],
    ['inpup.t', 'input'],
    ['notep.s', 'notes'],
    ['Plup.s', 'Plus'],
    ['voip.d', 'void'],
    ['h.ip.d', 'h.id'],
    ['disablep.d', 'disabled'],
    ['preventDefaulp.t', 'preventDefault'],
    ['prep.v', 'prev'],
    ['(ep.v)', '(ev)'],
    ['ep.v.', 'ev.'],
    ['returp.n', 'return'],
    ['aria-hiddep.n', 'aria-hidden'],
    ['onKeyDowp.n', 'onKeyDown'],
];

for (const [from, to] of pairs) {
    s = s.split(from).join(to);
}

// Fix broken closing tail from inline script
const tailNeedle = `                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
        {confirmPortal}`;
const tailFix = `                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
        {confirmPortal}`;

if (s.includes(tailNeedle)) {
    s = s.replace(tailNeedle, tailFix);
} else {
    const badTail = /(\s*<\/div>\s*){3,}\s*<\/motion\.div>\s*<\/motion\.motion\.div>/;
    s = s.replace(
        /(\n\s*<\/motion\.motion\.motion\.div>\s*){0,1}(\n\s*<\/div>\s*){2,6}(\n\s*<\/motion\.div>\s*){2,4}\n\s*\{confirmPortal\}/,
        `
                    </div>
                </div>
            </motion.div>
        </motion.div>
        {confirmPortal}`,
    );
}

// Normalize file end: lg col + grid + scroll + fixed shell
const endMarker = '{confirmPortal}';
const endIdx = s.lastIndexOf(endMarker);
if (endIdx >= 0) {
    const before = s.slice(0, endIdx);
    const after = s.slice(endIdx);
    const trimmedBefore = before.replace(
        /(\n\s*<\/(?:div|motion\.motion\.motion\.div)>\s*)+$/,
        `
                    </div>
                </div>
            </div>
        </div>
`,
    );
    s = trimmedBefore + after;
}

fs.writeFileSync(p, s);
const left = [
    'heighp', 'exip', 'texp', 'ip.d', 'notep', 'Plup', 'consp', 'inpup', 'checkep', 'Fielp', 'undefinep', 'targep', 'voip', ' ap.s', 'includep', 'disablep', 'Defaulp',
].filter((x) => s.includes(x));
console.log('remaining markers', left);
