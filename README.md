# KromaStudio

Laboratorio local-first de semitonos para DTF, construido con Svelte 5, TypeScript, Vite, svader y WebGPU. Las imágenes se procesan en el navegador y no se suben a ningún servidor.

## Comandos

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

En Termux, si un script responde `<bin>: not found`, ejecuta npm con `LD_PRELOAD=$PREFIX/lib/libtermux-exec.so`.

## Motor de semitono

- Rejilla AM configurable mediante LPI, DPI y ángulo, con presets de partida (35/45/55/65 LPI y 22,5°/45°).
- Puntos de círculo, elipse, diamante, cuadrado o línea.
- Screen AM por umbral en cada píxel, como Bitmap > Halftone Screen de Photoshop: la posición de las celdas es fija y el tamaño del punto sigue la tonalidad local.
- Una muestra de color, luminancia y alfa por píxel para conservar tipografía, líneas finas y contornos.
- Contraste, niveles, compensación tonal gamma, punto mínimo y sombras sólidas.
- Polaridad tonal explícita: **Luces imprimen** reproduce el flujo de referencia de Photoshop y **Sombras imprimen** invierte qué extremo tonal forma los puntos, sin invertir los colores ni el alfa.
- El último ajuste se guarda en el navegador; **Restaurar** vuelve a los valores iniciales.
- El punto mínimo se funde suavemente en vez de desaparecer de golpe.
- El alfa fuente modifica el área del punto en vez de crear grandes regiones de tinta semitransparente.
- Filtrado bilinear con RGB premultiplicado y antialiasing basado en derivadas.
- Modo monocromo negro o color original. El modo color es un efecto monocanal, no una separación CMYK.
- Underbase blanco tramado o sólido y choke calculados a partir de la misma máscara de puntos que la capa de color.
- Vista de comparación: resultado, imagen original, máscara de impresión y base blanca.
- Controles numéricos editables junto a los sliders, presets y restauración de ajustes; los grupos se pueden plegar.

Cuando la trama no se puede resolver en el preview, el shader muestra su cobertura media en lugar de cambiar silenciosamente el LPI. Una exportación que necesita menos de un píxel por celda se rechaza con un error explicativo.

## Preview y exportación

El buffer de preview se limita a 2048 px por lado, pero la rejilla usa las dimensiones lógicas originales de la imagen. Preview y exportación conservan así el mismo número y fase de celdas aunque utilicen buffers de muestreo diferentes.

La escala **Ajustar** adapta la imagen al panel; **100 %** muestra un píxel lógico por píxel CSS y permite desplazarse por la imagen.

Se pueden descargar PNG transparentes de color y underbase, además de un composite sobre el color de camiseta seleccionado. **Color** es la separación de tinta (sin blanco ni choke); **Base blanca** aplica el estilo de base y el choke; **Composite** combina ambos. Las descargas se habilitan cuando la imagen actual terminó de cargarse. El DPI controla la geometría de la trama y se guarda como metadatos físicos (pHYs) en el PNG.

La demo incorpora rampas tonal y de alfa, parches de cobertura, color, texto y transparencia para comparar cambios del motor.

## Alcance de producción

KromaStudio genera una trama artística en el PNG; no sustituye el screening, los perfiles ICC ni la calibración del RIP. El punto mínimo imprimible y la ganancia de punto deben validarse con la impresora, tinta, película, polvo, curado y prenda reales. Evita aplicar una segunda compensación si el RIP ya la realiza.

## Verificación

`npm run check` y `npm run build` no compilan el WGSL importado como texto. Después de cambiar el shader, valida también `getCompilationInfo()` y la creación del pipeline en un navegador con WebGPU. Las pruebas visuales y de exportación deben hacerse en un navegador WebGPU real; el submit/toBlob de Chromium headless con SwiftShader en Termux tiene limitaciones conocidas.
