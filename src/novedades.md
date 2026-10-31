# Novedades

## 7.9.0 — 2026-10-31

### Nuevo
- **El sintonizador tiene una tecla para cada banda:** FM1, FM2, FM3 y AM debajo de BAND (donde decía STANDBY), con la que está en uso prendida. Un toque va a la memoria de esa banda y prende el sintonizador si estaba apagado. BAND las sigue recorriendo.
- **La perilla muestra la frecuencia.** Las radios más escuchadas del país vienen de Radio Browser sin posición en el dial: el sintonizador la saca del nombre de la radio cuando está ahí ("La 100 - 99.9 FM", "Radio 10 AM 710"), en la escala de FM o AM, con la aguja.
- **Una radio solo por internet escribe su nombre en grande** donde van los números (80s80s, las de FM3, o una sintonizada que no tiene frecuencia en el nombre) en lugar de guiones.

### Arreglos
- La perilla de sintonía mostraba un recuadro de foco al tocarla.

## 7.8.9 — 2026-10-31

### Arreglos
- **Las teclas del sintonizador no hacían nada en Windows.** El marco de metal del rack sirve para mover la ventana (una zona de arrastre), y solo los módulos quedan afuera de esa zona: el sintonizador, que es una unidad aparte, no, así que Windows tomaba sus clics como arrastrar la ventana. Ahora se puede tocar.
- Una radio cuyo stream no contesta se da por perdida a los 12 s en lugar de esperar para siempre, y una dirección guardada que falla se vuelve a buscar una vez en Radio Browser antes de decir que la radio no responde.

## 7.8.8 — 2026-10-31

### Arreglos
- **El diseño del sintonizador se había perdido en la 7.8.7** (una edición posterior de los estilos lo cortó): el DT-90 quedaba con su alto completo y empujaba el rack más allá del borde de la ventana (las memorias 1–6 fuera de alcance), y `9` / VER → RADIO no lo escondían. Ahora se achica con la ventana y se esconde.
- **Deck 90 se seguía a sí mismo como "el reproductor de la PC":** mientras sonaba la radio, Windows mostraba a Deck 90 como reproductor, el puente lo tomaba como lo que suena en la PC y el título de la ventana (el tema más " · Deck 90") volvía como el tema, cada vez más largo. Ahora la sesión propia de Deck 90 queda afuera, y Windows muestra el nombre de la radio.
- Lo que hace la radio (la radio que suena, o por qué una no arrancó) queda escrito en media.log.

## 7.8.7 — 2026-10-31

### Nuevo
- **Un sintonizador de radio en el rack: el DT-90** (VER → RADIO, o `9`). Una unidad hi-fi debajo de los medidores, con display VFD (banda, memoria, la frecuencia en 7 segmentos, STEREO/MONO/TUNED, señal, niveles L/R y una línea de matriz de puntos con la radio) y un dial analógico con aguja que se desliza hasta la emisora. Es la misma radio del estéreo del auto: las mismas emisoras, bandas (FM1–FM3, AM) y memorias. POWER la prende (y pausa lo que sonaba en la PC; al apagarla vuelve), BAND cambia de banda, ◀ ▶ y la perilla recorren las más escuchadas del país, 1–6 son las memorias (mantené 1 s, o MEMO y el número, para guardar la que suena), SCAN prueba cada una 8 s, MODE muestra AUTO/MONO y DISP la radio, la hora o la temperatura. Una radio solo por internet muestra guiones en el dial. El frente sigue al chasis del rack (plata, negro, champagne). Los looks y su rotación no lo tocan. Si abrís el estéreo con la radio prendida, sigue ahí; si cerrás el estéreo con la radio prendida, sigue sonando en el sintonizador.
- **SDM tiene 28 estilos:** doce más después de AQUA: COBALTO (azul profundo, letras blanco azulado), LIMA, ROSA, VIOLETA, FUEGO (letras naranja, vúmetros rojos), MATRIX (fósforo verde de terminal), ATARDECER (violeta oscuro, letras naranja, vúmetros rosa), NIXIE (el naranja de los tubos nixie), OLED (negro puro, blanco frío, vúmetros azules), LCD AZUL (LCD con luz azul y letras blancas), LCD ÁMBAR (LCD con luz ámbar y letras oscuras) y BICOLOR (letras amarillas, carteles celestes, vúmetros verdes).

## 7.8.6 — 2026-10-31

### Cambios
- **El estéreo baja el volumen rápido.** VOL ▼ (y la rueda para abajo) baja tres pasos del volumen de Windows de una (6 %); VOL ▲ sigue subiendo de a uno (2 %), como en un auto. Manteniendo VOL ▲ o ▼ apretado, se repite cada 0,1 s.

### Arreglos
- Las teclas de volumen tardaban: el puente de Windows tomaba un comando cada 0,4 s, después de leer el reproductor. Ahora las aprieta apenas llegan (una ráfaga de una) y responde cualquier comando sin esperar esos 0,4 s.

## 7.8.5 — 2026-10-31

### Nuevo
- **SDM tiene 16 estilos:** los seis colores y HD quedan como estaban, y se suman nueve estilos completos, cada uno con su vidrio, sus letras, sus carteles y sus vúmetros: ÁMBAR (negro, ámbar de los 80), HIELO (azul noche, celeste de VFD), VERDE NOCHE, ROJO SPORT, BLANCO, LCD CLARO (vidrio claro con letras oscuras, como un LCD positivo), MIAMI (violeta, letras rosas, vúmetros celestes), ORO y AQUA. Cada toque dice cuál es; manteniendo SDM un segundo vuelve al anterior.

## 7.8.4 — 2026-10-31

### Nuevo
- **FM2 y FM3 vienen completas, por género.** FM2 es Buenos Aires: Con Vos 89.9, Nacional Clásica 96.7 (clásica), Blackie 89.1 (jazz), Delta 90.3 (electrónica), Blue 100.7 (los 80 y 90) y Nacional Rock 93.7. FM3 son los mismos géneros del mundo, solo por internet: Radio Swiss Classic, Radio Swiss Jazz, Ibiza Global Radio, Heart 80s (Londres), SomaFM Groove Salad (chill) y Radio Paradise. Si ya lo tenías configurado, se cargan en las memorias vacías; una radio que guardaste a mano ahí se queda.

## 7.8.3 — 2026-10-31

### Cambios
- **Con un CD, los números son sus pistas:** 1–6 ponen las pistas 1 a 6 y, manteniéndolos apretados un segundo, la 7 a la 12 (los números impresos arriba de las teclas). En un disco con MP3, sus archivos. En RADIO siguen siendo las memorias.
- **En AM el display prende MONO** (STEREO se apaga), como suena una AM; FM, el CD y la PC quedan en STEREO.
- **HDB tiene un brillo más alto:** NORMAL → ALTO → MEDIO → BAJO, y el display dice cuál quedó.
- **SDM tiene un séptimo modo, HD:** el vidrio pasa a negro y las letras a amarillo, como un display de gama alta. Los otros seis colores siguen.
- **Los vúmetros del estéreo tienen la forma de los del DP940 real:** columnas curvas que van escalando de adentro hacia afuera (las filas de abajo largas, metiéndose debajo de TRACK, las de arriba cortas), en lugar de tres columnas parejas. Los últimos cinco escalones van amarillo, ámbar y rojo, en todos los colores (tal cual en el color 1 y en HD).
- **Un amarillo más intenso en el display del estéreo:** las letras de 16 segmentos y los carteles prendidos son de un amarillo saturado y un poco más gruesos, como en el vidrio real.

### Arreglos
- **Saltar pistas del CD:** apretar TRACK ▶ varias veces rápido avanzaba una sola (cada toque contaba desde la pista que la lectora todavía informaba), y la lectora se seguía solo mientras decía 'playing', así que un salto que quedaba en 'seeking' dejaba el display trabado. Ahora cada toque cuenta desde la pedida y se ve enseguida, el puente sigue a la lectora mientras busca, los extremos del disco dan la vuelta (▶ en la última va a la primera, ◀ en la primera a la última) y se saltean las pistas de datos.

## 7.8.2 — 2026-10-31

