const SVG_NS = 'http://www.w3.org/2000/svg';

const presets = {
    regular: {
        thickness: 80,
        bezelWidth: 40,
        ior: 1.4,
        scaleRatio: 0.85,
        blur: 0.5,
        specularOpacity: 0.45,
        saturation: 1,
        balancedSpecular: false,
    },
    switcher: {
        thickness: 16,
        bezelWidth: 40,
        ior: 1.4,
        scaleRatio: 1,
        blur: 0.25,
        specularOpacity: 0.08,
        saturation: 1,
        balancedSpecular: true,
    },
};
const mapCache = new Map();
const MAX_CACHED_MAPS = 12;

function getCachedMaps(key, createMaps) {
    const cached = mapCache.get(key);
    if (cached) {
        mapCache.delete(key);
        mapCache.set(key, cached);
        return cached;
    }

    const maps = createMaps();
    mapCache.set(key, maps);
    if (mapCache.size > MAX_CACHED_MAPS) {
        mapCache.delete(mapCache.keys().next().value);
    }
    return maps;
}

function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function getCanvasData(width, height, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const image = context.createImageData(width, height);
    paint(image.data, width, height);
    context.putImageData(image, 0, 0);
    return canvas.toDataURL();
}

function calculateProfile(thickness, bezel, ior, samples = 128) {
    const eta = 1 / ior;
    const profile = new Float64Array(samples);
    const surface = x => Math.pow(1 - Math.pow(1 - x, 4), 0.25);

    for (let i = 0; i < samples; i += 1) {
        const x = i / samples;
        const y = surface(x);
        const dx = x < 1 ? 0.0001 : -0.0001;
        const derivative = (surface(x + dx) - y) / dx;
        const magnitude = Math.sqrt(derivative * derivative + 1);
        const nx = -derivative / magnitude;
        const ny = -1 / magnitude;
        const k = 1 - eta * eta * (1 - ny * ny);

        if (k < 0) continue;
        const sqrtK = Math.sqrt(k);
        const refractedX = -(eta * ny + sqrtK) * nx;
        const refractedY = eta - (eta * ny + sqrtK) * ny;
        if (Math.abs(refractedY) < 0.0001) continue;
        profile[i] = refractedX * ((y * bezel + thickness) / refractedY);
    }

    return profile;
}

function createDisplacementMap(width, height, radius, bezel, profile, maxDisplacement) {
    return getCanvasData(width, height, (data, mapWidth, mapHeight) => {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 128;
            data[i + 1] = 128;
            data[i + 2] = 0;
            data[i + 3] = 255;
        }

        const innerRadius = Math.max(radius - bezel, 0);
        const innerRadiusSq = innerRadius * innerRadius;
        const radiusSq = radius * radius;
        const roundedRadiusSq = (radius + 1) * (radius + 1);
        const bodyWidth = mapWidth - radius * 2;
        const bodyHeight = mapHeight - radius * 2;

        for (let y = 0; y < mapHeight; y += 1) {
            for (let x = 0; x < mapWidth; x += 1) {
                const cornerX = x < radius ? x - radius : x >= mapWidth - radius ? x - radius - bodyWidth : 0;
                const cornerY = y < radius ? y - radius : y >= mapHeight - radius ? y - radius - bodyHeight : 0;
                const distanceSq = cornerX * cornerX + cornerY * cornerY;
                if (distanceSq > roundedRadiusSq || distanceSq < innerRadiusSq) continue;

                const distance = Math.sqrt(distanceSq);
                if (distance === 0) continue;
                const opacity = distanceSq < radiusSq
                    ? 1
                    : 1 - (distance - radius) / ((radius + 1) - radius);
                const profileIndex = Math.min(
                    Math.floor(((radius - distance) / bezel) * profile.length),
                    profile.length - 1
                );
                const displacement = profile[profileIndex] || 0;
                const index = (y * mapWidth + x) * 4;
                data[index] = clampByte(128 - (cornerX / distance) * displacement / maxDisplacement * 127 * opacity);
                data[index + 1] = clampByte(128 - (cornerY / distance) * displacement / maxDisplacement * 127 * opacity);
            }
        }
    });
}

function createSpecularMap(width, height, radius, bezel, balanced) {
    return getCanvasData(width, height, (data, mapWidth, mapHeight) => {
        const innerRadius = Math.max(radius - bezel, 0);
        const innerRadiusSq = innerRadius * innerRadius;
        const radiusSq = radius * radius;
        const roundedRadiusSq = (radius + 1) * (radius + 1);
        const bodyWidth = mapWidth - radius * 2;
        const bodyHeight = mapHeight - radius * 2;
        const lightX = Math.cos(Math.PI / 3);
        const lightY = Math.sin(Math.PI / 3);

        for (let y = 0; y < mapHeight; y += 1) {
            for (let x = 0; x < mapWidth; x += 1) {
                const cornerX = x < radius ? x - radius : x >= mapWidth - radius ? x - radius - bodyWidth : 0;
                const cornerY = y < radius ? y - radius : y >= mapHeight - radius ? y - radius - bodyHeight : 0;
                const distanceSq = cornerX * cornerX + cornerY * cornerY;
                if (distanceSq > roundedRadiusSq || distanceSq < innerRadiusSq) continue;

                const distance = Math.sqrt(distanceSq);
                if (distance === 0) continue;
                const fromEdge = radius - distance;
                const opacity = distanceSq < radiusSq
                    ? 1
                    : 1 - (distance - radius) / ((radius + 1) - radius);
                const cosine = cornerX / distance;
                const sine = -cornerY / distance;
                const direction = balanced ? 1 : Math.abs(cosine * lightX + sine * lightY);
                const edge = Math.sqrt(Math.max(0, 1 - Math.pow(1 - fromEdge, 2)));
                const intensity = direction * edge;
                const index = (y * mapWidth + x) * 4;
                const color = clampByte(255 * intensity);
                data[index] = color;
                data[index + 1] = color;
                data[index + 2] = color;
                data[index + 3] = clampByte(color * intensity * opacity);
            }
        }
    });
}

