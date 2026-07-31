/**
 * مدخل معزول لمودال المستودع الذكي — يستهدفه repositoryHubLoader فقط.
 * يمنع سحب المسار عبر LawyerDashboard / AppRuntime عند cold open.
 */
export { SmartRepositoryModal } from '@/app/components/lawyer/SmartRepositoryModal';
export type {
    RepositoryTab,
    SmartRepositoryModalProps,
} from '@/app/components/lawyer/SmartRepositoryModal';