### Cambios
- **Cambiar de modo en el estéreo pausa lo que estaba sonando.** Al pasar de PC a RADIO o CD se pausa el tema del reproductor (Spotless, o el que esté sonando); al salir de RADIO se apaga la radio; al salir de CD se pausa el disco. Al volver, sigue: el tema continúa, el CD sigue donde estaba y la radio vuelve a sintonizar la misma emisora (en vivo). Una memoria (1–6) o SCAN desde otro modo hace lo mismo.

## 7.8.1 — 2026-10-31

### Cambios
- **Los vúmetros del estéreo se mueven mucho más.** Seguían a las agujas del VU (lentas, unos 300 ms, y calibradas para que un master fuerte quede cerca del tope): ahora leen cada ~40 ms de sonido y lo muestran alrededor del volumen propio de la música de los últimos segundos, con una subida rápida y una caída corta, así saltan con los golpes y bajan en los momentos tranquilos, sea cual sea el volumen del tema. Solo en el estéreo: los del rack quedan como están.

## 7.8.0 — 2026-10-31

### Nuevo
- **El estéreo pasa CDs: modo CD** (MODE ahora va PC → RADIO → CD, o tocá la ranura del CD). En Windows, Deck 90 encuentra la lectora de CD/DVD de la PC (también una por USB):
  - **Un CD de audio** suena desde la misma lectora (el CD de audio de Windows), y arranca solo como en un estéreo de auto cuando entra el disco. TRACK ◀ ▶ cambia de pista (◀ en los primeros segundos de una pista va a la anterior), SEL pausa y reproduce, y el display muestra TRACK 03, las pistas y la duración del disco, y el tiempo; los vúmetros siguen su sonido.
  - **Un CD o DVD con MP3** (o M4A, OGG, FLAC, WAV) reproduce sus archivos acá, uno tras otro, con el nombre de cada uno en el display.
  - **⏏ abre la bandeja.** Ahora es PWR el que vuelve al rack.
  - Sin lectora, sin disco o con un disco sin música, el display lo dice (SIN LECTORA, NO DISC, SIN AUDIO).

- **DISP muestra la hora y la temperatura**, en todos los modos (PC, RADIO y CD): pasa por normal → hora → temperatura (el clima del encabezado, con la ciudad y la máxima y mínima abajo) → BPM → loudness. La línea de abajo sigue diciendo qué suena.
- **AM en la radio:** BAND ahora va FM1 → FM2 → FM3 → AM, con seis AM de Buenos Aires por internet: Mitre 790, Radio 10 710, Continental 590, Rivadavia 630, Radio Nacional 870 y La Red 910 (24 memorias en total).

### Cambios
- FM1-6 ahora es Vorterix 92.1 (antes, Los 40).

## 7.7.0 — 2026-10-31

### Nuevo
- **ESTÉREO: Deck 90 como un estéreo de auto, con radio por internet.** La tecla `E` (o el botón nuevo de la radio en las herramientas, o la bandeja) cierra el rack y la ventana pasa a ser el frente de un estéreo DP940: la foto del frente completo con el display de 16 segmentos en vivo sobre su LCD y una tecla sobre cada botón. Es una ventana tipo tira, con su propio tamaño y lugar, siempre arriba como la tira mini.
  - **Modo PC:** el tema con letras de 16 segmentos (se desplaza si es largo), el artista y el tiempo, y los vúmetros L/R con el sonido real; en pausa o detenido, la pantalla de radio. DISP: tema, BPM, loudness u hora.
  - **Modo RADIO** (MODE): radios por internet, buscadas por nombre en Radio Browser (radio-browser.info, gratis; solo se envía el nombre que se busca) y reproducidas por el programa, así los vúmetros las siguen. FM1 viene con Aspen 102.3, 80s80s (de Hamburgo, solo por internet: no tiene dial, el display muestra su nombre), Metro 95.1, Rock & Pop 95.9, La 100 99.9 y Los 40 105.5 en 1–6, y Con Vos 89.9 en FM2-1; TUNE ◀ ▶ recorre las radios más escuchadas de Argentina, SCAN pasa 8 s de cada una, mantener apretado 1–6 un segundo guarda ahí la que suena, BAND da FM1, FM2 y FM3 (18 memorias). La pantalla de radio muestra la frecuencia (o el nombre), la memoria y la emisora.
  - **Las demás teclas:** VOL ▲ ▼ (o la rueda del mouse en cualquier parte del frente) es el volumen de Windows, ATT silencia, SEL reproduce o pausa (la radio, o el tema del reproductor), TRACK ◀ ▶ salta temas en modo PC, SDM cambia el color del display (seis) y HDB su brillo, PWR o ⏏ vuelven al rack (y apagan la radio). La luz AUX se prende mientras suena algo.
  - El display es el módulo DP940 hecho para Deck 90 (`src/vendor/dp940-display.js`), con dos agregados chicos para que sus vúmetros y el nombre de la radio también funcionen en la pantalla de radio.
- Las memorias de radio viajan en la copia de los ajustes.

## 7.6.1 — 2026-10-30

### Arreglos
- A veces, al arrancar, el primer aviso del reproductor llegaba antes de que la página terminara de cargar y daba un error (el tema aparecía un momento después). Ahora espera a la página y se muestra enseguida.

## 7.6.0 — 2026-10-30

### Nuevo
- **Modo vidriera: los looks rotan solos.** ↻ ROTAR, al lado de GUARDAR en LOOKS (o la tecla `R`), abre un menú chico: prendido o apagado, cada 1, 3, 5 o 10 minutos, y cuáles: los diez de fábrica (los dos de cada número), tus C1–C3 o todos. El rack pasa al siguiente con un fundido corto y te dice el nombre. Solo cuenta el tiempo de música: con el tema en pausa, en la tira mini, con la cinta grande sola, la ventana escondida o un menú abierto, se queda quieto. Un look que elegís a mano tiene su turno completo; se recuerda con tus ajustes (y en su copia).
- Formularios en español en GitHub para contar un problema o proponer una idea.

### Cambios
- Un GIF nuevo arriba del README: la consola, un vúmetro elegido por su foto y un look que cambia con el fundido.

## 7.5.2 — 2026-10-30

### Cambios
- **Los ajustes ⚙ quedan parejos.** El reloj y la ciudad comparten una fila en PANTALLA (OFF · HORA · + CLIMA y la ciudad al lado) y EXTRAS queda con el celular y la copia de los ajustes: los cuatro bloques quedan de a pares, tres y tres, dos y dos. Van de a dos hasta 1650 px de ancho (antes se ponían los cuatro en fila desde 1300 y las filas de la fuente y del reloj quedaban apretadas), y de a cuatro con más ancho, cada par de la misma altura. Los avisos del clima te mandan a ⚙ → PANTALLA → RELOJ.

## 7.5.1 — 2026-10-30

### Nuevo
- **Un instalador de Windows** además del zip: `Deck-90-…-setup.exe` instala Deck 90 para tu usuario, sin pedir permisos de administrador, en `%LOCALAPPDATA%\Programs\Deck 90` (una carpeta donde se puede actualizar solo con INSTALAR), con su acceso en el menú Inicio, un ícono en el escritorio si querés y un desinstalador en Configuración → Aplicaciones que también saca lo de "Arrancar con Windows" (tus ajustes quedan). El instalador de cada versión se arma y se prueba en Windows: se instala, arranca y se desinstala.

## 7.5.0 — 2026-10-30

### Nuevo
- **Una bienvenida la primera vez que se abre** (tres pasos): de dónde escucha Deck 90 (la PC, el micrófono o la DEMO), los cinco looks con su foto para probarlos en el rack de atrás, y dos extras: la ciudad para el clima y el QR de la pantalla en el celular. Aparece una sola vez; ⓘ → VER LA BIENVENIDA la vuelve a mostrar.
- **Una copia de tus ajustes en un archivo**: ⚙ → EXTRAS → AJUSTES → GUARDAR COPIA guarda el look que tenés en pantalla, tus C1–C3, el reloj y la ciudad; CARGAR (tocalo dos veces, porque reemplaza lo que tenés) lo trae de vuelta, para otra PC o después de reinstalar. El historial de temas se exporta aparte, a Excel.

