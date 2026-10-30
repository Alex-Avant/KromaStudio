// ============================================================================
// halftone.wgsl — Semitono AM por celda para DTF
// ============================================================================
//
// La imagen llega como un storage buffer RGBA porque svader 1.0 no expone
// texturas y samplers. `sample_image()` emula filtrado bilinear con RGB
// premultiplicado para evitar halos en bordes transparentes.
//
// Cada celda toma una única muestra en su centro. Así, todos los fragmentos
// del punto comparten color, cobertura y alfa, y la imagen no corta su forma.
// La rejilla usa las dimensiones lógicas de salida, independientes del buffer
// reducido del preview, para conservar el mismo número de celdas al exportar.
//
// u_mode = 0 -> capa de color; u_mode = 1 -> underbase blanco.
// Ambas pasadas llaman a `evaluate_ink()`, también en los vecinos del choke.
// ============================================================================

@group(0) @binding(0) var<uniform> u_resolution: vec2<f32>;
@group(0) @binding(1) var<uniform> u_lpi: f32;
@group(0) @binding(2) var<uniform> u_angle: f32;          // radianes
@group(0) @binding(3) var<uniform> u_tone: vec4<f32>;     // contraste, gamma, mínimo, sólido
@group(0) @binding(4) var<uniform> u_choke_px: f32;       // píxeles lógicos de salida
@group(0) @binding(5) var<uniform> u_underbase_active: u32; // 0 | 1
@group(0) @binding(6) var<uniform> u_mode: u32;           // 0 color, 1 underbase
@group(0) @binding(7) var<uniform> u_image_metrics: vec4<f32>; // buffer xy, salida lógica zw
@group(0) @binding(8) var<uniform> u_dpi: f32;
@group(0) @binding(9) var<storage, read> u_pixels: array<u32>;
@group(0) @binding(10) var<uniform> u_offset: vec2<f32>;
@group(0) @binding(11) var<uniform> u_color_mode: u32;    // 0 color, 1 B&N
@group(0) @binding(12) var<uniform> u_levels: vec4<f32>;  // negro, blanco, forma, reservado

const PI: f32 = 3.141592653589793;
const LUMA_WEIGHTS: vec3<f32> = vec3<f32>(0.299, 0.587, 0.114);
const ELLIPSE_ASPECT: f32 = 1.5;

fn rotate2d(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(c * p.x - s * p.y, s * p.x + c * p.y);
}

fn unpack_rgba(packed: u32) -> vec4<f32> {
    let r = f32(packed & 0xffu) / 255.0;
    let g = f32((packed >> 8u) & 0xffu) / 255.0;
    let b = f32((packed >> 16u) & 0xffu) / 255.0;
    let a = f32((packed >> 24u) & 0xffu) / 255.0;
    return vec4<f32>(r, g, b, a);
}

fn load_pixel(p: vec2<i32>) -> vec4<f32> {
    let size = vec2<i32>(u_image_metrics.xy);
    let clamped = clamp(p, vec2<i32>(0), size - vec2<i32>(1));
    let index = u32(clamped.y) * u32(size.x) + u32(clamped.x);
    return unpack_rgba(u_pixels[index]);
}

fn premultiply(color: vec4<f32>) -> vec4<f32> {
    return vec4<f32>(color.rgb * color.a, color.a);
}

// Filtrado bilinear clamp-to-edge. RGB se interpola premultiplicado y sólo se
// recupera el color recto cuando el alfa resultante es suficiente.
fn sample_image(uv: vec2<f32>) -> vec4<f32> {
    let image_size = u_image_metrics.xy;
    let texel = uv * image_size - vec2<f32>(0.5);
    let base = floor(texel);
    let f = fract(texel);

    let p00 = premultiply(load_pixel(vec2<i32>(base)));
    let p10 = premultiply(load_pixel(vec2<i32>(base + vec2<f32>(1.0, 0.0))));
    let p01 = premultiply(load_pixel(vec2<i32>(base + vec2<f32>(0.0, 1.0))));
    let p11 = premultiply(load_pixel(vec2<i32>(base + vec2<f32>(1.0, 1.0))));

    let top = mix(p00, p10, f.x);
    let bottom = mix(p01, p11, f.x);
    let sampled = mix(top, bottom, f.y);
    if (sampled.a <= 0.00001) {
        return vec4<f32>(0.0);
    }
    return vec4<f32>(sampled.rgb / sampled.a, sampled.a);
}

