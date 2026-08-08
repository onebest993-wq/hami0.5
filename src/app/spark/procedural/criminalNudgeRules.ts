import type { SparkNudge } from '@/app/spark/types';
import type { CriminalSparkContext } from '@/app/spark/context/criminalSparkContext';
import { latestAbsentiaCard } from '@/app/spark/context/criminalSparkContext';

export function collectCriminalSparkNudges(ctx: CriminalSparkContext): SparkNudge[] {
    if (ctx.isArchived) return [];

    const nudges: SparkNudge[] = [];

    if (ctx.shouldShowArticle3DeadlineBanner && typeof ctx.article3ElapsedDays === 'number') {
        nudges.push({
            id: `${ctx.dossierKey}:article3`,
            kind: 'criminal.article3_deadline',
            surface: 'criminal',
            priority: 10,
            message:
                'يبدو أن مهلة المادة (3) تجاوزت 90 يوماً من تاريخ اكتشاف الجريمة — هل يهمك مراجعة الوضع؟',
            presence: {
                present: ['جريمة مشمولة بالمادة 3', `منذ نحو ${ctx.article3ElapsedDays} يوماً`],
                missing: ['تقييم المهلة في السجل'],
            },
            source: 'criminal.article3Deadline',
            dossierKey: ctx.dossierKey,
            action: { label: 'مراجعة الإضبارة', actionId: 'review_dossier' },
        });
    }

    if (ctx.shouldShowMandatoryCassationBanner) {
        nudges.push({
            id: `${ctx.dossierKey}:mandatory-cassation`,
            kind: 'criminal.mandatory_cassation',
            surface: 'criminal',
            priority: 15,
            message:
                'يبدو أن الحكم يستوجب تمييزاً إلزامياً — هل تود مراجعة مسار التمييز؟',
            presence: {
                present: ['حكم مشمول بالتمييز الإلزامي'],
                missing: ['إحالة للتمييز في السجل'],
            },
            source: 'criminal.mandatoryCassation',
            dossierKey: ctx.dossierKey,
            action: { label: 'مراجعة التمييز', actionId: 'review_dossier' },
        });
    }

    const absentia = latestAbsentiaCard(ctx.verdictCards);
    if (absentia) {
        const hasPublication = Boolean(String(absentia.absentiaPublicationDate ?? '').trim());
        const objectionFiled = absentia.absentiaObjectionFiled === true;

        if (!hasPublication) {
            nudges.push({
                id: `${ctx.dossierKey}:absentia-publication`,
                kind: 'criminal.absentia_publication_missing',
                surface: 'criminal',
                priority: 20,
                message:
                    'يوجد حكم غيابي، لكن تاريخ النشر/التبليغ غير مسجّل — هل يهمك الأمر؟',
                presence: {
                    present: ['حكم غيابي'],
                    missing: ['تاريخ النشر أو التبليغ'],
                },
                source: 'verdictCards.absentiaPublicationDate',
                dossierKey: ctx.dossierKey,
                action: { label: 'متابعة الإجراء', actionId: 'absentia_objection' },
            });
        } else if (!objectionFiled && !absentia.absentiaTreatedAsInPerson) {
            nudges.push({
                id: `${ctx.dossierKey}:absentia-objection`,
                kind: 'criminal.absentia_objection_available',
                surface: 'criminal',
                priority: 30,
                message:
                    'الحكم غيابي ومسجّل تبليغه، ومسار المعارضة قد يكون متاحاً — هل تود متابعته؟',
                presence: {
                    present: ['حكم غيابي', 'تاريخ تبليغ/نشر'],
                    missing: ['معارضة غيابية مسجّلة'],
                },
                source: 'verdictCards.absentiaObjection',
                dossierKey: ctx.dossierKey,
                action: { label: 'متابعة المعارضة', actionId: 'absentia_objection' },
            });
        }
    }

    return nudges.sort((a, b) => a.priority - b.priority);
}