### Cambios
- **Una consola más prolija.** La cara del VU y el estilo del espectro ahora son un botón cada uno, con la foto y el nombre del que estás usando; al tocarlo se abren todos con su foto (sacada de los propios displays) y una línea que lo describe. `V` y `T` los siguen recorriendo. Arriba quedan VU, ESPECTRO y VER; abajo, LOOKS (los presets) y las herramientas.
- **Los ajustes ⚙ en cuatro bloques**: SONIDO (fuente, calibración 0 VU, SENS), PANTALLA (marco y tono), CASETERA Y CINTA, y EXTRAS (celular, reloj y la ciudad, que ahora tiene su propio campo). Las etiquetas en una columna y los botones de cada fila del mismo ancho; en ventanas de menos de 1300 px van de a dos bloques.
- Íconos dibujados para las herramientas (ajustes, historial, solo la cinta, modo mini, esconder, pantalla completa, acerca de) en vez de símbolos de texto que se veían distinto en cada PC.
- La letra de la consola es la condensada de las caseteras en lugar de la Courier, más grande y fácil de leer, y un solo código de colores: dorado para lo elegido, azul para los módulos que se ven, verde para la fuente que está escuchando.
- Todo lo que se toca está en español: ESPECTRO y CASETERA en VER, LOOKS para los presets; cada botón de módulo dice su tecla. Los avisos del clima te mandan a ⚙ → EXTRAS → CIUDAD.

## 7.4.1 — 2026-10-29

### Nuevo
- **ⓘ ACERCA DE / NOVEDADES** (el botón ⓘ al lado de ⛶, la tecla `I`, o "Acerca de Deck 90 y novedades" en la bandeja): la versión, qué es Deck 90, los links a GitHub, un botón BUSCAR ACTUALIZACIONES, todas las teclas y lo que cambió en cada una de las 43 versiones, de la más nueva a la primera (la tuya marcada LA TUYA). Se abre sola una vez después de cada actualización.

### Arreglos
- **DÚO, LED CIAN y LED VERDE podían mostrar solo el canal izquierdo** cuando el panel del VU no era ancho (espectro y OSC escondidos, una ventana angosta): con ellas el panel R se guarda, pero dibujaban los dos solo en un panel ancho. Ahora el panel L muestra siempre los dos: DÚO pone una cara arriba de la otra y los LEDs se paran en dos columnas.
- **Después de STOP esas tres caras quedaban en el último nivel** (agujas arriba, LEDs prendidos) en vez de quedar en reposo como las demás.
- Si pasabas la ventana a una pantalla con otra escala (100 % → 150 %) sin que cambiara de tamaño, los displays podían quedar dibujados a un tamaño equivocado: ahora se vuelve a dimensionar todo para la pantalla nueva.
- FL SPECTRUM y FL SPECTRUM CIAN vuelven a dibujar su nombre y la lámpara PEAK HOLD cuando el panel cambia de alto.
- El tooltip de MÁS ▾ ahora incluye FL SPECTRUM y FL SPECTRUM CIAN.

## 7.4.0 — 2026-10-29

### Nuevo
- **DÚO, una séptima cara de VU** (⚙ → VU → DÚO, o `V`): los dos medidores lado a lado en una sola cara crema ancha y retroiluminada, como el vúmetro de una casetera. Una escala recta de −60 a +3 dB (0 y +3 en rojo) cuyas marcas se inclinan todas hacia el pivote de las agujas, debajo de la ventana; dB bajo cada escala, LEVEL L y LEVEL R, DECK 90 en el medio, todo en un marco negro cepillado con bisel de latón. El panel L ocupa todo el ancho (el R se guarda); en el celular cada medidor se ve por separado.
- **LED CIAN y LED VERDE, caras de VU ocho y nueve**: los dos canales como dos filas de LEDs cuadrados encendidos sobre vidrio negro, de −40 a +3 dB, que pasan a ámbar desde −5 y a rojo arriba de 0, con la escala abajo en el color del medidor. Igual que DÚO, ocupan todo el ancho (y en el celular muestran un medidor cada una).
- **Cada preset favorito tiene un segundo look.** Si apretás 1–5 (F1–F5) mientras su look está en pantalla, pasa al otro, y vuelve: 1 Estudio / Estudio LED, 2 Hi-Fi 90s / Hi-Fi Spectrum (DÚO con FL SPECTRUM), 3 Cinta 70s / Casetera (DÚO, FL 90s y el SO-90 REEL), 4 Vidriera / Vidriera cian (LED CIAN, FL SPECTRUM CIAN y el CD-90), 5 Mastering / Mastering LED (LED VERDE y el espectrograma). El botón se prende con cualquiera de los dos; su tooltip nombra ambos y el mensaje te dice cuál es (1/2, 2/2). Tus C1–C3 quedan exactamente como los guardaste.

### Cambios
- **Los carretes del casete DECK 90 son más chicos y quedan centrados en la ventana**, con margen hasta la etiqueta arriba y hasta el borde de la ventana abajo (se sacaron los carretes propios de la foto, así que solo se ven los que giran).

## 7.3.0 — 2026-10-29

### Nuevo
- **Dos estilos de espectro nuevos, FL SPECTRUM y FL SPECTRUM CIAN** (MÁS ▾): una ventana negra limpia con un filete dorado fino, diecinueve barras, topes de pico naranjas, las bandas nombradas abajo (32 … 16k) y una sola lámpara PEAK HOLD. FL SPECTRUM es verde y pasa a amarillo y naranja cerca del tope; CIAN es turquesa, con los segmentos de arriba de cada barra más pálidos, sea cual sea su altura. Los dos siguen a SENS, y el celular también los puede mostrar (⚙ → COLOR FL → SPECTRUM o CIAN).

### Cambios
- **Con el tema en pausa, el rack deja de dibujar.** Cuando no entra nada y todos los displays se asentaron (las agujas en su tope, las barras y sus picos en el piso, la cinta quieta), los displays quedan como están y dibujar no cuesta nada, hasta que vuelve un sonido, cambia algo en ellos (un tema nuevo, el tiempo en el CD-90), cambia la ventana o tocás cualquier cosa. Lo que se mueve solo sigue moviéndose: un título demasiado largo para su display se desplaza, el espectrograma corre, FL SHOWROOM pasa su demo de vidriera. Cada display en reposo se comparó con un dibujo nuevo del mismo instante: idénticos.
- **El true peak lleva menos de la mitad del trabajo** en el hilo de audio, y nada en silencio. Las lecturas son idénticas bit a bit (verificado muestra por muestra contra la versión anterior sobre medio millón de muestras, y con tonos de prueba).

### Arreglos
- En celulares con pantalla de densidad muy alta, los medidores, el FL y el casete de la pantalla en el celular salían un poco más grandes que su marco (7.2.0) y perdían el borde derecho.

## 7.2.0 — 2026-10-28

### Cambios
- **La misma imagen con más o menos la mitad del trabajo.** Lo que no se mueve en un display ahora se pinta una vez y se copia en cada cuadro, en vez de dibujarse de nuevo sesenta veces por segundo: las caras de VU con sus escalas y números, el vidrio del FL con cada segmento apagado, las fotos del SO-90 y del CD-90, el acero de la casetera y las carcasas de los casetes, los marcos, etiquetas y leyendas. El brillo de un segmento encendido se pinta una vez por color y tamaño y después se estampa, y los displays FL difuminan su brillo en una copia a un cuarto del tamaño, solo sobre las barras encendidas. Cada display conserva su look (cada uno se comparó con la 7.1.3 píxel por píxel).
- Medido en una máquina de prueba lenta sin placa de video, el trabajo por cuadro de una ventana con los vúmetros, FL SHOWROOM y el SO-90 REEL bajó de unos 31 ms a 16 ms, y la página necesita unos 85 MB menos de memoria. Cada display solo: vúmetros 31–50 → 17–18 ms, SO-90 REEL 65 → 24, CD-90 48 → 16, casete CLEAR 35 → 19, casetera 31 → 16, FL SHOWROOM 44 → 34, FL ÁMBAR 49 → 25, LED 80s 36 → 22, LCD 33 → 19.
- **En la bandeja o minimizado no se dibuja nada.** El rack sigue midiendo (LUFS, LRA, BPM, el historial, el celular) pero no pinta lo que nadie ve: en la prueba, el hilo principal pasó de 86 % ocupado a 4 %, y el proceso de gráficos de 25 % a 1 %.
- Como máximo 60 cuadros dibujados por segundo, también en pantallas de 120 y 144 Hz, y 30 después de unos segundos de silencio (un tema en pausa: las agujas en reposo, la cinta quieta). Las mediciones son las mismas: los tonos de prueba de 0 a −55 dBFS leen exactamente igual que antes, EBU 3342 incluido.
- Las lecturas y los LEDs tocan la página solo cuando cambia lo que muestran, y las imágenes fijas que ningún display usó por un rato devuelven su memoria.

