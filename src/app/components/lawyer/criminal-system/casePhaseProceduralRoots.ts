import type { JourneyNode } from '@/app/types/criminal';
import type { ProceduralContainer, ProceduralSubItem } from './proceduralContainersEngine';
import { getCurrentJourneyNode, parseEventDateKey } from './stageJourney';
import type { CaseRecordPhase } from './casePhaseFilterTypes';
import {
    journeyNodeRecordPhase,
    resolveCasePhaseByJourneyDate,
} from './casePhaseResolveCore';

function collectContainerDates(container: ProceduralContainer): string[] {
    const dates: string[] = [];
    const walk = (items: ProceduralSubItem[]) => {
        for (const item of items) {
            if (item.type === 'action' && item.date) dates.push(String(item.date).trim());
            if (item.type === 'container') collectContainerDates(item.container);
        }
    };
    walk(container.subItems);
    if (container.pathEndedAt) dates.push(String(container.pathEndedAt).trim());
    return dates.filter(Boolean);
}

function maxIsoDate(dates: string[]): string {
    const list = dates.filter(Boolean);
    if (!list.length) return '';
    return list.sort((a, b) => parseEventDateKey(a) - parseEventDateKey(b))[list.length - 1] ?? '';
}

/** مرحلة المسار الجذري — من تاريخ الإنهاء/آخر نشاط مقابل بداية المحاكمة. */
export function resolveProceduralRootCasePhase(
    root: ProceduralContainer,
    stageJourney: JourneyNode[] | undefined,
): CaseRecordPhase {
    if (root.parentId != null) return 'investigation';

    const dates = collectContainerDates(root);
    let referenceDate = '';

    if (root.pathStatus === 'completed') {
        referenceDate = String(root.pathEndedAt ?? '').trim() || maxIsoDate(dates);
    } else if (dates.length) {
        referenceDate = maxIsoDate(dates);
    }

    if (!referenceDate) {
        const current = getCurrentJourneyNode(Array.isArray(stageJourney) ? stageJourney : []);
        return current ? journeyNodeRecordPhase(current) : 'investigation';
    }

    return resolveCasePhaseByJourneyDate(referenceDate, Array.isArray(stageJourney) ? stageJourney : []);
}

/** مسار جذري مُغلق في مرحلة التحقيق — يُخفّى/يُبهت في عرض المحاكمة. */
export function isInvestigationClosedProceduralRoot(
    root: ProceduralContainer,
    stageJourney: JourneyNode[] | undefined,
): boolean {
    if (root.parentId != null) return false;
    if (root.pathStatus !== 'completed') return false;
    return resolveProceduralRootCasePhase(root, stageJourney) === 'investigation';
}
