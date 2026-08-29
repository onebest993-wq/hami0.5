/** فتح بطاقة التنبيهات من الهيدر — بلا بلاطة شبكة */
const HOME_HUB_ENTRY_OPEN_EVENT = 'hami:home-hub-entry-open';

let pendingHomeHubEntryOpen = false;

export function requestHomeHubEntryOpen(): void {
    pendingHomeHubEntryOpen = true;
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(HOME_HUB_ENTRY_OPEN_EVENT));
}

export function consumePendingHomeHubEntryOpen(): boolean {
    const pending = pendingHomeHubEntryOpen;
    pendingHomeHubEntryOpen = false;
    return pending;
}

export function subscribeHomeHubEntryOpen(onOpen: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const handler = () => onOpen();
    window.addEventListener(HOME_HUB_ENTRY_OPEN_EVENT, handler);
    return () => window.removeEventListener(HOME_HUB_ENTRY_OPEN_EVENT, handler);
}

export function resetHomeHubEntryOpenForTests(): void {
    pendingHomeHubEntryOpen = false;
}