## 7.1.3 — 2026-10-28

### Arreglos
- **La tira mini podía terminar tan grande como la ventana normal**, con números de LUFS y TP gigantes (por ejemplo cuando Windows mueve ventanas entre pantallas, o si se arrastraba un borde muy abajo). Ahora la tira nunca pasa de 300 px de alto, la redimensione lo que la redimensione, y sus números chicos mantienen el tamaño a cualquier altura.
- Si la página se vuelve a cargar con la tira activa (después de un tropiezo del driver de video), vuelve como tira.

## 7.1.2 — 2026-10-28

### Cambios
- **La temperatura se queda en ventanas más angostas.** Cuando al display del encabezado le falta lugar, primero se van las palabras del clima, después la fecha, después el ícono del clima y recién ahí la temperatura; el tema cede un poco más de lugar y los separadores se acercan. En una ventana de unos 1080 px de ancho ahora entran el reloj, el tema, el ícono y la temperatura (antes, ahí el clima desaparecía); hasta unos 950 px la temperatura se queda, sin su ícono.

## 7.1.1 — 2026-10-27

### Cambios
- El clima muestra su ciudad al lado de la máxima y la mínima del día (BUENOS AIRES · ↑18° ↓12°), así ves de qué lugar es.
- La tira mini conserva el reloj y el clima hasta donde le da el ancho; una tira angosta le cede al display el lugar del nombre grabado (el LED se queda).

### Arreglos
- La tira mini podía quedar cortada abajo: cuando el encabezado cambia de altura (al prenderse el reloj, al entrar o salir del modo mini), ahora los módulos de abajo se vuelven a dimensionar.
- En una tira mini muy baja, los medidores se quedan dentro de su ventana.
- Capturas nuevas en el README: el encabezado con cinco tipos de clima, una ventana ancha con el CD-90 y la tira mini.

## 7.1.0 — 2026-10-27

### Nuevo
- **Reloj, fecha y clima en el display del encabezado** (con los marcos metálicos). El display ahora ocupa el encabezado entre la marca y el estado. A la izquierda, la hora con los mismos dígitos de 7 segmentos que las caseteras, los dos puntos titilando, con el día y la fecha al lado (MARTES / 27 OCT). El tema sigue centrado en el medio. A la derecha, el clima: un ícono FL (sol o luna, nubes, lluvia, llovizna, tormenta, nieve, niebla), la temperatura en dígitos de 7 segmentos, el cielo en palabras y la máxima y la mínima del día. El display es más alto cuando la ventana lo es.
- **⚙ → RELOJ**: OFF, HORA (solo el reloj) o + CLIMA, y un campo para tu ciudad: escribila y apretá Enter (se busca por nombre y se queda con la primera coincidencia; el nombre completo aparece cuando dejás el mouse sobre el clima). Si hacés clic en el clima, se abre ese campo. Mientras no haya ciudad, el lado del clima te dice cómo configurarla.
- El clima viene de Open-Meteo (gratis, sin cuenta) cada 15 minutos, a través del proceso principal; solo se envía el nombre de la ciudad, una vez, y sus coordenadas. Sin conexión, reintenta cada pocos minutos y oculta los números de más de tres horas.
- Una ventana angosta le guarda lugar al tema: primero se van las palabras del clima, después la fecha, después el clima. En modo mini y con el marco CLÁSICO el encabezado queda como antes.

### Arreglos
- Escribir en un campo del panel ⚙ ya no dispara los atajos de teclado del rack.

## 7.0.1 — 2026-10-27

### Cambios
- **Un panel del CD-90 más ancho cuando el módulo es ancho.** Con el CD-90 debajo de los vúmetros y el espectro (un módulo mucho más ancho que alto), el panel de acero ahora también crece a lo ancho, hasta un 75 % más: una bandeja más larga, teclas 1–8 más anchas y más separadas, más acero entre el LED y TIME. Las letras, los números de las teclas, eject y las esquinas redondeadas mantienen su forma, porque la foto solo se estira en franjas lisas. El display ocupa el resto del ancho, como antes.

## 7.0.0 — 2026-10-27

### Cambios
- **Motor nuevo: Electron 45** (con su Chromium y su Node.js), en lugar de Electron 33, que dejó de recibir parches de seguridad en abril de 2025. Esta versión no puede entrar por INSTALAR: Deck 90 te avisa que "cambia el motor del programa", y hay que bajar una vez el zip completo de Windows y ponerlo en lugar de la carpeta del programa. Los ajustes, los presets y el historial de temas viven en `%APPDATA%\Deck 90` y quedan como están. Las versiones siguientes sobre este motor se vuelven a instalar solas. Los medidores leen igual con el motor nuevo (tonos, un solo canal, fase invertida, EBU Tech 3342).
- **Probado en Windows antes de cada versión.** Cada push ahora también corre en una de las máquinas Windows de GitHub: el puente de "reproduciendo ahora" (que se parsee bien; que siga al reproductor correcto entre sesiones inventadas: primero Spotless cuando suena, después el que ya venía siguiendo, después el actual de Windows; y que arranque de verdad, informe, dé señales de vida y se cierre cuando Deck 90 lo cierra), el programa compilado arrancando una vez, y el actualizador con una instalación normal, una versión nueva que no arranca (vuelve la vieja), un paquete dañado (rechazado antes de escribir nada) y un paquete que necesita motor nuevo (ofrecido como descarga completa). Una versión solo se publica si pasa todo esto.
- Cuando la captura del audio del sistema no puede arrancar, `media.log` ahora dice por qué (por ejemplo "NotReadableError: Could not start audio source").

## 6.16.1 — 2026-10-27

### Cambios
- **Letras más nítidas en el encabezado y en los displays.** El tema y el artista de arriba se dibujaban con la fuente condensada que tuviera la PC (o una genérica de reemplazo), con un brillo ancho y suave que los desdibujaba. Ahora Deck 90 trae la suya: Barlow Condensed, una condensada limpia en el espíritu de un display FL de los 90, dibujada con kerning y un brillo ajustado para que las letras queden nítidas; el título es un poco más grande y la línea del artista, más espaciada. Las mismas letras se usan para PLAY, TRACK, METAL, REEL y las demás palabras de los displays DECK 90, SO-90 REEL y CD-90, en el display del casete dibujado y en el celular.
- **Nombres de temas en matriz de puntos de verdad** en los displays del CD-90 y del SO-90 REEL (Doto), como en los mock-ups, en vez de una fuente de máquina de escribir.
- Capturas nuevas en el README con las letras nuevas, y una del CD-90.

## 6.16.0 — 2026-10-27

### Nuevo
- **El CD-90**, un tercer estilo para el módulo grande CINTA (⚙ → CINTA → CD), con los marcos metálicos. Un panel de CD de acero cepillado sacado del mock-up (bandeja, eject, las ocho teclas de pista con la actual encendida, encendido con su LED, verde mientras suena, TIME y REPEAT) al lado de un display FL: el tiempo del tema, el número de pista (cuenta los temas que sonaron desde que arrancó Deck 90), PLAY / PAUSE / STOP, CD, el calendario de pistas, el tema en letras de matriz de puntos (que se desplazan si es largo), el avance del tema y un espectro en vivo con picos que caen; debajo, las cinco teclas de transporte, que manejan el reproductor. TIME alterna entre tiempo transcurrido y restante; REPEAT prende su indicador; eject solo avisa que el CD-90 únicamente reproduce. El panel sigue la altura, y el display y las teclas ocupan el resto del ancho; un display angosto deja afuera primero el calendario. Con CLÁSICO, o en el celular, lo reemplaza el casete REEL.

## 6.15.0 — 2026-10-27

