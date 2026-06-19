import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Shield, Sparkles, X, Zap } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import {
    addRequestTypeTemplate,
    loadRequestTypeTemplates,
    normalizeRequestTypeTemplate,
    persistRequestTypeTemplates,
    removeRequestTypeTemplate,
} from '../smartFile/fastTrackRequestTemplates';
import { MoroccanGlassPanel } from '../smartFile/moroccanGlassShell';
import {
    buildUnifiedRequests,
    computeRequestStats,
    resolveRequestResultLabel,
    resolveRequestStatusChip,
    statusToneClasses,
} from '../smartFile/requestsHubEngine';
import type { AttachmentShieldSummary, FastTrackPetitionSummary, OnAddFastTrackFn } from '../smartFile/requestTypes';

export interface SmartRequestsPanelProps {
    petitions?: FastTrackPetitionSummary[];
    attachments?: AttachmentShieldSummary[];
    onAddFastTrack?: OnAddFastTrackFn;
    onEditPetition?: (petition: FastTrackPetitionSummary) => void;
    onEditAttachment?: (attachment: AttachmentShieldSummary) => void;
    onResolvePetition?: (petition: FastTrackPetitionSummary, status: 'accepted' | 'rejected') => void;
    readOnly?: boolean;
    visualVariant?: 'civil' | 'personal';
    embedMode?: 'standalone' | 'pearl-embed';
}

