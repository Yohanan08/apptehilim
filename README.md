# Tehilim — La Torá Viviente (app)

App web instalable (PWA) con los 150 Salmos + los 5 Salmos de Qumrán, tal como están en tu documento Word:
texto hebreo, fonética, traducción literal, cumplimiento profético en Yeshúa HaMashíaj, conexión con los
Neviím, conexión con el Brit Hadashá, profecías cumplidas, aplicación espiritual, impacto profético y la
oración estilo Mizmor de cada Salmo.

Todo el contenido (155 Salmos) está empaquetado dentro de la app (`data/data.js`), así que **después de
instalarla una vez, funciona sin internet**, en cualquier celular.

## 1. Publicarla (una sola vez, gratis)

Necesitas subir esta carpeta a un hosting con HTTPS para poder instalarla en el celular — igual que hiciste
con bibliotecatora.vercel.app. La opción más simple:

### Opción A — Vercel (recomendada, ya usas esta plataforma)
1. Entra a https://vercel.com (con tu cuenta).
2. "Add New… → Project" → "Deploy" y arrastra esta carpeta completa (`tehilim-app`), o súbela primero a un
   repositorio de GitHub (por ejemplo `Yohanan08/Tehilim`) y luego impórtalo en Vercel.
3. No necesita build command ni framework: elige "Other" / "Static" — Vercel detecta el `index.html`
   automáticamente.
4. Al terminar te da una URL como `tehilim-toraviviente.vercel.app`.

### Opción B — Netlify Drop (sin cuenta ni GitHub)
1. Entra a https://app.netlify.com/drop
2. Arrastra la carpeta `tehilim-app` completa.
3. Te da una URL al instante (puedes crear una cuenta gratis después para conservarla).

### Opción C — GitHub Pages
1. Sube la carpeta a un repositorio (puede ser el mismo estilo que `Yohanan08/Calendario`).
2. Activa GitHub Pages en la rama principal, carpeta raíz.

## 2. Instalarla en el celular (queda sin internet)

Una vez publicada, abre la URL en el navegador del celular:

**Android (Chrome):**
1. Abre el enlace.
2. Toca el menú (⋮) → "Agregar a pantalla de inicio" / "Instalar app".
3. Confirma. Queda como un ícono más, se abre a pantalla completa.

**iPhone (Safari):**
1. Abre el enlace en Safari (tiene que ser Safari, no Chrome, para que iOS permita instalarla).
2. Toca el botón de compartir (el cuadrado con la flecha hacia arriba).
3. "Agregar a pantalla de inicio".

Después de instalarla, ábrela una vez con internet para que termine de guardar todo en el celular
(tarda un par de segundos porque son ~2 MB de contenido). Desde ese momento puedes activar modo avión:
todo — los 155 Salmos completos — sigue funcionando.

## 3. Qué tiene la app

### Novedad: Tarjetas de colores para compartir
- Cada Salmo se abre ahora en **tarjetas de colores** (pestaña *Tarjetas*): porciones cortas de 1 a 3
  versículos, y cada una con su línea **"En Yeshúa HaMashíaj"** tomada del propio estudio.
  1.097 tarjetas en total; cada tarjeta y cada Salmo empiezan en un color distinto.
- **Agrandar**: toca la tarjeta → vista ampliada, con A−/A+ para el tamaño de letra y deslizar para
  pasar a la siguiente.
- **Compartir / Imagen / Enlace**: cada tarjeta se comparte como imagen 1080×1350 (formato para
  WhatsApp, Instagram y Facebook), lleva el enlace directo a esa tarjeta en https://apptehilim.vercel.app/ (`#/salmo/23/t/2`).
- **Descargar Salmo (PDF)**: todas las tarjetas del Salmo en un PDF, en el tema de color elegido:
  *Arcoíris*, *Real* (azul y oro), *Pergamino* o *Aurora*.
- **Firma** al final de cada Salmo (en la app, en el PDF y en el pie de cada imagen):
  *Yohanan ben Israel — compañero de labores en Adonai Yeshúa Melej HaMashíaj* ·
  *Yeshúa — La Torá Viviente, Ministerio Judío Mesiánico*.
- **Porción del día** en la pantalla de inicio.
- La pestaña *Estudio completo* conserva todo lo anterior (hebreo, fonética, voz, copiar, resaltado).

Si cambias `data/data.js`, regenera las tarjetas con:
`node tools/build-cards.js data/data.js data/cards.js`


- **Índice de Salmos** agrupado por los 5 libros tradicionales de Tehilim + Salmos de Qumrán, con buscador
  (por número o por palabra, busca en todo el contenido).
- **Vista de cada Salmo** con las 10 secciones de tu documento en acordeón (el texto hebreo, la fonética y
  la traducción abiertos por defecto; el resto del estudio se despliega al tocarlo). Botones Anterior /
  Siguiente para leer todo el libro seguido.
- **Menú lateral** con la Introducción del libro y la Bibliografía/créditos, tal como aparecen en tu Word.
- Colores y estilo tomados de tu identidad ya establecida del ministerio (navy / oro / marfil).

## 4. Si en algún momento actualizas el texto del Word

Vuelve a pasarme el `.docx` actualizado y regenero `data/data.js`; el resto de la app no cambia.

## Estructura del proyecto

```
index.html        página principal (una sola página, navegación por rutas internas)
manifest.json      metadatos de instalación (nombre, ícono, colores)
sw.js              service worker: guarda todo en caché para el modo sin conexión
css/style.css      estilos
js/app.js          toda la lógica de la app
data/data.js       el contenido completo de los 155 Salmos (extraído de tu Word)
data/cards.js      las porciones cortas de cada Salmo + conexión con Yeshúa (generado)
js/share.js        dibujo de imágenes, PDF y compartir (sin internet)
fonts/             tipografías incluidas (Cormorant Garamond, Montserrat, Frank Ruhl Libre — licencia OFL)
tools/             script que genera data/cards.js
img/logo.png       tu logo del ministerio
icons/             íconos de la app para el celular
```
