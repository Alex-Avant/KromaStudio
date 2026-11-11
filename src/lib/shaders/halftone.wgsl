// ============================================================================
// halftone.wgsl — Semitono AM por umbral para DTF
// ============================================================================
//
// La imagen llega como un storage buffer RGBA porque svader 1.0 no expone
// texturas y samplers. `sample_image()` emula filtrado bilinear con RGB
// premultiplicado para evitar halos en bordes transparentes.
//
// La trama es un screen AM clásico: cada píxel compara su cobertura tonal
// contra un umbral periódico que depende de su posición dentro de la celda.
// Es el mismo modelo que usa Photoshop al convertir a Bitmap con Halftone
// Screen: los puntos quedan en una cuadrícula regular, pero el contorno de
// cada punto sigue la tonalidad local y conserva tipografía y detalles.
//
// La rejilla usa las dimensiones lógicas de salida, independientes del buffer
// reducido del preview, para conservar el mismo número de celdas al exportar.
//
// u_mode = 0 -> capa de color; u_mode = 1 -> underbase blanco; u_mode = 2 ->
// máscara de impresión (la cobertura de tinta en gris premultiplicado).
// Ambas pasadas de tinta llaman a `evaluate_ink()`; el choke erosiona la misma
// máscara (tramada) o la máscara plana cuando la base blanca es sólida.
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
@group(0) @binding(12) var<uniform> u_levels: vec4<f32>;  // negro, blanco, forma, base sólida

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

// Umbral periódico del screen AM, expresado como fracción de área (0..1).
// Comparar la cobertura del píxel contra este umbral equivale a dibujar el
// punto cuya área coincide con la tonalidad local. Es el spot function de un
// screen de amplitud: sin ruido, con centros fijos y tamaño variable.
fn screen_threshold(cell_local: vec2<f32>) -> f32 {
    let shape = u32(u_levels.z + 0.5);

    if (shape == 1u) {
        // Elipse: semiejes proporcionales a sqrt(área).
        return PI * (
            cell_local.x * cell_local.x / ELLIPSE_ASPECT +
            cell_local.y * cell_local.y * ELLIPSE_ASPECT
        );
    }

    if (shape == 2u) {
        // Diamante: área = 2 · r², con r = |x| + |y|.
        let radius = abs(cell_local.x) + abs(cell_local.y);
        return 2.0 * radius * radius;
    }

    if (shape == 3u) {
        // Cuadrado alineado: área = (2 · max(|x|, |y|))².
        let radius = max(abs(cell_local.x), abs(cell_local.y));
        return 4.0 * radius * radius;
    }

    if (shape == 4u) {
        // Línea continua: el grosor equivale a la fracción de área.
        return 2.0 * abs(cell_local.y);
    }

    // Círculo: área = π · r².
    return PI * dot(cell_local, cell_local);
}

// Cobertura tonal de la fuente en este píxel, ya con niveles, contraste,
// gamma y polaridad. El alfa fuente limita la cobertura; un píxel
// transparente nunca produce tinta.
fn coverage_from_source(source: vec4<f32>) -> f32 {
    if (source.a <= 0.0) {
        return 0.0;
    }

    let lum = luminance(source.rgb);
    if (lum < u_levels.x) {
        return 0.0;
    }

    let range = max(u_levels.y - u_levels.x, 0.0001);
    let adjusted = clamp((lum - u_levels.x) / range, 0.0, 1.0);
    let tone = clamp((adjusted - 0.5) * u_tone.x + 0.5, 0.0, 1.0);

    // u_levels.w empaqueta flags: bit 0 = base sólida, bit 1 = polaridad
    // oscura. El modo de color solo decide el RGB de salida, no la trama.
    let dark_polarity = (u32(u_levels.w + 0.5) & 2u) != 0u;
    let polarity = select(tone, 1.0 - tone, dark_polarity);
    return clamp(pow(polarity * source.a, u_tone.y), 0.0, 1.0);
}

