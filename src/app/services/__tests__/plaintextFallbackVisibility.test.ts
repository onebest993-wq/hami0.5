/**
 * الفرع الذي يُسقط التشفير عن أكبر الحمولات — يجب أن يبقى مرئياً ومسمّى.
 *
 * شظايا القضايا الجنائية ومفاتيح التسخين والإشعارات/الملف لا تسقط — تشفير أو فشل.
 * مقاطع الدعاوى والمعاملات تُشفَّر؛ التنفيذ وحده plaintext محلي.
 */
import { PROTECTED_WARM_KEYS } from '@/app/services/dossierPersistence/protectedStorageKeys';
import {
    CRIMINAL_SHARD_ENCRYPT_MAX_BYTES,
    ENCRYPT_MAX_BYTES,
    encryptionSizeLimitFor,
    fallsBackToPlaintextBySize,
    isLawsuitEncryptAlwaysKey,
    isLawsuitLegalStorageKey,
    isSensitiveStorageKey,
    isWarmEncryptAlwaysKey,
    shouldEncryptValue,
} from '../secureStorageKeys';

const big = (bytes: number) => 'x'.repeat(bytes);

describe('رؤية سقوط التشفير بسبب الحجم', () => {
    it('حمولة إضبارة دعوى فوق الحدّ تبقى مشفّرة — لا plaintext fallback', () => {
        const key = 'lawyer_files_active';
        expect(isSensitiveStorageKey(key)).toBe(true);

        const over = big(ENCRYPT_MAX_BYTES + 1);
        expect(shouldEncryptValue(key, over)).toBe(true);
        expect(fallsBackToPlaintextBySize(key, over)).toBe(false);
    });

    it('نفس مفتاح الدعوى تحت الحدّ يُشفَّر', () => {
        const key = 'lawyer_files_active';
        const under = big(ENCRYPT_MAX_BYTES - 1);
        expect(shouldEncryptValue(key, under)).toBe(true);
        expect(fallsBackToPlaintextBySize(key, under)).toBe(false);
    });

    it('شظيّة القضية الجزائية لها حدّ أضيق للتجزئة — لا تسقط إلى plaintext', () => {
        const key = 'hami:criminal:case:c-1';
        expect(encryptionSizeLimitFor(key)).toBe(CRIMINAL_SHARD_ENCRYPT_MAX_BYTES);
        expect(encryptionSizeLimitFor('lawyer_files_active')).toBe(ENCRYPT_MAX_BYTES);
        expect(fallsBackToPlaintextBySize(key, big(CRIMINAL_SHARD_ENCRYPT_MAX_BYTES + 1))).toBe(false);
        expect(shouldEncryptValue(key, big(CRIMINAL_SHARD_ENCRYPT_MAX_BYTES + 1))).toBe(true);
    });

    it('مفتاح غير حسّاس لا يُحسَب سقوطاً — لم يكن مُرشَّحاً للتشفير أصلاً', () => {
        // وإلّا صار البلاغ ضجيجاً عن مفاتيح الواجهة الكبيرة كالخلفية
        expect(fallsBackToPlaintextBySize('lawyer_theme', big(ENCRYPT_MAX_BYTES + 1))).toBe(false);
        expect(fallsBackToPlaintextBySize('lawyer_wallpaper', big(ENCRYPT_MAX_BYTES + 1))).toBe(false);
    });

    it('مقاطع الدعاوى المُسخَّنة فوق الحدّ تُشفَّر — لا plaintext fallback', () => {
        const over = big(ENCRYPT_MAX_BYTES + 1);
        for (const key of ['lawyer_files', 'lawyer_files_active', 'lawyer_files_index'] as const) {
            expect(isLawsuitEncryptAlwaysKey(key)).toBe(true);
            expect(isLawsuitLegalStorageKey(key)).toBe(true);
            expect(fallsBackToPlaintextBySize(key, over)).toBe(false);
            expect(shouldEncryptValue(key, over)).toBe(true);
        }
    });

    it('مقاطع archived/trash فوق الحدّ تُشفَّر — لا plaintext fallback', () => {
        const over = big(ENCRYPT_MAX_BYTES + 1);
        for (const key of ['lawyer_files_archived', 'lawyer_files_trash'] as const) {
            expect(isLawsuitEncryptAlwaysKey(key)).toBe(true);
            expect(isLawsuitLegalStorageKey(key)).toBe(true);
            expect(fallsBackToPlaintextBySize(key, over)).toBe(false);
            expect(shouldEncryptValue(key, over)).toBe(true);
        }
    });

    it('مفاتيح التسخين الحسّاسة فوق الحدّ تُشفَّر — لا plaintext fallback', () => {
        const over = big(ENCRYPT_MAX_BYTES + 1);
        const warmed = [
            'lawyer_settings',
            'lawyer_notes',
            'hami:calendar:events:v1',
            'hami:community:posts:v1',
            'hami:repository:docs:v1',
            'hami:smartvault:docs:v1',
            'hami:lawsuit:dossier-tombstones:v1',
            'hami:calendar:tombstones:v1',
            'hami:community:deleted-ids:v1',
            'hami:transactions:v1',
            'hami:smartvault:deleted:v1',
            'hami:repository:deleted:v1',
            'hami:lawyer-notes:deleted:v1',
            'hami:forum:groups:v1',
            'hami:forum:group-members:v1',
            'hami_quantum_legal_tasks_v1',
        ] as const;
        for (const key of warmed) {
            expect([...PROTECTED_WARM_KEYS]).toContain(key);
            expect(isWarmEncryptAlwaysKey(key)).toBe(true);
            expect(fallsBackToPlaintextBySize(key, over)).toBe(false);
            expect(shouldEncryptValue(key, over)).toBe(true);
        }
    });

    it('كاش الإشعارات وملف المحامي يُشفَّران فوق الحدّ — لا plaintext fallback', () => {
        const over = big(ENCRYPT_MAX_BYTES + 1);
        expect(isWarmEncryptAlwaysKey('hami:notifications:v1:user-1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:profile:v1:user-1')).toBe(true);
        expect(fallsBackToPlaintextBySize('hami:notifications:v1:user-1', over)).toBe(false);
        expect(fallsBackToPlaintextBySize('hami:profile:v1:user-1', over)).toBe(false);
        expect(shouldEncryptValue('hami:notifications:v1:user-1', over)).toBe(true);
        expect(shouldEncryptValue('hami:profile:v1:user-1', over)).toBe(true);
    });

    it('سجل المعاملات وخيوطها يُشفَّران فوق الحدّ — بلا سقوط لنص صريح', () => {
        const over = big(ENCRYPT_MAX_BYTES + 1);
        expect(isWarmEncryptAlwaysKey('hami:transactions:v1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:transactionsThreading:v1:user-1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:transactions:taskTemplates:v1:user-1')).toBe(true);
        expect(fallsBackToPlaintextBySize('hami:transactions:v1', over)).toBe(false);
        expect(fallsBackToPlaintextBySize('hami:transactionsThreading:v1:user-1', over)).toBe(false);
        expect(shouldEncryptValue('hami:transactions:v1', over)).toBe(true);
        expect(shouldEncryptValue('hami:transactionsThreading:v1:user-1', over)).toBe(true);
        expect(shouldEncryptValue('hami:transactions:taskTemplates:v1:user-1', over)).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:lawyerdb:u1:cases')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:urgentActions:v1:u1')).toBe(true);
        expect(fallsBackToPlaintextBySize('hami:lawyerdb:u1:cases', over)).toBe(false);
        expect(fallsBackToPlaintextBySize('hami:urgentActions:v1:u1', over)).toBe(false);
        expect(isWarmEncryptAlwaysKey('hami:forum:groups:v1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:forum:muted-users:v1:user-1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:repository:rooms:v1:user-1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:smartvault:custom-categories:v1:user-1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:smartvault:deleted:v1')).toBe(true);
        expect(fallsBackToPlaintextBySize('hami:forum:groups:v1', over)).toBe(false);
        expect(fallsBackToPlaintextBySize('hami:repository:rooms:v1:user-1', over)).toBe(false);
    });

    it('سجل كتابة الدعاوى والإنشاء المعلّق يُشفَّران فوق الحدّ دون تسخين قشرة الإقلاع', () => {
        const over = big(ENCRYPT_MAX_BYTES + 1);
        expect([...PROTECTED_WARM_KEYS]).not.toContain('hami_lawsuit_write_journal_v1');
        expect([...PROTECTED_WARM_KEYS]).not.toContain('hami_lawsuit_pending_creates_v1');
        expect(isWarmEncryptAlwaysKey('hami_lawsuit_write_journal_v1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami_lawsuit_pending_creates_v1')).toBe(true);
        expect(fallsBackToPlaintextBySize('hami_lawsuit_write_journal_v1', over)).toBe(false);
        expect(fallsBackToPlaintextBySize('hami_lawsuit_pending_creates_v1', over)).toBe(false);
        expect(shouldEncryptValue('hami_lawsuit_write_journal_v1', over)).toBe(true);
        expect(shouldEncryptValue('hami_lawsuit_pending_creates_v1', over)).toBe(true);
    });

    it('مخزن القضايا ودبابيس المساحة يُشفَّران فوق الحدّ — بلا تسخين InnerRuntime', () => {
        const over = big(ENCRYPT_MAX_BYTES + 1);
        expect(isWarmEncryptAlwaysKey('legal-cases-storage')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:workspace:pins:v1')).toBe(true);
        expect(fallsBackToPlaintextBySize('legal-cases-storage', over)).toBe(false);
        expect(fallsBackToPlaintextBySize('hami:workspace:pins:v1', over)).toBe(false);
        expect(shouldEncryptValue('legal-cases-storage', over)).toBe(true);
        expect(shouldEncryptValue('hami:workspace:pins:v1', over)).toBe(true);
        expect([...PROTECTED_WARM_KEYS]).not.toContain('legal-cases-storage');
    });

    it('KYC والقوالب وتأجيل التذكير وإخفاء الرادار تُشفَّر فوق الحدّ', () => {
        const over = big(ENCRYPT_MAX_BYTES + 1);
        expect(isWarmEncryptAlwaysKey('hami:auth:lawyer-verification:v1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:fast-track-request-type-templates:u1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:manual-classification-templates')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:session-judge-decision-templates')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami-calendar-reminder-snooze-v1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami-calendar-reminder-fired-v1')).toBe(true);
        expect(isWarmEncryptAlwaysKey('hami:home-hub-radar-dismissed:v1:lawyer-1')).toBe(true);
        expect(fallsBackToPlaintextBySize('hami:auth:lawyer-verification:v1', over)).toBe(false);
        expect(shouldEncryptValue('hami:home-hub-radar-dismissed:v1:lawyer-1', over)).toBe(true);
        expect([...PROTECTED_WARM_KEYS]).not.toContain('hami:auth:lawyer-verification:v1');
    });
});
