/* DECK 90 display — generated from the included editable sources.
   Deck 90 7.7: two small additions for the stereo's internet radio, marked "radio live": setRadio({ live, name })
   lets the L/R meters follow the sound on the radio screen too, and shows the station's name under the frequency;
   7.8.3: setRadio({ mono }) lights MONO instead of STEREO (an AM station), and the L/R meters' cells
   (METER_DATA.channels) were redrawn like the real DP940's: curved columns that step up from the inside out, the
   bottom rows reaching in under the status labels, the top ones short (made by a small script from the same 14
   levels, two to six cells a row). */
(function(globalThis){
'use strict';
/** Original DECK 90 16-segment geometry. Coordinates use SVG y-down. */
const FONT_DATA = {"name":"DECK 90 Segment","version":"1.0","description":"Original 16-segment display lettering inspired by 1990s car-audio LCDs; not a recovered manufacturer font.","width":100,"height":150,"advance":112,"coordinateSystem":"SVG; origin upper left; x rightward, y downward","baseSegments":["a1","a2","b","c","d1","d2","e","f","g1","g2","h","i","j","k","l","m"],"segments":{"a1":[[19.5,22.5],[42.5,22.5],[47,18],[42.5,13.5],[19.5,13.5],[15,18]],"a2":[[57.5,22.5],[80.5,22.5],[85,18],[80.5,13.5],[57.5,13.5],[53,18]],"b":[[84.5,29.5],[84.5,63.5],[89,68],[93.5,63.5],[93.5,29.5],[89,25]],"c":[[84.5,91.5],[84.5,126.5],[89,131],[93.5,126.5],[93.5,91.5],[89,87]],"d1":[[19.5,144.5],[42.5,144.5],[47,140],[42.5,135.5],[19.5,135.5],[15,140]],"d2":[[57.5,144.5],[80.5,144.5],[85,140],[80.5,135.5],[57.5,135.5],[53,140]],"e":[[6.5,91.5],[6.5,126.5],[11,131],[15.5,126.5],[15.5,91.5],[11,87]],"f":[[6.5,29.5],[6.5,63.5],[11,68],[15.5,63.5],[15.5,29.5],[11,25]],"g1":[[21.0,82.0],[41.0,82.0],[45,78],[41.0,74.0],[21.0,74.0],[17,78]],"g2":[[59.0,82.0],[79.0,82.0],[83,78],[79.0,74.0],[59.0,74.0],[55,78]],"h":[[18.91,32.83],[39.17,64.91],[44,66],[45.09,61.17],[24.83,29.09],[20,28]],"i":[[46.5,30.5],[46.5,62.5],[50,66],[53.5,62.5],[53.5,30.5],[50,27]],"j":[[75.17,29.09],[54.91,61.17],[56,66],[60.83,64.91],[81.09,32.83],[80,28]],"k":[[24.8,128.8],[45.2,94.8],[44,90],[39.2,91.2],[18.8,125.2],[20,130]],"l":[[46.5,93.5],[46.5,127.5],[50,131],[53.5,127.5],[53.5,93.5],[50,90]],"m":[[81.2,125.2],[60.8,91.2],[56,90],[54.8,94.8],[75.2,128.8],[80,130]],"dot":[[44,132],[53,132],[53,141],[44,141]],"dotUpper":[[44,48],[53,48],[53,57],[44,57]],"dotLower":[[44,101],[53,101],[53,110],[44,110]],"comma":[[45,131],[54,131],[54,141],[46,149],[48,140],[45,140]],"apostrophe":[[46.78,20.59],[43.41,34.78],[46,39],[50.22,36.41],[53.59,22.22],[51,18]],"quoteLeft":[[35.57,20.5],[33.5,33.57],[36,37],[39.43,34.5],[41.5,21.43],[39,18]],"quoteRight":[[58.57,20.5],[56.5,33.57],[59,37],[62.43,34.5],[64.5,21.43],[62,18]],"acute":[[48,9],[58,0],[67,0],[57,9]],"grave":[[33,0],[42,0],[52,9],[43,9]],"tilde":[[29,6],[38,0],[47,0],[57,5],[66,0],[72,4],[61,10],[53,10],[43,5],[35,10]],"umlautLeft":[[30,1],[39,1],[39,9],[30,9]],"umlautRight":[[61,1],[70,1],[70,9],[61,9]],"circumflex":[[33,10],[47,0],[54,0],[68,10],[57,10],[50,5],[43,10]],"cedilla":[[47,143],[56,143],[59,148],[46,150],[43,147],[50,146]]},"glyphs":{" ":[],"0":["a1","a2","b","c","d1","d2","e","f","j","k"],"1":["b","c"],"2":["a1","a2","b","g1","g2","e","d1","d2"],"3":["a1","a2","b","c","d1","d2","g1","g2"],"4":["f","g1","g2","b","c"],"5":["a1","a2","f","g1","g2","c","d1","d2"],"6":["a1","a2","f","e","d1","d2","c","g1","g2"],"7":["a1","a2","b","c"],"8":["a1","a2","b","c","d1","d2","e","f","g1","g2"],"9":["a1","a2","b","c","d1","d2","f","g1","g2"],"A":["a1","a2","b","c","e","f","g1","g2"],"B":["a1","a2","b","c","d1","d2","g2","i","l"],"C":["a1","a2","d1","d2","e","f"],"D":["a1","a2","b","c","d1","d2","i","l"],"E":["a1","a2","d1","d2","e","f","g1","g2"],"F":["a1","a2","e","f","g1","g2"],"G":["a1","a2","c","d1","d2","e","f","g2"],"H":["b","c","e","f","g1","g2"],"I":["a1","a2","d1","d2","i","l"],"J":["b","c","d1","d2","e"],"K":["e","f","j","m"],"L":["d1","d2","e","f"],"M":["b","c","e","f","h","j"],"N":["b","c","e","f","h","m"],"O":["a1","a2","b","c","d1","d2","e","f"],"P":["a1","a2","b","e","f","g1","g2"],"Q":["a1","a2","b","c","d1","d2","e","f","m"],"R":["a1","a2","b","e","f","g1","g2","m"],"S":["a1","a2","c","d1","d2","f","g1","g2"],"T":["a1","a2","i","l"],"U":["b","c","d1","d2","e","f"],"V":["e","f","j","k"],"W":["b","c","e","f","k","m"],"X":["h","j","k","m"],"Y":["h","j","l"],"Z":["a1","a2","j","k","d1","d2"],"-":["g1","g2"],"_":["d1","d2"],"=":["g1","g2","d1","d2"],"+":["g1","g2","i","l"],"/":["j","k"],"\\":["h","m"],".":["dot"],",":["comma"],":":["dotUpper","dotLower"],";":["dotUpper","comma"],"'":["apostrophe"],"\"":["quoteLeft","quoteRight"],"!":["i","l","dot"],"?":["a1","a2","b","g2","l","dot"],"[":["a1","d1","e","f"],"]":["a2","b","c","d2"],"(":["j","m"],")":["h","k"],"|":["i","l"],"*":["g1","g2","h","j","k","m"],"#":["b","c","e","f","g1","g2"],"%":["j","k","dotUpper","dotLower"],"&":["a1","f","g1","g2","e","d1","d2","m"],"@":["a1","a2","b","c","d2","e","f","g2","l"],"$":["a1","a2","f","g1","g2","c","d1","d2","i","l"],"<":["j","m"],">":["h","k"],"^":["h","j"],"`":["grave"],"{":["a1","f","g1","e","d1"],"}":["a2","b","g2","c","d2"],"~":["tilde"],"−":["g1","g2"],"–":["g1","g2"],"—":["g1","g2"],"·":["dotUpper"],"…":["dot"],"°":["a1","i","g1","f"],"¡":["i","l","dot"],"¿":["a1","a2","f","g1","i","dot"],"a":["a1","a2","b","c","e","f","g1","g2"],"b":["a1","a2","b","c","d1","d2","g2","i","l"],"c":["a1","a2","d1","d2","e","f"],"d":["a1","a2","b","c","d1","d2","i","l"],"e":["a1","a2","d1","d2","e","f","g1","g2"],"f":["a1","a2","e","f","g1","g2"],"g":["a1","a2","c","d1","d2","e","f","g2"],"h":["b","c","e","f","g1","g2"],"i":["a1","a2","d1","d2","i","l"],"j":["b","c","d1","d2","e"],"k":["e","f","j","m"],"l":["d1","d2","e","f"],"m":["b","c","e","f","h","j"],"n":["b","c","e","f","h","m"],"o":["a1","a2","b","c","d1","d2","e","f"],"p":["a1","a2","b","e","f","g1","g2"],"q":["a1","a2","b","c","d1","d2","e","f","m"],"r":["a1","a2","b","e","f","g1","g2","m"],"s":["a1","a2","c","d1","d2","f","g1","g2"],"t":["a1","a2","i","l"],"u":["b","c","d1","d2","e","f"],"v":["e","f","j","k"],"w":["b","c","e","f","k","m"],"x":["h","j","k","m"],"y":["h","j","l"],"z":["a1","a2","j","k","d1","d2"],"Á":["a1","a2","b","c","e","f","g1","g2","acute"],"É":["a1","a2","d1","d2","e","f","g1","g2","acute"],"Í":["a1","a2","d1","d2","i","l","acute"],"Ó":["a1","a2","b","c","d1","d2","e","f","acute"],"Ú":["b","c","d1","d2","e","f","acute"],"Ý":["h","j","l","acute"],"À":["a1","a2","b","c","e","f","g1","g2","grave"],"È":["a1","a2","d1","d2","e","f","g1","g2","grave"],"Ì":["a1","a2","d1","d2","i","l","grave"],"Ò":["a1","a2","b","c","d1","d2","e","f","grave"],"Ù":["b","c","d1","d2","e","f","grave"],"Â":["a1","a2","b","c","e","f","g1","g2","circumflex"],"Ê":["a1","a2","d1","d2","e","f","g1","g2","circumflex"],"Î":["a1","a2","d1","d2","i","l","circumflex"],"Ô":["a1","a2","b","c","d1","d2","e","f","circumflex"],"Û":["b","c","d1","d2","e","f","circumflex"],"Ñ":["b","c","e","f","h","m","tilde"],"Ã":["a1","a2","b","c","e","f","g1","g2","tilde"],"Õ":["a1","a2","b","c","d1","d2","e","f","tilde"],"Ü":["b","c","d1","d2","e","f","umlautLeft","umlautRight"],"Ä":["a1","a2","b","c","e","f","g1","g2","umlautLeft","umlautRight"],"Ë":["a1","a2","d1","d2","e","f","g1","g2","umlautLeft","umlautRight"],"Ï":["a1","a2","d1","d2","i","l","umlautLeft","umlautRight"],"Ö":["a1","a2","b","c","d1","d2","e","f","umlautLeft","umlautRight"],"Ç":["a1","a2","d1","d2","e","f","cedilla"],"á":["a1","a2","b","c","e","f","g1","g2","acute"],"é":["a1","a2","d1","d2","e","f","g1","g2","acute"],"í":["a1","a2","d1","d2","i","l","acute"],"ó":["a1","a2","b","c","d1","d2","e","f","acute"],"ú":["b","c","d1","d2","e","f","acute"],"ý":["h","j","l","acute"],"à":["a1","a2","b","c","e","f","g1","g2","grave"],"è":["a1","a2","d1","d2","e","f","g1","g2","grave"],"ì":["a1","a2","d1","d2","i","l","grave"],"ò":["a1","a2","b","c","d1","d2","e","f","grave"],"ù":["b","c","d1","d2","e","f","grave"],"â":["a1","a2","b","c","e","f","g1","g2","circumflex"],"ê":["a1","a2","d1","d2","e","f","g1","g2","circumflex"],"î":["a1","a2","d1","d2","i","l","circumflex"],"ô":["a1","a2","b","c","d1","d2","e","f","circumflex"],"û":["b","c","d1","d2","e","f","circumflex"],"ñ":["b","c","e","f","h","m","tilde"],"ã":["a1","a2","b","c","e","f","g1","g2","tilde"],"õ":["a1","a2","b","c","d1","d2","e","f","tilde"],"ü":["b","c","d1","d2","e","f","umlautLeft","umlautRight"],"ä":["a1","a2","b","c","e","f","g1","g2","umlautLeft","umlautRight"],"ë":["a1","a2","d1","d2","e","f","g1","g2","umlautLeft","umlautRight"],"ï":["a1","a2","d1","d2","i","l","umlautLeft","umlautRight"],"ö":["a1","a2","b","c","d1","d2","e","f","umlautLeft","umlautRight"],"ç":["a1","a2","d1","d2","e","f","cedilla"]},"fallback":"?","uppercase":true};


const METER_DATA = {"width":1188,"height":207,"viewBox":[0,0,1188,207],"levels":14,"levelOrder":"bottom-to-top","onColor":"#C9F7E6","offColor":"#3C503D","glowFilterId":"d90-meter-glow","background":"<defs>\n  <linearGradient id=\"d90-frame-metal\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n    <stop offset=\"0\" stop-color=\"#6D6E70\"/><stop offset=\".07\" stop-color=\"#222427\"/>\n    <stop offset=\".48\" stop-color=\"#101113\"/><stop offset=\".9\" stop-color=\"#353638\"/>\n    <stop offset=\"1\" stop-color=\"#101012\"/>\n  </linearGradient>\n  <linearGradient id=\"d90-frame-bevel\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n    <stop offset=\"0\" stop-color=\"#0A0A0C\"/><stop offset=\".13\" stop-color=\"#26272A\"/>\n    <stop offset=\".45\" stop-color=\"#07080A\"/><stop offset=\"1\" stop-color=\"#55545A\"/>\n  </linearGradient>\n  <linearGradient id=\"d90-lcd-film\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n    <stop offset=\"0\" stop-color=\"#4D203C\"/><stop offset=\".25\" stop-color=\"#681E43\"/>\n    <stop offset=\".7\" stop-color=\"#5F193B\"/><stop offset=\"1\" stop-color=\"#3C162B\"/>\n  </linearGradient>\n  <linearGradient id=\"d90-glass-edge\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n    <stop offset=\"0\" stop-color=\"#FFFFFF\" stop-opacity=\".12\"/>\n    <stop offset=\".18\" stop-color=\"#FFFFFF\" stop-opacity=\".015\"/>\n    <stop offset=\"1\" stop-color=\"#000000\" stop-opacity=\".12\"/>\n  </linearGradient>\n  <filter id=\"d90-meter-glow\" x=\"-18%\" y=\"-35%\" width=\"136%\" height=\"170%\" color-interpolation-filters=\"sRGB\">\n    <feGaussianBlur in=\"SourceGraphic\" stdDeviation=\"1.05\" result=\"blur\"/>\n    <feComponentTransfer in=\"blur\" result=\"halo\"><feFuncA type=\"linear\" slope=\".34\"/></feComponentTransfer>\n    <feMerge><feMergeNode in=\"halo\"/><feMergeNode in=\"SourceGraphic\"/></feMerge>\n  </filter>\n</defs>\n<g id=\"d90-frame\">\n  <rect x=\"1.5\" y=\"1.5\" width=\"1185\" height=\"204\" rx=\"19\" fill=\"url(#d90-frame-metal)\" stroke=\"#070809\" stroke-width=\"3\"/>\n  <rect x=\"8\" y=\"8\" width=\"1172\" height=\"191\" rx=\"14\" fill=\"url(#d90-frame-bevel)\" stroke=\"#7B7D7F\" stroke-opacity=\".22\"/>\n  <rect x=\"17\" y=\"17\" width=\"1154\" height=\"173\" rx=\"9\" fill=\"#0B0A0D\"/>\n  <rect x=\"23\" y=\"24\" width=\"1142\" height=\"157\" rx=\"5\" fill=\"url(#d90-lcd-film)\"/>\n  <rect x=\"23\" y=\"24\" width=\"1142\" height=\"157\" rx=\"5\" fill=\"url(#d90-glass-edge)\"/>\n  <path d=\"M30 23.5H1158\" fill=\"none\" stroke=\"#020204\" stroke-width=\"3\" stroke-opacity=\".7\"/>\n  <path d=\"M28 182H1160\" fill=\"none\" stroke=\"#C6BCC4\" stroke-width=\"1\" stroke-opacity=\".13\"/>\n</g>\n<g id=\"d90-channel-labels\" fill=\"#D4E7D9\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"23\" font-weight=\"700\">\n  <text x=\"28\" y=\"44\">L</text><text x=\"1142\" y=\"44\">R</text>\n</g>","titleRect":{"x":275,"y":44,"width":690,"height":92},"meterBounds":{"left":{"x":37,"y":39,"width":169.916,"height":109.6},"right":{"x":981.084,"y":39,"width":169.916,"height":109.6}},"channels":{"left":[{"level":0,"paths":["M37.061 143 L65.061 143 L65 148.6 L37 148.6 Z","M68.061 143 L96.061 143 L96 148.6 L68 148.6 Z","M99.061 143 L125.061 143 L125 148.6 L99 148.6 Z","M128.061 143 L154.061 143 L154 148.6 L128 148.6 Z","M157.061 143 L181.061 143 L181 148.6 L157 148.6 Z","M184.061 143 L206.061 143 L206 148.6 L184 148.6 Z"],"points":[[[37.061,143],[65.061,143],[65,148.6],[37,148.6]],[[68.061,143],[96.061,143],[96,148.6],[68,148.6]],[[99.061,143],[125.061,143],[125,148.6],[99,148.6]],[[128.061,143],[154.061,143],[154,148.6],[128,148.6]],[[157.061,143],[181.061,143],[181,148.6],[157,148.6]],[[184.061,143],[206.061,143],[206,148.6],[184,148.6]]]},{"level":1,"paths":["M37.361 135 L65.361 135 L65.125 140.6 L37.125 140.6 Z","M68.361 135 L96.361 135 L96.125 140.6 L68.125 140.6 Z","M99.361 135 L125.361 135 L125.125 140.6 L99.125 140.6 Z","M128.361 135 L154.361 135 L154.125 140.6 L128.125 140.6 Z","M157.361 135 L181.361 135 L181.125 140.6 L157.125 140.6 Z","M184.361 135 L206.361 135 L206.125 140.6 L184.125 140.6 Z"],"points":[[[37.361,135],[65.361,135],[65.125,140.6],[37.125,140.6]],[[68.361,135],[96.361,135],[96.125,140.6],[68.125,140.6]],[[99.361,135],[125.361,135],[125.125,140.6],[99.125,140.6]],[[128.361,135],[154.361,135],[154.125,140.6],[128.125,140.6]],[[157.361,135],[181.361,135],[181.125,140.6],[157.125,140.6]],[[184.361,135],[206.361,135],[206.125,140.6],[184.125,140.6]]]},{"level":2,"paths":["M37.916 127 L65.916 127 L65.5 132.6 L37.5 132.6 Z","M68.916 127 L96.916 127 L96.5 132.6 L68.5 132.6 Z","M99.916 127 L125.916 127 L125.5 132.6 L99.5 132.6 Z","M128.916 127 L154.916 127 L154.5 132.6 L128.5 132.6 Z","M157.916 127 L181.916 127 L181.5 132.6 L157.5 132.6 Z","M184.916 127 L206.916 127 L206.5 132.6 L184.5 132.6 Z"],"points":[[[37.916,127],[65.916,127],[65.5,132.6],[37.5,132.6]],[[68.916,127],[96.916,127],[96.5,132.6],[68.5,132.6]],[[99.916,127],[125.916,127],[125.5,132.6],[99.5,132.6]],[[128.916,127],[154.916,127],[154.5,132.6],[128.5,132.6]],[[157.916,127],[181.916,127],[181.5,132.6],[157.5,132.6]],[[184.916,127],[206.916,127],[206.5,132.6],[184.5,132.6]]]},{"level":3,"paths":["M38.735 119 L66.735 119 L66.133 124.6 L38.133 124.6 Z","M69.735 119 L97.735 119 L97.133 124.6 L69.133 124.6 Z","M100.735 119 L126.735 119 L126.133 124.6 L100.133 124.6 Z","M129.735 119 L155.735 119 L155.133 124.6 L129.133 124.6 Z","M158.735 119 L182.735 119 L182.133 124.6 L158.133 124.6 Z"],"points":[[[38.735,119],[66.735,119],[66.133,124.6],[38.133,124.6]],[[69.735,119],[97.735,119],[97.133,124.6],[69.133,124.6]],[[100.735,119],[126.735,119],[126.133,124.6],[100.133,124.6]],[[129.735,119],[155.735,119],[155.133,124.6],[129.133,124.6]],[[158.735,119],[182.735,119],[182.133,124.6],[158.133,124.6]]]},{"level":4,"paths":["M39.834 111 L67.834 111 L67.035 116.6 L39.035 116.6 Z","M70.834 111 L98.834 111 L98.035 116.6 L70.035 116.6 Z","M101.834 111 L127.834 111 L127.035 116.6 L101.035 116.6 Z"],"points":[[[39.834,111],[67.834,111],[67.035,116.6],[39.035,116.6]],[[70.834,111],[98.834,111],[98.035,116.6],[70.035,116.6]],[[101.834,111],[127.834,111],[127.035,116.6],[101.035,116.6]]]},{"level":5,"paths":["M41.235 103 L69.235 103 L68.222 108.6 L40.222 108.6 Z","M72.235 103 L100.235 103 L99.222 108.6 L71.222 108.6 Z","M103.235 103 L129.235 103 L128.222 108.6 L102.222 108.6 Z"],"points":[[[41.235,103],[69.235,103],[68.222,108.6],[40.222,108.6]],[[72.235,103],[100.235,103],[99.222,108.6],[71.222,108.6]],[[103.235,103],[129.235,103],[128.222,108.6],[102.222,108.6]]]},{"level":6,"paths":["M42.969 95 L70.969 95 L69.719 100.6 L41.719 100.6 Z","M73.969 95 L101.969 95 L100.719 100.6 L72.719 100.6 Z","M104.969 95 L130.969 95 L129.719 100.6 L103.719 100.6 Z"],"points":[[[42.969,95],[70.969,95],[69.719,100.6],[41.719,100.6]],[[73.969,95],[101.969,95],[100.719,100.6],[72.719,100.6]],[[104.969,95],[130.969,95],[129.719,100.6],[103.719,100.6]]]},{"level":7,"paths":["M45.083 87 L73.083 87 L71.561 92.6 L43.561 92.6 Z","M76.083 87 L104.083 87 L102.561 92.6 L74.561 92.6 Z"],"points":[[[45.083,87],[73.083,87],[71.561,92.6],[43.561,92.6]],[[76.083,87],[104.083,87],[102.561,92.6],[74.561,92.6]]]},{"level":8,"paths":["M47.643 79 L75.643 79 L73.8 84.6 L45.8 84.6 Z","M78.643 79 L106.643 79 L104.8 84.6 L76.8 84.6 Z"],"points":[[[47.643,79],[75.643,79],[73.8,84.6],[45.8,84.6]],[[78.643,79],[106.643,79],[104.8,84.6],[76.8,84.6]]]},{"level":9,"paths":["M50.757 71 L78.757 71 L76.513 76.6 L48.513 76.6 Z","M81.757 71 L109.757 71 L107.513 76.6 L79.513 76.6 Z"],"points":[[[50.757,71],[78.757,71],[76.513,76.6],[48.513,76.6]],[[81.757,71],[109.757,71],[107.513,76.6],[79.513,76.6]]]},{"level":10,"paths":["M54.606 63 L82.606 63 L79.824 68.6 L51.824 68.6 Z","M85.606 63 L113.606 63 L110.824 68.6 L82.824 68.6 Z"],"points":[[[54.606,63],[82.606,63],[79.824,68.6],[51.824,68.6]],[[85.606,63],[113.606,63],[110.824,68.6],[82.824,68.6]]]},{"level":11,"paths":["M59.549 55 L87.549 55 L83.95 60.6 L55.95 60.6 Z","M90.549 55 L118.549 55 L114.95 60.6 L86.95 60.6 Z"],"points":[[[59.549,55],[87.549,55],[83.95,60.6],[55.95,60.6]],[[90.549,55],[118.549,55],[114.95,60.6],[86.95,60.6]]]},{"level":12,"paths":["M66.544 47 L94.544 47 L89.353 52.6 L61.353 52.6 Z","M97.544 47 L125.544 47 L120.353 52.6 L92.353 52.6 Z"],"points":[[[66.544,47],[94.544,47],[89.353,52.6],[61.353,52.6]],[[97.544,47],[125.544,47],[120.353,52.6],[92.353,52.6]]]},{"level":13,"paths":["M83 39 L111 39 L97.488 44.6 L69.488 44.6 Z","M114 39 L142 39 L128.488 44.6 L100.488 44.6 Z"],"points":[[[83,39],[111,39],[97.488,44.6],[69.488,44.6]],[[114,39],[142,39],[128.488,44.6],[100.488,44.6]]]}],"right":[{"level":0,"paths":["M1151 148.6 L1123 148.6 L1122.939 143 L1150.939 143 Z","M1120 148.6 L1092 148.6 L1091.939 143 L1119.939 143 Z","M1089 148.6 L1063 148.6 L1062.939 143 L1088.939 143 Z","M1060 148.6 L1034 148.6 L1033.939 143 L1059.939 143 Z","M1031 148.6 L1007 148.6 L1006.939 143 L1030.939 143 Z","M1004 148.6 L982 148.6 L981.939 143 L1003.939 143 Z"],"points":[[[1151,148.6],[1123,148.6],[1122.939,143],[1150.939,143]],[[1120,148.6],[1092,148.6],[1091.939,143],[1119.939,143]],[[1089,148.6],[1063,148.6],[1062.939,143],[1088.939,143]],[[1060,148.6],[1034,148.6],[1033.939,143],[1059.939,143]],[[1031,148.6],[1007,148.6],[1006.939,143],[1030.939,143]],[[1004,148.6],[982,148.6],[981.939,143],[1003.939,143]]]},{"level":1,"paths":["M1150.875 140.6 L1122.875 140.6 L1122.639 135 L1150.639 135 Z","M1119.875 140.6 L1091.875 140.6 L1091.639 135 L1119.639 135 Z","M1088.875 140.6 L1062.875 140.6 L1062.639 135 L1088.639 135 Z","M1059.875 140.6 L1033.875 140.6 L1033.639 135 L1059.639 135 Z","M1030.875 140.6 L1006.875 140.6 L1006.639 135 L1030.639 135 Z","M1003.875 140.6 L981.875 140.6 L981.639 135 L1003.639 135 Z"],"points":[[[1150.875,140.6],[1122.875,140.6],[1122.639,135],[1150.639,135]],[[1119.875,140.6],[1091.875,140.6],[1091.639,135],[1119.639,135]],[[1088.875,140.6],[1062.875,140.6],[1062.639,135],[1088.639,135]],[[1059.875,140.6],[1033.875,140.6],[1033.639,135],[1059.639,135]],[[1030.875,140.6],[1006.875,140.6],[1006.639,135],[1030.639,135]],[[1003.875,140.6],[981.875,140.6],[981.639,135],[1003.639,135]]]},{"level":2,"paths":["M1150.5 132.6 L1122.5 132.6 L1122.084 127 L1150.084 127 Z","M1119.5 132.6 L1091.5 132.6 L1091.084 127 L1119.084 127 Z","M1088.5 132.6 L1062.5 132.6 L1062.084 127 L1088.084 127 Z","M1059.5 132.6 L1033.5 132.6 L1033.084 127 L1059.084 127 Z","M1030.5 132.6 L1006.5 132.6 L1006.084 127 L1030.084 127 Z","M1003.5 132.6 L981.5 132.6 L981.084 127 L1003.084 127 Z"],"points":[[[1150.5,132.6],[1122.5,132.6],[1122.084,127],[1150.084,127]],[[1119.5,132.6],[1091.5,132.6],[1091.084,127],[1119.084,127]],[[1088.5,132.6],[1062.5,132.6],[1062.084,127],[1088.084,127]],[[1059.5,132.6],[1033.5,132.6],[1033.084,127],[1059.084,127]],[[1030.5,132.6],[1006.5,132.6],[1006.084,127],[1030.084,127]],[[1003.5,132.6],[981.5,132.6],[981.084,127],[1003.084,127]]]},{"level":3,"paths":["M1149.867 124.6 L1121.867 124.6 L1121.265 119 L1149.265 119 Z","M1118.867 124.6 L1090.867 124.6 L1090.265 119 L1118.265 119 Z","M1087.867 124.6 L1061.867 124.6 L1061.265 119 L1087.265 119 Z","M1058.867 124.6 L1032.867 124.6 L1032.265 119 L1058.265 119 Z","M1029.867 124.6 L1005.867 124.6 L1005.265 119 L1029.265 119 Z"],"points":[[[1149.867,124.6],[1121.867,124.6],[1121.265,119],[1149.265,119]],[[1118.867,124.6],[1090.867,124.6],[1090.265,119],[1118.265,119]],[[1087.867,124.6],[1061.867,124.6],[1061.265,119],[1087.265,119]],[[1058.867,124.6],[1032.867,124.6],[1032.265,119],[1058.265,119]],[[1029.867,124.6],[1005.867,124.6],[1005.265,119],[1029.265,119]]]},{"level":4,"paths":["M1148.965 116.6 L1120.965 116.6 L1120.166 111 L1148.166 111 Z","M1117.965 116.6 L1089.965 116.6 L1089.166 111 L1117.166 111 Z","M1086.965 116.6 L1060.965 116.6 L1060.166 111 L1086.166 111 Z"],"points":[[[1148.965,116.6],[1120.965,116.6],[1120.166,111],[1148.166,111]],[[1117.965,116.6],[1089.965,116.6],[1089.166,111],[1117.166,111]],[[1086.965,116.6],[1060.965,116.6],[1060.166,111],[1086.166,111]]]},{"level":5,"paths":["M1147.778 108.6 L1119.778 108.6 L1118.765 103 L1146.765 103 Z","M1116.778 108.6 L1088.778 108.6 L1087.765 103 L1115.765 103 Z","M1085.778 108.6 L1059.778 108.6 L1058.765 103 L1084.765 103 Z"],"points":[[[1147.778,108.6],[1119.778,108.6],[1118.765,103],[1146.765,103]],[[1116.778,108.6],[1088.778,108.6],[1087.765,103],[1115.765,103]],[[1085.778,108.6],[1059.778,108.6],[1058.765,103],[1084.765,103]]]},{"level":6,"paths":["M1146.281 100.6 L1118.281 100.6 L1117.031 95 L1145.031 95 Z","M1115.281 100.6 L1087.281 100.6 L1086.031 95 L1114.031 95 Z","M1084.281 100.6 L1058.281 100.6 L1057.031 95 L1083.031 95 Z"],"points":[[[1146.281,100.6],[1118.281,100.6],[1117.031,95],[1145.031,95]],[[1115.281,100.6],[1087.281,100.6],[1086.031,95],[1114.031,95]],[[1084.281,100.6],[1058.281,100.6],[1057.031,95],[1083.031,95]]]},{"level":7,"paths":["M1144.439 92.6 L1116.439 92.6 L1114.917 87 L1142.917 87 Z","M1113.439 92.6 L1085.439 92.6 L1083.917 87 L1111.917 87 Z"],"points":[[[1144.439,92.6],[1116.439,92.6],[1114.917,87],[1142.917,87]],[[1113.439,92.6],[1085.439,92.6],[1083.917,87],[1111.917,87]]]},{"level":8,"paths":["M1142.2 84.6 L1114.2 84.6 L1112.357 79 L1140.357 79 Z","M1111.2 84.6 L1083.2 84.6 L1081.357 79 L1109.357 79 Z"],"points":[[[1142.2,84.6],[1114.2,84.6],[1112.357,79],[1140.357,79]],[[1111.2,84.6],[1083.2,84.6],[1081.357,79],[1109.357,79]]]},{"level":9,"paths":["M1139.487 76.6 L1111.487 76.6 L1109.243 71 L1137.243 71 Z","M1108.487 76.6 L1080.487 76.6 L1078.243 71 L1106.243 71 Z"],"points":[[[1139.487,76.6],[1111.487,76.6],[1109.243,71],[1137.243,71]],[[1108.487,76.6],[1080.487,76.6],[1078.243,71],[1106.243,71]]]},{"level":10,"paths":["M1136.176 68.6 L1108.176 68.6 L1105.394 63 L1133.394 63 Z","M1105.176 68.6 L1077.176 68.6 L1074.394 63 L1102.394 63 Z"],"points":[[[1136.176,68.6],[1108.176,68.6],[1105.394,63],[1133.394,63]],[[1105.176,68.6],[1077.176,68.6],[1074.394,63],[1102.394,63]]]},{"level":11,"paths":["M1132.05 60.6 L1104.05 60.6 L1100.451 55 L1128.451 55 Z","M1101.05 60.6 L1073.05 60.6 L1069.451 55 L1097.451 55 Z"],"points":[[[1132.05,60.6],[1104.05,60.6],[1100.451,55],[1128.451,55]],[[1101.05,60.6],[1073.05,60.6],[1069.451,55],[1097.451,55]]]},{"level":12,"paths":["M1126.647 52.6 L1098.647 52.6 L1093.456 47 L1121.456 47 Z","M1095.647 52.6 L1067.647 52.6 L1062.456 47 L1090.456 47 Z"],"points":[[[1126.647,52.6],[1098.647,52.6],[1093.456,47],[1121.456,47]],[[1095.647,52.6],[1067.647,52.6],[1062.456,47],[1090.456,47]]]},{"level":13,"paths":["M1118.512 44.6 L1090.512 44.6 L1077 39 L1105 39 Z","M1087.512 44.6 L1059.512 44.6 L1046 39 L1074 39 Z"],"points":[[[1118.512,44.6],[1090.512,44.6],[1077,39],[1105,39]],[[1087.512,44.6],[1059.512,44.6],[1046,39],[1074,39]]]}]}};

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
      radio: { band: 'FM1', frequency: '102.3', preset: 12, live: false, name: '', mono: false, ...options.radio },
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
    if ('mono' in radio) this.state.radio.mono = Boolean(radio.mono);   // mono
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
    const mono = !music && this.state.radio.mono;   // mono: an AM station lights MONO, STEREO goes dark
    this._status.append(label(music ? 'PLAY' : 'STEREO', 158, 60, { fill: mono ? '#809641' : '#ffdd50', 'font-size': 23 }));
    this._status.append(label(music ? 'CD' : 'MONO', 159, 84, { fill: music || mono ? '#ffdd50' : '#809641', 'font-size': 22 }));
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
