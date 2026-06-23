// src/utils/themeTransition.js
// Simple, reliable fade transition for theme toggle.
export function runThemeCircle(_toDark, onMidpoint) {
    const html = document.documentElement;
    html.classList.add('theme-transitioning');
    onMidpoint();
    setTimeout(() => {
        html.classList.remove('theme-transitioning');
    }, 400);
}
