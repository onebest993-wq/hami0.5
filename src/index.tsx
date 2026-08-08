import { applyBootSurfacePaintFromStorage } from '@/app/services/settings/bootSurfacePaintCache';
import { kickoffBootCriticalPreload } from '@/boot/bootCriticalPreload';
import './styles/critical-shell.css';

/**
 * entry رفيع — لا SecureStore ولا applySettings ولا لوحة المحامي على المسار الحرج.
 * كل التهيئة الثقيلة في bootEntryPreamble / mountApplication (chunks منفصلة).
 */
applyBootSurfacePaintFromStorage();
kickoffBootCriticalPreload();
void import('@/app/bootstrap/homeStaticShellPaintGate').then((m) => m.wireHomeStaticShellPaintListener());

void import('@/boot/bootStaleChunkReload').then((m) => m.installStaleChunkReload());
void import('@/boot/bootEntryPreamble').then((m) => m.runBootEntryPreamble());
void import('@/boot/mountApplication').then((m) => m.startApplicationBoot());
