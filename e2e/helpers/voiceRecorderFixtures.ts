import type { Page } from '@playwright/test';

export async function installVoiceRecorderMocks(page: Page) {
    await page.addInitScript(() => {
        class MockMediaRecorder {
            state: RecordingState = 'inactive';
            mimeType = 'audio/webm';
            ondataavailable: ((event: BlobEvent) => void) | null = null;
            onstop: (() => void) | null = null;
            onerror: ((event: Event) => void) | null = null;

            constructor(_stream: MediaStream) {}

            start() {
                this.state = 'recording';
            }

            stop() {
                this.state = 'inactive';
                const blob = new Blob(['mock-audio-e2e'], { type: 'audio/webm' });
                this.ondataavailable?.({ data: blob } as BlobEvent);
                window.setTimeout(() => this.onstop?.(), 0);
            }
        }

        Object.defineProperty(MockMediaRecorder, 'isTypeSupported', {
            value: () => true,
        });

        window.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

        const track = {
            kind: 'audio',
            readyState: 'live',
            stop: () => undefined,
        } as Pick<MediaStreamTrack, 'kind' | 'readyState' | 'stop'>;

        navigator.mediaDevices.getUserMedia = async () =>
            ({
                getTracks: () => [track],
                getAudioTracks: () => [track],
            }) as MediaStream;
    });
}

export async function grantMicrophonePermission(page: Page) {
    const raw = page.url();
    const origin = !raw || raw === 'about:blank' ? 'http://localhost:8080' : new URL(raw).origin;
    // WebKit (mobile-safari) يرفض microphone مثل camera — المسجّل يعتمد على mocks
    await page.context().grantPermissions(['microphone'], { origin }).catch(() => undefined);
}
