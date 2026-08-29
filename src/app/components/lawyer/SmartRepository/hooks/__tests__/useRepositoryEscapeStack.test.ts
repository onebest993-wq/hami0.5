import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRepositoryEscapeStack } from '../useRepositoryEscapeStack';
import {
    registerRepositoryChromeDismiss,
    resetRepositoryChromeDismissStackForTests,
} from '../repositoryChromeDismiss';
import {
    registerVoiceRecorderEscape,
    resetVoiceRecorderEscapeForTests,
} from '@/app/components/lawyer/ActionModals/voiceRecorderEscapeBridge';

let nativeBackHandler: (() => boolean) | null = null;

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: (handler: () => boolean) => {
        nativeBackHandler = handler;
        return () => {
            if (nativeBackHandler === handler) nativeBackHandler = null;
        };
    },
}));

function pressEscape() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

describe('useRepositoryEscapeStack', () => {
    beforeEach(() => {
        nativeBackHandler = null;
        resetRepositoryChromeDismissStackForTests();
        resetVoiceRecorderEscapeForTests();
    });

    it('يغلق المستودع عند عدم وجود طبقات فرعية', () => {
        const onCloseModal = vi.fn();
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: false,
                scannerOpen: false,
                showVoiceRecorder: false,
                onResetComposer: vi.fn(),
                onCloseScanner: vi.fn(),
                onCloseModal,
            }),
        );
        pressEscape();
        expect(onCloseModal).toHaveBeenCalledTimes(1);
    });

    it('يلغي الإنشاء قبل إغلاق المستودع', () => {
        const onResetComposer = vi.fn();
        const onCloseModal = vi.fn();
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: true,
                scannerOpen: false,
                showVoiceRecorder: false,
                onResetComposer,
                onCloseScanner: vi.fn(),
                onCloseModal,
            }),
        );
        pressEscape();
        expect(onResetComposer).toHaveBeenCalledTimes(1);
        expect(onCloseModal).not.toHaveBeenCalled();
    });

    it('Cap native back يغلق الماسح قبل المستودع', () => {
        const onCloseScanner = vi.fn();
        const onCloseModal = vi.fn();
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: false,
                scannerOpen: true,
                showVoiceRecorder: false,
                onResetComposer: vi.fn(),
                onCloseScanner,
                onCloseModal,
            }),
        );
        expect(nativeBackHandler?.()).toBe(true);
        expect(onCloseScanner).toHaveBeenCalledTimes(1);
        expect(onCloseModal).not.toHaveBeenCalled();
    });

    it('Cap native back يغلق المستودع عند عدم وجود طبقات', () => {
        const onCloseModal = vi.fn();
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: false,
                scannerOpen: false,
                showVoiceRecorder: false,
                onResetComposer: vi.fn(),
                onCloseScanner: vi.fn(),
                onCloseModal,
            }),
        );
        expect(nativeBackHandler?.()).toBe(true);
        expect(onCloseModal).toHaveBeenCalledTimes(1);
    });

    it('Escape يغلق المسجّل الصوتي قبل المستودع', () => {
        const onCloseVoice = vi.fn();
        const onCloseModal = vi.fn();
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: false,
                scannerOpen: false,
                showVoiceRecorder: true,
                onResetComposer: vi.fn(),
                onCloseScanner: vi.fn(),
                onCloseVoice,
                onCloseModal,
            }),
        );
        pressEscape();
        expect(onCloseVoice).toHaveBeenCalledTimes(1);
        expect(onCloseModal).not.toHaveBeenCalled();
    });

    it('Cap native back يغلق المسجّل الصوتي قبل المستودع', () => {
        const onCloseVoice = vi.fn();
        const onCloseModal = vi.fn();
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: false,
                scannerOpen: false,
                showVoiceRecorder: true,
                onResetComposer: vi.fn(),
                onCloseScanner: vi.fn(),
                onCloseVoice,
                onCloseModal,
            }),
        );
        expect(nativeBackHandler?.()).toBe(true);
        expect(onCloseVoice).toHaveBeenCalledTimes(1);
        expect(onCloseModal).not.toHaveBeenCalled();
    });

    it('يغلق قائمة الكروم قبل المستودع', () => {
        const onCloseModal = vi.fn();
        const closeChrome = vi.fn(() => true);
        registerRepositoryChromeDismiss(closeChrome);
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: false,
                scannerOpen: false,
                showVoiceRecorder: false,
                onResetComposer: vi.fn(),
                onCloseScanner: vi.fn(),
                onCloseModal,
            }),
        );
        pressEscape();
        expect(closeChrome).toHaveBeenCalledTimes(1);
        expect(onCloseModal).not.toHaveBeenCalled();
    });

    it('المسجّل الصوتي يسبق قائمة الكروم', () => {
        const onCloseVoice = vi.fn();
        const onCloseModal = vi.fn();
        const closeChrome = vi.fn(() => true);
        registerRepositoryChromeDismiss(closeChrome);
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: false,
                scannerOpen: false,
                showVoiceRecorder: true,
                onResetComposer: vi.fn(),
                onCloseScanner: vi.fn(),
                onCloseVoice,
                onCloseModal,
            }),
        );
        pressEscape();
        expect(onCloseVoice).toHaveBeenCalledTimes(1);
        expect(closeChrome).not.toHaveBeenCalled();
        expect(onCloseModal).not.toHaveBeenCalled();
    });

    it('أثناء التسجيل: جسر المسجّل يستهلك Escape دون إغلاق الطبقة', () => {
        const onCloseVoice = vi.fn();
        const onCloseModal = vi.fn();
        const stopRecording = vi.fn(() => true);
        registerVoiceRecorderEscape(stopRecording);
        renderHook(() =>
            useRepositoryEscapeStack({
                enabled: true,
                composing: false,
                scannerOpen: false,
                showVoiceRecorder: true,
                onResetComposer: vi.fn(),
                onCloseScanner: vi.fn(),
                onCloseVoice,
                onCloseModal,
            }),
        );
        pressEscape();
        expect(stopRecording).toHaveBeenCalledTimes(1);
        expect(onCloseVoice).not.toHaveBeenCalled();
        expect(onCloseModal).not.toHaveBeenCalled();
    });
});
