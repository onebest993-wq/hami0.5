#!/usr/bin/env node
/**
 * إضافة الملفات التي أسقطها التصنيف الأصلي — بعد تدقيق اكتمال الجرد.
 *
 * سبب الإسقاط: NAME_CONCEPTS لم تحمل specificDelivery / encroachment / SecureStore /
 * cloudSync / DecisionsAppeals، وIMPORT_MARKERS لم تحمل executorSeizureDecisionQueue.
 *
 * تُسجَّل بوحدة R-late-discovered وتُعلَّم غير مفحوصة.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FILE = join(ROOT, '.audit', 'execution-inventory.json');

const MISSED = [
    // خدمات التخزين والمزامنة — كل كتابة تنفيذية تمر منها
    'src/app/services/SecureStoreService.ts',
    'src/app/services/cloudSyncEngine.ts',
    // مشغّل قسم التنفيذ من الشاشة الرئيسية
    'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx',
    // محرّك القرارات والاستئنافات — يعدّل قرارات المنفذ فعلياً
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsRowMutations.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsEngineController.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsTransitionWorkflow.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsGrievanceMutations.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsWaiveAppealMutations.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsCassationMutations.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/components/AppealOriginBadge.tsx',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/__tests__/creditorRequestAppealGate.test.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/__tests__/decisionCardSort.test.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/__tests__/appealProceedings.test.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/__tests__/appealDeadlineEnforcement.test.ts',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/__tests__/useDecisionsAppealsEngineController.integration.test.tsx',
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/__tests__/useDecisionsAppealsEngineStorage.persistReload.test.ts',
    // تسليم شيء معين + إزالة التجاوز — نفس نوع الدعوى الذي فيه عطل الانهيار المؤكد
    'src/app/utils/specificDeliveryConversionRequest.ts',
    'src/app/utils/specificDeliveryPropertyExpertRequest.ts',
    'src/app/utils/specificDeliveryExpertVisibility.ts',
    'src/app/utils/resolveSpecificDeliveryUiPhase.ts',
    'src/app/utils/encroachmentRemovalRequests.ts',
    'src/app/utils/otherPartyCreditorTrackDecisionUtils.ts',
    'src/app/utils/partyDeathClaimPolicyLite.ts',
    'src/app/utils/__tests__/specificDeliveryConversionRequest.test.ts',
    'src/app/utils/__tests__/encroachmentDecisionIntegration.test.ts',
    'src/app/utils/__tests__/specificDeliveryMovableValuationRequest.test.ts',
    // أنواع مشتركة تحمل seizedAssets
    'src/app/types/common.ts',
];

const data = JSON.parse(readFileSync(FILE, 'utf8'));
const existing = new Set(data.records.map((r) => r.path));

let added = 0;
let addedLines = 0;

for (const rel of MISSED) {
    if (existing.has(rel)) {
        console.log(`already present, skipped: ${rel}`);
        continue;
    }
    let src = '';
    try {
        src = readFileSync(join(ROOT, rel), 'utf8');
    } catch {
        console.log(`MISSING ON DISK: ${rel}`);
        continue;
    }
    const lines = src.split('\n').length;
    data.records.push({
        path: rel,
        lines,
        module: 'R-late-discovered',
        reason: 'completeness-audit',
        isTest: /__tests__|\.test\.|\.spec\./.test(rel),
        tsNocheck: /^\s*\/\/\s*@ts-nocheck/m.test(src.slice(0, 400)),
        reviewed: false,
    });
    added += 1;
    addedLines += lines;
}

data.totals.files = data.records.length;
data.totals.lines = data.records.reduce((s, r) => s + r.lines, 0);
data.totals.prodFiles = data.records.filter((r) => !r.isTest).length;
data.totals.prodLines = data.records.filter((r) => !r.isTest).reduce((s, r) => s + r.lines, 0);
data.totals.testFiles = data.records.filter((r) => r.isTest).length;
data.totals.tsNocheckFiles = data.records.filter((r) => r.tsNocheck).length;

const reviewed = data.records.filter((r) => r.reviewed);
data.coverage = {
    reviewedFiles: reviewed.length,
    reviewedLines: reviewed.reduce((s, r) => s + r.lines, 0),
    pendingFiles: data.records.length - reviewed.length,
    pendingLines: data.totals.lines - reviewed.reduce((s, r) => s + r.lines, 0),
    percentFiles: Number(((reviewed.length / data.records.length) * 100).toFixed(1)),
    percentLines: Number(((reviewed.reduce((s, r) => s + r.lines, 0) / data.totals.lines) * 100).toFixed(1)),
};

writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');

console.log('');
console.log(`added ${added} late-discovered files (${addedLines} lines)`);
console.log(`inventory now: ${data.totals.files} files / ${data.totals.lines} lines`);
console.log(
    `coverage: ${data.coverage.reviewedFiles}/${data.totals.files} files (${data.coverage.percentFiles}%) | pending ${data.coverage.pendingFiles} files / ${data.coverage.pendingLines} lines`,
);
