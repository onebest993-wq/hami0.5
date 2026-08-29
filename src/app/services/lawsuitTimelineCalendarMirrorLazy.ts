/**
 * مرآة تقويم الإضبارة — تُحمَّل عند الحفظ فقط، بلا سحب incrementalSync إلى أول إطار.
 */

type MirrorMod = typeof import('./lawsuitTimelineCalendarMirror');

let mirrorPromise: Promise<MirrorMod> | null = null;
let stageDatesEpoch = 0;
let sessionHearingEpoch = 0;

function loadMirror(): Promise<MirrorMod> {
    if (!mirrorPromise) {
        mirrorPromise = import('./lawsuitTimelineCalendarMirror');
    }
    return mirrorPromise;
}

export function overlayMirrorStageLegalDatesToCalendar(
    stages: Parameters<MirrorMod['mirrorStageLegalDatesToCalendar']>[0],
    stageIndex: number,
    ctx: Parameters<MirrorMod['mirrorStageLegalDatesToCalendar']>[2],
    apply: (next: ReturnType<MirrorMod['mirrorStageLegalDatesToCalendar']>) => void,
): void {
    const epoch = ++stageDatesEpoch;
    void loadMirror()
        .then((m) => {
            if (epoch !== stageDatesEpoch) return;
            apply(m.mirrorStageLegalDatesToCalendar(stages, stageIndex, ctx));
        })
        .catch(() => undefined);
}

export function overlayMirrorSessionNextHearingToCalendar(
    stages: Parameters<MirrorMod['mirrorSessionNextHearingToCalendar']>[0],
    stageIndex: number,
    sessionEventId: string,
    nextHearingDate: string | undefined,
    sessionTitle: string,
    ctx: Parameters<MirrorMod['mirrorSessionNextHearingToCalendar']>[5],
    apply: (next: ReturnType<MirrorMod['mirrorSessionNextHearingToCalendar']>) => void,
): void {
    const epoch = ++sessionHearingEpoch;
    void loadMirror()
        .then((m) => {
            if (epoch !== sessionHearingEpoch) return;
            apply(
                m.mirrorSessionNextHearingToCalendar(
                    stages,
                    stageIndex,
                    sessionEventId,
                    nextHearingDate,
                    sessionTitle,
                    ctx,
                ),
            );
        })
        .catch(() => undefined);
}
