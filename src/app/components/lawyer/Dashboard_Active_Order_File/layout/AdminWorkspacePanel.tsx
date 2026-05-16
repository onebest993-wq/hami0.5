import React from 'react';
import { ValidationBanner } from '../components/ValidationBanner';
import { DatePickerField } from '../components/DatePickerField';
import { formatDateText, formatDateTimeText, formatTimeText, eventKindMeta } from '../utils/formatters';
import type { AdminWorkspacePanelProps } from './AdminWorkspacePanelProps';
export type { AdminWorkspacePanelProps } from './AdminWorkspacePanelProps';

export function AdminWorkspacePanel({
    isIqrarContext,
    isFinalized,
    newFollowupTitle,
    setNewFollowupTitle,
    newFollowupDate,
    setNewFollowupDate,
    requestDateYmd,
    addFollowup,
    caseFollowups,
    todayYmdValue,
    toggleFollowupCompleted,
    deleteFollowup,
    caseEvents,
    newEventText,
    setNewEventText,
    addManualEvent,
    caseEventDayGroups,
    newNoteText,
    setNewNoteText,
    addCaseNote,
    caseNotes,
    deleteCaseNote,
    attachmentsError,
    attachmentInputId,
    addAttachmentFile,
    caseAttachments,
    deleteAttachment,
}: AdminWorkspacePanelProps) {
    return (
                        <div className="space-y-6">
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
                                <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">
                                    {caseFollowups.length === 0 ? (
                                        <div className="text-white/40 text-sm">لا توجد مهام</div>
                                    ) : (
                                        caseFollowups.map((f) => (
                                            <div
                                                key={f.id}
                                                className={`bg-black/20 border rounded-lg p-3 ${
                                                    !f.completed && f.date && f.date < todayYmdValue ? 'border-red-500/30' : 'border-white/10'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <label className="flex items-start gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={f.completed}
                                                            onChange={() => toggleFollowupCompleted(f.id)}
                                                            disabled={isFinalized}
                                                            className="mt-1 accent-[#E6C673] w-4 h-4"
                                                        />
                                                        <div>
                                                            <div className={`text-sm font-bold ${f.completed ? 'text-white/50 line-through' : 'text-white'}`}>{f.title}</div>
                                                            <div className={`text-xs mt-1 ${!f.completed && f.date && f.date < todayYmdValue ? 'text-red-300' : 'text-white/60'}`}>
                                                                الاستحقاق: {formatDateText(f.date)}
                                                            </div>
                                                        </div>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteFollowup(f.id)}
                                                        disabled={isFinalized}
                                                        className="text-red-300 hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        حذف
                                                    </button>
                                                </div>
                                                <div className="mt-2 text-white/40 text-xs">{formatDateTimeText(f.createdAt)}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            )}

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {!isIqrarContext && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 xl:col-span-2">
                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                        <div>
                                            <div className="text-white font-extrabold text-lg">سجل الأحداث</div>
                                            <p className="text-white/50 text-xs mt-1 leading-relaxed max-w-2xl">
                                                سجل زمني لكل ما يحدث في الإضبارة: القرارات، الجلسات، التبليغات، المرفقات، المهام، والأرشفة.
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-white/50 text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1">
                                            {caseEvents.length} حدث
                                        </span>
                                    </div>

                                    {!isFinalized && (
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                value={newEventText}
                                                onChange={(e) => setNewEventText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') addManualEvent();
                                                }}
                                                placeholder="إضافة ملاحظة إجرائية يدوياً..."
                                                className="flex-1 bg-[#1A1E2E] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#E6C673] outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={addManualEvent}
                                                className="px-3 py-2 rounded-lg bg-[#E6C673] text-[#0B1021] text-sm font-bold"
                                            >
                                                إضافة
                                            </button>
                                        </div>
                                    )}

                                    <div className="mt-2 max-h-[min(32rem,55vh)] overflow-y-auto pr-1">
                                        {caseEventDayGroups.length === 0 ? (
                                            <div className="text-white/40 text-sm py-6 text-center border border-dashed border-white/10 rounded-xl">
                                                لا توجد أحداث مسجّلة بعد
                                            </div>
                                        ) : (
                                            caseEventDayGroups.map((group) => (
                                                <div key={group.dayKey} className="mb-6 last:mb-0">
                                                    <div className="sticky top-0 z-10 py-1 bg-[#0f1428]/95 backdrop-blur-sm">
                                                        <div className="text-[#E6C673] text-xs font-extrabold tracking-wide">{group.dayLabel}</div>
                                                    </div>
                                                    <div className="relative mt-2 mr-2 border-r border-white/15 pr-5 space-y-4">
                                                        {group.events.map((ev) => {
                                                            const meta = eventKindMeta(ev.kind);
                                                            return (
                                                                <div key={ev.id} className="relative">
                                                                    <span
                                                                        className={`absolute -right-[23px] top-2 w-2.5 h-2.5 rounded-full ring-4 ring-[#0B1021] ${meta.dot}`}
                                                                        aria-hidden
                                                                    />
                                                                    <div className="bg-black/25 border border-white/10 rounded-xl p-3.5">
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <span
                                                                                className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border font-bold ${meta.badge}`}
                                                                            >
                                                                                {meta.label}
                                                                            </span>
                                                                            <span className="text-white/45 text-[11px] shrink-0 tabular-nums">
                                                                                {formatTimeText(ev.createdAt) || formatDateTimeText(ev.createdAt)}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-white/90 text-sm leading-relaxed mt-2">{ev.message}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                )}

                                <div className={`bg-white/5 border border-white/10 rounded-2xl p-5${isIqrarContext ? ' xl:col-span-2' : ''}`}>
                                    <div className="text-white font-extrabold mb-3">سجل الملاحظات (Logbook)</div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newNoteText}
                                            onChange={(e) => setNewNoteText(e.target.value)}
                                            disabled={isFinalized}
                                            placeholder="اكتب ملاحظة..."
                                            className="flex-1 bg-[#1A1E2E] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#E6C673] outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={addCaseNote}
                                            disabled={isFinalized}
                                            className="px-3 py-2 rounded-lg bg-[#E6C673] text-[#0B1021] text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            إضافة
                                        </button>
                                    </div>
                                    <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">
                                        {caseNotes.length === 0 ? (
                                            <div className="text-white/40 text-sm">لا توجد ملاحظات</div>
                                        ) : (
                                            caseNotes.map((n) => (
                                                <div key={n.id} className="bg-black/20 border border-white/10 rounded-lg p-3">
                                                    <div className="text-white/90 text-sm leading-relaxed">{n.text}</div>
                                                    <div className="mt-2 flex items-center justify-between text-white/45 text-[11px]">
                                                        <span>{formatDateTimeText(n.createdAt)}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteCaseNote(n.id)}
                                                            disabled={isFinalized}
                                                            className="text-red-300 hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            حذف
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <div className="text-white font-extrabold mb-3">المرفقات</div>
                                {!!attachmentsError && <ValidationBanner text={attachmentsError} />}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <input
                                            id={attachmentInputId}
                                            type="file"
                                            accept="image/*,application/pdf"
                                            disabled={isFinalized}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) addAttachmentFile(file);
                                                e.currentTarget.value = '';
                                            }}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor={attachmentInputId}
                                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-sm cursor-pointer ${
                                                isFinalized ? 'pointer-events-none opacity-50' : ''
                                            }`}
                                        >
                                            📎 ارفع مستنداً
                                        </label>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">
                                    {caseAttachments.length === 0 ? (
                                        <div className="text-white/40 text-sm">لا توجد مرفقات</div>
                                    ) : (
                                        caseAttachments.map((a) => (
                                            <div key={a.id} className="bg-black/20 border border-white/10 rounded-lg p-3">
                                                <div className="text-white text-sm break-all">
                                                    {a.url ? (
                                                        <a
                                                            href={a.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="underline decoration-white/30 hover:decoration-white"
                                                        >
                                                            {a.name}
                                                        </a>
                                                    ) : (
                                                        a.name
                                                    )}
                                                </div>
                                                <div className="mt-2 flex items-center justify-between text-white/40 text-xs">
                                                    <span>{formatDateText(a.createdAt)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteAttachment(a.id)}
                                                        disabled={isFinalized}
                                                        className="text-red-300 hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        حذف
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
    );
}
