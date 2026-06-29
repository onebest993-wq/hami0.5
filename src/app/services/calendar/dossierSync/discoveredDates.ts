/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import { buildStableBridgeId } from '@/app/services/calendarBridge';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import { discoverImplicitDossierDates } from '@/app/services/calendarDateSniffer';

/** تجميع معرّفات التواريخ المكتشفة لإضبارة معيّنة — لاستخدامها في تجنّب التقليم */
export function collectDiscoveredBridgeIdsForFile(
    file: Record<string, unknown>,
    sourceModule: CalendarSourceModule,
    sourceEntityId: string | number,
): string[] {
    const discovered = discoverImplicitDossierDates(file, sourceModule);
    return discovered.map((d) =>
        buildStableBridgeId(sourceModule, String(sourceEntityId), d.bridgeEventId),
    );
}
