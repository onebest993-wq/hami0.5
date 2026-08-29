import React from 'react';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '../../utils/expertCommitteeUtils';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import {
    saveMovableMarkInline,
} from '../../utils/movableSeizureInlinePersistence';
import { saveMovableExpertReportInline } from '../../utils/movableSeizureInlinePersistence.late';
import {
    savePropertyExpertReportInline,
    savePropertyMarkInline,
} from '../../utils/propertySeizureInlinePersistence';
import {
    FIELD,
    THEME,
    InlineSectionShell,
    hasExpertReportSaved,
    resolveEntitiesForSave,
    type SeizureInlineSectionsCoreProps,
} from './seizureInlineSectionsShared';
import type { MovableInlineSaveContext } from '../../utils/movableSeizureInlinePersistence';
import type { PropertyInlineSaveContext } from '../../utils/propertySeizureInlinePersistence';
import { useSeizureInlineEntityDraftState } from './useSeizureInlineEntityDraftState';
import { useSeizureInlineSectionDecisions } from './useSeizureInlineSectionDecisions';
import { SeizureInlineLateSections } from './SeizureInlineLateSections';

export type {
    SeizureInlineSectionKey,
    MovableExpertDecisionSubtype,
    PropertyExpertDecisionSubtype,
    SeizureExpertDecisionSubtype,
    SeizureInlineEntity,
    SeizureInlineSectionsCoreProps,
} from './seizureInlineSectionsShared';

export const SeizureInlineSectionsCore: React.FC<SeizureInlineSectionsCoreProps> = ({
    assetKind,
    entity: row,
    entities,
    decisions,
    saveCtx,
    focusKey,
    pendingDecisionId,
    section,
    embedded = false,
    expertDecisionSubtype,
}) => {
    const theme = THEME[assetKind];
    const entityId = String(row.id || '').trim();
    const hasMark = Boolean(String(row.seizureMarkLetterNumber || '').trim());

    const {
        markLetter,
        setMarkLetter,
        markDate,
        setMarkDate,
        markEntity,
        setMarkEntity,
        expertNames,
        setExpertNames,
        expertNameSlots,
        setExpertNameSlots,
        expertDate,
        setExpertDate,
        expertPrice,
        setExpertPrice,
        auctionYmd,
        setAuctionYmd,
        newspaper,
        setNewspaper,
        pubDate,
        setPubDate,
        auctionOutcome,
        setAuctionOutcome,
        buyerName,
        setBuyerName,
        awardAmount,
        setAwardAmount,
        reauctionNotes,
        setReauctionNotes,
    } = useSeizureInlineEntityDraftState(row, assetKind);

    const {
        expertDecision,
        auctionDecision,
        reauctionDecision,
        expertDecisionId,
        auctionDecisionId,
        reauctionDecisionId,
    } = useSeizureInlineSectionDecisions({
        assetKind,
        entityId,
        decisions,
        expertDecisionSubtype,
        pendingDecisionId,
        focusKey,
        section,
    });

    const requiredExperts = readExpertCommitteeSize(row);
    const expertReportSaved = hasExpertReportSaved(row, assetKind);

    const expertNamesRawForSave = React.useCallback((): string => {
        if (requiredExperts <= 1) {
            return String(expertNames || '').trim();
        }
        return expertNameSlots.map((s) => String(s || '').trim()).join('، ');
    }, [requiredExperts, expertNames, expertNameSlots]);

    const needsPub =
        !String(row.newspaperName || '').trim() || !String(row.publicationDateYmd || '').trim();
    const status = String(row.status || '');

    const showMark = !section || section === 'mark';
    const showExperts = !section || section === 'experts';
    const showAuction = !section || section === 'auction';
    const showPublication = !section || section === 'publication';
    const showAuctionResult = !section || section === 'auction_result';
    const showReauctionDefault = !section || section === 'reauction_default';

    const entitiesForSave = () => resolveEntitiesForSave(assetKind, saveCtx, entities, row);

    return (
        <div className="relative z-[2] space-y-0 pointer-events-auto">
            {showMark && (!hasMark || (!embedded && section === 'mark')) ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="mark"
                    focusKey={focusKey}
                    title="تسجيل كتاب تأييد وضع الإشارة"
                    titleClassName={theme.markTitle}
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
                            className={theme.btnSave}
                            onClick={() => {
                                const list = entitiesForSave();
                                const payload = {
                                    letterNo: markLetter,
                                    ymd: markDate,
                                    entity: markEntity,
                                };
                                if (assetKind === 'movable') {
                                    saveMovableMarkInline(
                                        list as SeizedMovable[],
                                        entityId,
                                        payload,
                                        saveCtx as MovableInlineSaveContext,
                                    );
                                } else {
                                    savePropertyMarkInline(
                                        list as SeizedProperty[],
                                        entityId,
                                        payload,
                                        saveCtx as PropertyInlineSaveContext,
                                    );
                                }
                            }}
                        >
                            حفظ
                        </button>
                    </div>
                </InlineSectionShell>
            ) : null}

            {showExperts &&
            !expertReportSaved &&
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
                    defaultExpanded={
                        focusKey === 'experts' || section === 'experts' || Boolean(expertDecision)
                    }
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
                            className={theme.btnSave}
                            disabled={!expertDecisionId}
                            onClick={() => {
                                if (!expertDecisionId) return;
                                const list = entitiesForSave();
                                const payload = {
                                    expertNamesRaw: expertNamesRawForSave(),
                                    reportYmd: expertDate,
                                    priceDisplay: expertPrice,
                                };
                                if (assetKind === 'movable') {
                                    saveMovableExpertReportInline(
                                        list as SeizedMovable[],
                                        entityId,
                                        expertDecisionId,
                                        payload,
                                        saveCtx as MovableInlineSaveContext,
                                    );
                                } else {
                                    savePropertyExpertReportInline(
                                        list as SeizedProperty[],
                                        entityId,
                                        expertDecisionId,
                                        payload,
                                        saveCtx as PropertyInlineSaveContext,
                                    );
                                }
                            }}
                        >
                            حفظ
                        </button>
                    </div>
                </InlineSectionShell>
            ) : null}

            <SeizureInlineLateSections
                assetKind={assetKind}
                entityId={entityId}
                embedded={embedded}
                focusKey={focusKey}
                section={section}
                theme={theme}
                status={status}
                needsPub={needsPub}
                showAuction={showAuction}
                showPublication={showPublication}
                showAuctionResult={showAuctionResult}
                showReauctionDefault={showReauctionDefault}
                auctionDecision={auctionDecision}
                auctionDecisionId={auctionDecisionId}
                reauctionDecision={reauctionDecision}
                reauctionDecisionId={reauctionDecisionId}
                auctionYmd={auctionYmd}
                setAuctionYmd={setAuctionYmd}
                newspaper={newspaper}
                setNewspaper={setNewspaper}
                pubDate={pubDate}
                setPubDate={setPubDate}
                auctionOutcome={auctionOutcome}
                setAuctionOutcome={setAuctionOutcome}
                buyerName={buyerName}
                setBuyerName={setBuyerName}
                awardAmount={awardAmount}
                setAwardAmount={setAwardAmount}
                reauctionNotes={reauctionNotes}
                setReauctionNotes={setReauctionNotes}
                entitiesForSave={entitiesForSave}
                saveCtx={saveCtx}
            />
        </div>
    );
};

