import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { JourneyNode } from '@/app/types/criminal';
import type {
    CriminalComplainant,
    CriminalDefendant,
    CriminalStoreState,
    OtherEvidenceItem,
    Statement,
} from './criminalStore';
import type { CriminalDashboardConfirmAction } from './useCriminalDashboardModalUiState';
import { StatementLogCard } from './components/StatementLogCard';
import { OtherEvidenceLogCard } from './components/OtherEvidenceLogCard';

type UseCriminalDashboardEvidenceCardRenderersParams = {
    id: string;
    stageJourney: JourneyNode[];
    complainants: CriminalComplainant[];
    defendants: CriminalDefendant[];
    isStatementsTabReadOnly: boolean;
    isOtherEvidenceReadOnly: boolean;
    moveStatementToTrash: CriminalStoreState['moveStatementToTrash'];
    moveOtherEvidenceToTrash: CriminalStoreState['moveOtherEvidenceToTrash'];
    setConfirmAction: Dispatch<SetStateAction<CriminalDashboardConfirmAction>>;
    showLegalToast: (message: string, durationMs?: number) => void;
};

/**
 * دوالّ عرض بطاقات الإفادات وأدلة الإثبات الأخرى (مع طلب النقل إلى سلة المهملات) — مستخرَجة من
 * الـ runtime دون أي تغيير في المنطق أو الـ JSX الناتج.
 */
export function useCriminalDashboardEvidenceCardRenderers({
    id,
    stageJourney,
    complainants,
    defendants,
    isStatementsTabReadOnly,
    isOtherEvidenceReadOnly,
    moveStatementToTrash,
    moveOtherEvidenceToTrash,
    setConfirmAction,
    showLegalToast,
}: UseCriminalDashboardEvidenceCardRenderersParams) {
    const renderStatementCard = useCallback(
        (st: Statement) => (
            <StatementLogCard
                key={st.id}
                statement={st}
                stageJourney={stageJourney}
                complainants={complainants}
                defendants={defendants}
                readOnly={isStatementsTabReadOnly}
                onRequestTrash={() => {
                    setConfirmAction({
                        title: 'نقل إلى سلة المهملات',
                        message: 'سيتم إخفاء الإفادة مع إمكانية استرجاعها من سلة المهملات.',
                        confirmText: 'نقل للسلة',
                        onConfirm: () => {
                            const err = moveStatementToTrash(id, st.id);
                            if (err) {
                                showLegalToast(err, 4500);
                            }
                        },
                    });
                }}
            />
        ),
        [complainants, defendants, isStatementsTabReadOnly, id, moveStatementToTrash, setConfirmAction, showLegalToast, stageJourney],
    );

    const renderOtherEvidenceCard = useCallback(
        (item: OtherEvidenceItem) => (
            <OtherEvidenceLogCard
                key={item.id}
                item={item}
                stageJourney={stageJourney}
                readOnly={isOtherEvidenceReadOnly}
                onRequestTrash={() => {
                    setConfirmAction({
                        title: 'نقل إلى سلة المهملات',
                        message: 'سيتم إخفاء الدليل مع إمكانية استرجاعه من سلة المهملات.',
                        confirmText: 'نقل للسلة',
                        onConfirm: () => {
                            const delErr = moveOtherEvidenceToTrash(id, item.id);
                            if (delErr) {
                                showLegalToast(delErr, 4500);
                                return;
                            }
                            showLegalToast('✓ تم نقل الدليل إلى سلة المهملات.', 3500);
                        },
                    });
                }}
            />
        ),
        [id, isOtherEvidenceReadOnly, moveOtherEvidenceToTrash, setConfirmAction, showLegalToast, stageJourney],
    );

    return { renderStatementCard, renderOtherEvidenceCard };
}