### Nuevo
- **AZUL INTENSO**, una sexta cara de VU: un azul profundo y saturado, iluminado fuerte desde abajo y más oscuro hacia las esquinas, una escala blanca gruesa, una franja coral, una aguja ámbar que brilla, y sin lectura debajo: el medidor llena su marco. En el panel ⚙ (AZUL INT.), con V, en los presets y en el celular. AZUL queda como estaba.

## 6.14.0 — 2026-10-27

### Cambios
- **Gana el reproductor que está sonando.** Con Spotless abierto pero en pausa, Deck 90 seguía mostrando su tema aunque sonara otro reproductor (un video de YouTube en Chrome, Spotify, Apple Music…). Ahora sigue al que esté sonando: primero Spotless si suena, si no el que ya venía siguiendo, si no el actual de Windows; si no suena nada, Spotless si está abierto. Las teclas de la casetera controlan el reproductor que se muestra.
- **Nombres de temas limpios desde los navegadores.** El título de una pestaña del navegador se convierte en el tema: sin contador de no leídos ("(5)"), sin "- YouTube", sin "(Official Video)", "[Official Audio]", "(Video Oficial)" y similares, y "Artista - Tema" se separa para que el artista no se repita (los canales "… - Topic" o "…VEVO" dan el nombre del artista). En el encabezado, las caseteras, el celular y el historial.

## 6.13.4 — 2026-10-27

### Cambios
- **El tema del encabezado se lee como el display de las caseteras**: con los marcos metálicos, el título va en turquesa brillante, en mayúsculas condensadas en negrita y más grande, con el artista y el álbum debajo en un turquesa más tenue; un título largo se corta con … dentro de su espacio; un tema en pausa se atenúa. El origen (SISTEMA, DEMO…) va en un verde claro y SIG / CLIP toman el color de las etiquetas grabadas, así que todo el encabezado se lee bien en cualquier acabado. En el rack CLÁSICO el tema es más grande y más brillante, en su dorado.

## 6.13.3 — 2026-10-27

### Arreglos
- Medidores de aguja bajos y anchos (CREMA, AZUL, CINTA 70s): "VU" y los signos − / + se chocaban con el arco y la aguja. Ahora se ubican en el espacio que queda debajo del arco, con un tamaño acorde; un medidor diminuto deja "VU" afuera.

### Cambios
- Capturas nuevas en el README: los marcos metálicos, la casetera DECK 90, el SO-90 REEL, las caras de VU con CREMA y los estilos de espectro en el marco nuevo.

## 6.13.2 — 2026-10-27

### Cambios
- Los carretes del SO-90 REEL tienen un dorado más rico y brillante, con más contraste en el metal cepillado.

## 6.13.1 — 2026-10-27

### Cambios
- **El SO-90 REEL es el nuevo diseño de casete**: el casete de aluminio con ventanas transparentes que muestran el interior de la carcasa (guías, rodillos, el recorrido de la cinta), carretes de dorado cepillado natural con carretes blancos (reconstruidos alrededor de sus centros reales, así giran sin bambolearse) sobre los rollos de cinta marrón que cambian de tamaño a medida que avanza el lado, y DECK 90 en serif a lo largo del borde del carrete derecho. El casete mantiene su propio contorno (esquinas redondeadas, escalones laterales). La etiqueta: el lado, el tema, SO-90 REEL.

## 6.13.0 — 2026-10-27

### Nuevo
- **El marco de los medidores.** Con los marcos metálicos, cada cara de VU va en el marco negro de un medidor, con el borde que agarra la luz y la cara detrás de un aro pulido de esquinas redondeadas. Las caras de aguja (AZUL, CINTA 70s, CREMA) tienen el nivel en su propia ventanita de lectura negra debajo de la cara, en números monoespaciados; sus números, marcas y franja roja crecen con el medidor, y un medidor ancho tiene un arco más grande y más plano. STUDIO y HI-FI 90s van dentro del mismo marco con sus propias lecturas. CLÁSICO mantiene el look viejo.
- **CREMA**, una quinta cara de VU: el clásico medidor crema retroiluminado, brillante y parejo, tinta y aguja negras, una franja roja marcada, el nivel en ámbar. En el panel ⚙, con V y en el celular.

### Cambios
- Los carretes del SO-90 son de un dorado más brillante y más amarillo, y la sombra sobre ellos es más clara.

### Arreglos
- Las caras de VU retroiluminadas (CINTA 70s, AZUL) tenían una bruma gris en el medio: el brillo de la lámpara se desvanecía a negro transparente. Ahora se desvanece a su propio color.
- Los medidores de aguja muy chicos muestran solo los números principales y no la palabra PEAK, así no se superpone nada.

## 6.12.0 — 2026-10-27

### Nuevo
- **La cinta grande como SO-90 REEL**, con los marcos metálicos y el casete REEL: armada a partir del mock-up del panel. El casete de aluminio cepillado con el tema en la etiqueta, dos ventanas con **carretes abiertos dorados** que giran alrededor de sus centros reales (como un C90 de verdad: ver 6.11.0), con los rollos de cinta marrón cambiando detrás de sus recortes y los tramos de cinta hasta las guías, y "DECK 90" a lo largo del borde del carrete derecho; el display FL detrás de un bisel cromado con el tiempo del tema, PLAY, el tema en letras de matriz de puntos (que se desplazan si es largo) y medidores L/R con **zonas amarilla y roja**; y cinco teclas de transporte oscuras, con PLAY encendida en verde con su barra. Sigue al panel: por su altura, o por su ancho en un panel alto. CLEAR, CLÁSICO y un panel vertical mantienen la cinta dibujada.

## 6.11.2 — 2026-10-27

### Nuevo
- **El tema en el display de la casetera.** En el espacio libre a la derecha de PLAY y METAL, con las letras propias del display: el título brillante y el artista debajo (casetera A: lo que suena; casetera B: el tema anterior). Si no entra, la línea se desplaza despacio con una pausa al principio, apareciendo y desvaneciéndose en los bordes, como hacían los displays de la época. En un display ancho va en el medio, antes del tiempo restante, y los indicadores DOLBY / HX PRO / AUTO REV pasan a la fila de abajo.

## 6.11.1 — 2026-10-27

### Arreglos
- **Los carretes de la cinta DECK 90 ya no se bambolean.** Giraban alrededor de un punto 6–7 px por debajo de su centro real, así que oscilaban y alrededor se veía el carrete quieto de la imagen. Ahora el centro de cada carrete se calcula a partir de su propia forma de simetría séxtuple (el punto donde se ve igual girado 60°), la imagen del carrete se centra ahí con precisión de fracción de píxel, y la luz sobre él queda fija mientras el carrete gira, como en un carrete real. En una vuelta completa, el eje se mantiene dentro de 0,06 px.

### Nuevo
- **Zonas amarilla y roja en los medidores de nivel de la casetera**, como en las caseteras de la época: turquesa hasta −6 dB, amarillo hasta 0 dB, rojo arriba. Los segmentos apagados conservan un toque del color de su zona, y los números de la escala también lo toman.

## 6.11.0 — 2026-10-27

### Nuevo
- **La casetera DECK 90.** Con los marcos metálicos (TITANIO, NEGRO, CHAMPAGNE), el módulo DECK es una casetera de aluminio cepillado negro armada a partir del mock-up del panel: un compartimento de casete biselado con una cinta DECK 90 TYPE IV, el display FL detrás de su bisel, seis teclas de transporte cuadradas bajo TRANSPORT, dos perillas moleteadas (REC LEVEL sigue a la música), la tecla de encendido con su LED y la salida de auriculares, y cuatro tornillos. Llena su panel como la anterior: el compartimento y las perillas mantienen su tamaño, y el display y las teclas se estiran. CLÁSICO mantiene la casetera dibujada.
- **El tema en la etiqueta del casete**: la cinta de la casetera A tiene el tema que suena en letras grandes con el artista debajo (los títulos largos se achican y después se cortan con …); la de la casetera B tiene el tema anterior.

