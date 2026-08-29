import { readFileSync, writeFileSync } from 'node:fs';

const p = 'src/app/runtime/profileInstantPaint.ts';
const raw = readFileSync(p, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const s = raw.replace(/\r\n/g, '\n');

if (s.includes("setProperty('position', 'fixed')")) {
    console.log('already patched');
    process.exit(0);
}

const neu = `function applySurfacePaint(surface: HTMLElement, visible: boolean): void {
    /* دائماً fixed على الشاشة — يمنع شريط لون اللوحة فوق absolute داخل SafeView */
    surface.style.setProperty('position', 'fixed');
    surface.style.setProperty('inset', '0');
    surface.style.setProperty('width', '100%');
    surface.style.setProperty('height', '100%');
    surface.style.setProperty('max-height', '100dvh');
    surface.style.setProperty('background-color', CHROME);
    if (visible) {
        surface.style.setProperty('opacity', '1');
        surface.style.setProperty('visibility', 'visible');
        surface.style.setProperty('pointer-events', 'auto');
        surface.style.setProperty('z-index', '20');
    } else {
        /*
         * إخفاء صريح بالـ inline — لا removeProperty:
         * بينما React ما زال يضع --active يبقى السطح مرئياً من الـ CSS
         * إن اكتفينا بإزالة الأنماط فقط.
         */
        surface.style.setProperty('opacity', '0');
        surface.style.setProperty('visibility', 'hidden');
        surface.style.setProperty('pointer-events', 'none');
        surface.style.setProperty('z-index', '0');
    }
    void surface.offsetHeight;
}`;

const re =
    /function applySurfacePaint\(surface: HTMLElement, visible: boolean\): void \{[\s\S]*?void surface\.offsetHeight;\n\}/;

if (!re.test(s)) {
    console.error('regex fail');
    process.exit(1);
}

const out = s.replace(re, neu).replace(/\n/g, nl);
writeFileSync(p, out);
console.log('patched ok');