fn luminance(rgb: vec3<f32>) -> f32 {
    return dot(rgb, LUMA_WEIGHTS);
}

fn inside_rect(pos: vec2<f32>, origin: vec2<f32>, size: vec2<f32>) -> bool {
    let local = pos - origin;
    return local.x >= 0.0 && local.y >= 0.0 && local.x < size.x && local.y < size.y;
}

fn grid_position(canvas_pos: vec2<f32>, cell: f32) -> vec2<f32> {
    let centered = canvas_pos - u_resolution * 0.5;
    return rotate2d(centered, u_angle) / cell;
}

fn cell_center_canvas(grid_pos: vec2<f32>, cell: f32) -> vec2<f32> {
    let center = (floor(grid_pos) + vec2<f32>(0.5)) * cell;
    return rotate2d(center, -u_angle) + u_resolution * 0.5;
}

// Distancia firmada aproximada en píxeles de canvas para un punto cuya
// fracción de área es `area` (0..0.5). Negativa dentro del punto.
//
// Para coberturas por encima del 50 % la trama se invierte: lo que se dibuja
// es un hueco de área 1 - cobertura que se cierra hacia sólido. Así los puntos
// vecinos nunca se solapan y las sombras quedan limpias en vez de empastadas.
fn dot_distance(cell_local: vec2<f32>, area: f32, cell: f32) -> f32 {
    let shape = u32(u_levels.z + 0.5);
    let safe_area = clamp(area, 0.0, 0.5);

    if (shape == 1u) {
        let clamped = max(safe_area, 0.000001);
        let radii = vec2<f32>(
            sqrt(clamped * ELLIPSE_ASPECT / PI),
            sqrt(clamped / (PI * ELLIPSE_ASPECT))
        );
        let normalized = length(cell_local / radii);
        return (normalized - 1.0) * min(radii.x, radii.y) * cell;
    }

    if (shape == 2u) {
        let radius = sqrt(safe_area * 0.5);
        return (abs(cell_local.x) + abs(cell_local.y) - radius) * 0.70710678 * cell;
    }

    let radius = sqrt(safe_area / PI);
    return (length(cell_local) - radius) * cell;
}

// Devuelve RGB recto de la celda y alfa de tinta. El alfa fuente modifica el
// área del punto en lugar de volver a multiplicar la tinta ya rasterizada.
fn evaluate_ink(
    canvas_pos: vec2<f32>,
    origin: vec2<f32>,
    displayed: vec2<f32>,
    cell: f32,
    aa: f32
) -> vec4<f32> {
    if (!inside_rect(canvas_pos, origin, displayed)) {
        return vec4<f32>(0.0);
    }

    let grid_pos = grid_position(canvas_pos, cell);
    let center = cell_center_canvas(grid_pos, cell);
    if (!inside_rect(center, origin, displayed)) {
        return vec4<f32>(0.0);
    }

    let uv = (center - origin) / displayed;
    let source = sample_image(uv);
    let lum = luminance(source.rgb);
    if (source.a <= 0.0 || lum < u_levels.x) {
        return vec4<f32>(0.0);
    }

    let range = max(u_levels.y - u_levels.x, 0.0001);
    let adjusted = clamp((lum - u_levels.x) / range, 0.0, 1.0);
    let luma = clamp((adjusted - 0.5) * u_tone.x + 0.5, 0.0, 1.0);
    let base_coverage = clamp((1.0 - luma) * source.a, 0.0, 1.0);
    if (base_coverage <= 0.0) {
        return vec4<f32>(0.0);
    }

    let coverage = clamp(pow(base_coverage, u_tone.y), 0.0, 1.0);
    if (coverage >= u_tone.w) {
        return vec4<f32>(source.rgb, 1.0);
    }

    let cell_local = fract(grid_pos) - vec2<f32>(0.5);
    let dot_area = min(coverage, 1.0 - coverage);
    let distance = dot_distance(cell_local, dot_area, cell);
    let dot_mask = 1.0 - smoothstep(-aa, aa, distance);

    // Fase invertida a partir del 50 %: el hueco en la tinta se cierra hacia
    // sólido. Un crossfade breve evita el salto de forma en la transición.
    let phase = smoothstep(0.45, 0.55, coverage);
    let shape_mask = mix(dot_mask, 1.0 - dot_mask, phase);

    // El punto mínimo se funde en vez de cortarse en seco, para que las luces
    // no pierdan puntos de golpe.
    let faded = shape_mask * smoothstep(u_tone.z * 0.5, u_tone.z, coverage);

    // Si la trama no se puede resolver, el preview representa su cobertura
    // media en vez de producir aliasing o cambiar silenciosamente el LPI.
    let resolved = smoothstep(0.5, 1.25, cell);
    let mask = mix(coverage, faded, resolved);
    return vec4<f32>(source.rgb, clamp(mask, 0.0, 1.0));
}

