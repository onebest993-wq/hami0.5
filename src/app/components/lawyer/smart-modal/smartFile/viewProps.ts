export type { SmartFileLayoutBuildInput, SmartFileLayoutProps } from './viewPropsTypes';
export { buildChromeProps } from './buildSmartFileChromeProps';
export { buildMainPanelProps } from './buildSmartFileMainPanelProps';
export { buildModalsPortalProps } from './buildSmartFileModalsPortalProps';

import type { SmartFileLayoutBuildInput, SmartFileLayoutProps } from './viewPropsTypes';
import { buildChromeProps } from './buildSmartFileChromeProps';
import { buildMainPanelProps } from './buildSmartFileMainPanelProps';
import { buildModalsPortalProps } from './buildSmartFileModalsPortalProps';

export function buildSmartFileLayoutProps(input: SmartFileLayoutBuildInput): SmartFileLayoutProps {
    return {
        chrome: buildChromeProps(input),
        mainPanel: buildMainPanelProps(input),
        modalsPortal: buildModalsPortalProps(input),
    };
}
