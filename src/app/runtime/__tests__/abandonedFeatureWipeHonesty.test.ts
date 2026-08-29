import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('abandoned feature wipe honesty', () => {
    it('OCR والمحرّك المساعد محذوفان', () => {
        expect(existsSync(join(root, 'src/app/services/documentOcrService.ts'))).toBe(false);
        const assist = src('src/app/services/auth/lawyerIdentityAssist.ts');
        expect(assist).not.toContain('assistIdentityFromIdCard');
        expect(assist).not.toContain('documentOcrService');
        const vaultExtract = src('src/app/services/vault/vaultTextExtractionService.ts');
        expect(vaultExtract).not.toContain('documentOcrService');
        expect(vaultExtract).toContain('extractTextFromVaultPdf');
        const admin = src('src/app/components/admin/AdminLawyerVerificationRequests.tsx');
        expect(admin).not.toContain('OCR:');
        expect(admin).not.toContain('ocrNameMatch');
    });

    it('secretaryEnabled وعدّاد سبارك وعارض الزيارة المهجور محذوفة', () => {
        const settings = src('src/app/services/settings/notificationSettings.ts');
        expect(settings).not.toContain('secretaryEnabled');
        expect(settings).not.toContain('BUILTIN_SMART_ALERTS');
        const aria = src('src/app/components/lawyer/dashboard/commandHub/buildHubTileAriaLabel.ts');
        expect(aria).not.toContain('proceduralAttentionCount');
        const model = src('src/app/components/lawyer/dashboard/useHomeTabContentModel.ts');
        expect(model).not.toContain('hubTileAttention');
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/ExecutionDashboard/components/VisitationCalendarModal.tsx',
                ),
            ),
        ).toBe(false);
        const registry = src(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistry.ts',
        );
        expect(registry).not.toContain('LazyVisitationCalendarModal');
        const followup = src(
            'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupController.ts',
        );
        expect(followup).not.toContain('showVisitationCalendarModal');
        expect(followup).not.toContain('setShowVisitationCalendarModal');
        const phoneBody = src(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBody.tsx',
        );
        expect(phoneBody).not.toContain('showVisitationCalendarModal');
        const actionGrid = src(
            'src/app/components/lawyer/ExecutionDashboard/components/ActionGridSection.tsx',
        );
        expect(actionGrid).not.toContain('showVisitationCalendarButton');
        expect(actionGrid).not.toContain('onOpenVisitationCalendar');
    });

    it('جدول RAG ودالة daily-auditor وأرشيف التسجيل غير الموصول محذوفة', () => {
        expect(existsSync(join(root, 'supabase/functions/daily-auditor'))).toBe(false);
        const config = src('supabase/config.toml');
        expect(config).not.toContain('functions.daily-auditor');
        const migration = src('supabase/migrations/032_drop_abandoned_rag_auditor.sql');
        expect(migration).toContain('DROP TABLE IF EXISTS public.cassation_decisions');
        expect(migration).toContain('daily_auditor_3am_baghdad');
        expect(existsSync(join(root, 'docs/archive/unwired-lawyer-registration'))).toBe(false);
        const srcTreeHint = src('src/app/api/laws/list/route.ts');
        expect(srcTreeHint).not.toContain('cassation_decisions');
        const edgeServer = src('supabase/functions/server/index.tsx');
        const edgeClone = src('supabase/functions/make-server-f09713ba/index.tsx');
        expect(edgeServer).not.toContain('legal-memory-search');
        expect(edgeClone).not.toContain('legal-memory-search');
        expect(edgeServer).not.toContain('comms-dispatcher');
        expect(edgeClone).not.toContain('comms-dispatcher');
        expect(edgeServer).not.toContain('RAG retired');
        expect(edgeClone).not.toContain('RAG retired');
        expect(src('docs/API.md')).not.toContain('legal-memory-search');
    });

    it('مالية معاملات مهجورة: لا تبويب ولا كتابة ولا مزامنة تقويم', () => {
        expect(existsSync(join(root, 'src/app/components/lawyer/TransactionsThreading/FinancesTabView.tsx'))).toBe(
            false,
        );
        expect(
            existsSync(join(root, 'src/app/components/lawyer/TransactionsThreading/AddFinanceBottomSheet.tsx')),
        ).toBe(false);
        expect(
            existsSync(join(root, 'src/app/components/lawyer/TransactionsThreading/FinancialRecordCard.tsx')),
        ).toBe(false);
        const store = src('src/app/modules/transactionsThreading/store.ts');
        expect(store).not.toContain('addFinanceRecord');
        expect(store).not.toContain('setTransactionAgreedFees');
        const service = src('src/app/modules/transactionsThreading/service.ts');
        expect(service).not.toContain('listFinanceRecords');
        expect(service).not.toContain('addFinanceRecord');
        const persist = src('src/app/services/transactions/sanitizeTransactionsThreadingPersist.ts');
        expect(persist).toContain('financeRecords: []');
        const calendar = src('src/app/services/calendar/bridge/legacyCalendarBridge.ts');
        expect(calendar).not.toContain('syncThreadingFinance');
        const alerts = src('src/app/services/financialAlerts.ts');
        expect(alerts).not.toContain('agreedFees');
        expect(alerts).not.toContain('AdvancePayment');
    });

    it('سوق النجدة/الاستشارة الفورية وصندوق طلبات التوكيل محذوفة', () => {
        expect(existsSync(join(root, 'src/app/components/lawyer/ClientRequestsHub.tsx'))).toBe(false);
        expect(existsSync(join(root, 'src/app/stores/legalMarketplaceStore.ts'))).toBe(false);
        expect(existsSync(join(root, 'src/app/infrastructure/persistence/legalMarketplaceStorePersist.ts'))).toBe(
            false,
        );
        expect(existsSync(join(root, 'src/app/services/ClientRequestService.ts'))).toBe(false);
        expect(existsSync(join(root, 'src/app/types/common/clientRequests.ts'))).toBe(false);
        const common = src('src/app/types/common.ts');
        expect(common).not.toContain('clientRequests');
        const secretary = src('src/app/services/SecretaryOrchestrator.ts');
        expect(secretary).not.toContain('ClientRequestService');
        expect(secretary).not.toContain('buildRequestAlerts');
        expect(secretary).not.toContain('client_requests');
        const overlay = src(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNonExecArchiveOverlayEntry.tsx',
        );
        expect(overlay).not.toContain('LazyClientRequestsHub');
        const persist = src('src/app/services/securePersistStorage.ts');
        expect(persist).not.toContain('hami-legal-marketplace');
        expect(existsSync(join(root, 'src/app/api/requests'))).toBe(false);
        expect(existsSync(join(root, 'src/app/api/comms-dispatcher'))).toBe(false);
        expect(existsSync(join(root, 'src/app/api/requests/list/route.ts'))).toBe(false);
        expect(existsSync(join(root, 'src/app/api/requests/create/route.ts'))).toBe(false);
        expect(existsSync(join(root, 'src/app/api/requests/update/route.ts'))).toBe(false);
        expect(existsSync(join(root, 'src/app/api/comms-dispatcher/route.ts'))).toBe(false);
        const manifest = src('src/app/api/vercelRouteManifest.ts');
        expect(manifest).not.toContain('comms-dispatcher');
        expect(manifest).not.toContain('requests/');
        const catalog = src('e2e/fixtures/wife-protected-routes.json');
        expect(catalog).not.toContain('/api/comms-dispatcher');
        expect(catalog).not.toContain('/api/requests/');
        expect(src('package.json')).not.toContain('comms-dispatcher/route.test.ts');
        expect(src('.env.production.example')).not.toContain('WIFE_DISABLE_EDGE_COMMS_DISPATCHER');
        expect(src('.env.example')).not.toContain('WIFE_DISABLE_EDGE_COMMS_DISPATCHER');
        const alimonyTypes = src(
            'src/app/components/lawyer/ExecutionCreationView/hooks/alimonyCreationAnalysisTypes.ts',
        );
        expect(alimonyTypes).not.toContain('sparkBrief');
        const hubCss = src('src/app/components/lawyer/LawyerHomeHubCard/homeHubAlertsFx.css');
        expect(hubCss).not.toContain('hami-hub-alert-row--new');
        const hubRow = src(
            'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubAlertRow.tsx',
        );
        expect(hubRow).not.toContain("tone === 'new'");
        expect(src('src/app/domain/admin/AdminUser.ts')).not.toContain("'client'");
        expect(src('src/app/types/admin-types.ts')).not.toContain('CLIENT');
        expect(src('src/app/types/common/user.ts')).not.toContain("'client'");
    });

    it('حدّ المعدّل في المتصفح متقاعد — الحماية على الخادم عبر wifeRateLimitStore', () => {
        expect(existsSync(join(root, 'src/app/services/RateLimitService.ts'))).toBe(false);
        expect(src('src/app/security/SecurityInitializer.tsx')).not.toContain('rateLimitService');
        expect(src('src/app/services/SecureAPIClient.ts')).not.toContain('rateLimitService');
        expect(src('src/app/services/settings/wipeIndexedDatabases.ts')).toContain('HamiRateLimitDB');
        const crypto = src('src/app/services/CryptoService.ts');
        expect(crypto).not.toContain('encryptObject');
        expect(crypto).not.toContain('persistKeyToSession');
        expect(crypto).not.toContain('setMasterKey');
    });
});
