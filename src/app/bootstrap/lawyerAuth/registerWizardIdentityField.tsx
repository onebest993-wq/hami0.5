import type { ChangeEvent, ReactElement } from 'react';
import {
    authGateLabelClass,
    authGateLabelTextClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';

export async function fileToDataUrl(file: File): Promise<string> {
    const { fileToIdentityJpegDataUrl } = await import(
        '@/app/services/auth/identityImageNormalize'
    );
    return fileToIdentityJpegDataUrl(file);
}

/** معرض + كاميرا — النص الأصلي للمتصفح مخفي؛ الاختيار إلزامي عبر المعالج لا عبر required الوهمي */
export function IdentityImageField(props: {
    label: string;
    testId: string;
    cameraTestId?: string;
    galleryTestId?: string;
    required?: boolean;
    hasValue: boolean;
    previewUrl?: string | null;
    captureMode?: 'environment' | 'user';
    onPick: (event: ChangeEvent<HTMLInputElement>) => void;
}): ReactElement {
    const {
        label,
        testId,
        cameraTestId,
        galleryTestId,
        required,
        hasValue,
        previewUrl,
        captureMode = 'environment',
        onPick,
    } = props;

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        onPick(event);
        event.target.value = '';
    };

    return (
        <div className={authGateLabelClass}>
            <span className={authGateLabelTextClass}>
                {label}
                {required ? ' — إلزامي' : ''}
                {hasValue ? ' — تم الرفع' : ''}
            </span>
            <div className="grid grid-cols-2 gap-2">
                <label className="hami-auth-gate-file-hit">
                    <span className="hami-auth-gate-file-hit-text">من المعرض</span>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/*"
                        className="hami-auth-gate-file-native"
                        onChange={onChange}
                        data-testid={galleryTestId ?? `${testId}-gallery`}
                    />
                </label>
                <label className="hami-auth-gate-file-hit">
                    <span className="hami-auth-gate-file-hit-text">الكاميرا</span>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/*"
                        capture={captureMode}
                        className="hami-auth-gate-file-native"
                        onChange={onChange}
                        data-testid={cameraTestId ?? `${testId}-camera`}
                    />
                </label>
            </div>
            {previewUrl ? (
                <img
                    src={previewUrl}
                    alt={label}
                    className="hami-auth-gate-id-preview"
                />
            ) : null}
            <input type="hidden" data-testid={testId} value={hasValue ? '1' : ''} readOnly />
        </div>
    );
}
