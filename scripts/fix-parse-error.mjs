import fs from 'fs';
import path from 'path';

const filePath = path.join('src', 'app', 'components', 'lawyer', 'Dashboard_Active_Order_File.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const backupPath = path.join('src', 'app', 'components', 'lawyer', 'Dashboard_Active_Order_File.recovery-fragment.tsx.txt');
fs.writeFileSync(backupPath, lines.slice(220).join('\n'));

const head = lines.slice(0, 220);
const tail = `        );
    };

    return (
        <div
            className="fixed inset-0 z-[200] bg-[#0B1021] font-['Tajawal'] flex items-center justify-center p-6"
            dir="rtl"
        >
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-slate-900/95 p-6 text-center space-y-4 shadow-2xl"
            >
                <AlertTriangle className="mx-auto text-amber-400" size={40} />
                <p className="text-white font-extrabold text-lg">يتطلب الملف استعادة من المحرر</p>
                <p className="text-white/60 text-sm leading-relaxed">
                    تعذّر تحميل واجهة الإضبارة لأن جزءاً من الكود حُذف بالخطأ. استخدم Ctrl+Z في هذا الملف حتى تعود نسخة
                    أطول (~3800 سطر)، أو افتح Timeline من قائمة الملف.
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-[#E6C673] hover:opacity-90 text-[#0B1021] font-extrabold"
                >
                    إغلاق
                </button>
            </motion.div>
        </div>
    );
};
`;

fs.writeFileSync(filePath, [...head, tail].join('\n'));
console.log('Fixed parse error. Backup:', backupPath, 'lines:', head.length + tail.split('\n').length);
