import React from 'react';
import type { SeizedProperty } from '@/app/types/execution';
import { CollapsibleWorkflowToggle } from './CollapsibleWorkflowToggle';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '../utils/expertCommitteeUtils';
import {
    findSeizureDecisionForProperty,
    isDecisionResolvedApproved,
} from '../utils/propertySeizureWorkflowUtils';
import {
    formatNumberInput,
    savePropertyAuctionDateInline,
    savePropertyAuctionResultInline,
    savePropertyExpertReportInline,
    savePropertyMarkInline,
    savePropertyPublicationInline,
    savePropertyReauctionDefaultInline,
    type PropertyInlineSaveContext,
} from '../utils/propertySeizureInlinePersistence';

const FIELD =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 outline-none';
const BTN_SAVE =
    'w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 py-2 text-[10px] font-black text-emerald-100 hover:bg-emerald-500/15';

export type PropertyInlineSectionKey =
    | 'mark'
    | 'experts'
    | 'auction'
    | 'publication'
    | 'auction_result'
    | 'reauction_default';

export type PropertyExpertDecisionSubtype = 'property_expert' | 'property_expert_committee';

export type PropertySeizureInlineSectionsProps = {
    property: SeizedProperty;
    properties: SeizedProperty[];
    decisions: Array<Record<string, unknown>>;
    saveCtx: PropertyInlineSaveContext;
    focusKey?: string | null;
    pendingDecisionId?: string | null;
    section?: PropertyInlineSectionKey;
    embedded?: boolean;
    expertDecisionSubtype?: PropertyExpertDecisionSubtype;
};

function buildExpertNameSlots(entity: SeizedProperty): string[] {
    const size = readExpertCommitteeSize(entity);
    const names = Array.isArray(entity.expertNames)
        ? entity.expertNames.map((x) => String(x || '').trim())
        : [];
    return Array.from({ length: size }, (_, i) => names[i] || '');
}

const InlineSectionShell: React.FC<{
    embedded?: boolean;
    sectionId?: string;
    focusKey?: string | null;
    title: string;
    titleClassName: string;
    defaultExpanded?: boolean;
    children: React.ReactNode;
}> = ({ embedded, sectionId, focusKey, title, titleClassName, defaultExpanded, children }) => {
    if (embedded) {
        return (
            <div className="space-y-2">
                <p className={`text-[10px] font-black text-right ${titleClassName}`}>{title}</p>
                {children}
            </div>
        );
    }
    return (
        <CollapsibleWorkflowToggle
            sectionId={sectionId}
            focusKey={focusKey}
            title={title}
            titleClassName={titleClassName}
            defaultExpanded={defaultExpanded}
        >
            {children}
        </CollapsibleWorkflowToggle>
    );
};

