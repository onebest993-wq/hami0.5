import { beforeEach, describe, expect, it } from 'vitest';

import { reconcileClosedOverlayLayers } from '@/app/runtime/overlayLayerHygiene';

describe('reconcileClosedOverlayLayers', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-notifications-open');
    });

    it('يخفي طبقة بحث مغلقة لكنها ظاهرة بسبب inline reveal', () => {
        const layer = document.createElement('div');
        layer.className = 'hami-gs-layer';
        layer.setAttribute('data-search-open', 'false');
        layer.style.visibility = 'visible';
        layer.style.pointerEvents = 'auto';
        const backdrop = document.createElement('button');
        backdrop.className = 'hami-gs-backdrop';
        layer.appendChild(backdrop);
        document.body.appendChild(layer);

        reconcileClosedOverlayLayers();

        expect(layer.style.getPropertyValue('visibility')).toBe('');
        expect(layer.style.getPropertyPriority('visibility')).toBe('');
        expect(layer.getAttribute('data-search-open')).toBe('false');
    });

    it('لا يمس طبقة البحث المفتوحة', () => {
        const layer = document.createElement('div');
        layer.className = 'hami-gs-layer';
        layer.setAttribute('data-search-open', 'true');
        layer.style.visibility = 'visible';
        document.body.appendChild(layer);

        reconcileClosedOverlayLayers();

        expect(layer.style.visibility).toBe('visible');
    });

    it('يخفي جذر الإشعارات المغلق مع opacity ظاهر', () => {
        const root = document.createElement('div');
        root.setAttribute('data-notification-root', '');
        root.setAttribute('data-open', 'false');
        root.style.opacity = '1';
        root.style.visibility = 'visible';
        document.body.appendChild(root);

        reconcileClosedOverlayLayers();

        expect(root.style.getPropertyValue('opacity')).toBe('');
        expect(root.getAttribute('data-open')).toBe('false');
    });
});
