import React from 'react';

import { RoyalLawyerProfile } from '@/app/components/lawyer/RoyalLawyerProfile/index';

type RoyalProfileProps = React.ComponentProps<typeof RoyalLawyerProfile>;

/** واجهة الملف — استيراد ثابت للعرض الفوري (بلا فجوة chunk). */
export function RoyalLawyerProfileHost(props: RoyalProfileProps): React.ReactElement {
    return <RoyalLawyerProfile {...props} />;
}