// Devuelve RGB recto del píxel y su máscara de tinta. La cobertura se evalúa
// en cada fragmento y se compara contra el screen periódico; el borde del
// punto sigue la tonalidad local en lugar de una única muestra por celda.
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

    let uv = (canvas_pos - origin) / displayed;
    let source = sample_image(uv);
    let coverage = coverage_from_source(source);
    if (coverage <= 0.0) {
        return vec4<f32>(0.0);
    }
    if (coverage >= u_tone.w) {
        return vec4<f32>(source.rgb, 1.0);
    }

    let grid_pos = grid_position(canvas_pos, cell);
    let cell_local = fract(grid_pos) - vec2<f32>(0.5);
    let threshold = screen_threshold(cell_local);
    let screen_mask = smoothstep(threshold - aa, threshold + aa, coverage);

    // El punto mínimo funde los puntos más débiles en vez de cortarlos en seco.
    let faded = screen_mask * smoothstep(u_tone.z * 0.5, u_tone.z, coverage);

    // Si la trama no se puede resolver, el preview representa su cobertura
    // media en vez de producir aliasing.
    let resolved = smoothstep(0.5, 1.25, cell);
    let mask = mix(coverage, faded, resolved);
    return vec4<f32>(source.rgb, clamp(mask, 0.0, 1.0));
}

// Tinta fuente exacta en `canvas_pos`, sin trama: 1.0 si el píxel es
// imprimible según la misma cobertura tonal y el alfa. Se usa para la base
// blanca sólida.
fn source_ink_at(
    canvas_pos: vec2<f32>,
    origin: vec2<f32>,
    displayed: vec2<f32>
) -> f32 {
    if (!inside_rect(canvas_pos, origin, displayed)) {
        return 0.0;
    }
    let uv = (canvas_pos - origin) / displayed;
    let source = sample_image(uv);
    if (source.a < 0.5) {
        return 0.0;
    }
    // La base sólida no debe cubrir zonas cuyo punto ya desapareció por el
    // umbral mínimo de impresión.
    let coverage = coverage_from_source(source);
    return select(0.0, 1.0, coverage > 0.0 && coverage >= u_tone.z);
}

const CHOKE_OFFSETS: array<vec2<f32>, 8> = array<vec2<f32>, 8>(
    vec2<f32>(1.0, 0.0),
    vec2<f32>(-1.0, 0.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(0.0, -1.0),
    vec2<f32>(0.70710678, 0.70710678),
    vec2<f32>(0.70710678, -0.70710678),
    vec2<f32>(-0.70710678, 0.70710678),
    vec2<f32>(-0.70710678, -0.70710678),
);

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
    let screen_t = screen_threshold(cell_local);

    // fwidth permanece en flujo uniforme. El ancho de suavizado se mide en
    // unidades de cobertura y sigue el gradiente real del screen.
    let aa = max(fwidth(screen_t) * 0.5, 0.0005);
    let ink = evaluate_ink(pos, origin, displayed, cell, aa);

    if (u_mode == 2u) {
        // Máscara de impresión: la cobertura de tinta en gris premultiplicado.
        return vec4<f32>(vec3<f32>(ink.a), ink.a);
    }

    if (u_mode == 1u) {
        if (u_underbase_active == 0u) {
            return vec4<f32>(0.0);
        }

        let choke_px = u_choke_px * fit;
        var white_alpha: f32;

        if ((u32(u_levels.w + 0.5) & 1u) != 0u) {
            // Base blanca sólida: tinta plana bajo el diseño, erosionada por el
            // choke igual que la base tramada.
            white_alpha = source_ink_at(pos, origin, displayed);
            if (choke_px > 0.0 && white_alpha > 0.0) {
                for (var i = 0u; i < 8u; i++) {
                    white_alpha = min(white_alpha, source_ink_at(
                        pos + CHOKE_OFFSETS[i] * choke_px, origin, displayed));
                }
            }
        } else {
            if (ink.a <= 0.0) {
                return vec4<f32>(0.0);
            }

            // Erosión de la misma máscara de puntos usada por la capa de color.
            white_alpha = ink.a;
            if (choke_px > 0.0) {
                for (var i = 0u; i < 8u; i++) {
                    white_alpha = min(white_alpha, evaluate_ink(
                        pos + CHOKE_OFFSETS[i] * choke_px, origin, displayed, cell, aa).a);
                }
            }
        }

        // El canvas está configurado con alfa premultiplicado.
        return vec4<f32>(vec3<f32>(white_alpha), white_alpha);
    }

    if (u_color_mode == 0u) {
        return vec4<f32>(ink.rgb * ink.a, ink.a);
    }
    return vec4<f32>(0.0, 0.0, 0.0, ink.a);
}
