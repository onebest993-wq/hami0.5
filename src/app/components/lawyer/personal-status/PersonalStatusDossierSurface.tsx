import { PersonalStatusSmartFileChrome } from '@/app/components/lawyer/personal-status/PersonalStatusSmartFileChrome';
import { PersonalStatusDossierBody } from '@/app/components/lawyer/personal-status/PersonalStatusDossierBody';
import type { SmartFileChromeProps } from '@/app/components/lawyer/smart-modal/layout/SmartFileChrome';
import type { SmartFileMainPanelProps } from '@/app/components/lawyer/smart-modal/layout/mainPanel/smartFileMainPanelTypes';

export type PersonalStatusDossierSurfaceProps = {
    chrome: SmartFileChromeProps;
    panel: SmartFileMainPanelProps;
};

/** كروم + جسم الأحوال في وحدة واحدة حتى لا يُرسم الرأس فوق جسم فارغ. */
export function PersonalStatusDossierSurface({ chrome, panel }: PersonalStatusDossierSurfaceProps) {
    return (
        <>
            <PersonalStatusSmartFileChrome {...chrome} />
            <PersonalStatusDossierBody {...panel} />
        </>
    );
}
