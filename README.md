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

- Rejilla AM configurable mediante LPI, DPI y ángulo, con presets de partida (25/35/45 LPI y 22,5°/45°).
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

La escala **Ajustar** adapta la imagen al panel; **100 %** muestra un píxel lógico por píxel CSS y permite paneo arrastrando dentro de la vista.

La vista **Comparar** superpone el original y el resultado con un divisor arrastrable; ambos lados comparten la misma resolución de preview y posición. También puede moverse el divisor con las flechas del teclado.

Se pueden descargar PNG transparentes de color y underbase, además de un composite sobre el color de camiseta seleccionado. **Color** es la separación de tinta (sin blanco ni choke); **Base blanca** aplica el estilo de base y el choke; **Composite** combina ambos. Las descargas se habilitan cuando la imagen actual terminó de cargarse. El nombre del archivo incluye polaridad y ajustes tonales; choke y estilo de base solo aparecen cuando afectan a la capa exportada. El DPI controla la geometría de la trama y se guarda como metadatos físicos (pHYs) en el PNG. Si la GPU debe reducir los píxeles, se conservan el tamaño físico y el LPI bajando el DPI efectivo; la app muestra un aviso y el archivo declara ambos DPI.

La demo incorpora rampas tonal y de alfa, parches de cobertura, color, texto y transparencia para comparar cambios del motor.

## Calibración DTF

El botón **Hoja de calibración** genera una lámina con degradado, escala de **tono de entrada (0–100 %)**, círculos, líneas finas, tipografía, color sólido y transparencia usando los ajustes actuales. Los patrones y la transparencia respetan la polaridad Luces/Sombras. Reúne en un solo PNG las separaciones Color, Base blanca (si está activa) y Composite; las etiquetas se dibujan después del semitono para que no se tramaden. El PNG conserva el DPI mediante pHYs. La hoja reutiliza una sola sesión WebGPU para todos los paneles y muestra el tiempo de generación al terminar.

Sirve para validar físicamente la pérdida de puntos en luces, el cierre de sombras, la legibilidad y la correspondencia entre blanco y color después de aplicar polvo, curar, prensar y lavar.

**Hoja para RIP** genera una sola placa de color transparente de 4 × 5,33″ (1200 × 1599 px a 300 DPI), sin fondos de simulación ni base blanca. Está pensada para RIP que generan la underbase desde el alfa y conserva las etiquetas sólidas después del semitono.

## Alcance de producción

KromaStudio genera una trama artística en el PNG; no sustituye el screening, los perfiles ICC ni la calibración del RIP. El punto mínimo imprimible y la ganancia de punto deben validarse con la impresora, tinta, película, polvo, curado y prenda reales. Evita aplicar una segunda compensación si el RIP ya la realiza.

## Verificación

`npm run check`, `npm run build` y `npm test`. Las pruebas de Vitest cubren geometría del screen, configuración persistida, empaquetado de polaridad/base, nombres de exportación, calibración y metadatos pHYs. No compilan WGSL ni leen píxeles de la GPU.

Para una comprobación real del render/export, abre **`/qa.html`** con `npm run dev` en un navegador con WebGPU. La página exporta fixtures sintéticos y verifica dimensiones, DPI y pHYs, monotonía y precisión de cobertura en las cinco formas, polaridad, transparencia, alfa, coherencia entre color y underbase, frecuencia real en el raster, DPI efectivo con reducción y la matriz 25/35/45 LPI × 300/600 DPI. Permite descargar un informe JSON. El submit/toBlob de Chromium headless con SwiftShader en Termux tiene limitaciones conocidas, así que esa página debe ejecutarse en un navegador WebGPU real.
