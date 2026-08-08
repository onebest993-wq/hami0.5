import { Briefcase, Home, Car, Receipt, Users, FileText, Building2 } from '@/app/components/ui/lucideIcons';
import type { DepartmentType } from './types';

export const DEPARTMENTS = [
  { id: 'all', label: 'الكل', icon: Briefcase, color: 'bg-[#D4AF37]' },
  { id: 'tabu', label: 'التسجيل العقاري', icon: Home, color: 'bg-blue-500' },
  { id: 'traffic', label: 'المرور', icon: Car, color: 'bg-green-500' },
  { id: 'tax', label: 'الضريبة', icon: Receipt, color: 'bg-orange-500' },
  { id: 'retirement', label: 'التقاعد', icon: Users, color: 'bg-purple-500' },
  { id: 'notary', label: 'كاتب العدل', icon: FileText, color: 'bg-pink-500' },
  { id: 'other', label: 'أخرى', icon: Building2, color: 'bg-gray-500' }
] as const;

export const TRANSACTION_TEMPLATES = {
  'قسام-شرعي': {
    label: 'القسام الشرعي',
    department: 'notary' as DepartmentType,
    steps: [
      'استخراج شهادة الوفاة',
      'استخراج صورة قيد النفوس',
      'جلب حجة ولادات/وفيات',
      'مراجعة ضريبة التركات',
      'تقديم الطلب لمحكمة الأحوال الشخصية',
      'صدور القسام الشرعي'
    ]
  },
  'تأسيس-شركة': {
    label: 'تأسيس شركة',
    department: 'other' as DepartmentType,
    steps: [
      'إعداد النظام الأساسي',
      'حجز الاسم التجاري',
      'التصديق لدى كاتب العدل',
      'تقديم الطلب لدائرة تسجيل الشركات',
      'استلام شهادة التأسيس'
    ]
  },
  'نقل-ملكية-عقار': {
    label: 'نقل ملكية عقار',
    department: 'tabu' as DepartmentType,
    steps: [
      'تجهيز المستمسكات والوكالة',
      'تقديم الطلب وسحب الاستمارة',
      'إجراء الكشف الموقعي',
      'دفع الرسوم والضريبة',
      'استلام المنجز النهائي'
    ]
  }
};

export const DEPARTMENT_FIELDS = {
  tabu: [
    { id: 'propertyNumber', label: 'رقم العقار والمقاطعة', placeholder: '15/4 م، الكرادة', required: true },
    { id: 'transactionSubType', label: 'نوع المعاملة', type: 'select' as const, options: ['بيع', 'إفراز', 'تصحيح صنف', 'تبديل', 'نقل ملكية'], required: true }
  ],
  traffic: [
    { id: 'vehicleNumber', label: 'رقم المركبة / الشاصي', placeholder: 'بغداد 12345', required: true },
    { id: 'transactionSubType', label: 'نوع المعاملة', type: 'select' as const, options: ['نقل ملكية', 'تسجيل لأول مرة', 'وكالة دورية', 'تجديد إجازة'], required: true }
  ],
  tax: [
    { id: 'taxFileNumber', label: 'رقم الإضبارة الضريبية', placeholder: '2024/12345', required: true }
  ],
  retirement: [
    { id: 'serviceNumber', label: 'الرقم الوظيفي', placeholder: '123456', required: true },
    { id: 'transactionSubType', label: 'نوع المعاملة', type: 'select' as const, options: ['تقاعد قانوني', 'تعويض', 'حقوق تقاعدية'], required: true }
  ],
  notary: [
    { id: 'contractType', label: 'نوع العقد/الإقرار', placeholder: 'عقد بيع، وكالة...', required: true }
  ],
  other: [
    { id: 'customDescription', label: 'وصف المعاملة', placeholder: 'اكتب وصفاً...', required: true }
  ]
};

export const REQUIRED_DOCS_BY_DEPT = {
  traffic: ['براءة ذمة ضريبية', 'هوية الموكل', 'سنوية السيارة'],
  tabu: ['هوية الموكل', 'سند العقار', 'براءة ذمة ماء وكهرباء'],
  tax: ['هوية الموكل', 'الإقرار الضريبي'],
  retirement: ['هوية الموكل', 'الأمر الإداري بالإحالة'],
  notary: ['هوية الموكل', 'الوثائق ذات العلاقة'],
  other: ['هوية الموكل']
};