### Cambios
- **Los casetes giran como los de verdad.** Reproduciendo el lado A, el carrete izquierdo suelta la cinta y el derecho la enrolla, y los dos giran en sentido antihorario (antes giraban al revés). Cada uno gira a la velocidad de la cinta sobre su propio rollo: 0,30 vueltas por segundo con el rollo lleno, 0,67 con el carrete pelado, 0,39 cada uno a mitad de camino, como un C90 a 4,76 cm/s. En la cinta DECK 90 ves cómo cambian los rollos marrones por la ventana a medida que avanza el lado. Vale para todos los casetes (las caseteras, la cinta grande, REEL y CLEAR).
- **El display FL** de las caseteras: dígitos rectos con segmentos biselados y sin el fantasma de los apagados, letras condensadas en negrita, segmentos de medidor gruesos con los apagados apenas visibles, y la escala de dB debajo. Un display bajo muestra solo el contador, PLAY/METAL y los medidores, así no se superpone nada.

## 6.10.2 — 2026-10-27

### Arreglos
- **La ventana se puede mover desde todo el marco.** Solo la barra del encabezado la movía: agarrar el borde metálico, un tornillo, los huecos entre módulos o el nombre grabado arriba de un módulo no hacía nada, y es fácil que pase con la ventana maximizada (el borde de arriba de la pantalla es el marco). Ahora todo eso mueve la ventana (y un doble clic ahí la maximiza o la restaura, como en el encabezado). Los módulos, los controles y las teclas de la casetera reciben los clics como antes.

## 6.10.1 — 2026-10-27

### Cambios
- **Las caseteras llenan su panel.** Mantenían una forma fija (como mucho unos 3 : 1) y quedaban chiquitas en el medio de un panel ancho. Ahora el compartimento del casete y las perillas siguen la altura de la casetera, y el display y las teclas de transporte se estiran a lo ancho: dos caseteras llenan el panel una al lado de la otra, y una sola ocupa todo el ancho de su panel.
- Con una sola casetera (SIMPLE), su panel ocupa más alto de la ventana, así esa casetera crece en las dos direcciones.
- El display de una casetera ancha suma el **tiempo restante** (del tema en la casetera A, del lado de la cinta en la B) y los indicadores de las caseteras de la época: DOLBY B, HX PRO, AUTO REV, NR, MPX FILTER.
- En las caseteras chicas, las etiquetas de las perillas ya no se pisan.

## 6.10.0 — 2026-10-27

### Nuevo
- **MARCO: el frente de una casetera premium de los 90**, en tres acabados, **TITANIO** (el predeterminado), **NEGRO** y **CHAMPAGNE**, o el viejo **CLÁSICO**. Se elige en el panel ⚙ y se recuerda. Cada módulo es una placa de metal cepillado con su nombre grabado arriba (LEVEL L, LEVEL R, BPM, GONIO…), y lo que muestra queda detrás de un vidrio negro en un bisel pulido y achaflanado; la ventana del espectro tiene un bisel fino ámbar, el tema va en una ranura de display negra en el encabezado, las teclas de la ventana son teclas de metal cuadradas, y cuatro tornillos sujetan la placa en las esquinas. Solo cambia el marco: los vúmetros, el espectro y las caseteras se dibujan como antes. El metal y los tornillos salen de mock-ups del panel; los biseles están dibujados, así que el marco se adapta a cualquier tamaño de ventana y sigue a los módulos que prendas o apagues.

### Arreglos
- En una ventana muy baja, los displays ahora se quedan dentro de sus marcos en vez de pasarse del borde inferior.

## 6.9.2 — 2026-10-27

### Cambios
- Se fue el reflejo que cruzaba el rack desde la izquierda, de ida y vuelta, cada 9 segundos.
- El borde del programa es un marco de frente, con los cuatro tornillos adentro: ya no quedan en las esquinas de la barra de título, y el borde de la ventana se distingue contra lo que haya detrás.

## 6.9.1 — 2026-10-27

### Cambios
- **El ecualizador de Spotless 1.2.** Prendido y no plano, cambia el sonido según la frecuencia, así que no se puede deducir el loudness del máster a partir de lo que se escucha: el indicador de Spotify muestra **SPOTIFY ?** (y el historial deja vacíos MASTER y Spotify) hasta que se apague o quede plano, igual que con la nivelación de Spotless. Su preamp y sus bandas se leen de los ajustes de Spotless, como su volumen.

## 6.9.0 — 2026-10-26

### Arreglos
- **El loudness ahora es exacto alrededor de 1–3 kHz.** La ponderación K usaba el filtro high-shelf propio del navegador, cuya curva no es la de BS.1770: leía hasta 0,5 dB de menos entre 1 y 3 kHz (la música, unos 0,1–0,3 LU de menos, y el indicador de Spotify, así de generoso de más). Los dos filtros de ponderación K ahora se diseñan a partir de la recomendación para la frecuencia de muestreo propia de la placa de sonido; a 48 kHz son exactamente sus coeficientes. Un tono de 2 kHz a −20 dBFS lee −17,6 LUFS, como corresponde.
- **El true peak ya no salta hasta +1 dB cuando arranca la medición.** El filtro de sobremuestreo arrancaba desde silencio mientras la música ya sonaba; ahora espera 12 muestras reales.
- **Crest** es el pico de cada canal contra su propio RMS en 400 ms, como dice la etiqueta: ya no cambia con la cantidad de cuadros por segundo (leía más alto en la bandeja) ni lee 3 dB de más cuando solo un canal tiene sonido.
- **Historial: una remedición corta ya no reemplaza una línea larga.** Pasar a MIC o DEMO y volver durante un tema lo medía de nuevo bajo la misma línea; ahora cada medición tiene la suya.
- El tema anterior, en la casetera B, sale bien cuando el reproductor desaparece y vuelve con otro tema; un tema que se repite ("repetir uno") es una línea nueva.
- El loudness integrado guarda 6 horas (antes 1) para sets largos de DJ y podcasts.
- Después de reiniciar sobre el mismo tema, LRA e integrado esperan a que se vuelvan a llenar las ventanas de loudness.
- La ventana en sus tamaños más chicos: nada se superpone a 760 px de ancho, los paneles ceden altura antes de que se corte algo, y si igual no entra, el rack hace scroll.
- Teclas: F1–F8 no hacen nada detrás de la ventana del celular; Esc cierra una ventana aunque GUARDAR esté armado; GUARDAR y después F6–F8 guarda; mantener apretada S, M, D o Espacio ya no reinicia el origen una y otra vez (dos arranques rápidos podían dejar el micrófono tomado).
- El modo solo cinta (Z) se recuerda junto con el rack del que vino.
- La barra de progreso y el contador de cinta del celular ya no dependen de que el reloj del celular coincida con el de la PC.

### Nuevo
- **Se tiene en cuenta el volumen de Spotless.** Deck 90 lee el volumen y la nivelación de Spotless desde sus ajustes: al 71 % Spotless suena 7,9 dB por debajo del máster, lo que hacía que el historial leyera unos 8 dB de menos y que el indicador de Spotify errara en lo mismo. El indicador ahora muestra lo que Spotify le haría al máster a cualquier volumen (su tooltip dice cuánto se compensó), y el historial tiene una columna **MASTER** (también en el CSV, con el volumen del reproductor). Con la nivelación de Spotless prendida, el indicador muestra **SPOTIFY ?**: Spotless ya está emparejando el volumen, así que el máster no se puede conocer. Las líneas guardadas antes de la 6.9 no se pueden corregir y muestran — ahí.
- Bandeja: **Nueva clave para el celular** (con la pantalla en el celular activa) les corta el acceso a todos los que alguna vez escanearon el QR.

