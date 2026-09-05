import { SETTING_GLASS_INNER } from './settings-ui';

/** فتحات صفوف الإعدادات — ثيم موجود، بلا نص تحميل. */
export function SettingsSectionInstantSlots() {
    return (
        <div className="space-y-2 py-2" aria-busy="true" aria-hidden>
            <div className={`min-h-[44px] ${SETTING_GLASS_INNER}`} />
            <div className={`min-h-[44px] ${SETTING_GLASS_INNER}`} />
            <div className={`min-h-[44px] ${SETTING_GLASS_INNER}`} />
        </div>
    );
}
