import { beforeEach, describe, expect, it } from 'vitest';
import {
    getUserIdentityUiState,
    mergeUserIdentityUiState,
    publishUserIdentityUiState,
    resetUserIdentityUiStateForTests,
} from '@/app/services/profile/userIdentityUiState';

const SAMPLE_JPEG_DATA_URL =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

describe('userIdentityUiState', () => {
    beforeEach(() => {
        resetUserIdentityUiStateForTests();
    });

    it('ينشر لقطة ذرّية واحدة', () => {
        publishUserIdentityUiState({
            userId: 'u1',
            displayName: 'أحمد مهدي',
            avatarUrl: SAMPLE_JPEG_DATA_URL,
            profileInitial: 'أ',
            isLoaded: true,
        });
        const state = getUserIdentityUiState('u1');
        expect(state?.displayName).toBe('أحمد مهدي');
        expect(state?.avatarUrl).toBe(SAMPLE_JPEG_DATA_URL);
        expect(state?.isLoaded).toBe(true);
    });

    it('لا يفرّغ حقلاً أغنى عند الدمج الجزئي', () => {
        publishUserIdentityUiState({
            userId: 'u1',
            displayName: 'أحمد مهدي',
            avatarUrl: SAMPLE_JPEG_DATA_URL,
            profileInitial: 'أ',
            isLoaded: true,
        });
        mergeUserIdentityUiState({
            userId: 'u1',
            displayName: '',
            avatarUrl: '',
            profileInitial: '',
            isLoaded: true,
        });
        const state = getUserIdentityUiState('u1');
        expect(state?.displayName).toBe('أحمد مهدي');
        expect(state?.avatarUrl).toBe(SAMPLE_JPEG_DATA_URL);
    });

    it('يرفض رابط صورة خطيراً ويُبقي الصورة الآمنة السابقة', () => {
        publishUserIdentityUiState({
            userId: 'u1',
            displayName: 'أحمد مهدي',
            avatarUrl: SAMPLE_JPEG_DATA_URL,
            profileInitial: 'أ',
            isLoaded: true,
        });
        mergeUserIdentityUiState({
            userId: 'u1',
            displayName: 'أحمد مهدي',
            avatarUrl: 'javascript:alert(1)',
            profileInitial: 'أ',
            isLoaded: true,
        });
        expect(getUserIdentityUiState('u1')?.avatarUrl).toBe(SAMPLE_JPEG_DATA_URL);
    });

    it('يثبّت الاسم الأغنى ولا يرجع إلى بادئة بلا همزة', () => {
        mergeUserIdentityUiState({
            userId: 'u1',
            displayName: 'احمد',
            avatarUrl: '',
            profileInitial: 'ا',
            isLoaded: false,
        });
        mergeUserIdentityUiState({
            userId: 'u1',
            displayName: 'أحمد مهدي',
            avatarUrl: SAMPLE_JPEG_DATA_URL,
            profileInitial: 'أ',
            isLoaded: true,
        });
        const state = getUserIdentityUiState('u1');
        expect(state?.displayName).toBe('أحمد مهدي');
        expect(state?.avatarUrl).toBe(SAMPLE_JPEG_DATA_URL);
        expect(state?.isLoaded).toBe(true);
        mergeUserIdentityUiState({
            userId: 'u1',
            displayName: 'احمد',
            avatarUrl: '',
            profileInitial: 'ا',
            isLoaded: true,
        });
        expect(getUserIdentityUiState('u1')?.displayName).toBe('أحمد مهدي');
    });

    it('يثبّت الحساب بلا اسم بعد التسخين', () => {
        mergeUserIdentityUiState({
            userId: 'new-1',
            displayName: '',
            avatarUrl: '',
            profileInitial: 'م',
            isLoaded: true,
        });
        const state = getUserIdentityUiState('new-1');
        expect(state?.isLoaded).toBe(true);
        expect(state?.displayName).toBe('');
        expect(state?.profileInitial).toBe('م');
    });

    it('ينزع الوسوم من الاسم ويُبقي النص الآمن', () => {
        mergeUserIdentityUiState({
            userId: 'u1',
            displayName: '<script>alert(1)</script>أحمد مهدي',
            avatarUrl: SAMPLE_JPEG_DATA_URL,
            profileInitial: '<b>أ</b>',
            isLoaded: true,
        });
        const state = getUserIdentityUiState('u1');
        expect(state?.displayName).toBe('أحمد مهدي');
        expect(state?.profileInitial).toBe('أ');
    });
});