### Cambios — seguridad
- **Una actualización que no arranca vuelve a poner sola la versión anterior**, incluso cuando su proceso principal no llega a cargar (el programa ahora arranca desde un archivo chico y fijo, `electron/boot.js`) o su ventana no cargó después de 2 minutos. Antes de escribir nada, todos los scripts de una actualización tienen que compilar.
- Las verificaciones le dan a GitHub 20 s para responder y 2 minutos para la descarga: una conexión muerta ya no frena las verificaciones por días ni deja BAJANDO… en pantalla. **Buscar actualizaciones** en la bandeja siempre informa. Una versión que falló una vez se puede volver a instalar desde ahí.
- Si arranca con Windows, Deck 90 se queda en la bandeja aunque la última vez se haya cerrado maximizado (y vuelve maximizado).
- Al salir del modo mini en Windows, la ventana vuelve maximizada si lo estaba.
- Historial: si un programa de backup o el antivirus tiene tomado el archivo, no se escribe nada encima (se podía perder el historial); se escribe como mucho cada 30 s y al cerrar el programa.
- "Reproduciendo ahora" se recupera solo cuando Windows reinicia el Explorador; el puente se reinicia cuando se queda callado, y sigue intentando en vez de rendirse después de cinco arranques fallidos.
- Si la página se detiene (driver de video, memoria) después de días en la bandeja, se vuelve a cargar. El log pasa a `media.1.log` al superar 1 MB en vez de quedarse mudo o borrarse. Los ajustes se escriben de forma que un corte de luz no los deje a medio escribir.
- Pantalla en el celular: un puerto que Windows reserva (Hyper-V, WSL) se saltea como si estuviera ocupado; los adaptadores de máquinas virtuales van al final en el QR.
- "Arrancar con Windows" ya no se vuelve a activar solo cuando se lo deshabilita en el Administrador de tareas.
- Publicación de versiones: cada push compila todos los scripts, y el build de Linux se arranca una vez antes de publicarse; las acciones de build están fijadas a una versión.

## 6.8.2 — 2026-10-26

### Cambios
- En el programa, FUENTE (SISTEMA · MIC · DEMO · ■) pasó de la fila principal al panel ⚙: el programa escucha la PC solo, así que la fila principal ya no parece la vieja pantalla de elegir origen. S, M, D y Espacio funcionan como antes. La versión de navegador lo sigue teniendo adelante, donde hace falta.

## 6.8.1 — 2026-10-26

### Arreglos
- **Se acabó el rack en espera al arrancar.** Por un momento el programa mostraba el rack en reposo (FUENTE sin nada elegido, STANDBY, los paneles "esperando"), como la vieja pantalla de elegir origen, antes de que arrancara el audio del sistema. Ahora la ventana aparece cuando ya está escuchando, con un cuadro en vivo ya dibujado (o a los 2,5 s si tarda más, a los 5 s como máximo).

## 6.8.0 — 2026-10-26

### Cambios
- **Las actualizaciones aparecen antes.** Deck 90 suele vivir días en la bandeja, que es donde lo deja ✕, así que solo veía una versión nueva al reiniciarse o cada 6 horas. Ahora le pregunta a GitHub cada hora y cada vez que la ventana vuelve de la bandeja (si la última consulta tiene más de 30 minutos).
- El menú de la bandeja tiene **Buscar actualizaciones**, que dice "al día" o qué salió mal, y se convierte en **Instalar Deck 90 x.y** cuando hay una para instalar.

## 6.7.0 — 2026-10-26

### Cambios
- **Presets: cinco favoritos y tres tuyos.** 1–5 (F1–F5) ahora son looks fijos (Estudio, Hi-Fi 90s, Cinta 70s, Vidriera, Mastering) y C1, C2, C3 (F6–F8) son tuyos: GUARDAR y después C1–C3, Shift+clic en uno, o Shift+F6–F8 guarda ahí lo que está en pantalla. Un C vacío te lo dice cuando lo tocás. Los looks guardados sobre 1–5 con la 6.6.0 pasan solos a C1–C3.

### Nuevo
- El tamaño y la posición de la ventana, y si estaba maximizada, se recuerdan entre sesiones (solo se restauran si ese lugar sigue estando en una pantalla). La tira mini guarda los suyos.

## 6.6.0 — 2026-10-26

### Nuevo
- **Cinco presets**, en la consola (★ 1 2 3 4 5 GUARDAR) y en F1–F5. Un preset guarda todo el look: cara de VU, estilo de espectro y sensibilidad del FL, tono de pantalla, calibración del VU, qué módulos se muestran, y los estilos de casetera y de casete. Vienen cinco listos (Estudio, Hi-Fi 90s, Cinta 70s, Vidriera, Mastering) y cualquiera se puede reemplazar: GUARDAR y después un número, Shift+clic en un número, o Shift+F1–F5. Un preset reemplazado toma el nombre de su cara de VU y su espectro; se prende el número cuyo look está en pantalla. Se guardan con los ajustes del programa.

## 6.5.1 — 2026-10-26

### Arreglos
- El programa ya no muestra por un instante la pantalla de inicio de la versión de navegador al abrirse.

### Documentación
- Capturas nuevas: la vista principal con el VU CINTA 70s y FL ÁMBAR, seis estilos de espectro, las dos caras de VU nuevas, la pantalla en el celular y el historial de temas.

## 6.5.0 — 2026-10-24

### Nuevo
- **Seis estilos de espectro nuevos**, en el nuevo menú MÁS ▾ de la consola y con `T`:
  - **LED 80s:** columnas de LEDs rectangulares, verde / amarillo / rojo, y un LED de pico que se sostiene y cae.
  - **FL SHOWROOM:** el display FL en turquesa con topes magenta; después de 3 s de silencio pasa patrones de demo de vidriera hasta que vuelve la música.
  - **FL ÁMBAR:** estéreo, el canal izquierdo hacia arriba desde el medio y el derecho hacia abajo, segmentos ámbar y los nombres de las bandas en el medio.
  - **RTA 1/3:** 31 bandas ISO de tercio de octava medidas como potencia por banda, con cada bin de la FFT ponderado según cuánto cae dentro de la banda (el ruido rosa lee plano dentro de ±0,5 dB por encima de 40 Hz, ±1,5 dB por debajo), escala en dBFS a los dos lados; las bandas por debajo de 40 Hz se ven atenuadas porque ahí la FFT tiene muy pocos bins; SENS suma 0 / 6 / 12 dB y lo indica.
  - **LCD:** panel de matriz de puntos verde con la sombra de los píxeles sobre el fondo.
  - **ESPECTROGRAMA:** cascada, de 30 Hz a 20 kHz en escala logarítmica, 60 px por segundo sea cual sea la cantidad de cuadros.
- **Dos caras de VU nuevas:** CINTA 70s (cara crema cálida retroiluminada, aguja negra fina, zona roja, vidrio) y AZUL (cara azul retroiluminada, aguja ámbar). Las dos usan la clásica escala VU de −20…+3 espaciada por tensión, como el instrumento real, y se adaptan a paneles anchos y altos. `V` pasa por las cuatro.
- **Ícono en la bandeja.** En Windows, ✕ deja Deck 90 en la bandeja, midiendo igual (la pantalla en el celular sigue funcionando); la primera vez, Windows te lo avisa. Shift+✕ siempre cierra. Su menú: mostrar/ocultar, modo mini, pantalla en el celular, "Arrancar con Windows" (arranca oculto, directo a la bandeja; la entrada sigue al programa si se mueve su carpeta), "Al cerrar, quedar en la bandeja" (apagado por defecto en Linux, donde muchos escritorios no muestran ícono en la bandeja) y Salir. Si la ventana nunca termina su primer dibujo, se muestra igual a los 4 s.
- Después de una actualización el programa vuelve visible, aunque hubiera arrancado oculto con Windows.
- **Celular:** una vista de espectrograma (deslizá: todo · VU · FL · espectrograma · cinta), y el color del FL (verde, turquesa, ámbar o igual que en la PC) en ⚙; las caras de VU nuevas también están ahí.

### Arreglos
- Redimensionar la ventana mientras el programa todavía cargaba podía tirar un error.

## 6.4.0 — 2026-10-24

### Nuevo
- **Se actualiza solo.** Unos segundos después de arrancar (y cada 6 horas) el programa le pide a GitHub la última versión. Si es más nueva, una barra te la ofrece: INSTALAR baja un paquete chico con los archivos propios del programa (unos 230 KB), lo verifica contra el SHA-256 que GitHub publica para él, guarda los archivos actuales en `resources\app-anterior`, escribe los nuevos y reinicia. Si algo falla a mitad de camino, se vuelven a poner los archivos viejos. Una versión compilada sobre otro Electron te manda a GitHub a buscar el zip completo. Las versiones ahora traen `Deck-90-<version>-app.bundle` para esto.
  - Redes de seguridad: cada escritura de archivo se reintenta mientras Windows (antivirus, indexador) lo tenga tomado; si una escritura falla, se restauran exactamente los archivos que ya se habían escrito. `resources\deck90-update.json` marca una instalación en curso: si el programa arranca y encuentra una instalación que quedó cortada, o una versión nueva que murió antes de cargar su ventana, restaura `app-anterior`, reinicia con esa, te lo avisa y no vuelve a ofrecer esa versión.
