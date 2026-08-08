import type { DepartmentType, TransactionStatus } from './types';
import { DEPARTMENTS } from './constants';

export const getDepartmentInfo = (type: DepartmentType) => {
  return DEPARTMENTS.find(d => d.id === type) || DEPARTMENTS[0];
};

/** @deprecated استخدم getDepartmentInfo */
export const getDeptInfo = getDepartmentInfo;

export const getStatusBadge = (status: TransactionStatus, currentStep: string) => {
  const configs: Record<TransactionStatus, { label: string; color: string }> = {
    'pending': { label: 'في الانتظار', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    'in-progress': { label: `⏳ ${currentStep}`, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'review': { label: 'قيد المراجعة', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    'completed': { label: '✅ مكتمل', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    'archived': { label: '📦 مؤرشف', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    'blocked': { label: '⚠️ معلق', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
  };
  return configs[status];
};

/** @deprecated استخدم getStatusBadge */
export const getBadge = getStatusBadge;

export const getRequiredDocsByDepartment = (deptType: DepartmentType): string[] => {
  const map: Record<DepartmentType, string[]> = {
    traffic: ['براءة ذمة ضريبية', 'هوية الموكل', 'سنوية السيارة'],
    tabu: ['هوية الموكل', 'سند العقار', 'براءة ذمة ماء وكهرباء'],
    tax: ['هوية الموكل', 'الإقرار الضريبي'],
    retirement: ['هوية الموكل', 'الأمر الإداري بالإحالة'],
    notary: ['هوية الموكل', 'الوثائق ذات العلاقة'],
    other: ['هوية الموكل']
  };
  return map[deptType] || [];
};