@fragment
fn main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    // `u_offset` compensa el recorte virtual que svader aplica a canvas grandes.
    let pos = frag_coord.xy + u_offset;
    let canvas_size = u_resolution;
    let logical_size = max(u_image_metrics.zw, vec2<f32>(1.0));
    let fit = min(canvas_size.x / logical_size.x, canvas_size.y / logical_size.y);
    let displayed = logical_size * fit;
    let origin = (canvas_size - displayed) * 0.5;

    let output_cell = max(u_dpi / max(u_lpi, 1.0), 0.0001);
    let cell = max(output_cell * fit, 0.0001);
    let grid_pos = grid_position(pos, cell);
    let cell_local = fract(grid_pos) - vec2<f32>(0.5);
    let grid_dist = length(cell_local) * cell;

    // fwidth permanece en flujo uniforme. El suavizado sigue el footprint real
    // del píxel, sin el borde mínimo de 1,5 px del prototipo anterior.
    let aa = max(fwidth(grid_dist) * 0.5, 0.0001);
    let ink = evaluate_ink(pos, origin, displayed, cell, aa);

    if (u_mode == 1u) {
        if (u_underbase_active == 0u || ink.a <= 0.0) {
            return vec4<f32>(0.0);
        }

        var white_alpha = ink.a;
        let choke_px = u_choke_px * fit;
        if (choke_px > 0.0) {
            let diagonal = choke_px * 0.70710678;

            // Erosión de la misma máscara de puntos usada por la capa de color.
            white_alpha = min(white_alpha, evaluate_ink(
                pos + vec2<f32>(choke_px, 0.0), origin, displayed, cell, aa).a);
            white_alpha = min(white_alpha, evaluate_ink(
                pos + vec2<f32>(-choke_px, 0.0), origin, displayed, cell, aa).a);
            white_alpha = min(white_alpha, evaluate_ink(
                pos + vec2<f32>(0.0, choke_px), origin, displayed, cell, aa).a);
            white_alpha = min(white_alpha, evaluate_ink(
                pos + vec2<f32>(0.0, -choke_px), origin, displayed, cell, aa).a);
            white_alpha = min(white_alpha, evaluate_ink(
                pos + vec2<f32>(diagonal, diagonal), origin, displayed, cell, aa).a);
            white_alpha = min(white_alpha, evaluate_ink(
                pos + vec2<f32>(diagonal, -diagonal), origin, displayed, cell, aa).a);
            white_alpha = min(white_alpha, evaluate_ink(
                pos + vec2<f32>(-diagonal, diagonal), origin, displayed, cell, aa).a);
            white_alpha = min(white_alpha, evaluate_ink(
                pos + vec2<f32>(-diagonal, -diagonal), origin, displayed, cell, aa).a);
        }

        // El canvas está configurado con alfa premultiplicado.
        return vec4<f32>(vec3<f32>(white_alpha), white_alpha);
    }

    if (u_color_mode == 0u) {
        return vec4<f32>(ink.rgb * ink.a, ink.a);
    }
    return vec4<f32>(0.0, 0.0, 0.0, ink.a);
}
