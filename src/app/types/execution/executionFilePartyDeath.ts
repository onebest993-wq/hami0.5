/**
 * ExecutionFile domain slice: ExecutionFilePartyDeath.
 */


export interface ExecutionFilePartyDeath {
    /** وفاة الدائن — مستقل عن وفاة المدين (يُفضّل على party_death_case القديم) */
    creditor_party_death_case?: {
        deceased_party: 'creditor';
        heir_certificate_file_name?: string | null;
        heir_names: string[];
        heir_details?: Array<{
            name: string;
            phone?: string;
            address?: string;
        }>;
        flow?: 'no_heirs' | 'heir_substitution' | 'death_only';
    } | null;
    /** وفاة المدين — مستقل عن وفاة الدائن */
    debtor_party_death_case?: {
        deceased_party: 'debtor';
        heir_certificate_file_name?: string | null;
        heir_names: string[];
        heir_details?: Array<{
            name: string;
            phone?: string;
            address?: string;
        }>;
        flow?: 'no_heirs' | 'heir_substitution' | 'death_only';
    } | null;
    /** وفاة طرف — مسار بلا ورثة (إغلاق إضبارة) أو إحلال ورثة */
    party_death_case?: {
        deceased_party: 'debtor' | 'creditor';
        /** قديم — لم يعد يُجمع من الواجهة */
        heir_certificate_file_name?: string | null;
        heir_names: string[];
        heir_details?: Array<{
            name: string;
            phone?: string;
            address?: string;
        }>;
        /** death_only: إبلاغ أول دون إحلال؛ ثم النافذة تصبح «طلب إحلال مورث» فقط */
        flow?: 'no_heirs' | 'heir_substitution' | 'death_only';
    } | null;
    /** مسار تبليغ الورثة بعد إحلالهم (خاص بوفاة المدين) */
    heirs_notification_workflow?: {
        hasReceivedInitialNotice: boolean;
        /**
         * تتبّع مستقل لكل وريث (كل وريث له دورة حياة خاصة به):
         * مذكرة الإخبار (7 أيام) ← التكليف بالحضور (3 أيام) ← مفاتحة التحقيق ← حضور الوريث.
         */
        byHeir?: Record<
            string,
            {
                heirName: string;
                memoDate?: string | null;
                memoStatus?: 'none' | 'active' | 'attended' | 'closed_manual';
                summonDate?: string | null;
                summonStatus?: 'none' | 'active' | 'expired';
                investigationRequestStatus?: 'none' | 'requested';
                investigationDecisionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
                investigationDecisionId?: string | null;
                arrestWarrantStatus?: 'none' | 'issued';
                lastActionAt?: string | null;
            }
        >;
    } | null;
}
