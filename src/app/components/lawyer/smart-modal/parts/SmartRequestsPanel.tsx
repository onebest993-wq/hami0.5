import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { ChevronUp } from '@/app/components/ui/icons/ChevronUp';
import { Plus } from '@/app/components/ui/icons/Plus';
import { Zap } from '@/app/components/ui/icons/Zap';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
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
} from '../smartFile/requestsHubEngine';
import type { AttachmentShieldSummary, FastTrackPetitionSummary, OnAddFastTrackFn } from '../smartFile/requestTypes';
import { SmartRequestsList } from './SmartRequestsList';
import { SmartRequestsTemplatesSection } from './SmartRequestsTemplatesSection';
import {
    resolveSmartRequestsThemeClasses,
    resolveSmartRequestsVisualFlags,
} from './smartRequestsPanelTheme';

export interface SmartRequestsPanelProps {
    petitions?: FastTrackPetitionSummary[];
    attachments?: AttachmentShieldSummary[];
    onAddFastTrack?: OnAddFastTrackFn;
    onEditPetition?: (petition: FastTrackPetitionSummary) => void;
    onEditAttachment?: (attachment: AttachmentShieldSummary) => void;
    onResolvePetition?: (petition: FastTrackPetitionSummary, status: 'accepted' | 'rejected') => void;
    readOnly?: boolean;
    visualVariant?: 'civil' | 'personal';
    embedMode?: 'standalone' | 'pearl-embed' | 'pearl-stage';
    /** تخطيط مضغوط — يطوي الطلبات الفارغة افتراضياً */
    dense?: boolean;
}

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
    dense = false,
}: SmartRequestsPanelProps) => {
    const flags = resolveSmartRequestsVisualFlags(visualVariant, embedMode);
    const { isPersonal, isPearlEmbed, isPearlInline } = flags;
    const { headerBar, iconWrap, titleClass, badgeClass, addBtnClass } = resolveSmartRequestsThemeClasses(flags);
    const templatesUserId = resolveCalendarUserId();
    const [typeTemplates, setTypeTemplates] = useState<string[]>(() =>
        loadRequestTypeTemplates(templatesUserId),
    );
    const [templateDraft, setTemplateDraft] = useState('');
    const [expanded, setExpanded] = useState(!dense);
    const [showQuickTemplates, setShowQuickTemplates] = useState(false);
    const [showPearlTemplates, setShowPearlTemplates] = useState(false);

    useEffect(() => {
        setTypeTemplates(loadRequestTypeTemplates(templatesUserId));
    }, [templatesUserId]);

    const items = useMemo(
        () => buildUnifiedRequests({ petitions, attachments }),
        [petitions, attachments],
    );

    const stats = useMemo(() => computeRequestStats(items), [items]);

    useEffect(() => {
        if (!dense) return;
        if (stats.total > 0) {
            setExpanded(true);
        } else {
            setExpanded(false);
            setShowQuickTemplates(false);
        }
    }, [dense, stats.total]);
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
        persistRequestTypeTemplates(next, templatesUserId);
        setTemplateDraft('');
        SmartToast.success('تم حفظ القالب');
    };

    const handleRemoveTemplate = (text: string) => {
        const next = removeRequestTypeTemplate(typeTemplates, text);
        setTypeTemplates(next);
        persistRequestTypeTemplates(next, templatesUserId);
    };

    const handleQuickAddFromTemplate = (requestType: string) => {
        onAddFastTrack?.({ requestType });
    };

    if (isPearlInline && visible.length === 0 && !showPearlTemplates) {
        return null;
    }

    const panelBody = (
        <>
            {!isPearlInline ? (
            <div className={headerBar}>
                <div className={`flex items-start justify-between gap-2 ${isPearlEmbed ? 'mb-2' : ''}`}>
                    {!isPearlInline ? (
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
                            {stats.total === 0 && !isPearlEmbed ? (
                                <button
                                    type="button"
                                    onClick={() => setShowQuickTemplates((v) => !v)}
                                    className="text-[9px] text-white/40 hover:text-[#E6C673]/80 px-1.5 py-1 transition-colors"
                                >
                                    {showQuickTemplates ? 'إخفاء القوالب' : 'قوالب'}
                                </button>
                            ) : null}
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

            {(isPearlInline ? visible.length > 0 || showPearlTemplates : expanded) ? (
                <>
                    <SmartRequestsTemplatesSection
                        isPearlInline={isPearlInline}
                        showPearlTemplates={showPearlTemplates}
                        readOnly={readOnly}
                        onAddFastTrack={onAddFastTrack}
                        statsTotal={stats.total}
                        showQuickTemplates={showQuickTemplates}
                        templateDraft={templateDraft}
                        setTemplateDraft={setTemplateDraft}
                        typeTemplates={typeTemplates}
                        handleAddTemplate={handleAddTemplate}
                        handleRemoveTemplate={handleRemoveTemplate}
                        handleQuickAddFromTemplate={handleQuickAddFromTemplate}
                    />
                    <SmartRequestsList
                        visible={visible}
                        isPearlInline={isPearlInline}
                        isPearlStage={flags.isPearlStage}
                        isPearlEmbed={isPearlEmbed}
                        readOnly={readOnly}
                        petitionById={petitionById}
                        onEditPetition={onEditPetition}
                        onEditAttachment={onEditAttachment}
                        onResolvePetition={onResolvePetition}
                        handleOpen={handleOpen}
                    />
                </>
            ) : null}
        </>
    );

    if (isPearlInline) {
        return (
            <div data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHub} dir="rtl">
                {panelBody}
            </div>
        );
    }

    return (
        <MoroccanGlassPanel
            className={`${dense ? 'mt-0' : 'mt-2'} overflow-hidden`}
            data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHub}
            dir="rtl"
            visualVariant={visualVariant}
        >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#E6C673]/35 to-transparent pointer-events-none" aria-hidden />
            {panelBody}
        </MoroccanGlassPanel>
    );
};