- **Indicador de Spotify.** Al lado de "Loudness": cuánto cambiaría la normalización de Spotify el volumen del tema (objetivo −14 LUFS integrado; un tema más bajo se sube solo hasta que su pico llega a −1 dB). También en el celular, debajo del valor integrado.
- **Historial de temas (`L` o ☰).** Cada tema escuchado 30 s o más se guarda con sus LUFS integrados, LRA, true peak (o sample peak), BPM y el cambio de Spotify, hasta 5000 temas, en `history.json` en la carpeta de datos del programa. La ventana muestra el tema que suena mientras se mide. EXPORTAR A EXCEL guarda un CSV que Excel abre directo (`;`, comas decimales, UTF-8); los títulos no se pueden convertir en fórmulas de Excel.
- `Esc` cierra las ventanas del historial y del celular en vez de detener el análisis.
- El historial se guarda cada 45 s mientras suena un tema, así un cuelgue o un apagado de Windows pierde poco. Un reproductor que desaparece un momento (Windows suelta su sesión cada tanto) no parte un tema en dos, y detener y reanudar el análisis a mitad de un tema sigue midiendo el mismo tema.
- Los picos cuentan desde el segundo 1 del tema, y el historial deja afuera el último segundo antes de que se anuncie el tema siguiente, así el primer golpe del tema siguiente no se convierte en el pico del anterior.

### Blindaje
- Cada mensaje de la página al programa se acepta solo si viene de la propia ventana de Deck 90.

### Arreglos
- Un tema nuevo ya no arranca con los datos del anterior (duración, álbum) hasta que llegan los suyos.
- El loudness integrado y el LRA cuentan un bloque cada 100 ms de tiempo en vez de uno por cuadro, así una PC lenta u ocupada mide lo mismo que una rápida.

## 6.3.1 — 2026-10-23

- **La ventana minimizada sigue midiendo.** Windows frena los cuadros de animación de una ventana minimizada (o tapada del todo), y todo el análisis corría sobre ellos: la pantalla en el celular caía a cero y los LUFS integrados, el LRA y los BPM se congelaban hasta que volvía la ventana. Ahora un temporizador toma la posta a ~30 por segundo mientras no llegan cuadros: mide y alimenta al celular, y se saltea el dibujo que nadie puede ver.

## 6.3.0 — 2026-10-22

### Nuevo (pantalla en el celular)
- **Espectro FL 90s en el celular.** Tiene su propia vista y también aparece en la vista "todo". La PC manda las 19 bandas tal como se midieron; el celular hace la caída y los topes de pico.
- **Ajustes propios del celular (⚙).** La cara de VU, el estilo de casete y la sensibilidad del FL pueden seguir a la PC o elegirse en el celular, cada uno por separado. Además: si el FL aparece en "todo", un modo noche atenuado y una vibración corta en las teclas del casete.
- **Barra de progreso del tema.** Muestra el tiempo transcurrido y el que falta.
- **Deslizá hacia los costados** para cambiar de vista.

### Cambios
- El display FL 90s lo dibuja una sola función, `drawFLDisplay`, compartida por el rack y el celular. Sus lámparas y leyendas se corren en paneles angostos.
- El VU HI-FI 90s saca sus leyendas en paneles demasiado angostos para ellas.

## 6.2.0 — 2026-10-22

### Nuevo
- **Pantalla en el celular.** En el panel de ajustes, CELULAR → ON levanta un servidor chico en la red de tu casa (puerto 9090) y muestra un código QR. Un celular o tablet que lo abre recibe:
  - los vúmetros y el casete grande, en vivo, dibujados con el mismo código del rack;
  - el tema y su tapa;
  - LUFS momentáneo e integrado, LRA, true peak, BPM y fase.
  - Las teclas del casete controlan el reproductor de la PC.
  - Tres vistas (todo, solo VU, solo casete), vertical y horizontal, y pantalla completa.
  - Apagado por defecto. Cada pedido necesita la clave en la dirección. Solo se sirven los archivos propios de la página.
  - Si el puerto 9090 está ocupado, usa del 9091 al 9095, y el QR muestra el puerto que consiguió.
  - Un celular que deja de leer nunca acumula cuadros en la PC. Como máximo 8 pantallas a la vez.
  - La página del celular intenta mantener la pantalla prendida: Wake Lock donde el navegador lo permite y, si no, un video mudo diminuto. Algunos celulares igual se duermen; para esos está el ajuste de tiempo de espera de la pantalla.

### Arreglos
- La etiqueta "VU" del VU STUDIO ya no cae sobre la lectura de dB en paneles altos y angostos.

## 6.1.0 — 2026-10-21

### Nuevo
- **Modo mini** (`P`, o el botón ◫). Una tira chica que queda por encima de las demás ventanas: dos carretes que giran mientras suena música, barras LED L/R en la escala VU con retención de pico, loudness momentáneo e integrado, y true peak. El tema queda en la barra de título. La tira recuerda su tamaño y posición; hacé doble clic o apretá `P` para volver.
- **Goniómetro** (módulo 8). La imagen estéreo como nube de puntos (mid hacia arriba, side a lo ancho), con ganancia automática, persistencia de fósforo y una barra de correlación.
- **True peak.** La tarjeta de pico ahora muestra dBTP: sobremuestreo 4x de BS.1770-4 en el hilo de audio, con retención de 1,5 s y el máximo del tema. Sin AudioWorklet vuelve a sample peak (dBFS).
- **Rango de loudness (LRA).** EBU Tech 3342, por tema, al lado del loudness integrado.

### Cambios
- La fila principal acomoda cualquier combinación de VU, BPM y goniómetro. Con los VU apagados, el display de BPM y el goniómetro se reparten el ancho.

### Arreglos
- El primer "reproduciendo ahora" podía llegar antes de que la ventana estuviera escuchando y aparecer recién unos segundos después. Ahora el último tema se entrega apenas carga la página.

## 6.0.1 — 2026-10-20

### Arreglos
- **El loudness leía alto en los graves.** Web Audio toma el Q de un filtro pasaaltos en dB, así que el pasaaltos de la ponderación K resonaba en vez de caer. La música con mucho grave leía hasta 6 dB de más entre 30 y 50 Hz. Ahora los LUFS quedan dentro de ±0,3 dB de BS.1770 de 30 Hz a 5 kHz.
- **El medidor de fase leía menos de +1,00 en mono.** La correlación L/R ahora se calcula alineada por muestra en el hilo de audio.
- **Pasar a DEMO con audio corriendo dejaba los medidores muertos** (estado clavado en STANDBY). Los cambios de origen rápidos y repetidos también podían dejar dos orígenes andando a la vez.
- **Linux: SISTEMA podía abrir el micrófono en vez de la fuente monitor.** Ahora usa el monitor, y avisa claramente cuando no hay ninguno.
- **Esc para salir de pantalla completa también detenía el análisis.**
- La etiqueta "20k" del espectro quedaba cortada en el borde derecho.
- El casete de carretes grande todavía mostraba el nombre viejo.
- Un error de dibujo podía, en casos raros, colgar la ventana mientras se recuperaba.

### Mejoras
- Content-Security-Policy. Ya no se puede sacar a la ventana de su página (por ejemplo, soltándole un archivo encima). Los permisos de captura se limitan a la propia página de la app.
- Puente de "reproduciendo ahora" en Windows: aguanta que PowerShell falte o esté bloqueado, se recupera después de suspender y reanudar, y registra los errores repetidos una sola vez.
- "Reproduciendo ahora" en Linux: elige el reproductor que realmente está sonando cuando Spotless no está abierto, y muestra la tapa que llega un momento después del título.
- El loudness integrado cuesta menos de calcular en sesiones largas.
- El empaquetado borra una descarga de Electron en caché que esté corrupta en vez de fallar siempre.
- README: nota sobre el sandbox de Linux para Ubuntu 23.10+, y notas de medición corregidas.

## 6.0.0 — 2026-10-20

Primera versión pública.
