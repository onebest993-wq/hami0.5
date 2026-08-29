import type {
    ConsolidationSecondaryRef,
    FileData,
    IncidentalCase,
    Party,
    Task,
    TimelineEvent,
} from '../../LawyerShared';
import {
    type ConsolidationExternalMeta,
    type ConsolidationMergeMeta,
    appendSecondaryRef,
    assertConsolidationStageCompatibility,
    buildConsolidationEvent,
    formatConsolidatedChipLabel,
    mergeById,
    mergeHistory,
    mergeImages,
    mergeNotes,
    mergeParties,
    preservePrimaryFileFields,
    resolveActiveStageIndex,
    resolveStages,
    sortTimeline,
    sumOptionalAmount,
} from './caseConsolidationHelpers';

export function addExternalConsolidationRef(
    file: FileData,
    meta: ConsolidationExternalMeta,
): FileData {
    const stages = [...resolveStages(file)];
    const idx = resolveActiveStageIndex(file, stages);
    const stage = { ...stages[idx] };
    const preserved = preservePrimaryFileFields(file, stage, String(file.caseNo ?? '').trim() || `#${file.id}`);

    const ref: ConsolidationSecondaryRef = {
        id: `cons_ext_${Date.now()}`,
        caseNo: meta.peerCaseNo.trim(),
        isExternal: true,
        consolidationDate: meta.consolidationDate,
        reason: meta.notes,
    };
    const refs = appendSecondaryRef(
        stage.consolidatedSecondaryRefs ?? file.consolidationSecondaryRefs,
        ref,
    );

    stages[idx] = {
        ...stage,
        ...preserved,
        consolidatedSecondaryRefs: refs,
        consolidatedWith: formatConsolidatedChipLabel(refs),
        timeline: [
            buildConsolidationEvent(preserved.caseNo ?? '', ref.caseNo, meta, true),
            ...(stage.timeline ?? []),
        ],
    };

    return {
        ...file,
        caseNo: preserved.caseNo,
        court: preserved.court || file.court,
        judge: preserved.judge || file.judge,
        docType: preserved.docType || file.docType,
        claimValue: preserved.claimValue || file.claimValue,
        stages,
        activeStageIndex: idx,
        consolidationSecondaryRefs: refs,
    };
}

export function mergeLawsuitFilesForConsolidation(
    primary: FileData,
    secondary: FileData,
    meta: ConsolidationMergeMeta,
): { mergedPrimary: FileData; archivedSecondary: FileData } | { error: string } {
    const stageCheck = assertConsolidationStageCompatibility(primary, secondary);
    if (!stageCheck.ok) return { error: stageCheck.message };

    const primaryStages = [...resolveStages(primary)];
    const secondaryStages = [...resolveStages(secondary)];
    const primaryIdx = resolveActiveStageIndex(primary, primaryStages);
    const secondaryIdx = resolveActiveStageIndex(secondary, secondaryStages);
    const primaryStage = { ...primaryStages[primaryIdx] };
    const secondaryStage = { ...secondaryStages[secondaryIdx] };

    const secondaryCaseNo =
        String(secondary.caseNo ?? secondaryStage.caseNo ?? '').trim() || `#${secondary.id}`;
    const primaryCaseNo = String(primary.caseNo ?? '').trim() || String(primaryStage.caseNo ?? '').trim() || `#${primary.id}`;
    const preserved = preservePrimaryFileFields(primary, primaryStage, primaryCaseNo);

    const ref: ConsolidationSecondaryRef = {
        id: `cons_${Date.now()}`,
        caseNo: secondaryCaseNo,
        peerFileId: Number(secondary.id),
        isExternal: false,
        consolidationDate: meta.consolidationDate,
        reason: meta.notes,
    };
    const refs = appendSecondaryRef(
        primaryStage.consolidatedSecondaryRefs ?? primary.consolidationSecondaryRefs,
        ref,
    );

    const mergedTimeline = sortTimeline([
        ...((primaryStage.timeline as TimelineEvent[] | undefined) ?? []),
        ...((secondaryStage.timeline as TimelineEvent[] | undefined) ?? []),
        buildConsolidationEvent(primaryCaseNo, secondaryCaseNo, meta, false),
    ]);

    const mergedTasks = mergeById<Task>(
        (primaryStage.tasks as Task[] | undefined) ?? [],
        (secondaryStage.tasks as Task[] | undefined) ?? [],
    );
    const mergedIncidental = mergeById<IncidentalCase>(
        (primaryStage.incidentalCases as IncidentalCase[] | undefined) ?? [],
        (secondaryStage.incidentalCases as IncidentalCase[] | undefined) ?? [],
    );
    const mergedThirdParties = mergeById(
        (primaryStage.thirdParties as { id: string }[] | undefined) ?? [],
        (secondaryStage.thirdParties as { id: string }[] | undefined) ?? [],
    );
    const mergedParties = mergeParties(
        (primaryStage.parties as Party[] | undefined) ?? primary.parties ?? [],
        (secondaryStage.parties as Party[] | undefined) ?? secondary.parties ?? [],
    );
    const mergedNotes = mergeNotes(primary.notes ?? [], secondary.notes ?? []);
    const mergedImages = mergeImages(primary.images, secondary.images);
    const mergedHistory = mergeHistory(primary.history, secondary.history);

    primaryStages[primaryIdx] = {
        ...primaryStage,
        ...preserved,
        consolidatedSecondaryRefs: refs,
        consolidatedWith: formatConsolidatedChipLabel(refs),
        timeline: mergedTimeline,
        tasks: mergedTasks,
        incidentalCases: mergedIncidental,
        parties: mergedParties,
        thirdParties: mergedThirdParties.length > 0 ? mergedThirdParties : primaryStage.thirdParties,
    };

    const mergedPrimary: FileData = {
        ...primary,
        caseNo: preserved.caseNo,
        court: preserved.court || primary.court,
        judge: preserved.judge || primary.judge,
        docType: preserved.docType || primary.docType,
        claimValue: preserved.claimValue || primary.claimValue,
        parties: mergedParties,
        stages: primaryStages,
        activeStageIndex: primaryIdx,
        tasks: mergedTasks,
        incidentalCases: mergedIncidental,
        consolidationSecondaryRefs: refs,
        notes: mergedNotes,
        images: mergedImages,
        history: mergedHistory,
        feesTotal: sumOptionalAmount(primary.feesTotal, secondary.feesTotal),
        feesPaid: sumOptionalAmount(primary.feesPaid, secondary.feesPaid),
        mergedConsolidatedFileIds: [
            ...(Array.isArray(primary.mergedConsolidatedFileIds) ? primary.mergedConsolidatedFileIds : []),
            Number(secondary.id),
        ],
    };

    const archivedSecondary: FileData = {
        ...secondary,
        status: 'archived',
        consolidationMergedInto: Number(primary.id),
    };

    return { mergedPrimary, archivedSecondary };
}
