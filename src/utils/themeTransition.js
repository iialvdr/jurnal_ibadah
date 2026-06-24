// src/utils/themeTransition.js
// Circle ripple view transition starting from the clicked element position.
export function runThemeCircle(_toDark, onMidpoint, origin = null) {
    if (!document.startViewTransition) {
        onMidpoint();
        return;
    }

    // Default ke pojok kanan atas jika tidak ada koordinat
    const x = origin?.x ?? window.innerWidth - 40;
    const y = origin?.y ?? 40;
    const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
        onMidpoint();
    });

    transition.ready.then(() => {
        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${radius}px at ${x}px ${y}px)`
                ]
            },
            {
                duration: 600,
                easing: 'cubic-bezier(0.25, 1, 0.35, 1)',
                pseudoElement: '::view-transition-new(root)'
            }
        );
    });
}
