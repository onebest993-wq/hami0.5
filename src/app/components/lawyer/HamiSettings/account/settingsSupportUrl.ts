/** روابط الدعم من مركز الإعدادات — mailto فقط */
export function isAllowedSettingsSupportUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed || trimmed.length > 500) return false;
    const lower = trimmed.toLowerCase();
    if (lower.includes('javascript:') || lower.includes('data:') || /[\s<>]/.test(trimmed)) {
        return false;
    }
    return /^mailto:[^\s]+$/i.test(trimmed);
}
