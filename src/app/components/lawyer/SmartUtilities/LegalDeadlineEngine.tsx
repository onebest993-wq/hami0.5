import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Calendar, CalendarPlus, Siren, Lightbulb, Clock, Info } from '@/app/components/ui/lucideIcons';
import { addToCalendar } from '@/app/utils/calendar';
import type { DeadlineResult } from './types';

const DEADLINES = [
    { id: 'civ_obj', label: 'اعتراض على حكم غيابي (مدني)', val: 10, unit: 'd', cat: 'forfeiture', ref: 'مرافعات', urgency: 'high' },
    { id: 'civ_app_norm', label: 'استئناف (عادي)', val: 30, unit: 'd', cat: 'forfeiture', ref: 'مرافعات' },
    { id: 'civ_app_urg', label: 'استئناف (مستعجل)', val: 15, unit: 'd', cat: 'forfeiture', ref: 'مرافعات' },
    { id: 'civ_cas_fin', label: 'تمييز (حكم نهائي)', val: 30, unit: 'd', cat: 'forfeiture', ref: 'مرافعات' },
    { id: 'civ_cas_urg', label: 'تمييز (قرارات مستعجلة/حجز/تظلم)', val: 7, unit: 'd', cat: 'forfeiture', ref: 'مرافعات', urgency: 'critical' },
    { id: 'civ_cor', label: 'تصحيح قرار تمييزي', val: 7, unit: 'd', cat: 'forfeiture', ref: 'مرافعات', urgency: 'critical' },
    { id: 'crim_cas', label: 'طعن تمييزي (جزائي عام)', val: 30, unit: 'd', cat: 'forfeiture', ref: 'أصول جزائية' },
    { id: 'crim_comp', label: 'تقادم الشكوى (زنا/قذف)', val: 3, unit: 'm', cat: 'forfeiture', ref: 'أصول م3' },
    { id: 'crim_obj_fel', label: 'اعتراض على غيابي (جنايات)', val: 6, unit: 'm', cat: 'forfeiture', ref: 'أصول جزائية' },
    { id: 'crim_obj_mis', label: 'اعتراض على غيابي (جنح)', val: 3, unit: 'm', cat: 'forfeiture', ref: 'أصول جزائية' },
    { id: 'admin_flow', label: 'مسار الطعن الإداري (أمر إداري)', val: 0, unit: 'x', cat: 'forfeiture', ref: 'مجلس الدولة' },
    { id: 'exec_cas', label: 'تمييز قرارات المنفذ العدل', val: 7, unit: 'd', cat: 'forfeiture', ref: 'تنفيذ', urgency: 'critical' },
    { id: 'pre_civ', label: 'تقادم دين مدني عادي', val: 15, unit: 'y', cat: 'prescription', ref: 'مدني م429' },
    { id: 'pre_pro', label: 'أتعاب مهنية (محامين/أطباء)', val: 1, unit: 'y', cat: 'prescription', ref: 'مدني م431' },
    { id: 'pre_lab', label: 'حقوق عمالية (قانون 2015)', val: 3, unit: 'y', cat: 'prescription', ref: 'عمل م429' },
    { id: 'pre_com_3', label: 'أوراق تجارية (ضد القابل)', val: 3, unit: 'y', cat: 'prescription', ref: 'تجارة' },
    { id: 'pre_com_1', label: 'أوراق تجارية (ضد المظهرين)', val: 1, unit: 'y', cat: 'prescription', ref: 'تجارة' },
];

const isSovereignHoliday = (d: Date) => {
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const key = `${month}-${day}`;
    const holidays = ['1-1', '1-6', '3-21', '5-1', '7-14', '12-25'];
    return holidays.includes(key);
};

const isWeekend = (d: Date) => d.getDay() === 5 || d.getDay() === 6;

const addPeriod = (d: Date, count: number, unit: string) => {
    const newDate = new Date(d);
    if (unit === 'd') newDate.setDate(newDate.getDate() + count);
    if (unit === 'm') newDate.setMonth(newDate.getMonth() + count);
    if (unit === 'y') newDate.setFullYear(newDate.getFullYear() + count);
    return newDate;
};

