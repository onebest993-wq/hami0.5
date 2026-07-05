import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';

/** مراجع ثابتة — لا تمرير بيانات ثقيلة لـ hosts مغلقة */
export const SUSPENDED_LAWSUIT_FILES: FileData[] = [];
export const SUSPENDED_EXECUTION_FILES: ExecutionFile[] = [];
export const SUSPENDED_GLOBAL_NOTES: GlobalNote[] = [];
