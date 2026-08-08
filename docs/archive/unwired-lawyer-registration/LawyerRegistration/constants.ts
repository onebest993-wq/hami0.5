import { Castle, Anchor, Landmark, Crown, Waves, Palmtree, Flame, Sprout, Columns, Mountain, Tent, Hand, MapPin, Wheat, Gavel, Scale, Users, Building2, Briefcase, FileText, ShieldAlert, Navigation, Home, Car, User, FileBadge } from '@/app/components/ui/lucideIcons';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';

export const IRAQI_PHONE_REGEX = /^07[5789]\d{8}$/;
export const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'hami.app'];
export const NAME_REGEX = /^[\u0600-\u06FF\s]+$/;

export const SecurityGate = {
    validateEmail: (email: string) => {
        const domain = email.split('@')[1];
        return ALLOWED_EMAIL_DOMAINS.includes(domain?.toLowerCase());
    },
    validateName: (name: string) => {
        const parts = name.trim().split(/\s+/);
        return parts.length >= 3 && NAME_REGEX.test(name);
    }
};

export const getProvinceIcon = (name: string): LucideIcon => {
    if (name.includes('بغداد')) return Castle;
    if (name.includes('البصرة')) return Anchor;
    if (name.includes('نينوى')) return Landmark;
    if (name.includes('كربلاء') || name.includes('النجف')) return Landmark;
    if (name.includes('أربيل')) return Castle;
    if (name.includes('بابل')) return Crown;
    if (name.includes('ذي قار')) return Waves;
    if (name.includes('صلاح الدين')) return Landmark;
    if (name.includes('الأنبار')) return Palmtree;
    if (name.includes('كركوك')) return Flame;
    if (name.includes('ديالى')) return Sprout;
    if (name.includes('واسط')) return Columns;
    if (name.includes('ميسان')) return Waves;
    if (name.includes('سليمانية') || name.includes('دهوك')) return Mountain;
    if (name.includes('القادسية')) return Wheat;
    if (name.includes('المثنى')) return Tent;
    if (name.includes('حلبجة')) return Hand;
    return MapPin;
};

export const PROVINCES = [
    'بغداد', 'البصرة', 'نينوى', 'أربيل', 'السليمانية', 'دهوك', 'كركوك',
    'صلاح الدين', 'ديالى', 'الأنبار', 'بابل', 'كربلاء المقدسة',
    'النجف الأشرف', 'القادسية', 'المثنى', 'ذي قار', 'ميسان', 'واسط', 'حلبجة'
];

export const SPECIALIZATIONS = [
    { name: 'جنائي', icon: Gavel },
    { name: 'مدني', icon: Scale },
    { name: 'أحوال شخصية', icon: Users },
    { name: 'عقاري', icon: Building2 },
    { name: 'شركات', icon: Briefcase },
    { name: 'إداري', icon: FileText },
    { name: 'عسكري', icon: ShieldAlert },
    { name: 'مرور', icon: Navigation }
];

export const TRANSACTIONS = [
    { name: 'تسجيل عقاري (طابو)', icon: Home },
    { name: 'تنفيذ', icon: Gavel },
    { name: 'مرور', icon: Car },
    { name: 'تقاعد', icon: User },
    { name: 'تعويض', icon: FileBadge }
];

export const LAWYER_GRADES = [
    'صلاحية (أ)',
    'صلاحية (ب)',
    'صلاحية (ج)'
];

export const TERMS_TITLE = "الشروط والأحكام السيبرانية";
export const TERMS_BODY = `أهلاً بك في تطبيق "حامي". يرجى قراءة الشروط التالية بعناية:

1. إخلاء المسؤولية (حماية المطور):
إن تطبيق "حامي" هو منصة تقنية توفر الحلول الرقمية لتنظيم العمل القانوني، ولا يمثل "مكتب محاماة" أو جهة قضائية. إدارة التطبيق ومطوره يخلوا مسؤوليتهم تماماً عن أي استشارة خاطئة.

2. سياسة الخصوصية وأمن المعلومات:
نلتزم بحماية بياناتك باستخدام أحدث تقنيات التشفير، ولا نقوم بمشاركة صور هويتك أو بيانات موكليك مع أي طرف ثالث إلا بموجب أمر قضائي رسمي.

3. الملكية الفكرية:
جميع الحقوق الفكرية والبرمجية لتطبيق "حامي" محفوظة لإدارة التطبيق، ويمنع نسخ أو استنساخ أو هندسة التطبيق عكسياً.

4. الصلاحيات والإنهاء:
يحق لإدارة التطبيق تعليق أو حظر أي حساب يثبت تقديمه لبيانات مزيفة، أو استخدامه للتطبيق في غير الأغراض المخصص لها.

5. المطابقة الرقمية والذكاء الاصطناعي:
يقر المستخدم بعلمه أن التطبيق يستخدم تقنيات التعرف البصري (OCR) لمطابقة البيانات المدخلة مع المستندات الرسمية.

6. الاتصالات والإشعارات:
الموافقة على الشروط تعني قبول استلام الإشعارات القانونية ورسائل التحقق عبر البريد الإلكتروني والهاتف المسجلين.

7. التعديلات:
يحق لإدارة التطبيق تعديل هذه الشروط في أي وقت، ويعتبر استمرار استخدامك للتطبيق موافقة ضمنية على التعديلات.`;

export const LAWYER_PLEDGE = `التعهد الخاص بالمحامي (إقرار ملزم):
"بصفتي محامياً، أقر وأتعهد وبكامل إرادتي والقانونية المعتبرة شرعاً وقانوناً بالآتي:
1. أن هوتي ومعلوماتي الشخصية والمهنية المقدمة صحيحة 100% ومطابقة للواقع.
2. أن انتمائي لنقابة المحامين العراقيين ساري المفعول ولدي الصلاحية القانونية لممارسة المهنة وفق الصلاحية التي اخترتها."`;

export type Step = 1 | 2 | 3 | 4 | 5 | 6;

export interface LawyerData {
    fullName: string; email: string; phone: string; password: string; confirmPassword: string;
    lawyerGrade: string; officeName: string; officeAddress: string;
    workProvinces: string[]; specializations: string[]; transactions: string[];
    idFront: string | null; idBack: string | null; syndicateId: string | null; ocrVerified: boolean;
    otpEmail: string; otpSms: string; isFaceMatched: boolean;
}
