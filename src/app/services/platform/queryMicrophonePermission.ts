export type MicrophonePermissionStatus = 'granted' | 'prompt' | 'denied' | 'unsupported';

export function isMicrophoneAllowedByDocumentPolicy(): boolean {
    if (typeof document === 'undefined') return true;
    try {
        const policy = (
            document as Document & {
                permissionsPolicy?: { allowsFeature: (feature: string) => boolean };
            }
        ).permissionsPolicy;
        if (policy?.allowsFeature) {
            return policy.allowsFeature('microphone');
        }
    } catch {
        /* ignore */
    }
    return true;
}

/** فحص حالة إذن المايكروفون دون طلب التدفق — لإظهار/إخفاء البنر */
async function hasEnumeratedMicrophoneLabel(): Promise<boolean> {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some((device) => device.kind === 'audioinput' && Boolean(device.label?.trim()));
    } catch {
        return false;
    }
}

export async function queryMicrophonePermission(): Promise<MicrophonePermissionStatus> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return 'unsupported';
    }

    if (!isMicrophoneAllowedByDocumentPolicy()) {
        return 'denied';
    }

    try {
        const permissions = navigator.permissions;
        if (permissions?.query) {
            const result = await permissions.query({ name: 'microphone' as PermissionName });
            if (result.state === 'granted') return 'granted';
            if (result.state === 'denied') return 'denied';
            if (await hasEnumeratedMicrophoneLabel()) return 'granted';
            return 'prompt';
        }
    } catch {
        /* بعض المتصفحات/WebView لا تدعم name: microphone */
    }

    if (await hasEnumeratedMicrophoneLabel()) return 'granted';
    return 'prompt';
}

export function watchMicrophonePermission(
    onChange: (status: MicrophonePermissionStatus) => void,
): () => void {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
        return () => undefined;
    }

    let disposed = false;
    let permissionStatus: PermissionStatus | null = null;

    void permissionsQuery()
        .then((result) => {
            if (disposed || !result) return;
            permissionStatus = result;
            const apply = () => {
                if (result.state === 'granted') onChange('granted');
                else if (result.state === 'denied') onChange('denied');
                else onChange('prompt');
            };
            apply();
            result.onchange = apply;
        })
        .catch(() => undefined);

    return () => {
        disposed = true;
        if (permissionStatus) permissionStatus.onchange = null;
    };

    async function permissionsQuery(): Promise<PermissionStatus | null> {
        try {
            return await navigator.permissions!.query({ name: 'microphone' as PermissionName });
        } catch {
            return null;
        }
    }
}
