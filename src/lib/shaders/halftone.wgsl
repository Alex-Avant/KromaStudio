// ============================================================================
// halftone.wgsl — Prototipo de semitono B/N para DTF
// ============================================================================
//
// NOTA SOBRE svader 1.0:
// La librería sólo permite enlazar uniforms y storage buffers desde el array
// `parameters`. No expone todavía bindings de texture_2d<f32> + sampler.
// Para mantener el componente 100 % funcional con svader, la imagen llega como
// un storage buffer de píxeles RGBA empaquetados en u32. `sample_image()`
// reproduce el muestreo bilineal (clamp-to-edge) de una textura con sampler.
//
// La misma shader se ejecuta en dos pasadas:
//   u_mode = 0 -> capa de color: semitono (color original o negro).
//   u_mode = 1 -> capa de underbase: blanco puro solo donde hay tinta
//                 visible después de aplicar black point y choke.
//
// El choke se mide en píxeles de salida. En preview se escala por el factor
// "contain" de la imagen para que el resultado coincida con la exportación.
// ============================================================================

@group(0) @binding(0) var<uniform> u_resolution: vec2<f32>;
@group(0) @binding(1) var<uniform> u_lpi: f32;
@group(0) @binding(2) var<uniform> u_angle: f32;          // radianes
@group(0) @binding(3) var<uniform> u_contrast: f32;
@group(0) @binding(4) var<uniform> u_choke_px: f32;       // píxeles de salida
@group(0) @binding(5) var<uniform> u_underbase_active: u32; // 0 | 1
@group(0) @binding(6) var<uniform> u_mode: u32;           // 0 color, 1 underbase
@group(0) @binding(7) var<uniform> u_image_size: vec2<f32>;
@group(0) @binding(8) var<uniform> u_dpi: f32;
@group(0) @binding(9) var<storage, read> u_pixels: array<u32>;
@group(0) @binding(10) var<uniform> u_offset: vec2<f32>;
@group(0) @binding(11) var<uniform> u_color_mode: u32;    // 0 color, 1 B&N
@group(0) @binding(12) var<uniform> u_levels: vec2<f32>;  // x black, y white

const PI: f32 = 3.141592653589793;
const LUMA_WEIGHTS: vec3<f32> = vec3<f32>(0.299, 0.587, 0.114);

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
    let size = vec2<i32>(u_image_size);
    let clamped = clamp(p, vec2<i32>(0), size - vec2<i32>(1));
    let index = u32(clamped.y) * u32(size.x) + u32(clamped.x);
    return unpack_rgba(u_pixels[index]);
}

// Equivalente a textureSampleLevel(texture, sampler, uv, 0.0) con filtro
// lineal y clamp-to-edge: interpola los cuatro texels vecinos.
fn sample_image(uv: vec2<f32>) -> vec4<f32> {
    let texel = uv * u_image_size - vec2<f32>(0.5);
    let base = floor(texel);
    let f = fract(texel);

    let p00 = load_pixel(vec2<i32>(base));
    let p10 = load_pixel(vec2<i32>(base + vec2<f32>(1.0, 0.0)));
    let p01 = load_pixel(vec2<i32>(base + vec2<f32>(0.0, 1.0)));
    let p11 = load_pixel(vec2<i32>(base + vec2<f32>(1.0, 1.0)));

    let top = mix(p00, p10, f.x);
    let bottom = mix(p01, p11, f.x);
    return mix(top, bottom, f.y);
}

fn luminance(rgb: vec3<f32>) -> f32 {
    return dot(rgb, LUMA_WEIGHTS);
}

// Devuelve 1.0 si la posición tiene tinta (alfa opaco y luminancia igual o
// superior al black point) y 0.0 en caso contrario. Fuera de la imagen no hay
// tinta, así que el choke también erosiona el contorno exterior del diseño.
fn sample_ink_at_canvas(
    canvas_pos: vec2<f32>,
    origin: vec2<f32>,
    displayed: vec2<f32>,
    black_point: f32
) -> f32 {
    let local = canvas_pos - origin;
    if (local.x < 0.0 || local.y < 0.0 || local.x >= displayed.x || local.y >= displayed.y) {
        return 0.0;
    }

    let uv = local / displayed;
    let source = sample_image(uv);
    let has_alpha = source.a >= 0.5;
    let has_ink = luminance(source.rgb) >= black_point;
    return select(0.0, 1.0, has_alpha && has_ink);
}

