import { markHqDocumentEntry } from '@/product/hamiProductRuntime';
import { applyPlainDocumentSurface } from '@/boot/plainDocumentPath';
import { kickoffHqBootCriticalPreload } from '@/hq/hqBootCriticalPreload';

markHqDocumentEntry();
applyPlainDocumentSurface();
void import('@/app/utils/consoleHygiene').then((m) => m.installConsoleHygiene());
kickoffHqBootCriticalPreload();

void import('@/boot/bootStaleChunkReload').then((m) => m.installStaleChunkReload());
