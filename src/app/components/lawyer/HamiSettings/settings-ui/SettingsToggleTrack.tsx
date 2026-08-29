/** مسار المفتاح البصري — مشترك بين Toggle المتفائل وAsyncSettingToggle */

export function SettingsToggleTrack({ on }: { on: boolean }) {
    return (
        <div
            aria-hidden
            className={`pointer-events-none relative h-7 w-12 rounded-full hami-settings-toggle-track ${on ? 'bg-[#E6C673]' : 'bg-white/10'}`}
        >
            <div
                className={`pointer-events-none absolute top-1 right-1 h-5 w-5 rounded-full bg-white hami-settings-toggle-thumb ${on ? '-translate-x-5' : 'translate-x-0'}`}
            />
        </div>
    );
}
