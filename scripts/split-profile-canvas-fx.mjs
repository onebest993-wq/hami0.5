import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/app/components/lawyer/RoyalLawyerProfile');
const src = path.join(dir, 'profileCanvasFx.css');
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);

function slice(from, to) {
    return lines.slice(from - 1, to).join('\n');
}

function write(name, content) {
    fs.writeFileSync(path.join(dir, name), content + '\n', 'utf8');
}

const pauseInView = `
/* يوقف حركات الكتل خارج viewport */
.profile-text-canvas[data-canvas-in-view='false'] *,
.profile-text-canvas[data-canvas-in-view='false']::before,
.profile-text-canvas[data-canvas-in-view='false']::after {
    animation-play-state: paused !important;
}

[data-lawyer-profile-root][data-profile-lite-canvas='true'] .profile-text-canvas__silk-veil-glow,
[data-lawyer-profile-root][data-profile-lite-canvas='true'] .profile-text-canvas__silk-veil-sheen,
[data-lawyer-profile-root][data-profile-lite-canvas='true'] .profile-text-canvas__petal,
[data-lawyer-profile-root][data-profile-lite-canvas='true'] .profile-text-canvas__stardust-particle,
[data-lawyer-profile-root][data-profile-lite-canvas='true'] .profile-text-canvas__mist-shimmer,
[data-lawyer-profile-root][data-profile-lite-canvas='true'] .profile-text-canvas__mist-gold-haze,
[data-lawyer-profile-root][data-profile-lite-canvas='true'] .profile-text-canvas[data-interactive='true'][data-revealed='false'][data-interaction='luminousFold'] .profile-text-canvas__luminous-fold {
    animation: none !important;
}

.profile-text-canvas[data-canvas-slot-active='false'][data-interactive='true'] *,
.profile-text-canvas[data-canvas-slot-active='false'][data-interactive='true']::before,
.profile-text-canvas[data-canvas-slot-active='false'][data-interactive='true']::after {
    animation-play-state: paused !important;
}
`;

write(
    'profileCanvasFx.core.css',
    [slice(1, 133), slice(503, 514), slice(1179, 1190), pauseInView].join('\n\n'),
);
write('profileCanvasFx.tapReveal.css', slice(134, 280));
write('profileCanvasFx.doorOpen.css', slice(282, 386));
write('profileCanvasFx.mistSwipe.css', slice(388, 451));
write('profileCanvasFx.petal.css', slice(454, 501));
write('profileCanvasStudioFx.css', [slice(516, 1007), slice(1148, 1177), slice(1192, 1207)].join('\n\n'));
write('profileCanvasFx.luminousFold.css', slice(1008, 1096));
write('profileCanvasFx.stardust.css', slice(1097, 1146));

console.log('[split-profile-canvas-fx] done', lines.length, 'source lines');
