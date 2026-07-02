// src/utils/themeTransition.js
// Circle ripple view transition starting from the clicked element position.
// Returns a promise that resolves when the animation is fully complete.
export function runThemeCircle(_toDark, onMidpoint, origin = null) {
    if (!document.startViewTransition) {
        onMidpoint();
        return Promise.resolve();
    }

    // Default ke pojok kanan atas jika tidak ada koordinat
    const x = origin?.x ?? window.innerWidth - 40;
    const y = origin?.y ?? 40;
    // Tambahkan extra margin 200px agar buletan pasti menutupi seluruh layar 
    // terutama di mobile yang tinggi layarnya (100dvh) kadang lebih besar dari innerHeight
    const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    ) + 200;

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
                duration: 350,
                easing: 'cubic-bezier(0.25, 1, 0.35, 1)',
                pseudoElement: '::view-transition-new(root)'
            }
        );
    });

    // Kembalikan promise yang resolve saat animasi selesai
    return transition.finished;
}
