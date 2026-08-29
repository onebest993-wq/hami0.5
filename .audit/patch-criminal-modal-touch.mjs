import fs from 'node:fs';
import path from 'node:path';

const dir = 'src/app/components/lawyer/criminal-system/components/modals';
const touch = 'touch-manipulation';
const minH = 'min-h-[44px]';

const replacements = [
    [
        'className="text-white/70 hover:text-white text-sm font-bold"',
        'className="min-h-[44px] min-w-[44px] px-3 text-white/70 hover:text-white text-sm font-bold touch-manipulation"',
    ],
    [
        'className="text-white/70 hover:text-white transition text-sm font-bold"',
        'className="min-h-[44px] min-w-[44px] px-3 text-white/70 hover:text-white transition text-sm font-bold touch-manipulation"',
    ],
    [
        'className="text-white/60 text-xs font-bold"',
        'className="min-h-[44px] min-w-[44px] px-3 text-white/60 text-xs font-bold touch-manipulation"',
    ],
    [
        'className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/75"',
        'className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-sm font-black text-white/75 touch-manipulation"',
    ],
    [
        'className="rounded-xl bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black disabled:opacity-40"',
        'className="min-h-[44px] px-4 rounded-xl bg-[#E6C673] text-[#0B1021] text-sm font-black disabled:opacity-40 touch-manipulation hover:brightness-110 active:brightness-95 transition"',
    ],
    [
        'className="rounded-xl bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black"',
        'className="min-h-[44px] px-4 rounded-xl bg-[#E6C673] text-[#0B1021] text-sm font-black touch-manipulation hover:brightness-110 active:brightness-95 transition"',
    ],
    [
        'className="rounded-xl px-4 py-2 text-sm font-bold text-white/70 hover:text-white border border-white/15"',
        'className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white/70 hover:text-white border border-white/15 touch-manipulation"',
    ],
    [
        'className="rounded-xl px-4 py-2 text-sm font-black bg-[#E6C673]/20 border border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/30"',
        'className="min-h-[44px] px-4 rounded-xl text-sm font-black bg-[#E6C673]/20 border border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/30 touch-manipulation"',
    ],
    [
        'className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"',
        'className="min-h-[44px] min-w-[44px] px-3 text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words touch-manipulation"',
    ],
    [
        'className="text-white/60 hover:text-white transition text-xs font-bold px-2 py-1 rounded-md hover:bg-slate-700/60"',
        'className="min-h-[44px] min-w-[44px] px-3 text-white/60 hover:text-white transition text-xs font-bold rounded-md hover:bg-slate-700/60 touch-manipulation"',
    ],
    [
        'className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"',
        'className="min-h-[44px] px-4 rounded-xl border border-slate-700 bg-slate-900 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words touch-manipulation"',
    ],
    [
        'className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition"',
        'className="min-h-[44px] px-4 rounded-xl border border-slate-700 bg-slate-900 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition touch-manipulation"',
    ],
    [
        'className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"',
        'className="min-h-[44px] px-4 rounded-xl bg-[#E6C673] text-[#0B1021] font-black text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words touch-manipulation"',
    ],
    [
        'className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40"',
        'className="min-h-[44px] px-4 rounded-xl bg-[#E6C673] text-[#0B1021] font-black text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 touch-manipulation"',
    ],
    [
        'className="rounded-lg bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"',
        'className="min-h-[44px] px-4 rounded-lg bg-[#E6C673] text-[#0B1021] font-black text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words touch-manipulation"',
    ],
    [
        'className="text-white/65 hover:text-white text-xs font-bold rounded-md px-2 py-1 hover:bg-white/5 transition"',
        'className="min-h-[44px] min-w-[44px] px-3 text-white/65 hover:text-white text-xs font-bold rounded-md hover:bg-white/5 transition touch-manipulation"',
    ],
    [
        'className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-black text-white/75 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition"',
        'className="min-h-[44px] px-4 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-black text-white/75 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition touch-manipulation"',
    ],
    [
        'className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2 px-4 text-xs hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"',
        'className="min-h-[44px] px-4 rounded-xl bg-[#E6C673] text-[#0B1021] font-black text-xs hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition touch-manipulation"',
    ],
    [
        'className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"',
        'className="min-h-[44px] px-4 rounded-xl border border-slate-700 bg-slate-900 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words touch-manipulation"',
    ],
    [
        'className="rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-sm font-black text-red-200 hover:bg-red-500/20 hover:text-red-100 transition whitespace-normal break-words"',
        'className="min-h-[44px] px-4 rounded-xl border border-red-500/30 bg-red-500/15 text-sm font-black text-red-200 hover:bg-red-500/20 hover:text-red-100 transition whitespace-normal break-words touch-manipulation"',
    ],
    [
        'className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"',
        'className="min-h-[44px] min-w-[44px] px-3 text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words touch-manipulation"',
    ],
];

function patchFile(filePath) {
    let src = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [from, to] of replacements) {
        if (src.includes(from)) {
            src = src.split(from).join(to);
            changed = true;
        }
    }
    if (!changed) return false;
    fs.writeFileSync(filePath, src);
    return true;
}

let count = 0;
for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.tsx')) continue;
    const full = path.join(dir, name);
    if (patchFile(full)) {
        count += 1;
        console.log('patched', name);
    }
}

const confirmPath = 'src/app/components/lawyer/criminal-system/ConfirmActionModal.tsx';
if (patchFile(confirmPath)) {
    count += 1;
    console.log('patched ConfirmActionModal.tsx');
}

console.log('done', count, 'files');