@fragment
fn main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    // `u_offset` compensa el recorte virtual que svader aplica a canvas grandes.
    let pos = frag_coord.xy + u_offset;
    let canvas_size = u_resolution;

    // Ajuste "contain": la imagen se ve completa y centrada, sin deformarse.
    let image_size = max(u_image_size, vec2<f32>(1.0));
    let fit = min(canvas_size.x / image_size.x, canvas_size.y / image_size.y);
    let displayed = image_size * fit;
    let origin = (canvas_size - displayed) * 0.5;

    // La rejilla se expresa primero en píxeles de salida (dpi / lpi) y luego se
    // escala al tamaño que ocupa la imagen en el canvas de preview. Así el LPI
    // aparente del preview coincide con el de la exportación a resolución real.
    let output_cell = max(u_dpi / max(u_lpi, 1.0), 1.0);
    let cell = max(output_cell * fit, 1.0);
    let centered = pos - canvas_size * 0.5;
    let rotated = rotate2d(centered, u_angle);
    let cell_pos = rotated / cell;
    let cell_local = fract(cell_pos) - vec2<f32>(0.5);
    let dist = length(cell_local) * cell;

    // La rejilla y sus derivadas se calculan antes de cualquier rama no uniforme.
    // WGSL exige que fwidth() se ejecute en flujo de control uniforme.
    // El ancho mínimo de 0.75 px evita puntos con bordes duros.
    let aa = max(fwidth(dist), 0.75);

    let local = pos - origin;
    if (local.x < 0.0 || local.y < 0.0 || local.x >= displayed.x || local.y >= displayed.y) {
        return vec4<f32>(0.0);
    }

    let uv = local / displayed;
    let source = sample_image(uv);
    let lum = luminance(source.rgb);

    // Black point: con 0.0 no se recorta nada. Para eliminar un fondo negro,
    // hay que subir el nivel hasta que su luminancia quede por debajo.
    if (source.a <= 0.0 || lum < u_levels.x) {
        return vec4<f32>(0.0);
    }

    // White point: remapea el rango útil antes de aplicar el contraste y la trama.
    let range = max(u_levels.y - u_levels.x, 0.0001);
    let adjusted = clamp((lum - u_levels.x) / range, 0.0, 1.0);
    let luma = clamp((adjusted - 0.5) * u_contrast + 0.5, 0.0, 1.0);

    // Más oscuro -> punto más grande. El área del círculo crece de forma
    // proporcional a la cobertura, con un tope en la diagonal de la celda.
    let coverage = 1.0 - luma;
    let dot_radius = min(cell * sqrt(coverage / PI), cell * 0.70710678);
    let dot_mask = 1.0 - smoothstep(dot_radius - aa, dot_radius + aa, dist);

    // Desvanece los puntos en zonas casi blancas para evitar un punto tenue
    // residual en el centro de cada celda cuando el radio tiende a cero.
    let coverage_fade = smoothstep(0.0, 0.01, coverage);

    // En negros casi puros, rellena las esquinas que dejan los círculos para
    // garantizar un negro sólido en la salida DTF.
    let solid_black = 1.0 - smoothstep(0.0, 0.03, luma);
    let ink_alpha = max(dot_mask * coverage_fade, solid_black) * source.a;

    // ------------------------------------------------------------------------
    // PASADA DE UNDERBASE: blanco solo bajo tinta visible, con choke
    // ------------------------------------------------------------------------
    if (u_mode == 1u) {
        if (u_underbase_active == 0u || ink_alpha <= 0.01) {
            return vec4<f32>(0.0);
        }

        // El choke se define en píxeles de salida; en preview se escala con el
        // mismo factor que la trama para conservar la apariencia.
        let choke_px = u_choke_px * fit;
        if (choke_px > 0.0) {
            let diagonal = choke_px * 0.70710678;
            var min_ink = 1.0;

            // 8 vecinos a la distancia del choke. Si cualquiera queda fuera de
            // la tinta (o de la imagen), el píxel actual deja de ser blanco.
            min_ink = min(min_ink, sample_ink_at_canvas(
                pos + vec2<f32>(choke_px, 0.0), origin, displayed, u_levels.x));
            min_ink = min(min_ink, sample_ink_at_canvas(
                pos + vec2<f32>(-choke_px, 0.0), origin, displayed, u_levels.x));
            min_ink = min(min_ink, sample_ink_at_canvas(
                pos + vec2<f32>(0.0, choke_px), origin, displayed, u_levels.x));
            min_ink = min(min_ink, sample_ink_at_canvas(
                pos + vec2<f32>(0.0, -choke_px), origin, displayed, u_levels.x));
            min_ink = min(min_ink, sample_ink_at_canvas(
                pos + vec2<f32>(diagonal, diagonal), origin, displayed, u_levels.x));
            min_ink = min(min_ink, sample_ink_at_canvas(
                pos + vec2<f32>(diagonal, -diagonal), origin, displayed, u_levels.x));
            min_ink = min(min_ink, sample_ink_at_canvas(
                pos + vec2<f32>(-diagonal, diagonal), origin, displayed, u_levels.x));
            min_ink = min(min_ink, sample_ink_at_canvas(
                pos + vec2<f32>(-diagonal, -diagonal), origin, displayed, u_levels.x));

            if (min_ink < 0.5) {
                return vec4<f32>(0.0);
            }
        }

        return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    }

    // ------------------------------------------------------------------------
    // PASADA DE COLOR: color original o negro, con alfa premultiplicado
    // ------------------------------------------------------------------------
    if (u_color_mode == 0u) {
        return vec4<f32>(source.rgb * ink_alpha, ink_alpha);
    }
    return vec4<f32>(0.0, 0.0, 0.0, ink_alpha);
}
