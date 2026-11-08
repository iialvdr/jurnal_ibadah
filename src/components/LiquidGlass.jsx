// src/components/LiquidGlass.jsx
import React, { useRef, useState, useCallback, useId, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
    buildLiquidGlassFilter,
    removeLiquidGlassFilter,
    supportsLiquidGlassRefraction,
} from '@/utils/liquidGlassRefraction';

/**
 * Authentic Polar Displacement Map from rdev/liquid-glass-react
 * 64x64 radial displacement texture mapping optic curvature to RGB channels
 */
export const POLAR_DISPLACEMENT_MAP =
    "data:image/jpeg;base64,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";

/**
 * Convex liquid-glass surface with SVG backdrop refraction and a CSS fallback.
 */
const LiquidGlass = forwardRef(function LiquidGlass(
    {
        children,
        tier = 'regular', // 'thin' | 'regular' | 'thick'
        displacementScale = 65,
        refractionBlur = 0,
        blurAmount, // optional custom override
        saturation = 180,
        refractionPreset = 'regular',
        elasticity = false, // default false so navigation bars and containers don't bounce on press
        interactive = true,
        overflowVisible = false,
        cornerRadius = 'rounded-full',
        className = '',
        style = {},
        onRefractionReady,
        onClick,
        onPointerDown,
        onPointerUp,
        as: Component = 'div',
        ...rest
    },
    ref
) {
    const filterId = useId().replace(/:/g, '-');
    const containerRef = useRef(null);
    const refractionLayerRef = useRef(null);
    const specularEdgeRef = useRef(null);
    useImperativeHandle(ref, () => containerRef.current);

    useEffect(() => {
        const container = containerRef.current;
        const layer = refractionLayerRef.current;
        if (!container || !layer) return;

        const originalChildStyles = new Map();
        const elevateForeground = () => {
            Array.from(container.children).forEach(child => {
                if (child === layer || child.tagName.toLowerCase() === 'svg') return;
                if (!originalChildStyles.has(child)) {
                    originalChildStyles.set(child, {
                        position: child.style.position,
                        zIndex: child.style.zIndex,
                    });
                }
                const computed = getComputedStyle(child);
                if (computed.position === 'static') child.style.position = 'relative';
                if (computed.zIndex === 'auto') child.style.zIndex = '1';
            });
        };
        elevateForeground();

        const observer = new MutationObserver(elevateForeground);
        observer.observe(container, { childList: true });

        return () => {
            observer.disconnect();
            originalChildStyles.forEach((original, child) => {
                child.style.position = original.position;
                child.style.zIndex = original.zIndex;
            });
        };
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        const layer = refractionLayerRef.current;
        if (!container || !layer) return;
        if (
            !supportsLiquidGlassRefraction() ||
            style.backdropFilter ||
            style.WebkitBackdropFilter
        ) {
            onRefractionReady?.();
            return;
        }

        const originalBackdropFilter = container.style.backdropFilter;
        const originalWebkitBackdropFilter = container.style.WebkitBackdropFilter;
        let currentFilter = null;
        let dimensions = '';
        let frameId = 0;

        const rebuild = () => {
            frameId = 0;
            const width = Math.round(container.offsetWidth);
            const height = Math.round(container.offsetHeight);
            if (width < 2 || height < 2) return;

            const nextDimensions = `${width}x${height}`;
            if (nextDimensions === dimensions) return;

            const borderRadius = Number.parseFloat(getComputedStyle(container).borderTopLeftRadius) || Math.min(width, height) / 2;
            const nextFilter = buildLiquidGlassFilter(
                `liquid-glass-${filterId}`,
                width,
                height,
                borderRadius,
                refractionPreset,
                displacementScale
            );
            if (!nextFilter) {
                onRefractionReady?.();
                return;
            }

            removeLiquidGlassFilter(currentFilter);
            currentFilter = nextFilter;
            dimensions = nextDimensions;
            container.style.backdropFilter = 'none';
            container.style.WebkitBackdropFilter = 'none';
            const filterValue = `url(#${nextFilter.id})${refractionBlur > 0 ? ` blur(${refractionBlur}px)` : ''}`;
            layer.style.backdropFilter = filterValue;
            layer.style.webkitBackdropFilter = filterValue;
            onRefractionReady?.();
        };

        const scheduleRebuild = () => {
            if (frameId) cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(rebuild);
        };

        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(scheduleRebuild)
            : null;
        observer?.observe(container);
        scheduleRebuild();

        return () => {
            if (frameId) cancelAnimationFrame(frameId);
            observer?.disconnect();
            removeLiquidGlassFilter(currentFilter);
            container.style.backdropFilter = originalBackdropFilter;
            container.style.WebkitBackdropFilter = originalWebkitBackdropFilter;
            layer.style.backdropFilter = '';
            layer.style.webkitBackdropFilter = '';
        };
    }, [displacementScale, filterId, onRefractionReady, refractionBlur, refractionPreset, style.backdropFilter, style.WebkitBackdropFilter]);

    // Damped fluid pointer physics (lerped for viscous liquid realism)
    const renderOffsetRef = useRef({ x: 0, y: 0 });
    const [isPressed, setIsPressed] = useState(false);
    const targetOffset = useRef({ x: 0, y: 0 });
    const currentOffset = useRef({ x: 0, y: 0 });
    const rafId = useRef(null);
    const isInteracting = useRef(false);

    // Reduced motion & transparency checks
    const [reducedMotion, setReducedMotion] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mq.matches);
        const handler = (e) => setReducedMotion(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const updateLightAngle = useCallback((offset) => {
        const lightAngle = Math.round(135 + offset.x * 0.9 + offset.y * 0.4);
        if (style['--specular-angle'] === undefined) {
            containerRef.current?.style.setProperty('--specular-angle', `${lightAngle}deg`);
        }
        if (specularEdgeRef.current) {
            specularEdgeRef.current.style.background = `linear-gradient(
                        ${lightAngle}deg,
                        rgba(255, 255, 255, 0.32) 0%,
                        rgba(255, 255, 255, 0.02) 35%,
                        rgba(255, 255, 255, 0.18) 70%,
                        rgba(255, 255, 255, 0.01) 100%
                    )`;
        }
    }, [style]);

    // Animation loop for smooth spring-like fluid light tracking
    const startAnimationLoop = useCallback(() => {
        if (rafId.current || reducedMotion) return;
        const tick = () => {
            const dx = targetOffset.current.x - currentOffset.current.x;
            const dy = targetOffset.current.y - currentOffset.current.y;

            // Fluid viscosity dampening factor
            currentOffset.current.x += dx * 0.14;
            currentOffset.current.y += dy * 0.14;

            renderOffsetRef.current = {
                x: Math.round(currentOffset.current.x * 100) / 100,
                y: Math.round(currentOffset.current.y * 100) / 100,
            };
            updateLightAngle(renderOffsetRef.current);

            // Rest condition: smoothly halt loop when close to target and not interacting
            if (!isInteracting.current && Math.abs(dx) < 0.04 && Math.abs(dy) < 0.04) {
                currentOffset.current = { x: 0, y: 0 };
                renderOffsetRef.current = { x: 0, y: 0 };
                updateLightAngle(renderOffsetRef.current);
                rafId.current = null;
                return;
            }

            if (isInteracting.current) {
                const settledX = Math.round(targetOffset.current.x * 100) / 100;
                const settledY = Math.round(targetOffset.current.y * 100) / 100;
                const settledAngle = Math.round(135 + settledX * 0.9 + settledY * 0.4);
                const currentAngle = Math.round(
                    135 + renderOffsetRef.current.x * 0.9 + renderOffsetRef.current.y * 0.4
                );
                // Stop when further frames would not change the rendered highlight.
                if (currentAngle === settledAngle) {
                    rafId.current = null;
                    return;
                }
            }

            rafId.current = requestAnimationFrame(tick);
        };
        rafId.current = requestAnimationFrame(tick);
    }, [reducedMotion, updateLightAngle]);

    useEffect(() => {
        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, []);

    const handlePointerMove = useCallback((e) => {
        if (!interactive || reducedMotion || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        isInteracting.current = true;
        targetOffset.current = {
            x: ((clientX - centerX) / (rect.width / 2)) * 50,
            y: ((clientY - centerY) / (rect.height / 2)) * 50,
        };
        startAnimationLoop();
    }, [interactive, reducedMotion, startAnimationLoop]);

    const handlePointerLeave = useCallback(() => {
        isInteracting.current = false;
        targetOffset.current = { x: 0, y: 0 };
        setIsPressed(false);
        startAnimationLoop();
    }, [startAnimationLoop]);

    const handleDown = useCallback((e) => {
        if (elasticity && !reducedMotion) setIsPressed(true);
        if (onPointerDown) onPointerDown(e);
    }, [elasticity, reducedMotion, onPointerDown]);

    const handleUp = useCallback((e) => {
        if (elasticity) setIsPressed(false);
        if (onPointerUp) onPointerUp(e);
    }, [elasticity, onPointerUp]);

    // Dynamic light direction (rotates specular highlights smoothly around the rim)
    const lightAngle = Math.round(135 + renderOffsetRef.current.x * 0.9 + renderOffsetRef.current.y * 0.4);
    // Tier configuration matching Design Tokens (Section 4 & 6.2)
    // Direct pixel lengths ensure 100% valid backdrop-filter across all browser engines
    const tierBlur = blurAmount 
        ? `${blurAmount}px` 
        : tier === 'thin' 
            ? '12px' 
            : tier === 'thick' 
                ? '24px' 
                : '18px';

    const tierBg = tier === 'thin' 
        ? 'var(--glass-thin-bg)' 
        : tier === 'thick' 
            ? 'var(--glass-thick-bg)' 
            : 'var(--glass-regular-bg)';

    return (
        <Component
            ref={containerRef}
            onMouseMove={handlePointerMove}
            onTouchMove={handlePointerMove}
            onMouseLeave={handlePointerLeave}
            onTouchEnd={handlePointerLeave}
            onPointerDown={handleDown}
            onPointerUp={handleUp}
            onClick={onClick}
            className={`glass glass--${tier} liquid-glass liquid-glass-surface relative ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'} select-none ${typeof cornerRadius === 'string' ? cornerRadius : ''} ${className}`}
            style={{
                '--_blur': tierBlur,
                '--_bg': tierBg,
                '--_saturate': `${saturation}%`,
                '--specular-angle': `${lightAngle}deg`,
                transform: isPressed && elasticity ? 'scale(0.985)' : undefined,
                transition: elasticity && !reducedMotion ? 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)' : undefined,
                ...style,
            }}
            {...rest}
        >
            <div
                ref={refractionLayerRef}
                className="liquid-glass-refraction-layer"
                aria-hidden="true"
            />
            {/* Directional edge highlight keeps the glass contour visible without tinting content. */}
            <span
                ref={specularEdgeRef}
                className="glass-specular-edge absolute inset-0 pointer-events-none rounded-[inherit] z-0 opacity-80 dark:opacity-30"
                style={{
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                    WebkitMaskComposite: 'xor',
                    mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                    maskComposite: 'exclude',
                    background: `linear-gradient(
                        ${lightAngle}deg,
                        rgba(255, 255, 255, 0.32) 0%,
                        rgba(255, 255, 255, 0.02) 35%,
                        rgba(255, 255, 255, 0.18) 70%,
                        rgba(255, 255, 255, 0.01) 100%
                    )`,
                }}
            />

            {/* In-flow Children: 100% crisp typography & direct participatory layout */}
            {children}
        </Component>
    );
});

export default LiquidGlass;