function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
}

function ensureDefinitions() {
    let svg = document.getElementById('liquid-glass-svg-defs');
    if (!svg) {
        svg = document.createElementNS(SVG_NS, 'svg');
        svg.id = 'liquid-glass-svg-defs';
        svg.setAttribute('aria-hidden', 'true');
        svg.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none;visibility:hidden';
        svg.appendChild(document.createElementNS(SVG_NS, 'defs'));
        document.body.appendChild(svg);
    }
    return svg.querySelector('defs');
}

export function supportsLiquidGlassRefraction() {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
    return CSS.supports('backdrop-filter', 'url(#liquid-glass-test)')
        || CSS.supports('-webkit-backdrop-filter', 'url(#liquid-glass-test)');
}

export function buildLiquidGlassFilter(id, width, height, radius, presetName = 'regular', displacementScale = 80) {
    if (width < 2 || height < 2) return null;
    const settings = presets[presetName] || presets.regular;
    const safeRadius = Math.max(2, Math.min(radius, width / 2, height / 2));
    const bezel = Math.max(1, Math.min(settings.bezelWidth, safeRadius - 1, Math.min(width, height) / 2 - 1));
    const resolutionScale = Math.min(Math.max(window.devicePixelRatio || 1, 1) * 1.6, 3);
    const mapWidth = Math.ceil(width * resolutionScale);
    const mapHeight = Math.ceil(height * resolutionScale);
    const scaledRadius = safeRadius * resolutionScale;
    const scaledBezel = bezel * resolutionScale;
    const mapsKey = [
        mapWidth,
        mapHeight,
        scaledRadius,
        scaledBezel,
        presetName,
    ].join(':');
    const { displacementMap, specularMap, maxDisplacement } = getCachedMaps(mapsKey, () => {
        const profile = calculateProfile(settings.thickness, bezel, settings.ior);
        const maxDisplacement = Math.max(...Array.from(profile, Math.abs)) || 1;
        return {
            displacementMap: createDisplacementMap(
                mapWidth,
                mapHeight,
                scaledRadius,
                scaledBezel,
                profile,
                maxDisplacement
            ),
            specularMap: createSpecularMap(
                mapWidth,
                mapHeight,
                scaledRadius,
                bezel * 2.5 * resolutionScale,
                settings.balancedSpecular
            ),
            maxDisplacement,
        };
    });
    if (!displacementMap || !specularMap) return null;

    const pad = settings.balancedSpecular ? 0.36 : 0;
    const filter = svgElement('filter', {
        id,
        x: -Math.round(width * pad),
        y: -Math.round(height * pad),
        width: Math.round(width * (1 + pad * 2)),
        height: Math.round(height * (1 + pad * 2)),
        filterUnits: 'userSpaceOnUse',
        primitiveUnits: 'userSpaceOnUse',
        'color-interpolation-filters': 'sRGB',
    });
    const blur = svgElement('feGaussianBlur', {
        in: 'SourceGraphic',
        stdDeviation: settings.blur,
        result: 'glass-blur',
    });
    const displacementImage = svgElement('feImage', {
        href: displacementMap,
        x: 0,
        y: 0,
        width,
        height,
        preserveAspectRatio: 'none',
        result: 'glass-displacement-map',
    });
    const displacement = svgElement('feDisplacementMap', {
        in: 'glass-blur',
        in2: 'glass-displacement-map',
        scale: maxDisplacement * settings.scaleRatio * (
            presetName === 'switcher' ? 1 : Math.max(0.35, displacementScale / 80)
        ),
        xChannelSelector: 'R',
        yChannelSelector: 'G',
        result: 'glass-refracted',
    });
    const saturation = svgElement('feColorMatrix', {
        in: 'glass-refracted',
        type: 'saturate',
        values: settings.saturation,
        result: 'glass-saturated',
    });
    const specularImage = svgElement('feImage', {
        href: specularMap,
        x: 0,
        y: 0,
        width,
        height,
        preserveAspectRatio: 'none',
        result: 'glass-specular-map',
    });
    const maskedSpecular = svgElement('feComposite', {
        in: 'glass-saturated',
        in2: 'glass-specular-map',
        operator: 'in',
        result: 'glass-masked-specular',
    });
    const opacity = svgElement('feComponentTransfer', {
        in: 'glass-specular-map',
        result: 'glass-specular-opacity',
    });
    opacity.appendChild(svgElement('feFuncA', { type: 'linear', slope: settings.specularOpacity }));
    filter.append(
        blur,
        displacementImage,
        displacement,
        saturation,
        specularImage,
        maskedSpecular,
        opacity,
        svgElement('feBlend', {
            in: 'glass-masked-specular',
            in2: 'glass-refracted',
            mode: 'normal',
            result: 'glass-with-refraction',
        }),
        svgElement('feBlend', {
            in: 'glass-specular-opacity',
            in2: 'glass-with-refraction',
            mode: 'normal',
        })
    );

    ensureDefinitions().appendChild(filter);
    return filter;
}

export function removeLiquidGlassFilter(filter) {
    if (!filter) return;
    const defs = filter.parentNode;
    filter.remove();
    if (!defs || defs.childElementCount > 0) return;
    const svg = defs.parentNode;
    svg?.remove();
}
