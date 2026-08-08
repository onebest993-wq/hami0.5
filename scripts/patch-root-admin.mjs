import fs from 'fs';

const p = 'src/app/components/lawyer/Dashboard_Active_Order_File/ActiveOrderFileRoot.tsx';
let s = fs.readFileSync(p, 'utf8');

const needle = `                        <AdminWorkspacePanel />
                                    </div>
                                </div>
                                <motion.div className="mt-4 space-y-2 max-h-56 overflow-y-auto">`;

const replacement = `                        <div className="space-y-6">
                            {!isIqrarContext && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <div className="text-white font-extrabold mb-3">المهام والإجراءات الإدارية</div>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={newFollowupTitle}
                                        onChange={(e) => setNewFollowupTitle(e.target.value)}
                                        disabled={isFinalized}
                                        placeholder="عنوان المهمة..."
                                        className="w-full bg-[#1A1E2E] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#E6C673] outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <DatePickerField
                                            value={newFollowupDate || ''}
                                            onValueChange={(v) => setNewFollowupDate(v)}
                                            min={requestDateYmd || undefined}
                                            disabled={isFinalized}
                                            inputClassName="flex-1 bg-[#1A1E2E] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#E6C673] outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={addFollowup}
                                            disabled={
                                                isFinalized ||
                                                (!!requestDateYmd &&
                                                    !!newFollowupDate &&
                                                    newFollowupDate < requestDateYmd)
                                            }
                                            className="px-3 py-2 rounded-lg bg-[#E6C673] text-[#0B1021] text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            إضافة
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">`;

if (!s.includes('<AdminWorkspacePanel />')) {
    console.error('AdminWorkspacePanel marker not found');
    process.exit(1);
}

if (!s.includes(needle)) {
    const alt = needle.replace(/motion\.div/g, 'div');
    if (s.includes(alt)) {
        s = s.replace(alt, replacement);
    } else {
        console.error('needle not found');
        const idx = s.indexOf('<AdminWorkspacePanel />');
        console.log('context', s.slice(idx, idx + 200));
        process.exit(1);
    }
} else {
    s = s.replace(needle, replacement);
}

s = s.replace(
    "import { AdminWorkspacePanel } from './layout/AdminWorkspacePanel';\n",
    '',
);

fs.writeFileSync(p, s);
console.log('patched root admin');
