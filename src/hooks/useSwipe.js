import { useState } from 'react';

export default function useSwipe({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 50 }) {
    const [touchStart, setTouchStart] = useState({ x: null, y: null });
    const [touchEnd, setTouchEnd] = useState({ x: null, y: null });

    const onTouchStart = (e) => {
        setTouchEnd({ x: null, y: null });
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchMove = (e) => {
        setTouchEnd({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchEndHandler = (e) => {
        if (touchStart.x === null || touchEnd.x === null) return;
        
        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        
        // Cek apakah gesture lebih dominan horizontal atau vertikal
        const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
        
        let handled = false;
        if (isHorizontalSwipe) {
            const isLeftSwipe = distanceX > threshold;
            const isRightSwipe = distanceX < -threshold;

            if (isLeftSwipe && onSwipeLeft) {
                if (onSwipeLeft() !== false) handled = true;
            } else if (isRightSwipe && onSwipeRight) {
                if (onSwipeRight() !== false) handled = true;
            }
        } else {
            const isUpSwipe = distanceY > threshold;
            const isDownSwipe = distanceY < -threshold;

            if (isUpSwipe && onSwipeUp) {
                if (onSwipeUp() !== false) handled = true;
            } else if (isDownSwipe && onSwipeDown) {
                if (onSwipeDown() !== false) handled = true;
            }
        }

        if (handled && e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }
    };

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd: onTouchEndHandler
    };
}
