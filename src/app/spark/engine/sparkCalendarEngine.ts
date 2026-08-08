import type { SparkNudge, SparkNudgeKind } from '@/app/spark/types';



import type { CalendarSparkContext } from '@/app/spark/context/calendarSparkContext';



import { CALENDAR_SPARK_RULES } from '@/app/spark/procedural/calendarNudgeRules';



import {

    collectCalendarSupplementalSparkNudges,

    type CalendarSparkSupplementalInput,

} from '@/app/spark/calendar/calendarSparkSupplementalScan';

import { runSparkCoherenceForCalendar } from '@/app/spark/coherence/runSparkCoherenceForCalendar';

import { coherenceReportToSparkNudges } from '@/app/spark/coherence/bridge/coherenceToSparkNudges';



const CALENDAR_CONFLICT_NUDGE_KINDS = new Set<SparkNudgeKind>([

    'calendar.travel_conflict',

    'calendar.schedule_overload',

    'calendar.location_mismatch',

    'calendar.multi_day_travel',

]);



function mergeCalendarSparkCandidates(

    ctx: CalendarSparkContext,

    supplemental?: CalendarSparkSupplementalInput,

): SparkNudge[] {

    const procedural = collectCalendarSparkNudges(ctx, supplemental);

    const hasProceduralConflict = procedural.some((nudge) =>
        CALENDAR_CONFLICT_NUDGE_KINDS.has(nudge.kind),
    );

    let coherence = coherenceReportToSparkNudges(

        runSparkCoherenceForCalendar(ctx),

        ctx.dossierKey,

        'calendar',

        'supplemental',

    );

    if (hasProceduralConflict) {
        coherence = coherence.filter((nudge) => !String(nudge.kind).startsWith('coherence.'));
    }

    const seen = new Set<string>();

    const merged: SparkNudge[] = [];

    for (const nudge of [...procedural, ...coherence].sort((a, b) => b.priority - a.priority)) {

        if (seen.has(nudge.id)) continue;

        seen.add(nudge.id);

        merged.push(nudge);

    }

    return merged;

}



export function collectCalendarSparkNudges(

    ctx: CalendarSparkContext,

    supplemental?: CalendarSparkSupplementalInput,

): SparkNudge[] {

    const core = CALENDAR_SPARK_RULES.map((rule) => rule(ctx)).filter((n): n is SparkNudge => n !== null);

    const extra = collectCalendarSupplementalSparkNudges(ctx, supplemental);

    return [...core, ...extra];

}



export type PickActiveCalendarSparkNudgeOptions = {

    /** يخفِي تنبيهات التضارب ليوم محدد عندما يعرض ScheduleConflictAlert نفس اليوم */

    suppressConflictNudgesForDate?: string;

    supplemental?: CalendarSparkSupplementalInput;

};



export function pickActiveCalendarSparkNudge(

    ctx: CalendarSparkContext,

    options?: PickActiveCalendarSparkNudgeOptions,

): SparkNudge | null {

    const suppressDate = String(options?.suppressConflictNudgesForDate ?? '').trim().slice(0, 10);

    let nudges = mergeCalendarSparkCandidates(ctx, options?.supplemental);



    if (suppressDate) {

        nudges = nudges.filter(

            (nudge) =>

                !(

                    CALENDAR_CONFLICT_NUDGE_KINDS.has(nudge.kind) &&

                    nudge.targetFileId === suppressDate

                ),

        );

    }

    if (!nudges.length) return null;



    return nudges.sort((a, b) => b.priority - a.priority)[0];

}


