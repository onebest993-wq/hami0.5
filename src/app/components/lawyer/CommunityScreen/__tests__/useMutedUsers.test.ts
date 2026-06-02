import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMutedUsers } from '../useMutedUsers';

describe('useMutedUsers — كتم محلي للمستخدمين', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('يبدأ بقائمة فارغة', () => {
        const { result } = renderHook(() => useMutedUsers('me'));
        expect(result.current.mutedIds.size).toBe(0);
        expect(result.current.isMuted('anyone')).toBe(false);
    });

    it('يضيف ويزيل مستخدماً بـ toggle', () => {
        const { result } = renderHook(() => useMutedUsers('me'));
        act(() => result.current.toggleMute('annoying-user'));
        expect(result.current.isMuted('annoying-user')).toBe(true);
        act(() => result.current.toggleMute('annoying-user'));
        expect(result.current.isMuted('annoying-user')).toBe(false);
    });

    it('يمنع كتم النفس', () => {
        const { result } = renderHook(() => useMutedUsers('me'));
        act(() => result.current.toggleMute('me'));
        expect(result.current.isMuted('me')).toBe(false);
    });

    it('يحفظ القائمة في localStorage باسم مفتاح مرتبط بالمستخدم', () => {
        const { result } = renderHook(() => useMutedUsers('userA'));
        act(() => result.current.toggleMute('target'));
        const raw = window.localStorage.getItem('hami:forum:muted-users:v1:userA');
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(raw as string);
        expect(parsed).toContain('target');
    });

    it('قوائم منفصلة لمستخدمين مختلفين على نفس الجهاز', () => {
        const userA = renderHook(() => useMutedUsers('userA'));
        act(() => userA.result.current.toggleMute('target'));
        const userB = renderHook(() => useMutedUsers('userB'));
        expect(userB.result.current.isMuted('target')).toBe(false);
    });

    it('clearMutes يفرغ القائمة', () => {
        const { result } = renderHook(() => useMutedUsers('me'));
        act(() => result.current.toggleMute('a'));
        act(() => result.current.toggleMute('b'));
        expect(result.current.mutedIds.size).toBe(2);
        act(() => result.current.clearMutes());
        expect(result.current.mutedIds.size).toBe(0);
    });

    it('يقرأ القائمة من localStorage عند الإعادة (persistence)', () => {
        window.localStorage.setItem(
            'hami:forum:muted-users:v1:persisted-user',
            JSON.stringify(['x', 'y']),
        );
        const { result } = renderHook(() => useMutedUsers('persisted-user'));
        expect(result.current.isMuted('x')).toBe(true);
        expect(result.current.isMuted('y')).toBe(true);
        expect(result.current.mutedIds.size).toBe(2);
    });

    it('يتجاهل بيانات تالفة في localStorage', () => {
        window.localStorage.setItem('hami:forum:muted-users:v1:me', 'not-json');
        const { result } = renderHook(() => useMutedUsers('me'));
        expect(result.current.mutedIds.size).toBe(0);
    });

    it('لا يكتم لو لا يوجد currentUserId', () => {
        const { result } = renderHook(() => useMutedUsers(null));
        act(() => result.current.toggleMute('someone'));
        expect(result.current.isMuted('someone')).toBe(false);
    });
});
