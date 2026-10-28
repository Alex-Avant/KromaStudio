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
//   u_mode = 0 -> capa de color: puntos negros sobre transparente.
//   u_mode = 1 -> capa de underbase: blanco puro donde la máscara alfa
//                 erosionada sigue siendo opaca.
// ============================================================================

@group(0) @binding(0) var<uniform> u_resolution: vec2<f32>;
@group(0) @binding(1) var<uniform> u_lpi: f32;
@group(0) @binding(2) var<uniform> u_angle: f32;      // radianes
@group(0) @binding(3) var<uniform> u_contrast: f32;
@group(0) @binding(4) var<uniform> u_choke: f32;      // píxeles del canvas
@group(0) @binding(5) var<uniform> u_underbase: f32;  // 0.0 | 1.0
@group(0) @binding(6) var<uniform> u_mode: f32;       // 0 color, 1 underbase
@group(0) @binding(7) var<uniform> u_image_size: vec2<f32>;
@group(0) @binding(8) var<uniform> u_dpi: f32;
@group(0) @binding(9) var<storage, read> u_pixels: array<u32>;
@group(0) @binding(10) var<uniform> u_offset: vec2<f32>;

const PI: f32 = 3.141592653589793;

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

// Muestrea el alfa de la imagen en una posición del canvas. Devuelve 0 fuera
// de la imagen para que el choke también erosione el contorno exterior.
fn sample_alpha_at_canvas(
    canvas_pos: vec2<f32>,
    origin: vec2<f32>,
    displayed: vec2<f32>
) -> f32 {
    let local = canvas_pos - origin;
    if (local.x < 0.0 || local.y < 0.0 || local.x >= displayed.x || local.y >= displayed.y) {
        return 0.0;
    }

    let uv = local / displayed;
    let pixel = vec2<i32>(floor(uv * u_image_size));
    return load_pixel(pixel).a;
}

@fragment
fn main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    // `u_offset` compensa el recorte virtual que svader aplica a canvas grandes.
    let pos = frag_coord.xy + u_offset;
    let canvas_size = u_resolution;

    // La rejilla y sus derivadas se calculan antes de cualquier rama no uniforme.
    // WGSL exige que fwidth() se ejecute en flujo de control uniforme.
    let cell = max(u_dpi / max(u_lpi, 1.0), 1.0);
    let centered = pos - canvas_size * 0.5;
    let rotated = rotate2d(centered, u_angle);
    let cell_pos = rotated / cell;
    let cell_local = fract(cell_pos) - vec2<f32>(0.5);
    let dist = length(cell_local) * cell;
    let aa = max(fwidth(dist), 0.0001) * 0.75;

    // Ajuste "contain": la imagen se ve completa y centrada, sin deformarse.
    let image_size = u_image_size;
    let fit = min(canvas_size.x / image_size.x, canvas_size.y / image_size.y);
    let displayed = image_size * fit;
    let origin = (canvas_size - displayed) * 0.5;
    let local = pos - origin;

    if (local.x < 0.0 || local.y < 0.0 || local.x >= displayed.x || local.y >= displayed.y) {
        return vec4<f32>(0.0);
    }

    let uv = local / displayed;

    // ------------------------------------------------------------------------
    // PASADA DE UNDERBASE
    // ------------------------------------------------------------------------
    if (u_mode > 0.5) {
        if (u_underbase < 0.5) {
            return vec4<f32>(0.0);
        }

        // Erosión de la máscara alfa. radius = 1 -> kernel 3x3; radius = 2 -> 5x5.
        let radius = i32(round(clamp(u_choke, 0.0, 2.0)));
        var min_alpha = 1.0;

        for (var dy = -radius; dy <= radius; dy += 1) {
            for (var dx = -radius; dx <= radius; dx += 1) {
                let neighbor = pos + vec2<f32>(f32(dx), f32(dy));
                min_alpha = min(
                    min_alpha,
                    sample_alpha_at_canvas(neighbor, origin, displayed)
                );
            }
        }

        // Blanco puro sólo si todo el kernel sigue siendo opaco.
        if (min_alpha >= 0.5) {
            return vec4<f32>(1.0, 1.0, 1.0, 1.0);
        }
        return vec4<f32>(0.0);
    }

    // ------------------------------------------------------------------------
    // PASADA DE COLOR: semitono negro
    // ------------------------------------------------------------------------
    let source = sample_image(uv);
    var luma = dot(source.rgb, vec3<f32>(0.299, 0.587, 0.114));
    luma = clamp((luma - 0.5) * u_contrast + 0.5, 0.0, 1.0);

    // Más oscuro -> punto más grande. El área del círculo crece de forma
    // proporcional a la cobertura, con un tope en la diagonal de la celda.
    let coverage = 1.0 - luma;
    let dot_radius = min(cell * sqrt(coverage / PI), cell * 0.70710678);
    let dot_alpha = 1.0 - smoothstep(dot_radius - aa, dot_radius + aa, dist);

    // Desvanece los puntos en zonas casi blancas para evitar un punto tenue
    // residual en el centro de cada celda cuando el radio tiende a cero.
    let coverage_fade = smoothstep(0.0, 0.01, coverage);

    // En negros casi puros, rellena las esquinas que dejan los círculos para
    // garantizar un negro sólido en la salida DTF.
    let solid_black = 1.0 - smoothstep(0.0, 0.03, luma);
    let alpha = max(dot_alpha * coverage_fade, solid_black);

    // El alfa original recorta la forma (agujeros, bordes suaves, etc.).
    return vec4<f32>(0.0, 0.0, 0.0, alpha * source.a);
}