export const PropertySeizureInlineSections: React.FC<PropertySeizureInlineSectionsProps> = ({
    property: p,
    properties,
    decisions,
    saveCtx,
    focusKey,
    pendingDecisionId,
    section,
    embedded = false,
    expertDecisionSubtype,
}) => {
    const propertyId = String(p.id || '').trim();
    const hasMark = Boolean(String(p.seizureMarkLetterNumber || '').trim());

    const [markLetter, setMarkLetter] = React.useState(String(p.seizureMarkLetterNumber || ''));
    const [markDate, setMarkDate] = React.useState(String(p.seizureMarkDate || ''));
    const [markEntity, setMarkEntity] = React.useState(String(p.seizureMarkEntity || ''));

    const [expertNames, setExpertNames] = React.useState(
        Array.isArray(p.expertNames) && p.expertNames.length ? p.expertNames.join('، ') : ''
    );
    const [expertNameSlots, setExpertNameSlots] = React.useState(() => buildExpertNameSlots(p));
    const [expertDate, setExpertDate] = React.useState(String(p.expertReportDateYmd || ''));
    const [expertPrice, setExpertPrice] = React.useState(
        p.expertEstimatedAmountIqd != null && Number(p.expertEstimatedAmountIqd) > 0
            ? formatNumberInput(String(p.expertEstimatedAmountIqd))
            : p.estimatedPriceIqd != null && Number(p.estimatedPriceIqd) > 0
              ? formatNumberInput(String(p.estimatedPriceIqd))
              : ''
    );

    const [auctionYmd, setAuctionYmd] = React.useState(String(p.auctionDateYmd || p.auction?.auctionDateYmd || ''));

    const [newspaper, setNewspaper] = React.useState(String(p.newspaperName || ''));
    const [pubDate, setPubDate] = React.useState(String(p.publicationDateYmd || ''));

    const [auctionOutcome, setAuctionOutcome] = React.useState<'initial_award' | 'no_bidders'>('initial_award');
    const [buyerName, setBuyerName] = React.useState(String(p.initialAwardBuyerName || ''));
    const [awardAmount, setAwardAmount] = React.useState(
        p.initialAwardAmountIqd != null ? formatNumberInput(String(p.initialAwardAmountIqd)) : ''
    );

    const [reauctionNotes, setReauctionNotes] = React.useState(String(p.reauctionDefault?.notes || ''));

    React.useEffect(() => {
        setMarkLetter(String(p.seizureMarkLetterNumber || ''));
        setMarkDate(String(p.seizureMarkDate || ''));
        setMarkEntity(String(p.seizureMarkEntity || ''));
        setExpertNameSlots(buildExpertNameSlots(p));
        setExpertNames(
            Array.isArray(p.expertNames) && p.expertNames.length ? p.expertNames.join('، ') : ''
        );
    }, [p]);

    const expertDecision = React.useMemo(() => {
        const subtypes: PropertyExpertDecisionSubtype[] = expertDecisionSubtype
            ? [expertDecisionSubtype]
            : ['property_expert', 'property_expert_committee'];
        for (const st of subtypes) {
            const row = findSeizureDecisionForProperty(decisions, st, propertyId);
            if (row && isDecisionResolvedApproved(row) && !String(row.seizureRequestSavedAt || '').trim()) {
                return { row, subtype: st };
            }
        }
        return null;
    }, [decisions, propertyId, expertDecisionSubtype]);

    const auctionDecision = React.useMemo(() => {
        const row = findSeizureDecisionForProperty(decisions, 'property_auction', propertyId);
        if (row && isDecisionResolvedApproved(row) && !String(row.seizureRequestSavedAt || '').trim()) {
            return row;
        }
        return null;
    }, [decisions, propertyId]);

    const reauctionDecision = React.useMemo(() => {
        const row = findSeizureDecisionForProperty(decisions, 'property_reauction_default', propertyId);
        if (row && isDecisionResolvedApproved(row) && !String(row.seizureRequestSavedAt || '').trim()) {
            return row;
        }
        return null;
    }, [decisions, propertyId]);

    const pendingIdForSection = React.useCallback(
        (sectionKey: string): string => {
            const pid = String(pendingDecisionId || '').trim();
            if (!pid) return '';
            const fk = String(focusKey || '').trim();
            const sec = String(section || sectionKey).trim();
            if (fk && sec && fk !== sec) return '';
            return pid;
        },
        [pendingDecisionId, focusKey, section]
    );

    const expertDecisionId = String(
        pendingIdForSection('experts') || expertDecision?.row?.id || ''
    ).trim();
    const auctionDecisionId = String(
        pendingIdForSection('auction') || auctionDecision?.id || ''
    ).trim();
    const reauctionDecisionId = String(
        pendingIdForSection('reauction_default') || reauctionDecision?.id || ''
    ).trim();

    const requiredExperts = readExpertCommitteeSize(p);
    const hasExpertReportSaved =
        Boolean(String(p.expertReportDateYmd || '').trim()) &&
        ((p.expertEstimatedAmountIqd != null && Number(p.expertEstimatedAmountIqd) > 0) ||
            (p.estimatedPriceIqd != null && Number(p.estimatedPriceIqd) > 0));

    const expertNamesRawForSave = React.useCallback((): string => {
        if (requiredExperts <= 1) {
            return String(expertNames || '').trim();
        }
        return expertNameSlots.map((s) => String(s || '').trim()).join('، ');
    }, [requiredExperts, expertNames, expertNameSlots]);

    const needsPub =
        !String(p.newspaperName || '').trim() || !String(p.publicationDateYmd || '').trim();
    const status = String(p.status || '');

    const showMark = !section || section === 'mark';
    const showExperts = !section || section === 'experts';
    const showAuction = !section || section === 'auction';
    const showPublication = !section || section === 'publication';
    const showAuctionResult = !section || section === 'auction_result';
    const showReauctionDefault = !section || section === 'reauction_default';

    return (
        <div className="relative z-[2] space-y-0 pointer-events-auto">
            {showMark && (!hasMark || (!embedded && section === 'mark')) ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="mark"
                    focusKey={focusKey}
                    title="تسجيل كتاب تأييد وضع الإشارة"
                    titleClassName="text-amber-200"
                    defaultExpanded={focusKey === 'mark' || section === 'mark'}
                >
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <input
                            className={FIELD}
                            placeholder="رقم الكتاب"
                            value={markLetter}
                            onChange={(e) => setMarkLetter(e.target.value)}
                        />
                        <input
                            type="date"
                            className={FIELD}
                            value={markDate}
                            onChange={(e) => setMarkDate(e.target.value)}
                        />
                        <input
                            className={FIELD}
                            placeholder="الجهة المجيبة"
                            value={markEntity}
                            onChange={(e) => setMarkEntity(e.target.value)}
                        />
                        <button
                            type="button"
                            className={BTN_SAVE}
                            onClick={() =>
                                savePropertyMarkInline(
                                    properties,
                                    propertyId,
                                    { letterNo: markLetter, ymd: markDate, entity: markEntity },
                                    saveCtx
                                )
                            }
                        >
                            حفظ
                        </button>
                    </div>
                </InlineSectionShell>
            ) : null}

            {showExperts &&
            !hasExpertReportSaved &&
            (embedded
                ? Boolean(expertDecision) ||
                  (section === 'experts' && Boolean(expertDecisionId))
                : expertDecision || focusKey === 'experts') ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="experts"
                    focusKey={focusKey}
                    title="تسجيل تقرير الخبراء"
                    titleClassName="text-[#E6C673]"
                    defaultExpanded={focusKey === 'experts' || section === 'experts' || Boolean(expertDecision)}
                >
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <label className="block text-[9px] text-slate-400">
                            أسماء الخبراء — {expertCommitteeSizeLabelAr(requiredExperts)}
                        </label>
                        {requiredExperts <= 1 ? (
                            <input
                                className={FIELD}
                                placeholder="اسم الخبير"
                                value={expertNames}
                                onChange={(e) => setExpertNames(e.target.value)}
                            />
                        ) : (
                            <div className="space-y-2">
                                {expertNameSlots.map((slot, idx) => (
                                    <div
                                        key={`expert_slot_${idx}`}
                                        className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
                                    >
                                        <label className="mb-1.5 block text-[9px] font-bold text-[#E6C673]/90 text-right">
                                            الخبير {idx + 1} من {requiredExperts}
                                        </label>
                                        <input
                                            className={FIELD}
                                            placeholder={`اسم الخبير ${idx + 1}`}
                                            value={slot}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setExpertNameSlots((prev) => {
                                                    const next = [...prev];
                                                    next[idx] = v;
                                                    return next;
                                                });
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        <label className="block text-[9px] text-slate-400">تاريخ تقرير الخبراء</label>
                        <input
                            type="date"
                            className={FIELD}
                            value={expertDate}
                            onChange={(e) => setExpertDate(e.target.value)}
                        />
                        <label className="block text-[9px] text-slate-400">السعر المقدر</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            className={`${FIELD} font-mono text-right`}
                            value={expertPrice}
                            onChange={(e) => setExpertPrice(formatNumberInput(e.target.value))}
                            placeholder="0"
                        />
                        <button
                            type="button"
                            className={BTN_SAVE}
                            disabled={!expertDecisionId}
                            onClick={() => {
                                if (!expertDecisionId) return;
                                savePropertyExpertReportInline(
                                    properties,
                                    propertyId,
                                    expertDecisionId,
                                    {
                                        expertNamesRaw: expertNamesRawForSave(),
                                        reportYmd: expertDate,
                                        priceDisplay: expertPrice,
                                    },
                                    saveCtx
                                );
                            }}
                        >
                            حفظ
                        </button>
                    </div>
                </InlineSectionShell>
            ) : null}

            {showAuction && (embedded ? Boolean(auctionDecision) : auctionDecision || focusKey === 'auction') ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="auction"
                    focusKey={focusKey}
                    title="تسجيل موعد المزايدة"
                    titleClassName="text-[#E6C673]"
                    defaultExpanded={focusKey === 'auction' || section === 'auction' || Boolean(auctionDecision)}
                >
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <input
                            type="date"
                            className={FIELD}
                            value={auctionYmd}
                            onChange={(e) => setAuctionYmd(e.target.value)}
                        />
                        <button
                            type="button"
                            className={BTN_SAVE}
                            disabled={!auctionDecisionId}
                            onClick={() => {
                                if (!auctionDecisionId) return;
                                savePropertyAuctionDateInline(
                                    properties,
                                    propertyId,
                                    auctionDecisionId,
                                    auctionYmd,
                                    saveCtx
                                );
                            }}
                        >
                            حفظ
                        </button>
                    </div>
                </InlineSectionShell>
            ) : null}

            {showPublication &&
            (embedded
                ? status === 'published' && needsPub
                : section === 'publication' ||
                  (status === 'published' && needsPub) ||
                  Boolean(String(newspaper || pubDate).trim())) ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="publication"
                    focusKey={focusKey}
                    title="تسجيل بيانات النشر والإعلان"
                    titleClassName="text-amber-200"
                    defaultExpanded={focusKey === 'publication' || section === 'publication'}
                >
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <input
                            className={FIELD}
                            placeholder="اسم الصحيفة"
                            value={newspaper}
                            onChange={(e) => setNewspaper(e.target.value)}
                        />
                        <input
                            type="date"
                            className={FIELD}
                            value={pubDate}
                            onChange={(e) => setPubDate(e.target.value)}
                        />
                        <button
                            type="button"
                            className={BTN_SAVE}
                            onClick={() =>
                                savePropertyPublicationInline(
                                    properties,
                                    propertyId,
                                    { newspaperName: newspaper, ymd: pubDate },
                                    saveCtx
                                )
                            }
                        >
                            حفظ
                        </button>
                    </div>
                </InlineSectionShell>
            ) : null}

            {showAuctionResult &&
            (embedded
                ? status === 'published' && !needsPub
                : section === 'auction_result' ||
                  (status === 'published' && !needsPub) ||
                  Boolean(String(buyerName || awardAmount).trim())) ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="auction_result"
                    focusKey={focusKey}
                    title="تسجيل نتيجة جلسة المزايدة"
                    titleClassName="text-violet-200"
                    defaultExpanded={focusKey === 'auction_result' || section === 'auction_result'}
                >
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setAuctionOutcome('initial_award')}
                                className={`flex-1 rounded-xl border px-2 py-2 text-[10px] font-bold ${
                                    auctionOutcome === 'initial_award'
                                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
                                        : 'border-white/10 text-slate-400'
                                }`}
                            >
                                إحالة أولية
                            </button>
                            <button
                                type="button"
                                onClick={() => setAuctionOutcome('no_bidders')}
                                className={`flex-1 rounded-xl border px-2 py-2 text-[10px] font-bold ${
                                    auctionOutcome === 'no_bidders'
                                        ? 'border-rose-500/40 bg-rose-500/15 text-rose-100'
                                        : 'border-white/10 text-slate-400'
                                }`}
                            >
                                لا راغب
                            </button>
                        </div>
                        {auctionOutcome === 'initial_award' ? (
                            <>
                                <input
                                    className={FIELD}
                                    placeholder="اسم المشتري"
                                    value={buyerName}
                                    onChange={(e) => setBuyerName(e.target.value)}
                                />
                                <input
                                    className={`${FIELD} font-mono text-right`}
                                    dir="ltr"
                                    placeholder="مبلغ رسو المزاد"
                                    value={awardAmount}
                                    onChange={(e) => setAwardAmount(formatNumberInput(e.target.value))}
                                />
                            </>
                        ) : null}
                        <button
                            type="button"
                            className={BTN_SAVE}
                            onClick={() =>
                                savePropertyAuctionResultInline(
                                    properties,
                                    propertyId,
                                    {
                                        outcome: auctionOutcome,
                                        buyerName,
                                        amountDisplay: awardAmount,
                                    },
                                    saveCtx
                                )
                            }
                        >
                            حفظ
                        </button>
                    </div>
                </InlineSectionShell>
            ) : null}

            {showReauctionDefault &&
            (embedded
                ? Boolean(reauctionDecision)
                : reauctionDecision || focusKey === 'reauction_default') ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="reauction_default"
                    focusKey={focusKey}
                    title="تسجيل النكول / إعادة المزايدة"
                    titleClassName="text-rose-200"
                    defaultExpanded={
                        focusKey === 'reauction_default' ||
                        section === 'reauction_default' ||
                        Boolean(reauctionDecision)
                    }
                >
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <textarea
                            className={`${FIELD} min-h-[72px] resize-none`}
                            placeholder="سبب النكول / ملاحظات إعادة المزايدة"
                            value={reauctionNotes}
                            onChange={(e) => setReauctionNotes(e.target.value)}
                        />
                        <button
                            type="button"
                            className={BTN_SAVE}
                            disabled={!reauctionDecisionId}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!reauctionDecisionId) return;
                                savePropertyReauctionDefaultInline(
                                    properties,
                                    propertyId,
                                    reauctionDecisionId,
                                    reauctionNotes,
                                    saveCtx
                                );
                            }}
                        >
                            حفظ
                        </button>
                    </div>
                </InlineSectionShell>
            ) : null}
        </div>
    );
};