const FIELD_CLASS =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-1.5 px-2.5 text-[10px] text-white outline-none focus:border-[#E6C673]/30 placeholder:text-white/25 backdrop-blur-sm';

export const SmartRequestsPanel = ({
    petitions = [],
    attachments = [],
    onAddFastTrack,
    onEditPetition,
    onEditAttachment,
    onResolvePetition,
    readOnly = false,
    visualVariant = 'civil',
    embedMode = 'standalone',
}: SmartRequestsPanelProps) => {
    const isPersonal = visualVariant === 'personal';
    const isPearlEmbed = embedMode === 'pearl-embed';
    const headerBar = isPearlEmbed
        ? 'px-0 py-0 border-0 bg-transparent'
        : isPersonal
        ? 'px-3 sm:px-4 py-3 border-b border-white/[0.06] bg-[#141214]'
        : 'px-3 sm:px-4 py-3 border-b border-[#E6C673]/12 bg-gradient-to-l from-[#E6C673]/10 via-transparent to-transparent';
    const iconWrap = isPearlEmbed
        ? 'hidden'
        : isPersonal
        ? 'flex h-7 w-7 items-center justify-center rounded-lg bg-[#C4A574]/10 border border-[#C4A574]/22 shrink-0'
        : 'flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6C673]/10 border border-[#E6C673]/25 shrink-0';
    const titleClass = isPearlEmbed
        ? 'hidden'
        : isPersonal
        ? 'text-white/88 text-sm font-bold leading-tight'
        : 'text-[#E6C673]/95 text-sm font-bold leading-tight';
    const badgeClass = isPearlEmbed
        ? 'shrink-0 bg-white/[0.08] text-[#ECE8E2] px-2 py-0.5 rounded-full text-[9px] font-bold border border-white/[0.14]'
        : isPersonal
        ? 'shrink-0 bg-[#C4A574]/10 text-[#C4A574] px-2 py-0.5 rounded-full text-[9px] font-bold border border-[#C4A574]/22'
        : 'shrink-0 bg-[#E6C673]/15 text-[#E6C673] px-2 py-0.5 rounded-full text-[9px] font-bold border border-[#E6C673]/20';
    const addBtnClass = isPearlEmbed
        ? 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.16] text-[#FFFEF9] hover:bg-white/[0.12] transition-all text-[10px] font-bold'
        : isPersonal
        ? 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#C4A574]/10 border border-[#C4A574]/22 text-[#C4A574] hover:bg-[#C4A574]/15 transition-all text-[10px] font-bold'
        : 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#E6C673]/10 border border-[#E6C673]/25 text-[#E6C673] hover:bg-[#E6C673]/18 transition-all text-[10px] font-bold backdrop-blur-sm';
    const [typeTemplates, setTypeTemplates] = useState<string[]>(() => loadRequestTypeTemplates());
    const [templateDraft, setTemplateDraft] = useState('');
    const [expanded, setExpanded] = useState(true);
    const [showPearlTemplates, setShowPearlTemplates] = useState(false);

    const items = useMemo(
        () => buildUnifiedRequests({ petitions, attachments }),
        [petitions, attachments],
    );

    const stats = useMemo(() => computeRequestStats(items), [items]);
    const visible = items;

    const petitionById = useMemo(() => new Map(petitions.map((p) => [p.id, p])), [petitions]);
    const attachmentById = useMemo(() => new Map(attachments.map((a) => [a.id, a])), [attachments]);

    const handleOpen = (id: string, kind: 'fast_track' | 'attachment') => {
        if (kind === 'fast_track') {
            const p = petitionById.get(id);
            if (p) onEditPetition?.(p);
            return;
        }
        const a = attachmentById.get(id);
        if (a) onEditAttachment?.(a);
    };

    const handleAddTemplate = () => {
        const normalized = normalizeRequestTypeTemplate(templateDraft);
        if (!normalized) {
            SmartToast.error('أدخل نصاً للقالب');
            return;
        }
        const next = addRequestTypeTemplate(typeTemplates, normalized);
        if (next.length === typeTemplates.length) {
            SmartToast.error('القالب موجود مسبقاً أو طويل جداً');
            return;
        }
        setTypeTemplates(next);
        persistRequestTypeTemplates(next);
        setTemplateDraft('');
        SmartToast.success('تم حفظ القالب');
    };

    const handleRemoveTemplate = (text: string) => {
        const next = removeRequestTypeTemplate(typeTemplates, text);
        setTypeTemplates(next);
        persistRequestTypeTemplates(next);
    };

    const handleQuickAddFromTemplate = (requestType: string) => {
        onAddFastTrack?.({ requestType });
    };

    if (isPearlEmbed && visible.length === 0 && !showPearlTemplates) {
        return (
            <div data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHub} dir="rtl">
                <p className="text-[10px] text-[#9C9890]">لا طلبات — استخدم + أعلاه</p>
            </div>
        );
    }

    const panelBody = (
        <>
            {!isPearlEmbed ? (
            <div className={headerBar}>
                <div className={`flex items-start justify-between gap-2 ${isPearlEmbed ? 'mb-2' : ''}`}>
                    {!isPearlEmbed ? (
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        data-testid="smart-file-requests-hub-toggle"
                        className="flex items-start gap-2 min-w-0 flex-1 text-right group"
                        aria-expanded={expanded}
                        aria-label={expanded ? 'طي لوحة الطلبات' : 'توسيع لوحة الطلبات'}
                    >
                        <span className={iconWrap}>
                            <Zap size={14} className={isPersonal ? 'text-[#C4A574]' : 'text-[#E6C673]'} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className={titleClass}>الطلبات</h3>
                                {stats.total > 0 ? (
                                    <span className={badgeClass}>
                                        {stats.total}
                                    </span>
                                ) : null}
                                <span className={`mr-auto shrink-0 transition-colors ${isPersonal ? 'text-[#C4A574]/45 group-hover:text-[#C4A574]/75' : 'text-[#E6C673]/50 group-hover:text-[#E6C673]/80'}`}>
                                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </span>
                            </div>
                        </div>
                    </button>
                    ) : (
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                            {stats.total > 0 ? (
                                <>
                                    <span className={badgeClass}>{stats.total}</span>
                                    {stats.pending > 0 ? (
                                        <span className="text-[9px] text-[#FFD4DC]/80 tabular-nums">{stats.pending}⌛</span>
                                    ) : null}
                                </>
                            ) : null}
                        </div>
                    )}
                    {!readOnly && onAddFastTrack ? (
                        <div className="flex items-center gap-1 shrink-0">
                            {isPearlEmbed && visible.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setShowPearlTemplates((v) => !v)}
                                    className="text-[9px] text-[#9C9890] hover:text-[#C9B89A] px-1.5 py-0.5 transition-colors"
                                >
                                    قوالب
                                </button>
                            ) : null}
                            <button
                                type="button"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHubAdd}
                                onClick={() => onAddFastTrack?.()}
                                className={addBtnClass}
                            >
                                <Plus size={12} aria-hidden />
                                {isPearlEmbed ? 'جديد' : 'طلب جديد'}
                            </button>
                        </div>
                    ) : null}
                </div>

                {expanded && stats.total > 0 && !isPearlEmbed ? (
                    <div className={`grid grid-cols-3 gap-1.5 ${isPearlEmbed ? 'mt-2' : 'mt-3'}`}>
                        {[
                            { label: 'انتظار', value: stats.pending, tone: 'text-blue-300' },
                            { label: 'قبول', value: stats.accepted, tone: 'text-emerald-300' },
                            { label: 'رفض', value: stats.rejected, tone: 'text-rose-300' },
                        ].map((chip) => (
                            <div
                                key={chip.label}
                                className="rounded-lg border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm px-1.5 py-1.5 text-center"
                            >
                                <p className={`text-sm font-bold leading-none ${chip.tone}`}>{chip.value}</p>
                                <p className="text-[8px] text-white/35 mt-1">{chip.label}</p>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
            ) : isPearlEmbed && visible.length > 0 ? (
                <div className="flex items-center justify-end gap-1 mb-1.5">
                    <button
                        type="button"
                        onClick={() => setShowPearlTemplates((v) => !v)}
                        className="text-[9px] text-[#9C9890] hover:text-[#C9B89A] px-1 transition-colors"
                    >
                        {showPearlTemplates ? 'إخفاء القوالب' : 'قوالب'}
                    </button>
                </div>
            ) : null}

            {(isPearlEmbed ? visible.length > 0 || showPearlTemplates : expanded) ? (
                <>
                    {!isPearlEmbed ? (
                    <div className="px-3 sm:px-4 py-2.5 space-y-2 border-b border-white/[0.04]">
                        {!readOnly && onAddFastTrack ? (
                            <div className="space-y-2 pt-0.5">
                                <span className="text-[8px] font-bold text-white/35 flex items-center gap-1">
                                    <Sparkles size={9} aria-hidden />
                                    إضافة سريعة — قوالبك اليدوية
                                </span>
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        value={templateDraft}
                                        onChange={(e) => setTemplateDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTemplate();
                                            }
                                        }}
                                        data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsTemplateInput}
                                        placeholder="نوع الطلب"
                                        className={`${FIELD_CLASS} flex-1`}
                                    />
                                    <button
                                        type="button"
                                        data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsTemplateAdd}
                                        onClick={handleAddTemplate}
                                        disabled={!normalizeRequestTypeTemplate(templateDraft)}
                                        className="inline-flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-[#E6C673]/10 border border-[#E6C673]/25 text-[#E6C673] text-[9px] font-bold hover:bg-[#E6C673]/18 transition-all disabled:opacity-40 shrink-0 backdrop-blur-sm"
                                    >
                                        <Plus size={10} aria-hidden />
                                        إضافة قالب
                                    </button>
                                </div>
                                {typeTemplates.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {typeTemplates.map((type) => (
                                            <span
                                                key={type}
                                                className="inline-flex items-center max-w-full rounded-md bg-white/[0.03] border border-white/[0.07] overflow-hidden backdrop-blur-sm"
                                            >
                                                <button
                                                    type="button"
                                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsQuickType(type)}
                                                    onClick={() => handleQuickAddFromTemplate(type)}
                                                    className="px-2 py-0.5 text-white/45 hover:text-[#E6C673]/90 hover:bg-[#E6C673]/10 text-[8px] font-semibold transition-all truncate text-right"
                                                    title={`تسجيل طلب: ${type}`}
                                                >
                                                    {type}
                                                </button>
                                                <button
                                                    type="button"
                                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsTemplateRemove(type)}
                                                    onClick={() => handleRemoveTemplate(type)}
                                                    className="px-1 py-0.5 text-white/25 hover:text-rose-300 hover:bg-rose-500/10 border-r border-white/[0.06] transition-colors shrink-0"
                                                    aria-label={`حذف القالب ${type}`}
                                                >
                                                    <X size={9} aria-hidden />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    ) : showPearlTemplates && !readOnly && onAddFastTrack ? (
                        <div className="space-y-1.5 mb-2 pb-2 border-b border-[#C9B89A]/08">
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    value={templateDraft}
                                    onChange={(e) => setTemplateDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTemplate();
                                        }
                                    }}
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsTemplateInput}
                                    placeholder="قالب طلب"
                                    className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.12] rounded-md px-2 py-1 text-[10px] text-[#FFFEF9] outline-none focus:border-white/[0.24]"
                                />
                                <button
                                    type="button"
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsTemplateAdd}
                                    onClick={handleAddTemplate}
                                    disabled={!normalizeRequestTypeTemplate(templateDraft)}
                                    className="px-2 py-1 rounded-md bg-white/[0.08] border border-white/[0.16] text-[#ECE8E2] text-[9px] font-bold disabled:opacity-40"
                                >
                                    +
                                </button>
                            </div>
                            {typeTemplates.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {typeTemplates.map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsQuickType(type)}
                                            onClick={() => handleQuickAddFromTemplate(type)}
                                            className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.12] text-[#C9B89A] text-[8px] font-semibold truncate max-w-full"
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className={`${isPearlEmbed ? 'max-h-32' : 'max-h-64'} overflow-y-auto scrollbar-hide ${isPearlEmbed ? 'space-y-1.5' : 'px-3 sm:px-4 py-2.5 space-y-2.5'}`}>
                        {visible.length === 0 ? (
                            isPearlEmbed ? null : (
                            <div
                                className="rounded-xl border border-dashed border-[#E6C673]/20 bg-[#E6C673]/[0.03] backdrop-blur-sm px-3 py-5 text-center"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsEmpty}
                            >
                                <Shield size={20} className="mx-auto text-[#E6C673]/40 mb-2" aria-hidden />
                                <p className="text-[10px] font-bold text-[#E6C673]/70">
                                    لا توجد طلبات في هذه المرحلة
                                </p>
                                {!readOnly && onAddFastTrack && items.length === 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => onAddFastTrack?.()}
                                        className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E6C673]/10 border border-[#E6C673]/25 text-[#E6C673] text-[9px] font-bold hover:bg-[#E6C673]/18 transition-all backdrop-blur-sm"
                                        data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHubAdd}
                                    >
                                        <Zap size={11} aria-hidden />
                                        تسجيل أول طلب
                                    </button>
                                ) : null}
                            </div>
                            )
                        ) : (
                            visible.map((item) => {
                                const canOpen =
                                    item.kind === 'fast_track'
                                        ? Boolean(onEditPetition)
                                        : Boolean(onEditAttachment);
                                const resultLabel = resolveRequestResultLabel(item);
                                const statusChip = resolveRequestStatusChip(item);
                                const isPending =
                                    item.kind === 'fast_track'
                                    && (item.statusTone === 'pending'
                                        || item.statusTone === 'neutral'
                                        || item.statusTone === 'grievance');
                                const petition = item.kind === 'fast_track' ? petitionById.get(item.id) : undefined;
                                const isDecided =
                                    item.kind === 'fast_track'
                                    && (item.statusTone === 'accepted' || item.statusTone === 'rejected');

                                return (
                                    <div
                                        key={`${item.kind}-${item.id}`}
                                        data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHubRow(item.id)}
                                        className={`w-full text-right rounded-lg border transition-all group ${
                                            isPearlEmbed
                                                ? 'border-white/[0.10] bg-white/[0.04] hover:border-white/[0.18] p-2'
                                                : 'rounded-xl border-white/[0.08] bg-white/[0.03] backdrop-blur-sm hover:border-[#E6C673]/15 p-3'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleOpen(item.id, item.kind)}
                                            disabled={!canOpen}
                                            className="w-full text-right disabled:cursor-default"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[12px] font-bold text-white/92 truncate">{item.title}</p>
                                                    {item.detail ? (
                                                        <p className="text-[10px] text-white/42 mt-1 line-clamp-2 leading-relaxed">
                                                            {item.detail}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <span
                                                    className={`shrink-0 px-2 py-0.5 rounded-md border text-[9px] font-bold ${statusToneClasses(item.statusTone, isPearlEmbed ? 'pearl' : 'civil')}`}
                                                >
                                                    {statusChip}
                                                </span>
                                            </div>
                                        </button>

                                        {isPending && petition && !readOnly && onResolvePetition ? (
                                            <div className="pt-2 border-t border-white/[0.05] grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    data-testid={`${CIVIL_LAWSUIT_TEST_IDS.requestsHubRow(item.id)}-accept`}
                                                    onClick={() => onResolvePetition(petition, 'accepted')}
                                                    className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/15 transition-colors"
                                                >
                                                    قبول
                                                </button>
                                                <button
                                                    type="button"
                                                    data-testid={`${CIVIL_LAWSUIT_TEST_IDS.requestsHubRow(item.id)}-reject`}
                                                    onClick={() => onResolvePetition(petition, 'rejected')}
                                                    className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[10px] font-bold text-rose-200 hover:bg-rose-500/15 transition-colors"
                                                >
                                                    رفض
                                                </button>
                                            </div>
                                        ) : isDecided ? (
                                            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between gap-2">
                                                <span className="text-[10px] text-white/38">النتيجة</span>
                                                <span
                                                    className={`text-[11px] font-bold ${
                                                        resultLabel === 'قبول'
                                                            ? 'text-emerald-300'
                                                            : 'text-rose-300'
                                                    }`}
                                                >
                                                    {resultLabel}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            ) : null}
        </>
    );

    if (isPearlEmbed) {
        return (
            <div data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHub} dir="rtl">
                {panelBody}
            </div>
        );
    }

    return (
        <MoroccanGlassPanel className="mt-2" data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHub} dir="rtl" visualVariant={visualVariant}>
            {panelBody}
        </MoroccanGlassPanel>
    );
};
