import { readLatestDossierBackup } from './dossierBackupStore';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';
import { debug } from '@/app/utils/debug';

/**
 * يُرجع true عندما تبدو الإضابير فارغة لكن توجد نسخة احتياطية —
 * أي أن التخزين لم يُحمَّل بعد أو حدث فساد مؤقت. في هذه الحالة لا نُجرِّب purge للتقويم.
 */
export async function shouldSkipDossierDependentCalendarPurge(): Promise<boolean> {
    await SecureStoreService.ensurePersistedReady();

    const lawsuits = loadLawsuitFilesRaw();
    const executions = loadExecutionFilesRaw();
    const criminal = loadCriminalCasesRaw();

    if (lawsuits.length > 0 || executions.length > 0 || criminal.length > 0) {
        return false;
    }

    const [lawsuitBk, execBk] = await Promise.all([
        readLatestDossierBackup('lawsuit'),
        readLatestDossierBackup('execution'),
    ]);

    const hasBackup =
        (lawsuitBk?.payload.length ?? 0) > 0 || (execBk?.payload.length ?? 0) > 0;

    if (hasBackup) {
        debug.warn(
            '[storageHydrationGuard] تخطي تنظيف التقويم — الإضابير فارغة لكن النسخة الاحتياطية تحتوي بيانات',
        );
    }

    return hasBackup;
}
