/* DECK 90 display — generated from the included editable sources.
   Deck 90 7.7: two small additions for the stereo's internet radio, marked "radio live": setRadio({ live, name })
   lets the L/R meters follow the sound on the radio screen too, and shows the station's name under the frequency. */
(function(globalThis){
'use strict';
/** Original DECK 90 16-segment geometry. Coordinates use SVG y-down. */
const FONT_DATA = {"name":"DECK 90 Segment","version":"1.0","description":"Original 16-segment display lettering inspired by 1990s car-audio LCDs; not a recovered manufacturer font.","width":100,"height":150,"advance":112,"coordinateSystem":"SVG; origin upper left; x rightward, y downward","baseSegments":["a1","a2","b","c","d1","d2","e","f","g1","g2","h","i","j","k","l","m"],"segments":{"a1":[[19.5,22.5],[42.5,22.5],[47,18],[42.5,13.5],[19.5,13.5],[15,18]],"a2":[[57.5,22.5],[80.5,22.5],[85,18],[80.5,13.5],[57.5,13.5],[53,18]],"b":[[84.5,29.5],[84.5,63.5],[89,68],[93.5,63.5],[93.5,29.5],[89,25]],"c":[[84.5,91.5],[84.5,126.5],[89,131],[93.5,126.5],[93.5,91.5],[89,87]],"d1":[[19.5,144.5],[42.5,144.5],[47,140],[42.5,135.5],[19.5,135.5],[15,140]],"d2":[[57.5,144.5],[80.5,144.5],[85,140],[80.5,135.5],[57.5,135.5],[53,140]],"e":[[6.5,91.5],[6.5,126.5],[11,131],[15.5,126.5],[15.5,91.5],[11,87]],"f":[[6.5,29.5],[6.5,63.5],[11,68],[15.5,63.5],[15.5,29.5],[11,25]],"g1":[[21.0,82.0],[41.0,82.0],[45,78],[41.0,74.0],[21.0,74.0],[17,78]],"g2":[[59.0,82.0],[79.0,82.0],[83,78],[79.0,74.0],[59.0,74.0],[55,78]],"h":[[18.91,32.83],[39.17,64.91],[44,66],[45.09,61.17],[24.83,29.09],[20,28]],"i":[[46.5,30.5],[46.5,62.5],[50,66],[53.5,62.5],[53.5,30.5],[50,27]],"j":[[75.17,29.09],[54.91,61.17],[56,66],[60.83,64.91],[81.09,32.83],[80,28]],"k":[[24.8,128.8],[45.2,94.8],[44,90],[39.2,91.2],[18.8,125.2],[20,130]],"l":[[46.5,93.5],[46.5,127.5],[50,131],[53.5,127.5],[53.5,93.5],[50,90]],"m":[[81.2,125.2],[60.8,91.2],[56,90],[54.8,94.8],[75.2,128.8],[80,130]],"dot":[[44,132],[53,132],[53,141],[44,141]],"dotUpper":[[44,48],[53,48],[53,57],[44,57]],"dotLower":[[44,101],[53,101],[53,110],[44,110]],"comma":[[45,131],[54,131],[54,141],[46,149],[48,140],[45,140]],"apostrophe":[[46.78,20.59],[43.41,34.78],[46,39],[50.22,36.41],[53.59,22.22],[51,18]],"quoteLeft":[[35.57,20.5],[33.5,33.57],[36,37],[39.43,34.5],[41.5,21.43],[39,18]],"quoteRight":[[58.57,20.5],[56.5,33.57],[59,37],[62.43,34.5],[64.5,21.43],[62,18]],"acute":[[48,9],[58,0],[67,0],[57,9]],"grave":[[33,0],[42,0],[52,9],[43,9]],"tilde":[[29,6],[38,0],[47,0],[57,5],[66,0],[72,4],[61,10],[53,10],[43,5],[35,10]],"umlautLeft":[[30,1],[39,1],[39,9],[30,9]],"umlautRight":[[61,1],[70,1],[70,9],[61,9]],"circumflex":[[33,10],[47,0],[54,0],[68,10],[57,10],[50,5],[43,10]],"cedilla":[[47,143],[56,143],[59,148],[46,150],[43,147],[50,146]]},"glyphs":{" ":[],"0":["a1","a2","b","c","d1","d2","e","f","j","k"],"1":["b","c"],"2":["a1","a2","b","g1","g2","e","d1","d2"],"3":["a1","a2","b","c","d1","d2","g1","g2"],"4":["f","g1","g2","b","c"],"5":["a1","a2","f","g1","g2","c","d1","d2"],"6":["a1","a2","f","e","d1","d2","c","g1","g2"],"7":["a1","a2","b","c"],"8":["a1","a2","b","c","d1","d2","e","f","g1","g2"],"9":["a1","a2","b","c","d1","d2","f","g1","g2"],"A":["a1","a2","b","c","e","f","g1","g2"],"B":["a1","a2","b","c","d1","d2","g2","i","l"],"C":["a1","a2","d1","d2","e","f"],"D":["a1","a2","b","c","d1","d2","i","l"],"E":["a1","a2","d1","d2","e","f","g1","g2"],"F":["a1","a2","e","f","g1","g2"],"G":["a1","a2","c","d1","d2","e","f","g2"],"H":["b","c","e","f","g1","g2"],"I":["a1","a2","d1","d2","i","l"],"J":["b","c","d1","d2","e"],"K":["e","f","j","m"],"L":["d1","d2","e","f"],"M":["b","c","e","f","h","j"],"N":["b","c","e","f","h","m"],"O":["a1","a2","b","c","d1","d2","e","f"],"P":["a1","a2","b","e","f","g1","g2"],"Q":["a1","a2","b","c","d1","d2","e","f","m"],"R":["a1","a2","b","e","f","g1","g2","m"],"S":["a1","a2","c","d1","d2","f","g1","g2"],"T":["a1","a2","i","l"],"U":["b","c","d1","d2","e","f"],"V":["e","f","j","k"],"W":["b","c","e","f","k","m"],"X":["h","j","k","m"],"Y":["h","j","l"],"Z":["a1","a2","j","k","d1","d2"],"-":["g1","g2"],"_":["d1","d2"],"=":["g1","g2","d1","d2"],"+":["g1","g2","i","l"],"/":["j","k"],"\\":["h","m"],".":["dot"],",":["comma"],":":["dotUpper","dotLower"],";":["dotUpper","comma"],"'":["apostrophe"],"\"":["quoteLeft","quoteRight"],"!":["i","l","dot"],"?":["a1","a2","b","g2","l","dot"],"[":["a1","d1","e","f"],"]":["a2","b","c","d2"],"(":["j","m"],")":["h","k"],"|":["i","l"],"*":["g1","g2","h","j","k","m"],"#":["b","c","e","f","g1","g2"],"%":["j","k","dotUpper","dotLower"],"&":["a1","f","g1","g2","e","d1","d2","m"],"@":["a1","a2","b","c","d2","e","f","g2","l"],"$":["a1","a2","f","g1","g2","c","d1","d2","i","l"],"<":["j","m"],">":["h","k"],"^":["h","j"],"`":["grave"],"{":["a1","f","g1","e","d1"],"}":["a2","b","g2","c","d2"],"~":["tilde"],"−":["g1","g2"],"–":["g1","g2"],"—":["g1","g2"],"·":["dotUpper"],"…":["dot"],"°":["a1","i","g1","f"],"¡":["i","l","dot"],"¿":["a1","a2","f","g1","i","dot"],"a":["a1","a2","b","c","e","f","g1","g2"],"b":["a1","a2","b","c","d1","d2","g2","i","l"],"c":["a1","a2","d1","d2","e","f"],"d":["a1","a2","b","c","d1","d2","i","l"],"e":["a1","a2","d1","d2","e","f","g1","g2"],"f":["a1","a2","e","f","g1","g2"],"g":["a1","a2","c","d1","d2","e","f","g2"],"h":["b","c","e","f","g1","g2"],"i":["a1","a2","d1","d2","i","l"],"j":["b","c","d1","d2","e"],"k":["e","f","j","m"],"l":["d1","d2","e","f"],"m":["b","c","e","f","h","j"],"n":["b","c","e","f","h","m"],"o":["a1","a2","b","c","d1","d2","e","f"],"p":["a1","a2","b","e","f","g1","g2"],"q":["a1","a2","b","c","d1","d2","e","f","m"],"r":["a1","a2","b","e","f","g1","g2","m"],"s":["a1","a2","c","d1","d2","f","g1","g2"],"t":["a1","a2","i","l"],"u":["b","c","d1","d2","e","f"],"v":["e","f","j","k"],"w":["b","c","e","f","k","m"],"x":["h","j","k","m"],"y":["h","j","l"],"z":["a1","a2","j","k","d1","d2"],"Á":["a1","a2","b","c","e","f","g1","g2","acute"],"É":["a1","a2","d1","d2","e","f","g1","g2","acute"],"Í":["a1","a2","d1","d2","i","l","acute"],"Ó":["a1","a2","b","c","d1","d2","e","f","acute"],"Ú":["b","c","d1","d2","e","f","acute"],"Ý":["h","j","l","acute"],"À":["a1","a2","b","c","e","f","g1","g2","grave"],"È":["a1","a2","d1","d2","e","f","g1","g2","grave"],"Ì":["a1","a2","d1","d2","i","l","grave"],"Ò":["a1","a2","b","c","d1","d2","e","f","grave"],"Ù":["b","c","d1","d2","e","f","grave"],"Â":["a1","a2","b","c","e","f","g1","g2","circumflex"],"Ê":["a1","a2","d1","d2","e","f","g1","g2","circumflex"],"Î":["a1","a2","d1","d2","i","l","circumflex"],"Ô":["a1","a2","b","c","d1","d2","e","f","circumflex"],"Û":["b","c","d1","d2","e","f","circumflex"],"Ñ":["b","c","e","f","h","m","tilde"],"Ã":["a1","a2","b","c","e","f","g1","g2","tilde"],"Õ":["a1","a2","b","c","d1","d2","e","f","tilde"],"Ü":["b","c","d1","d2","e","f","umlautLeft","umlautRight"],"Ä":["a1","a2","b","c","e","f","g1","g2","umlautLeft","umlautRight"],"Ë":["a1","a2","d1","d2","e","f","g1","g2","umlautLeft","umlautRight"],"Ï":["a1","a2","d1","d2","i","l","umlautLeft","umlautRight"],"Ö":["a1","a2","b","c","d1","d2","e","f","umlautLeft","umlautRight"],"Ç":["a1","a2","d1","d2","e","f","cedilla"],"á":["a1","a2","b","c","e","f","g1","g2","acute"],"é":["a1","a2","d1","d2","e","f","g1","g2","acute"],"í":["a1","a2","d1","d2","i","l","acute"],"ó":["a1","a2","b","c","d1","d2","e","f","acute"],"ú":["b","c","d1","d2","e","f","acute"],"ý":["h","j","l","acute"],"à":["a1","a2","b","c","e","f","g1","g2","grave"],"è":["a1","a2","d1","d2","e","f","g1","g2","grave"],"ì":["a1","a2","d1","d2","i","l","grave"],"ò":["a1","a2","b","c","d1","d2","e","f","grave"],"ù":["b","c","d1","d2","e","f","grave"],"â":["a1","a2","b","c","e","f","g1","g2","circumflex"],"ê":["a1","a2","d1","d2","e","f","g1","g2","circumflex"],"î":["a1","a2","d1","d2","i","l","circumflex"],"ô":["a1","a2","b","c","d1","d2","e","f","circumflex"],"û":["b","c","d1","d2","e","f","circumflex"],"ñ":["b","c","e","f","h","m","tilde"],"ã":["a1","a2","b","c","e","f","g1","g2","tilde"],"õ":["a1","a2","b","c","d1","d2","e","f","tilde"],"ü":["b","c","d1","d2","e","f","umlautLeft","umlautRight"],"ä":["a1","a2","b","c","e","f","g1","g2","umlautLeft","umlautRight"],"ë":["a1","a2","d1","d2","e","f","g1","g2","umlautLeft","umlautRight"],"ï":["a1","a2","d1","d2","i","l","umlautLeft","umlautRight"],"ö":["a1","a2","b","c","d1","d2","e","f","umlautLeft","umlautRight"],"ç":["a1","a2","d1","d2","e","f","cedilla"]},"fallback":"?","uppercase":true};


const METER_DATA = {"width":1188,"height":207,"viewBox":[0,0,1188,207],"levels":14,"levelOrder":"bottom-to-top","onColor":"#C9F7E6","offColor":"#3C503D","glowFilterId":"d90-meter-glow","background":"<defs>\n  <linearGradient id=\"d90-frame-metal\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n    <stop offset=\"0\" stop-color=\"#6D6E70\"/><stop offset=\".07\" stop-color=\"#222427\"/>\n    <stop offset=\".48\" stop-color=\"#101113\"/><stop offset=\".9\" stop-color=\"#353638\"/>\n    <stop offset=\"1\" stop-color=\"#101012\"/>\n  </linearGradient>\n  <linearGradient id=\"d90-frame-bevel\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n    <stop offset=\"0\" stop-color=\"#0A0A0C\"/><stop offset=\".13\" stop-color=\"#26272A\"/>\n    <stop offset=\".45\" stop-color=\"#07080A\"/><stop offset=\"1\" stop-color=\"#55545A\"/>\n  </linearGradient>\n  <linearGradient id=\"d90-lcd-film\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n    <stop offset=\"0\" stop-color=\"#4D203C\"/><stop offset=\".25\" stop-color=\"#681E43\"/>\n    <stop offset=\".7\" stop-color=\"#5F193B\"/><stop offset=\"1\" stop-color=\"#3C162B\"/>\n  </linearGradient>\n  <linearGradient id=\"d90-glass-edge\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n    <stop offset=\"0\" stop-color=\"#FFFFFF\" stop-opacity=\".12\"/>\n    <stop offset=\".18\" stop-color=\"#FFFFFF\" stop-opacity=\".015\"/>\n    <stop offset=\"1\" stop-color=\"#000000\" stop-opacity=\".12\"/>\n  </linearGradient>\n  <filter id=\"d90-meter-glow\" x=\"-18%\" y=\"-35%\" width=\"136%\" height=\"170%\" color-interpolation-filters=\"sRGB\">\n    <feGaussianBlur in=\"SourceGraphic\" stdDeviation=\"1.05\" result=\"blur\"/>\n    <feComponentTransfer in=\"blur\" result=\"halo\"><feFuncA type=\"linear\" slope=\".34\"/></feComponentTransfer>\n    <feMerge><feMergeNode in=\"halo\"/><feMergeNode in=\"SourceGraphic\"/></feMerge>\n  </filter>\n</defs>\n<g id=\"d90-frame\">\n  <rect x=\"1.5\" y=\"1.5\" width=\"1185\" height=\"204\" rx=\"19\" fill=\"url(#d90-frame-metal)\" stroke=\"#070809\" stroke-width=\"3\"/>\n  <rect x=\"8\" y=\"8\" width=\"1172\" height=\"191\" rx=\"14\" fill=\"url(#d90-frame-bevel)\" stroke=\"#7B7D7F\" stroke-opacity=\".22\"/>\n  <rect x=\"17\" y=\"17\" width=\"1154\" height=\"173\" rx=\"9\" fill=\"#0B0A0D\"/>\n  <rect x=\"23\" y=\"24\" width=\"1142\" height=\"157\" rx=\"5\" fill=\"url(#d90-lcd-film)\"/>\n  <rect x=\"23\" y=\"24\" width=\"1142\" height=\"157\" rx=\"5\" fill=\"url(#d90-glass-edge)\"/>\n  <path d=\"M30 23.5H1158\" fill=\"none\" stroke=\"#020204\" stroke-width=\"3\" stroke-opacity=\".7\"/>\n  <path d=\"M28 182H1160\" fill=\"none\" stroke=\"#C6BCC4\" stroke-width=\"1\" stroke-opacity=\".13\"/>\n</g>\n<g id=\"d90-channel-labels\" fill=\"#D4E7D9\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"23\" font-weight=\"700\">\n  <text x=\"28\" y=\"44\">L</text><text x=\"1142\" y=\"44\">R</text>\n</g>","titleRect":{"x":275,"y":44,"width":690,"height":92},"meterBounds":{"left":{"x":36,"y":39,"width":112,"height":109.6},"right":{"x":1040,"y":39,"width":112,"height":109.6}},"channels":{"left":[{"level":0,"paths":["M56.241 143 L80.427 143 L81.237 148.6 L57.051 148.6 Z","M82.427 143 L113.708 143 L114.518 148.6 L83.237 148.6 Z","M115.708 143 L146.19 143 L147 148.6 L116.518 148.6 Z"],"points":[[[56.241,143],[80.427,143],[81.237,148.6],[57.051,148.6]],[[82.427,143],[113.708,143],[114.518,148.6],[83.237,148.6]],[[115.708,143],[146.19,143],[147,148.6],[116.518,148.6]]]},{"level":1,"paths":["M50.172 135 L75.723 135 L76.263 140.6 L50.712 140.6 Z","M77.723 135 L110.809 135 L111.349 140.6 L78.263 140.6 Z","M112.809 135 L144.998 135 L145.538 140.6 L113.349 140.6 Z"],"points":[[[50.172,135],[75.723,135],[76.263,140.6],[50.712,140.6]],[[77.723,135],[110.809,135],[111.349,140.6],[78.263,140.6]],[[112.809,135],[144.998,135],[145.538,140.6],[113.349,140.6]]]},{"level":2,"paths":["M45.38 127 L71.94 127 L72.21 132.6 L45.65 132.6 Z","M73.94 127 L108.358 127 L108.628 132.6 L74.21 132.6 Z","M110.358 127 L143.807 127 L144.077 132.6 L110.628 132.6 Z"],"points":[[[45.38,127],[71.94,127],[72.21,132.6],[45.65,132.6]],[[73.94,127],[108.358,127],[108.628,132.6],[74.21,132.6]],[[110.358,127],[143.807,127],[144.077,132.6],[110.628,132.6]]]},{"level":3,"paths":["M41.867 119 L69.077 119 L69.077 124.6 L41.867 124.6 Z","M71.077 119 L106.354 119 L106.354 124.6 L71.077 124.6 Z","M108.354 119 L142.615 119 L142.615 124.6 L108.354 124.6 Z"],"points":[[[41.867,119],[69.077,119],[69.077,124.6],[41.867,124.6]],[[71.077,119],[106.354,119],[106.354,124.6],[71.077,124.6]],[[108.354,119],[142.615,119],[142.615,124.6],[108.354,124.6]]]},{"level":4,"paths":["M39.632 111 L67.134 111 L66.864 116.6 L39.362 116.6 Z","M69.134 111 L104.797 111 L104.527 116.6 L68.864 116.6 Z","M106.797 111 L141.424 111 L141.154 116.6 L106.527 116.6 Z"],"points":[[[39.632,111],[67.134,111],[66.864,116.6],[39.362,116.6]],[[69.134,111],[104.797,111],[104.527,116.6],[68.864,116.6]],[[106.797,111],[141.424,111],[141.154,116.6],[106.527,116.6]]]},{"level":5,"paths":["M38.675 103 L66.111 103 L65.571 108.6 L38.135 108.6 Z","M68.111 103 L103.687 103 L103.147 108.6 L67.571 108.6 Z","M105.687 103 L140.232 103 L139.692 108.6 L105.147 108.6 Z"],"points":[[[38.675,103],[66.111,103],[65.571,108.6],[38.135,108.6]],[[68.111,103],[103.687,103],[103.147,108.6],[67.571,108.6]],[[105.687,103],[140.232,103],[139.692,108.6],[105.147,108.6]]]},{"level":6,"paths":["M38.996 95 L66.009 95 L65.199 100.6 L38.186 100.6 Z","M68.009 95 L103.025 95 L102.215 100.6 L67.199 100.6 Z","M105.025 95 L139.041 95 L138.231 100.6 L104.215 100.6 Z"],"points":[[[38.996,95],[66.009,95],[65.199,100.6],[38.186,100.6]],[[68.009,95],[103.025,95],[102.215,100.6],[67.199,100.6]],[[105.025,95],[139.041,95],[138.231,100.6],[104.215,100.6]]]},{"level":7,"paths":["M40.596 87 L66.827 87 L65.747 92.6 L39.516 92.6 Z","M68.827 87 L102.81 87 L101.73 92.6 L67.747 92.6 Z","M104.81 87 L137.849 87 L136.769 92.6 L103.73 92.6 Z"],"points":[[[40.596,87],[66.827,87],[65.747,92.6],[39.516,92.6]],[[68.827,87],[102.81,87],[101.73,92.6],[67.747,92.6]],[[104.81,87],[137.849,87],[136.769,92.6],[103.73,92.6]]]},{"level":8,"paths":["M43.473 79 L68.565 79 L67.215 84.6 L42.123 84.6 Z","M70.565 79 L103.043 79 L101.693 84.6 L69.215 84.6 Z","M105.043 79 L136.658 79 L135.308 84.6 L103.693 84.6 Z"],"points":[[[43.473,79],[68.565,79],[67.215,84.6],[42.123,84.6]],[[70.565,79],[103.043,79],[101.693,84.6],[69.215,84.6]],[[105.043,79],[136.658,79],[135.308,84.6],[103.693,84.6]]]},{"level":9,"paths":["M47.628 71 L71.223 71 L69.603 76.6 L46.008 76.6 Z","M73.223 71 L103.723 71 L102.103 76.6 L71.603 76.6 Z","M105.723 71 L135.466 71 L133.846 76.6 L104.103 76.6 Z"],"points":[[[47.628,71],[71.223,71],[69.603,76.6],[46.008,76.6]],[[73.223,71],[103.723,71],[102.103,76.6],[71.603,76.6]],[[105.723,71],[135.466,71],[133.846,76.6],[104.103,76.6]]]},{"level":10,"paths":["M53.062 63 L74.801 63 L72.911 68.6 L51.172 68.6 Z","M76.801 63 L104.85 63 L102.96 68.6 L74.911 68.6 Z","M106.85 63 L134.275 63 L132.385 68.6 L104.96 68.6 Z"],"points":[[[53.062,63],[74.801,63],[72.911,68.6],[51.172,68.6]],[[76.801,63],[104.85,63],[102.96,68.6],[74.911,68.6]],[[106.85,63],[134.275,63],[132.385,68.6],[104.96,68.6]]]},{"level":11,"paths":["M59.774 55 L79.3 55 L77.14 60.6 L57.614 60.6 Z","M81.3 55 L106.425 55 L104.265 60.6 L79.14 60.6 Z","M108.425 55 L133.083 55 L130.923 60.6 L106.265 60.6 Z"],"points":[[[59.774,55],[79.3,55],[77.14,60.6],[57.614,60.6]],[[81.3,55],[106.425,55],[104.265,60.6],[79.14,60.6]],[[108.425,55],[133.083,55],[130.923,60.6],[106.265,60.6]]]},{"level":12,"paths":["M67.763 47 L84.719 47 L82.289 52.6 L65.333 52.6 Z","M86.719 47 L108.447 47 L106.017 52.6 L84.289 52.6 Z","M110.447 47 L131.892 47 L129.462 52.6 L108.017 52.6 Z"],"points":[[[67.763,47],[84.719,47],[82.289,52.6],[65.333,52.6]],[[86.719,47],[108.447,47],[106.017,52.6],[84.289,52.6]],[[110.447,47],[131.892,47],[129.462,52.6],[108.017,52.6]]]},{"level":13,"paths":["M77.031 39 L91.058 39 L88.358 44.6 L74.331 44.6 Z","M93.058 39 L110.916 39 L108.216 44.6 L90.358 44.6 Z","M112.916 39 L130.7 39 L128 44.6 L110.216 44.6 Z"],"points":[[[77.031,39],[91.058,39],[88.358,44.6],[74.331,44.6]],[[93.058,39],[110.916,39],[108.216,44.6],[90.358,44.6]],[[112.916,39],[130.7,39],[128,44.6],[110.216,44.6]]]}],"right":[{"level":0,"paths":["M1130.949 148.6 L1106.763 148.6 L1107.573 143 L1131.759 143 Z","M1104.763 148.6 L1073.482 148.6 L1074.292 143 L1105.573 143 Z","M1071.482 148.6 L1041 148.6 L1041.81 143 L1072.292 143 Z"],"points":[[[1130.949,148.6],[1106.763,148.6],[1107.573,143],[1131.759,143]],[[1104.763,148.6],[1073.482,148.6],[1074.292,143],[1105.573,143]],[[1071.482,148.6],[1041,148.6],[1041.81,143],[1072.292,143]]]},{"level":1,"paths":["M1137.288 140.6 L1111.737 140.6 L1112.277 135 L1137.828 135 Z","M1109.737 140.6 L1076.651 140.6 L1077.191 135 L1110.277 135 Z","M1074.651 140.6 L1042.462 140.6 L1043.002 135 L1075.191 135 Z"],"points":[[[1137.288,140.6],[1111.737,140.6],[1112.277,135],[1137.828,135]],[[1109.737,140.6],[1076.651,140.6],[1077.191,135],[1110.277,135]],[[1074.651,140.6],[1042.462,140.6],[1043.002,135],[1075.191,135]]]},{"level":2,"paths":["M1142.35 132.6 L1115.79 132.6 L1116.06 127 L1142.62 127 Z","M1113.79 132.6 L1079.372 132.6 L1079.642 127 L1114.06 127 Z","M1077.372 132.6 L1043.923 132.6 L1044.193 127 L1077.642 127 Z"],"points":[[[1142.35,132.6],[1115.79,132.6],[1116.06,127],[1142.62,127]],[[1113.79,132.6],[1079.372,132.6],[1079.642,127],[1114.06,127]],[[1077.372,132.6],[1043.923,132.6],[1044.193,127],[1077.642,127]]]},{"level":3,"paths":["M1146.133 124.6 L1118.923 124.6 L1118.923 119 L1146.133 119 Z","M1116.923 124.6 L1081.646 124.6 L1081.646 119 L1116.923 119 Z","M1079.646 124.6 L1045.385 124.6 L1045.385 119 L1079.646 119 Z"],"points":[[[1146.133,124.6],[1118.923,124.6],[1118.923,119],[1146.133,119]],[[1116.923,124.6],[1081.646,124.6],[1081.646,119],[1116.923,119]],[[1079.646,124.6],[1045.385,124.6],[1045.385,119],[1079.646,119]]]},{"level":4,"paths":["M1148.638 116.6 L1121.136 116.6 L1120.866 111 L1148.368 111 Z","M1119.136 116.6 L1083.473 116.6 L1083.203 111 L1118.866 111 Z","M1081.473 116.6 L1046.846 116.6 L1046.576 111 L1081.203 111 Z"],"points":[[[1148.638,116.6],[1121.136,116.6],[1120.866,111],[1148.368,111]],[[1119.136,116.6],[1083.473,116.6],[1083.203,111],[1118.866,111]],[[1081.473,116.6],[1046.846,116.6],[1046.576,111],[1081.203,111]]]},{"level":5,"paths":["M1149.865 108.6 L1122.429 108.6 L1121.889 103 L1149.325 103 Z","M1120.429 108.6 L1084.853 108.6 L1084.313 103 L1119.889 103 Z","M1082.853 108.6 L1048.308 108.6 L1047.768 103 L1082.313 103 Z"],"points":[[[1149.865,108.6],[1122.429,108.6],[1121.889,103],[1149.325,103]],[[1120.429,108.6],[1084.853,108.6],[1084.313,103],[1119.889,103]],[[1082.853,108.6],[1048.308,108.6],[1047.768,103],[1082.313,103]]]},{"level":6,"paths":["M1149.814 100.6 L1122.801 100.6 L1121.991 95 L1149.004 95 Z","M1120.801 100.6 L1085.785 100.6 L1084.975 95 L1119.991 95 Z","M1083.785 100.6 L1049.769 100.6 L1048.959 95 L1082.975 95 Z"],"points":[[[1149.814,100.6],[1122.801,100.6],[1121.991,95],[1149.004,95]],[[1120.801,100.6],[1085.785,100.6],[1084.975,95],[1119.991,95]],[[1083.785,100.6],[1049.769,100.6],[1048.959,95],[1082.975,95]]]},{"level":7,"paths":["M1148.484 92.6 L1122.253 92.6 L1121.173 87 L1147.404 87 Z","M1120.253 92.6 L1086.27 92.6 L1085.19 87 L1119.173 87 Z","M1084.27 92.6 L1051.231 92.6 L1050.151 87 L1083.19 87 Z"],"points":[[[1148.484,92.6],[1122.253,92.6],[1121.173,87],[1147.404,87]],[[1120.253,92.6],[1086.27,92.6],[1085.19,87],[1119.173,87]],[[1084.27,92.6],[1051.231,92.6],[1050.151,87],[1083.19,87]]]},{"level":8,"paths":["M1145.877 84.6 L1120.785 84.6 L1119.435 79 L1144.527 79 Z","M1118.785 84.6 L1086.307 84.6 L1084.957 79 L1117.435 79 Z","M1084.307 84.6 L1052.692 84.6 L1051.342 79 L1082.957 79 Z"],"points":[[[1145.877,84.6],[1120.785,84.6],[1119.435,79],[1144.527,79]],[[1118.785,84.6],[1086.307,84.6],[1084.957,79],[1117.435,79]],[[1084.307,84.6],[1052.692,84.6],[1051.342,79],[1082.957,79]]]},{"level":9,"paths":["M1141.992 76.6 L1118.397 76.6 L1116.777 71 L1140.372 71 Z","M1116.397 76.6 L1085.897 76.6 L1084.277 71 L1114.777 71 Z","M1083.897 76.6 L1054.154 76.6 L1052.534 71 L1082.277 71 Z"],"points":[[[1141.992,76.6],[1118.397,76.6],[1116.777,71],[1140.372,71]],[[1116.397,76.6],[1085.897,76.6],[1084.277,71],[1114.777,71]],[[1083.897,76.6],[1054.154,76.6],[1052.534,71],[1082.277,71]]]},{"level":10,"paths":["M1136.828 68.6 L1115.089 68.6 L1113.199 63 L1134.938 63 Z","M1113.089 68.6 L1085.04 68.6 L1083.15 63 L1111.199 63 Z","M1083.04 68.6 L1055.615 68.6 L1053.725 63 L1081.15 63 Z"],"points":[[[1136.828,68.6],[1115.089,68.6],[1113.199,63],[1134.938,63]],[[1113.089,68.6],[1085.04,68.6],[1083.15,63],[1111.199,63]],[[1083.04,68.6],[1055.615,68.6],[1053.725,63],[1081.15,63]]]},{"level":11,"paths":["M1130.386 60.6 L1110.86 60.6 L1108.7 55 L1128.226 55 Z","M1108.86 60.6 L1083.735 60.6 L1081.575 55 L1106.7 55 Z","M1081.735 60.6 L1057.077 60.6 L1054.917 55 L1079.575 55 Z"],"points":[[[1130.386,60.6],[1110.86,60.6],[1108.7,55],[1128.226,55]],[[1108.86,60.6],[1083.735,60.6],[1081.575,55],[1106.7,55]],[[1081.735,60.6],[1057.077,60.6],[1054.917,55],[1079.575,55]]]},{"level":12,"paths":["M1122.667 52.6 L1105.711 52.6 L1103.281 47 L1120.237 47 Z","M1103.711 52.6 L1081.983 52.6 L1079.553 47 L1101.281 47 Z","M1079.983 52.6 L1058.538 52.6 L1056.108 47 L1077.553 47 Z"],"points":[[[1122.667,52.6],[1105.711,52.6],[1103.281,47],[1120.237,47]],[[1103.711,52.6],[1081.983,52.6],[1079.553,47],[1101.281,47]],[[1079.983,52.6],[1058.538,52.6],[1056.108,47],[1077.553,47]]]},{"level":13,"paths":["M1113.669 44.6 L1099.642 44.6 L1096.942 39 L1110.969 39 Z","M1097.642 44.6 L1079.784 44.6 L1077.084 39 L1094.942 39 Z","M1077.784 44.6 L1060 44.6 L1057.3 39 L1075.084 39 Z"],"points":[[[1113.669,44.6],[1099.642,44.6],[1096.942,39],[1110.969,39]],[[1097.642,44.6],[1079.784,44.6],[1077.084,39],[1094.942,39]],[[1077.784,44.6],[1060,44.6],[1057.3,39],[1075.084,39]]]}]}};

const NS = 'http://www.w3.org/2000/svg';
const audioGraphs = new WeakMap();
let nextId = 0;
const clamp = value => Number.isNaN(Number(value)) ? 0 : Math.max(0, Math.min(1, Number(value) || 0));
const svgNode = (name, attributes = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
};
const label = (text, x, y, options = {}) => {
  const node = svgNode('text', { x, y, fill: '#9ab34b', 'font-family': 'Arial, sans-serif', 'font-weight': 700, 'font-size': 21, ...options });
  node.textContent = text;
  return node;
};
const safeText = value => String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 512);
const safeSeconds = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

/** Framework-free DECK 90 display. No network, dependencies or automatic playback. */
class Deck90Display {
  constructor(root, options = {}) {
    if (!root?.appendChild) throw new TypeError('A container element is required.');
    this.root = root;
    this.options = { referenceDb: -12, attackMs: 90, releaseMs: 260, scrollSpeed: 45, scrollDelay: 1800, ...options };
    for (const [key, fallback] of Object.entries({ referenceDb: -12, attackMs: 90, releaseMs: 260, scrollSpeed: 45, scrollDelay: 1800 })) {
      if (!Number.isFinite(Number(this.options[key]))) this.options[key] = fallback;
      else this.options[key] = Number(this.options[key]);
    }
    this.options.scrollSpeed = Math.max(1, this.options.scrollSpeed);
    this.options.scrollDelay = Math.max(0, this.options.scrollDelay);
    this.id = `d90-${++nextId}`;
    this.state = {
      mode: 'radio',
      radio: { band: 'FM1', frequency: '102.3', preset: 12, live: false, name: '', ...options.radio },
      track: { title: '', artist: '', elapsed: 0, playing: false },
      levels: { left: 0, right: 0 },
    };
    this._visual = { left: 0, right: 0 };
    this._shown = { left: -1, right: -1 };
    this._motion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this._destroyed = false;
    this._audio = null;
    this._analysers = null;
    this._lastFrame = 0;
    this.root.classList.add('deck90-display');
    this.svg = svgNode('svg', { viewBox: '0 0 1188 207', width: 1188, height: 207, role: 'img', 'aria-label': 'DECK 90. Radio FM1 102.3', class: 'd90-screen' });
    this.svg.innerHTML = `<defs>
      <clipPath id="${this.id}-clip"><rect x="275" y="31" width="680" height="106"/></clipPath>
      <clipPath id="${this.id}-artist-clip"><rect x="275" y="123" width="680" height="31"/></clipPath>
      <filter id="${this.id}-glow" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="1.1" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`;
    this._background = svgNode('g', { 'data-layer': 'background' });
    const background = METER_DATA.background || '';
    this._background.innerHTML = background.replace(/id="([^"]+)"/g, (_, id) => `id="${this.id}-${id}"`).replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${this.id}-${id})`);
    this.svg.append(this._background);
    this._meterNodes = {};
    const channels = METER_DATA.channels;
    for (const channel of ['left', 'right']) {
      this._meterNodes[channel] = [];
      const group = svgNode('g', { 'data-channel': channel, fill: '#35544b' });
      const segments = Array.isArray(channels[channel]) ? channels[channel] : channels[channel].segments;
      for (const segment of segments) {
        const cell = svgNode('g', { 'data-level': segment.level, opacity: .36 });
        for (const d of segment.paths) cell.append(svgNode('path', { d }));
        group.append(cell);
        this._meterNodes[channel].push(cell);
      }
      this.svg.append(group);
    }
    this._status = svgNode('g', { 'data-layer': 'status' });
    this._titleClip = svgNode('g', { 'clip-path': `url(#${this.id}-clip)`, 'data-layer': 'title' });
    this._titleGroup = svgNode('g', { filter: `url(#${this.id}-glow)` });
    this._titleClip.append(this._titleGroup);
    this._artist = label('', 281, 143, { 'font-size': 17, fill: '#c3cf7a', 'letter-spacing': 1.4 });
    this._artist.setAttribute('data-layer', 'artist');
    this._artist.setAttribute('clip-path', `url(#${this.id}-artist-clip)`);
    this._footer = svgNode('g', { 'data-layer': 'footer' });
    this.svg.append(this._status, this._titleClip, this._artist, this._footer);
    this.root.replaceChildren(this.svg);
    this._motionHandler = () => this._renderText();
    this._motion?.addEventListener?.('change', this._motionHandler);
    this._renderText();
    this._tick = this._tick.bind(this);
    this._frame = requestAnimationFrame(this._tick);
  }

  getState() { return JSON.parse(JSON.stringify(this.state)); }

  setRadio(radio = {}) {
    this._assertAlive();
    for (const key of ['band', 'frequency', 'name']) if (key in radio) this.state.radio[key] = safeText(radio[key]);
    if ('live' in radio) { this.state.radio.live = Boolean(radio.live); if (!this.state.radio.live) { this.state.levels = { left: 0, right: 0 }; } }   // radio live
    if ('preset' in radio) this.state.radio.preset = Math.max(1, Math.min(99, Math.trunc(Number(radio.preset) || 1)));
    if (this.state.mode === 'radio') this._renderText();
    return this;
  }

  setTrack(track = {}) {
    this._assertAlive();
    if ('title' in track) this.state.track.title = safeText(track.title);
    if ('artist' in track) this.state.track.artist = safeText(track.artist);
    if ('elapsed' in track) this.state.track.elapsed = safeSeconds(track.elapsed);
    if ('playing' in track) return this.setPlayback(Boolean(track.playing));
    this._renderText();
    return this;
  }

  setPlayback(playing) {
    this._assertAlive();
    this.state.track.playing = Boolean(playing);
    this.state.mode = playing ? 'music' : 'radio';
    if (!playing) {
      this.state.levels = { left: 0, right: 0 };
      this._visual = { left: 0, right: 0 };
      this._paintMeters();
    }
    this._renderText();
    return this;
  }

  setElapsed(seconds) {
    this._assertAlive();
    this.state.track.elapsed = safeSeconds(seconds);
    this._renderFooter();
    return this;
  }

  /** Values are normalized display levels, 0..1. Does not change radio/music mode. */
  setLevels(left, right) {
    this._assertAlive();
    this.state.levels = { left: clamp(left), right: clamp(right) };
    return this;
  }

  /** Relative dB scale: -40 is empty, +3 is full; zero is the nominal level. */
  setDecibels(left, right) { return this.setLevels((Number(left) + 40) / 43, (Number(right) + 40) / 43); }

  /** Connect an existing stereo analysis graph without rerouting the application's sound. */
  connectAnalysers(left, right, options = {}) {
    this._assertAlive();
    if (!left?.getFloatTimeDomainData || !right?.getFloatTimeDomainData) throw new TypeError('Two time-domain AnalyserNodes are required.');
    this.disconnectAudio();
    if (Number.isFinite(options.referenceDb)) this.options.referenceDb = options.referenceDb;
    this._analysers = [left, right];
    this._samples = this._analysers.map(node => new Float32Array(node.fftSize));
    return this;
  }

  /** Call from a user gesture; never calls audio.play(). Reuses one source per audio element. */
  async connectAudio(audio) {
    this._assertAlive();
    if (!audio?.addEventListener || !('paused' in audio)) throw new TypeError('An HTML audio/video element is required.');
    if (this._audio === audio) return this;
    this.disconnectAudio();
    let graph = audioGraphs.get(audio);
    if (!graph) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) throw new Error('Web Audio is unavailable. Use setLevels() instead.');
      const context = new Context();
      let source;
      try { source = context.createMediaElementSource(audio); }
      catch (error) { void context.close(); throw new Error('This audio element already belongs to another audio graph. Use connectAnalysers() or setLevels().', { cause: error }); }
      const splitter = context.createChannelSplitter(2);
      const analysers = [context.createAnalyser(), context.createAnalyser()];
      for (const analyser of analysers) { analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0; }
      source.connect(context.destination); // One audible route; analysers never feed the speakers.
      source.connect(splitter);
      splitter.connect(analysers[0], 0);
      splitter.connect(analysers[1], 1);
      graph = { context, source, splitter, analysers };
      audioGraphs.set(audio, graph);
    }
    this._audio = audio;
    this._graph = graph;
    this._analysers = graph.analysers;
    this._samples = graph.analysers.map(node => new Float32Array(node.fftSize));
    this._audioHandlers = {
      play: () => { this.setPlayback(true); void this.resumeAudio(); },
      pause: () => this.setPlayback(false),
      ended: () => this.setPlayback(false),
      emptied: () => this.setPlayback(false),
      error: () => this.setPlayback(false),
      timeupdate: () => this.setElapsed(audio.currentTime),
    };
    for (const [event, handler] of Object.entries(this._audioHandlers)) audio.addEventListener(event, handler);
    this.setPlayback(!audio.paused && !audio.ended);
    if (globalThis.navigator?.userActivation?.isActive && graph.context.state === 'suspended') await graph.context.resume();
    return this;
  }

  async resumeAudio() {
    this._assertAlive();
    if (this._graph?.context.state === 'suspended') await this._graph.context.resume();
    return this;
  }

  disconnectAudio() {
    if (this._audio && this._audioHandlers) for (const [event, handler] of Object.entries(this._audioHandlers)) this._audio.removeEventListener(event, handler);
    this._audio = null;
    this._graph = null;
    this._audioHandlers = null;
    this._analysers = null;
    this._samples = null;
    return this;
  }

  /** A self-contained SVG snapshot: useful to export radio/music examples. */
  getSVG() {
    this._assertAlive();
    const clone = this.svg.cloneNode(true);
    clone.setAttribute('xmlns', NS);
    return new XMLSerializer().serializeToString(clone);
  }

  destroy() {
    if (this._destroyed) return;
    cancelAnimationFrame(this._frame);
    this.disconnectAudio();
    this._motion?.removeEventListener?.('change', this._motionHandler);
    this.root.replaceChildren();
    this.root.classList.remove('deck90-display');
    this._destroyed = true;
  }

  _assertAlive() { if (this._destroyed) throw new Error('This display was destroyed.'); }

  _drawSegmentText(text, height, ghost = true) {
    const font = FONT_DATA;
    const group = svgNode('g');
    const scale = height / font.height;
    let offset = 0;
    for (const char of text.toLocaleUpperCase('es').normalize('NFC')) {
      const glyph = font.glyphs[char] || font.glyphs['?'] || [];
      const active = new Set(Array.isArray(glyph) ? glyph : glyph.segments);
      const character = svgNode('g', { transform: `translate(${offset} 0) scale(${scale})` });
      if (ghost && char !== ' ') for (const [name, points] of Object.entries(font.segments)) {
        if (!/^(a1|a2|b|c|d1|d2|e|f|g1|g2|h|i|j|k|l|m)$/.test(name)) continue;
        character.append(svgNode('polygon', { points: points.map(p => p.join(',')).join(' '), fill: '#62751e', opacity: .47 }));
      }
      for (const name of active) {
        const points = font.segments[name];
        if (points) character.append(svgNode('polygon', { points: points.map(p => p.join(',')).join(' '), fill: '#ffdf4f', 'data-segment': name }));
      }
      group.append(character);
      offset += (font.advance || 112) * scale;
    }
    return { group, width: offset };
  }

  _renderText() {
    this._titleGroup.replaceChildren();
    this._status.replaceChildren();
    const music = this.state.mode === 'music';
    const title = music ? this.state.track.title || 'REPRODUCIENDO' : `${this.state.radio.band} ${this.state.radio.frequency}`;
    const text = this._drawSegmentText(title, music ? 84 : 96);
    this._titleWidth = text.width;
    this._titleY = music ? 33 : 31;
    this._scrollStarted = performance.now();
    this._scrollDistance = Math.max(0, text.width - 676);
    this._titleGroup.append(text.group);
    this._titleGroup.setAttribute('transform', `translate(278 ${this._titleY})`);
    this._status.append(svgNode('rect', { x: 151, y: 37, width: 111, height: 53, rx: 2, fill: 'none', stroke: '#dfc73e', 'stroke-width': 2 }));
    this._status.append(label(music ? 'PLAY' : 'STEREO', 158, 60, { fill: '#ffdd50', 'font-size': 23 }));
    this._status.append(label(music ? 'CD' : 'MONO', 159, 84, { fill: music ? '#ffdd50' : '#809641', 'font-size': 22 }));
    this._status.append(label(music ? 'TRACK' : 'LOCAL', 155, 115, { 'font-size': 21 }));
    this._artist.textContent = (music ? this.state.track.artist : this.state.radio.live ? this.state.radio.name : '').toLocaleUpperCase('es').slice(0, 42);   // radio live: the station
    this.svg.setAttribute('aria-label', music ? `DECK 90. Reproduciendo: ${title}${this.state.track.artist ? ', ' + this.state.track.artist : ''}` : `DECK 90. Radio ${this.state.radio.band} ${this.state.radio.frequency}`);
    this._renderFooter();
  }

  _renderFooter() {
    this._footer.replaceChildren();
    this._footer.append(svgNode('rect', { x: 289, y: 159, width: 107, height: 27, rx: 3, fill: '#e32322', opacity: .95 }));
    this._footer.append(label('S-HDB', 299, 180, { fill: '#ffde46', 'font-size': 24 }));
    const music = this.state.mode === 'music';
    if (music) {
      const seconds = Math.floor(this.state.track.elapsed);
      const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      this._footer.append(label('STEREO', 423, 180, { 'font-size': 23 }));
      this._footer.append(label(time, 581, 180, { fill: '#ffdd50', 'font-size': 24, 'letter-spacing': 2 }));
      this._footer.append(label('CD', 786, 180, { 'font-size': 22 }));
      this._footer.append(label('PLAY', 865, 180, { fill: '#c8d997', 'font-size': 22 }));
    } else {
      for (const [text, x] of [['LOUD', 423], ['MTL', 521], ['B-SKIP', 660], ['REP', 783], ['RAND', 866]]) this._footer.append(label(text, x, 180, { 'font-size': 22 }));
      this._footer.append(label(String(this.state.radio.preset), 956, 121, { fill: '#ffdf4f', 'font-size': 45 }));
    }
  }

  _paintMeters() {
    for (const channel of ['left', 'right']) {
      const count = this._meterNodes[channel].length;
      const on = this.state.mode === 'music' || this.state.radio.live ? Math.round(this._visual[channel] * count) : 0;   // radio live
      if (on === this._shown[channel]) continue;
      this._shown[channel] = on;
      for (const node of this._meterNodes[channel]) {
        const lit = Number(node.getAttribute('data-level')) < on;
        node.setAttribute('fill', lit ? '#c5f4df' : '#35544b');
        node.setAttribute('opacity', lit ? '1' : '.36');
      }
    }
  }

  _tick(now) {
    if (this._destroyed) return;
    const dt = Math.min(100, this._lastFrame ? now - this._lastFrame : 16);
    this._lastFrame = now;
    if (this._analysers && this.state.track.playing) {
      const levels = this._analysers.map((analyser, channel) => {
        const samples = this._samples[channel];
        analyser.getFloatTimeDomainData(samples);
        let squares = 0;
        for (const sample of samples) squares += sample * sample;
        const rms = Math.sqrt(squares / samples.length);
        const db = 20 * Math.log10(Math.max(1e-7, rms)) - this.options.referenceDb;
        return clamp((db + 40) / 43);
      });
      this.state.levels = { left: levels[0], right: levels[1] };
    }
    for (const channel of ['left', 'right']) {
      const target = this.state.mode === 'music' || this.state.radio.live ? this.state.levels[channel] : 0;   // radio live
      const time = target > this._visual[channel] ? this.options.attackMs : this.options.releaseMs;
      this._visual[channel] += (target - this._visual[channel]) * (1 - Math.exp(-dt / Math.max(1, time)));
    }
    this._paintMeters();
    if (this._scrollDistance > 0 && !this._motion?.matches) {
      const elapsed = now - this._scrollStarted;
      const travel = this._scrollDistance / this.options.scrollSpeed * 1000;
      const cycle = this.options.scrollDelay * 2 + travel * 2;
      const phase = elapsed % cycle;
      let x = 0;
      if (phase > this.options.scrollDelay && phase < this.options.scrollDelay + travel) x = (phase - this.options.scrollDelay) / 1000 * this.options.scrollSpeed;
      else if (phase >= this.options.scrollDelay + travel && phase < this.options.scrollDelay * 2 + travel) x = this._scrollDistance;
      else if (phase >= this.options.scrollDelay * 2 + travel) x = this._scrollDistance - (phase - this.options.scrollDelay * 2 - travel) / 1000 * this.options.scrollSpeed;
      this._titleGroup.setAttribute('transform', `translate(${278 - x} ${this._titleY})`);
    }
    this._frame = requestAnimationFrame(this._tick);
  }
}



globalThis.Deck90Display = Deck90Display;
})(globalThis);
