import type { CaseStage } from '../../../LawyerShared';

export type SmartFileAppealDeadlineBannerProps = {
    displayStage: CaseStage;
    showOpponentAppealBtn: boolean;
    showAbsentJudgmentFooter: boolean;
};

/** لا يُعرض عدّاد مهل — تجنّب إرشاد المحامي بمدد متبقية. */
export function SmartFileAppealDeadlineBanner(_props: SmartFileAppealDeadlineBannerProps) {
    return null;
}
