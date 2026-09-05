import type {
    buildPendingTaskFromRaw,
    buildSnoozedBacklogTask,
    buildWeeklyLocationBundleTask,
} from '@/app/services/tasks/quantumTaskCreateBuilders';

type CreateBuilders = {
    buildPendingTaskFromRaw: typeof buildPendingTaskFromRaw;
    buildWeeklyLocationBundleTask: typeof buildWeeklyLocationBundleTask;
    buildSnoozedBacklogTask: typeof buildSnoozedBacklogTask;
};

type VoiceAttach = typeof import('@/app/services/tasks/taskVoiceAttachment');
type Nlp = typeof import('@/app/utils/nlpParser');
type Enrich = typeof import('@/app/utils/quantumTaskEnrichment');
type Factory = typeof import('@/app/services/tasks/quantumPendingTaskFactory');

export type QuantumTaskCreateBundle = {
    builders: CreateBuilders;
    voice: VoiceAttach;
    nlp: Nlp;
    enrich: Enrich;
    factory: Factory;
};

let bundle: QuantumTaskCreateBundle | null = null;
let promise: Promise<QuantumTaskCreateBundle> | null = null;

export function peekQuantumTaskCreateBundle(): QuantumTaskCreateBundle | null {
    return bundle;
}

/** NLP / إنشاء المهام — يُحمَّل مع الأجندة لا مع ستارة الميدان */
export function loadQuantumTaskCreateBundle(): Promise<QuantumTaskCreateBundle> {
    if (!promise) {
        promise = Promise.all([
            import('@/app/services/tasks/quantumTaskCreateBuilders'),
            import('@/app/services/tasks/taskVoiceAttachment'),
            import('@/app/utils/nlpParser'),
            import('@/app/utils/quantumTaskEnrichment'),
            import('@/app/services/tasks/quantumPendingTaskFactory'),
        ])
            .then(([builders, voice, nlp, enrich, factory]) => {
                bundle = { builders, voice, nlp, enrich, factory };
                return bundle;
            })
            .catch((err) => {
                promise = null;
                throw err;
            });
    }
    return promise;
}
