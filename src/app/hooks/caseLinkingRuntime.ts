import type { FileData } from '@/app/components/lawyer/LawyerShared';

/** find محلي خفيف — لا يسحب حزم الربط/التوحيد إلى stem LD */
export function findLawsuitFileById(files: FileData[], fileId: number): FileData | null {
    return (
        files.find((f) => Number(f.id) === Number(fileId) || String(f.id) === String(fileId)) ?? null
    );
}

export async function loadCaseLinkingRuntime() {
    const [incidental, consolidation, linking] = await Promise.all([
        import('@/app/components/lawyer/smart-modal/smartFile/incidentalCaseLinking'),
        import('@/app/components/lawyer/smart-modal/smartFile/caseConsolidationLinking'),
        import('@/app/components/lawyer/smart-modal/smartFile/caseLinking'),
    ]);
    return {
        patchIncidentalLinkedFile: incidental.patchIncidentalLinkedFile,
        mergeLawsuitFilesForConsolidation: consolidation.mergeLawsuitFilesForConsolidation,
        assertDistinctConsolidationPair: consolidation.assertDistinctConsolidationPair,
        alignSecondaryFileLitigationStage: consolidation.alignSecondaryFileLitigationStage,
        linkExistingLawsuitFiles: linking.linkExistingLawsuitFiles,
    };
}
