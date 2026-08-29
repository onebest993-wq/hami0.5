import type { CriminalDashboardModalsHostProps } from './criminalDashboardModalsHostProps';
import { CriminalDashboardModalsHostCassation } from './CriminalDashboardModalsHostCassation';
import { CriminalDashboardModalsHostInvestigation } from './CriminalDashboardModalsHostInvestigation';
import { CriminalDashboardModalsHostTrial } from './CriminalDashboardModalsHostTrial';
import { CriminalDashboardModalsHostRequests } from './CriminalDashboardModalsHostRequests';
import { CriminalDashboardModalsHostIdentity } from './CriminalDashboardModalsHostIdentity';

export type {
    IdentityEditState,
    ConfirmActionState,
    CriminalDashboardModalsHostProps,
} from './criminalDashboardModalsHostProps';

/**
 * كل مودالات إضبارة الدعوى الجزائية — مستخرَجة من CriminalDashboardResolvedRuntime
 * ضمن تفكيك المكوّن العملاق. لا منطق جديد هنا: نفس الـ JSX وأصله بحرفيته،
 * فقط القيم/الأفعال أصبحت props صريحة بدل الإغلاق على النطاق الخارجي.
 *
 * Wave 4: المودالات مُقسَّمة إلى وحدات شقيقة؛ هذا الملف منسّق رفيع فقط.
 */
export function CriminalDashboardModalsHost(props: CriminalDashboardModalsHostProps) {
    return (
        <>
            <CriminalDashboardModalsHostCassation {...props} />
            <CriminalDashboardModalsHostInvestigation {...props} />
            <CriminalDashboardModalsHostTrial {...props} />
            <CriminalDashboardModalsHostRequests {...props} />
            <CriminalDashboardModalsHostIdentity {...props} />
        </>
    );
}