const applyHolidayRule = (dateObj: Date, isManualOverride: boolean) => {
    let d = new Date(dateObj);
    let note = '';

    while (isWeekend(d) || isSovereignHoliday(d)) {
        d.setDate(d.getDate() + 1);
        note = 'صادف الموعد عطلة رسمية (جمعة/سبت أو عيد وطني)، فتم التمديد تلقائياً وفق المادة 173';
    }

    if (isManualOverride) {
        d.setDate(d.getDate() + 1);
        note = 'تم التمديد يدوياً لمصادفة عطلة طارئة/محلية (المادة 173)';

        while (isWeekend(d) || isSovereignHoliday(d)) {
            d.setDate(d.getDate() + 1);
            note += ' + تمديد إضافي لمصادفة عطلة رسمية لاحقة';
        }
    }

    return { date: d, note };
};

const fmt = (d: Date) => d.toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const LegalDeadlineEngine = () => {
    const [date, setDate] = useState('');
    const [procedureId, setProcedureId] = useState('');
    const [manualHoliday, setManualHoliday] = useState(false);
    const [result, setResult] = useState<DeadlineResult | null>(null);

    const calculate = () => {
        if (!date || !procedureId) return;
        const proc = DEADLINES.find(d => d.id === procedureId);
        if (!proc) return;

        const inputDate = new Date(date);

        let startDate = new Date(inputDate);
        startDate.setDate(startDate.getDate() + 1);

        if (proc.id === 'admin_flow') {
            let grievanceDate = addPeriod(startDate, 30, 'd');
            grievanceDate = applyHolidayRule(grievanceDate, false).date;

            let silenceDate = addPeriod(grievanceDate, 30, 'd');

            let courtDate = addPeriod(silenceDate, 60, 'd');
            const courtFinal = applyHolidayRule(courtDate, manualHoliday);

            setResult({
                type: 'admin',
                steps: [
                    { label: 'آخر موعد لتقديم التظلم', date: grievanceDate, note: 'خلال 30 يوماً من التبليغ' },
                    { label: 'انتهاء فترة السكوت (30 يوماً)', date: silenceDate, note: 'يعتبر الرفض حكمياً عند انتهاء هذه المدة' },
                    { label: 'آخر موعد للطعن القضائي', date: courtFinal.date, note: courtFinal.note || 'خلال 60 يوماً من انتهاء السكوت أو الرد' }
                ]
            });
            return;
        }

        let endDate = addPeriod(startDate, proc.val, proc.unit);
        const holidayCheck = applyHolidayRule(endDate, manualHoliday);

        setResult({
            type: 'standard',
            finalDate: holidayCheck.date,
            logicNote: holidayCheck.note,
            proc: proc
        });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="space-y-4">
                <div className="bg-[#0B1021] p-3 rounded-xl border border-white/10">
                    <label className="text-white/50 text-xs block mb-1">تاريخ التبليغ / أو تاريخ الواقعة</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => { setDate(e.target.value); setResult(null); }}
                        className="w-full bg-transparent text-white font-bold outline-none font-mono"
                    />
                </div>

                <div className="relative w-full">
                    <select
                        value={procedureId}
                        onChange={e => { setProcedureId(e.target.value); setResult(null); }}
                        className="w-full bg-[#0B1021] border border-white/10 rounded-xl p-3 pr-4 pl-10 text-white text-sm focus:border-[#E6C673] appearance-none outline-none cursor-pointer text-right"
                        dir="rtl"
                    >
                        <option value="">اختر نوع الإجراء...</option>
                        <optgroup label="مدد مدنية">
                            {DEADLINES.filter(d => d.id.startsWith('civ_')).map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </optgroup>
                        <optgroup label="مدد جزائية">
                            {DEADLINES.filter(d => d.id.startsWith('crim_')).map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </optgroup>
                        <optgroup label="إداري">
                            <option value="admin_flow">مسار الطعن الإداري (أمر إداري)</option>
                        </optgroup>
                        <optgroup label="مدد تنفيذية">
                            <option value="exec_cas">تمييز قرارات المنفذ العدل</option>
                        </optgroup>
                        <optgroup label="مدد تقادم">
                            {DEADLINES.filter(d => d.id.startsWith('pre_')).map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </optgroup>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">▼</div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between bg-[#0B1021] p-3 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                            <span className="text-sm text-white/80">
                                {procedureId === 'exec_cas' ? 'هل صادف اخر يوم عطلة رسمية' : 'هل صادف عطلة'}
                            </span>
                            <span className="text-[10px] text-white/40">إذا صادف آخر يوم عطلة رسمية من مجلس الوزراء فقط</span>
                        </div>
                        <button type="button"
                            onClick={() => { setManualHoliday(!manualHoliday); setResult(null); }}
                            className={`w-12 h-6 rounded-full transition-colors relative ${manualHoliday ? 'bg-red-500' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${manualHoliday ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <button type="button"
                    onClick={calculate}
                    disabled={!date || !procedureId}
                    className="w-full py-4 bg-[#E6C673] text-[#0B1021] font-bold rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(230,198,115,0.2)]"
                >
                    <Calculator size={18} />
                    تحليل واحتساب الموعد
                </button>
            </div>

            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="border-t border-white/10 pt-4"
                    >
                        {result.type === 'standard' && result.proc ? (
                            <div className={`rounded-2xl border overflow-hidden relative ${result.proc.urgency === 'critical' ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                                <div className="p-5 text-center relative z-10">
                                    <p className="text-white/60 text-xs mb-1">آخر موعد {result.proc.label} هو:</p>
                                    <h2 className="text-2xl font-bold text-white mb-2">{fmt(result.finalDate!)}</h2>

                                    <div className="flex flex-col gap-2 mt-4">
                                        {result.logicNote && (
                                            <div className="bg-indigo-500/20 text-indigo-300 text-[11px] py-1.5 px-3 rounded-lg border border-indigo-500/20 flex items-center gap-2">
                                                <Calendar size={14} />
                                                {result.logicNote}
                                            </div>
                                        )}

                                        <button type="button"
                                            onClick={() => addToCalendar({
                                                title: `موعد ${result.proc!.label}`,
                                                startDate: result.finalDate!,
                                                description: `تذكير قانوني من تطبيق حامي: ${result.proc!.label}\nملاحظة: ${result.logicNote || 'لا توجد ملاحظات'}`,
                                                location: 'المحكمة'
                                            })}
                                            className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-white/10"
                                        >
                                            <CalendarPlus size={14} />
                                            أضف للتقويم
                                        </button>
                                    </div>
                                </div>

                                <div className={`p-4 border-t ${result.proc.urgency === 'critical' ? 'bg-red-500/20 border-red-500/30' : 'bg-[#0B1021] border-white/5'}`}>
                                    {result.proc.cat === 'forfeiture' ? (
                                        <div className="flex gap-3 items-start">
                                            <div className="bg-red-500/20 p-2 rounded-lg text-red-500"><Siren size={20} /></div>
                                            <div>
                                                <h4 className="text-red-400 font-bold text-xs mb-1">مدة سقوط حتمية (Forfeiture)</h4>
                                                <p className="text-white/60 text-[10px] leading-relaxed">
                                                    هذه المدة من النظام العام، وتسقط الحق نهائياً بفواتها. لا تقبل الوقف أو الانقطاع.
                                                    {result.proc.urgency === 'critical' && <span className="block mt-1 text-red-400 font-bold">⚠️ انتبه: المدة قصيرة جداً!</span>}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3 items-start">
                                            <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-500"><Lightbulb size={20} /></div>
                                            <div>
                                                <h4 className="text-yellow-400 font-bold text-xs mb-1">مدة تقادم (Prescription)</h4>
                                                <p className="text-white/60 text-[10px] leading-relaxed">
                                                    هذه المدة تمنع سماع الدعوى فقط، وتقبل الانقطاع بالمطالبة القضائية أو الإقرار بالحق.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : result.type === 'admin' && result.steps ? (
                            <div className="space-y-4">
                                <h4 className="text-[#E6C673] text-sm font-bold flex items-center gap-2">
                                    <Clock size={16} />
                                    المسار الإداري (مجلس الدولة):
                                </h4>
                                <div className="space-y-0 relative border-r border-white/10 pr-4 mr-2">
                                    {result.steps.map((step, idx) => (
                                        <div key={idx} className="relative pb-6 last:pb-0">
                                            <div className="absolute -right-[21px] top-0 w-3 h-3 rounded-full bg-[#E6C673] ring-4 ring-[#1A1E2E]" />
                                            <div className="bg-[#0B1021] p-3 rounded-xl border border-white/10">
                                                <span className="text-white/40 text-[10px] block mb-1">{step.label}</span>
                                                <div className="text-white font-bold text-sm mb-1">{fmt(step.date)}</div>
                                                <div className="text-[#E6C673] text-[10px]">{step.note}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="mt-4 flex gap-2 items-start opacity-50 px-2">
                            <Info size={14} className="text-white mt-0.5 shrink-0" />
                            <p className="text-[10px] text-white leading-relaxed">
                                تنبيه هام: الحساب يعتمد على العطل الرسمية المركزية (مجلس الوزراء). العطل المحلية (مجلس المحافظة) قد تكون محل خلاف قضائي؛ لذا يُنصح بعدم الانتظار لليوم الأخير في حال وجود عطلة محلية.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
