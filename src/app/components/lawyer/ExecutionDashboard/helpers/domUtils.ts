/** عجلة الفأرة أو اللمس المتتبع → تمرير أفقي (يتطلّب passive: false) */
export function bindHorizontalWheelToScroll(el: HTMLElement): () => void {
    const onWheel = (e: WheelEvent) => {
        if (el.scrollWidth <= el.clientWidth + 1) return;
        let delta = e.deltaX;
        if (e.shiftKey) {
            delta += e.deltaY;
        } else if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
            delta = e.deltaY;
        }
        if (delta === 0) return;
        const prev = el.scrollLeft;
        el.scrollLeft += delta;
        if (prev !== el.scrollLeft) {
            e.preventDefault();
        }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
}
