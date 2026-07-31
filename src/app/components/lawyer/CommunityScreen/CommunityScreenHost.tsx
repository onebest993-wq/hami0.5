import React from 'react';
import { CommunityScreen, type CommunityScreenProps } from '@/app/components/lawyer/CommunityScreen';

/**
 * Host رفيع — CommunityScreen متزامن (مثل HamiSettingsHost).
 * لا dynamic import ولا InstantShell عند الفتح.
 */
export function CommunityScreenHost(props: CommunityScreenProps): React.ReactElement | null {
    return <CommunityScreen {...props} />;
}
