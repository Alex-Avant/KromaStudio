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

- Rejilla AM configurable mediante LPI, DPI y ángulo; defaults de partida 35 LPI y 22,5°.
- Puntos de círculo, elipse, diamante, cuadrado o línea.
- Screen AM por umbral en cada píxel: la posición de las celdas es fija y el tamaño del punto sigue la tonalidad local. Es un modelo AM determinista; no se certifica equivalencia con Photoshop.
- Una muestra de color, luminancia y alfa por píxel para conservar tipografía, líneas finas y contornos.
- Brillo y contraste aditivos (−100…+100), gamma, niveles 0–255, punto mínimo y cobertura máxima.
- Tres modos reales: **Fades Only** conserva regiones cercanas a sólido; **Knockout Shirt** genera huecos alfa en medios tonos; **Full Halftone** aplica la pantalla AM en toda la imagen.
- Polaridad tonal explícita: **Luces imprimen** reproduce el flujo de referencia de Photoshop y **Sombras imprimen** invierte qué extremo tonal forma los puntos, sin invertir los colores ni el alfa.
- El último ajuste se guarda en el navegador; **Restaurar** vuelve a los valores iniciales.
- El punto mínimo se funde suavemente en vez de desaparecer de golpe.
- El alfa fuente modifica el área del punto en vez de crear grandes regiones de tinta semitransparente.
- Filtrado bilinear con RGB premultiplicado y antialiasing basado en derivadas.
- Modo monocromo negro o color original. El modo color es un efecto monocanal, no una separación CMYK.
- Underbase blanco tramado o sólido, choke y spread calculados desde la máscara visible del modo actual.
- Vista de comparación: resultado, imagen original, máscara de impresión y base blanca.
- Registro central de parámetros con rangos, unidades y validación; cuatro presets reproducibles y estado «Modificado»; controles numéricos junto a sliders.
- Presets iniciales: **DTF Standard** (35 LPI), **Fine Detail** (45 LPI), **Vintage** (Knockout, 25 LPI) y **Soft Fade** (35 LPI). Son puntos de partida, no perfiles certificados.

Cuando la trama no se puede resolver en el preview, el shader muestra su cobertura media en lugar de cambiar silenciosamente el LPI. Una exportación que necesita menos de un píxel por celda se rechaza con un error explicativo.

## Preview y exportación

El editor usa un Workspace de tres zonas: navegación (Imagen, Ajustes, Halftone, Separaciones y Exportar), lienzo central con vistas/zoom/comparación e inspector con controles agrupados por responsabilidad. La navegación móvil abre los mismos paneles en una hoja inferior.

El buffer de preview se limita a 2048 px por lado, pero la rejilla usa las dimensiones lógicas originales de la imagen. Preview y exportación conservan así el mismo número y fase de celdas aunque utilicen buffers de muestreo diferentes.

La escala **Ajustar** adapta la imagen al panel; **100 %** muestra un píxel lógico por píxel CSS y permite paneo arrastrando dentro de la vista.

La vista **Comparar** superpone el original y el resultado con un divisor arrastrable; ambos lados comparten la misma resolución de preview y posición. También puede moverse el divisor con las flechas del teclado.

Se pueden descargar PNG transparentes de color y underbase, además de un composite sobre la camiseta seleccionada. **Color** es la placa de tinta; **Base blanca** es la máscara de blanco; **Composite** combina ambas. Exportar permite especificar tamaño físico en pulgadas/cm, DPI, mantener proporción y espejo horizontal. El buffer se remuestrea a las dimensiones físicas solicitadas; pHYs declara el DPI efectivo. Si la GPU reduce píxeles, se conserva el tamaño físico bajando el DPI efectivo. El DPI original no se conserva al decodificar la fuente y se muestra como no disponible; no se inventa. La marca nunca se imprime en los PNG.

Antes de exportar, el **preflight** muestra dimensiones, tamaño físico estimado, porcentaje de alfa y píxeles semitransparentes. Avisa —sin bloquear ni modificar la imagen— cuando una fuente opaca con bordes oscuros puede imprimir ese fondo en modo Sombras, o cuando el tratamiento del alfa parcial depende del RIP.

La demo incorpora rampas tonal y de alfa, parches de cobertura, color, texto y transparencia para comparar cambios del motor.

## Calibración DTF

El botón **Hoja de calibración** genera una lámina con degradado, escala de **tono de entrada (0–100 %)**, círculos, líneas finas, tipografía, color sólido y transparencia usando los ajustes actuales. Los patrones y la transparencia respetan la polaridad Luces/Sombras. Reúne en un solo PNG las separaciones Color, Base blanca (si está activa) y Composite; las etiquetas se dibujan después del semitono para que no se tramaden. El PNG conserva el DPI mediante pHYs. La hoja reutiliza una sola sesión WebGPU para todos los paneles y muestra el tiempo de generación al terminar.

Sirve para validar físicamente la pérdida de puntos en luces, el cierre de sombras, la legibilidad y la correspondencia entre blanco y color después de aplicar polvo, curar, prensar y lavar.

**Hoja para RIP** genera una sola placa de color transparente de 4 × 5,33″ (1200 × 1599 px a 300 DPI), sin fondos de simulación ni base blanca. Está pensada para RIP que generan la underbase desde el alfa y conserva las etiquetas sólidas después del semitono.

## Alcance de producción

KromaStudio genera una trama artística en el PNG; no sustituye el screening, los perfiles ICC ni la calibración del RIP. El punto mínimo imprimible y la ganancia de punto deben validarse con la impresora, tinta, película, polvo, curado y prenda reales. Evita aplicar una segunda compensación si el RIP ya la realiza.

## Verificación

`npm run check`, `npm run build` y `npm test`. Las pruebas cubren geometría/tone modes, parámetros/presets, configuración persistida, dimensiones físicas, nombres de exportación, calibración y metadatos pHYs. No leen píxeles de la GPU.

Para una comprobación real del render/export, abre **`/qa.html`** con `npm run dev` en un navegador con WebGPU. La página exporta fixtures sintéticos y verifica dimensiones, DPI/pHYs, monotonía y cobertura en las cinco formas, polaridad, transparencia, underbase, modos Fades/Knockout/Full, espejo, frecuencia real y redimensionado físico. No certifica equivalencia con Photoshop. Chromium headless con SwiftShader en Termux compila el shader, pero su submit/toBlob tiene limitaciones conocidas; para validar píxeles, ejecútala en un navegador WebGPU real.

## Identidad de marca

Los recursos SVG transparentes están en `public/kromastudio-logo.svg`, `kromastudio-symbol.svg` y `kromastudio-monochrome.svg`. El favicon SVG y los iconos PNG 192/512 alimentan también `manifest.webmanifest`.
