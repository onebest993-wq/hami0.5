import React, { memo } from 'react';

import { motion } from 'motion/react';

import { X, Lock, FileText, Ban, Clock, PhoneOff } from '@/app/components/ui/lucideIcons';

import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';

import {

    formatCaseShareSession,

    isCaseShareSessionActive,

} from '@/app/services/caseShare/caseShareSession';

import { CaseShareEndSessionButton } from './CaseShareEndSessionButton';



type SharedDossierViewerProps = {

    share: CaseShareRecord;

    onClose: () => void;

    viewerUserId?: string | null;

    onSessionEnded?: () => void;

};



/** عرض مقيد — للمرسل والمستقبل */

export const SharedDossierViewer = memo(function SharedDossierViewer({

    share,

    onClose,

    viewerUserId,

    onSessionEnded,

}: SharedDossierViewerProps) {

    const view = share.maskedView;

    const fields = share.visibleFields;

    const active = isCaseShareSessionActive(share);

    const ended = share.status === 'ended';

    const isOwner = viewerUserId != null && share.ownerId === viewerUserId;

    const counterpart = isOwner ? share.recipientName : share.ownerName;



    return (

        <>

            <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

            <motion.div

                initial={{ opacity: 0, y: 24 }}

                animate={{ opacity: 1, y: 0 }}

                className="fixed inset-x-4 top-[8dvh] bottom-[8dvh] z-[131] max-w-lg mx-auto rounded-2xl bg-[#0A0F1C] border border-[#E6C673]/25 shadow-2xl flex flex-col overflow-hidden"

                dir="rtl"

                role="dialog"

                aria-label="إضبارة مشتركة — قراءة فقط"

            >

                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">

                    <div className="min-w-0">

                        <p className="text-white font-bold text-sm truncate">{view.title}</p>

                        <p className="text-[#E6C673]/80 text-[10px] flex items-center gap-1 mt-0.5">

                            <Lock size={11} /> قراءة فقط — {isOwner ? 'مع' : 'من'} {counterpart}

                        </p>

                    </div>

                    <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 text-white/50 flex items-center justify-center shrink-0">

                        <X size={18} />

                    </button>

                </div>



                {ended ? (

                    <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-white/50 text-xs text-center shrink-0">

                        <PhoneOff size={12} className="inline ml-1" />

                        انتهت الجلسة

                        {share.sessionEndedAt ? ` — ${new Date(share.sessionEndedAt).toLocaleString('ar-IQ')}` : ''}

                    </div>

                ) : null}



                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    <section className="rounded-xl border border-[#E6C673]/20 bg-[#E6C673]/5 px-3 py-2 flex items-center gap-2">

                        <Clock size={14} className="text-[#E6C673] shrink-0" />

                        <p className="text-white/70 text-xs">

                            مدة الجلسة المتوقعة:{' '}

                            <span className="text-[#E6C673] font-bold">

                                {formatCaseShareSession(

                                    share.sessionDurationMinutes ?? view.sessionDurationMinutes ?? 60,

                                )}

                            </span>

                            {active ? <span className="text-emerald-300/80 mr-2"> · نشطة</span> : null}

                        </p>

                    </section>



                    <section>

                        <h4 className="text-white/45 text-[10px] font-bold mb-1">المحكمة</h4>

                        <p className="text-white text-sm">{view.court}</p>

                    </section>



                    <section>

                        <h4 className="text-white/45 text-[10px] font-bold mb-1">الأطراف</h4>

                        <ul className="space-y-1">

                            {view.parties.map((p, i) => (

                                <li key={i} className="text-white text-sm">{p}</li>

                            ))}

                        </ul>

                        {fields.parties_names !== 'full' ? (

                            <p className="text-amber-300/60 text-[10px] mt-1">تجهيل: {fields.parties_names === 'hidden' ? 'كامل' : 'جزئي'}</p>

                        ) : null}

                    </section>



                    <section>

                        <h4 className="text-white/45 text-[10px] font-bold mb-1">أرقام القضية</h4>

                        <p className="text-white text-sm font-mono">{view.caseNumbers.join(' · ') || '—'}</p>

                    </section>



                    <section>

                        <h4 className="text-white/45 text-[10px] font-bold mb-1">الوقائع / الملخص</h4>

                        <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{view.narrative || '—'}</p>

                    </section>



                    {(view.visibleCatalog ?? []).map((section) => (

                        <section key={section.key} className="rounded-xl border border-white/10 p-3">

                            <h4 className="text-[#E6C673] text-[10px] font-bold mb-2">{section.title}</h4>

                            <ul className="space-y-1">

                                {section.items.map((item) => (

                                    <li key={item.id} className="text-white/70 text-xs truncate">

                                        • {item.label}

                                        {item.preview ? (

                                            <span className="text-white/35 text-[10px]"> — {item.preview}</span>

                                        ) : null}

                                    </li>

                                ))}

                            </ul>

                        </section>

                    ))}



                    <section className="rounded-xl border border-white/10 p-3 flex items-center gap-2">

                        {view.documentsIncluded ? (

                            <>

                                <FileText size={16} className="text-[#E6C673]" />

                                <span className="text-white/60 text-xs">المرفقات متاحة للعرض (روابط مُصفّاة)</span>

                            </>

                        ) : (

                            <>

                                <Ban size={16} className="text-amber-400" />

                                <span className="text-amber-300/80 text-xs">الوثائق والمرفقات مخفية بالكامل</span>

                            </>

                        )}

                    </section>

                </div>



                {active && viewerUserId ? (

                    <div className="px-4 py-3 border-t border-white/10 shrink-0">

                        <CaseShareEndSessionButton

                            share={share}

                            userId={viewerUserId}

                            onEnded={() => onSessionEnded?.()}

                        />

                    </div>

                ) : null}

            </motion.div>

        </>

    );

});


