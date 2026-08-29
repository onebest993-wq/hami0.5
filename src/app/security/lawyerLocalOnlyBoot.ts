/**
 * عزل الشبكة لإعدادات محامي الهاتف — ليس مسار مقر القيادة.
 */
import {
    armLocalOnlyNetworkIsolation,
    installLocalOnlyNetworkIsolation,
} from '@/app/services/settings/localOnlyNetworkIsolation';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { readLocalOnlyBootFlag } from '@/app/services/settings/localOnlyUrlPolicy';

export function installLawyerLocalOnlyIsolation(): void {
    installLocalOnlyNetworkIsolation();
    const snapshotOn = getLawyerSettingsSnapshot().security.localOnlyMode === true;
    if (snapshotOn || readLocalOnlyBootFlag()) {
        armLocalOnlyNetworkIsolation(true);
        void import('@/app/services/settings/settingsSecurityRuntime').then((m) =>
            m.applySettingsSecurityRuntime(getLawyerSettingsSnapshot().security),
        );
    }
}
