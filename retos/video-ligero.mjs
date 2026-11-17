/* Códice Vivo · MP4 ligero de un reto para celular (lo usa retos/reproductor.js con data-video).
   Uso:  node retos/video-ligero.mjs <id> <mp4 de origen> [MB]
         node retos/video-ligero.mjs <id> --mapa        (solo vuelve a escribir el .json; no toca el MP4)
   Ej.:  node retos/video-ligero.mjs aplica-tiro-catapulta "C:\Users\Gato\Videos\codice-vivo\aplica-tiro-catapulta-voz.mp4"

   Escribe en assets/video/:
     <id>.mp4   720×1280, H.264 + AAC, faststart, con cuadro clave al final de cada pausa (ahí salta el reproductor)
     <id>.json  { duracion, pausas: [{ t0, tq, t1 }] } leído de plantilla/videos/<id>/ (index.html y compositions/pausas.html)
                t0 = empieza la pausa · tq = termina la pregunta grabada (voz-pN + 0.3 s, sin pisar el primer tic de la
                cuenta regresiva): ahí se detiene el reproductor · t1 = termina la pausa: ahí salta al acertar
   El tamaño se apunta a [MB] (9 si no se dice) con dos pasadas. Necesita ffmpeg en el PATH.
   El MP4 de origen es el render completo del video (el de TikTok): debe durar lo mismo que la composición. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [id, origen, mbTexto] = process.argv.slice(2);
const soloMapa = origen === '--mapa';
if (!id || !origen) { console.error('Uso: node retos/video-ligero.mjs <id> <mp4 de origen> [MB]'); process.exit(1); }
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const comp = path.join(raiz, 'plantilla', 'videos', id), salida = path.join(raiz, 'assets', 'video');
const MB = parseFloat(mbTexto) || 9;

/* ---------- Pausas: de la composición ---------- */
const atributo = (etiqueta, nombre) => { const m = new RegExp(nombre + '="([^"]*)"').exec(etiqueta); return m ? m[1] : null; };
const etiquetas = (html, patron) => html.match(new RegExp('<(?:div|audio)\\b[^>]*' + patron + '[^>]*>', 'g')) || [];
const index = fs.readFileSync(path.join(comp, 'index.html'), 'utf8');
const principal = etiquetas(index, 'data-composition-id="main"')[0];
const capa = etiquetas(index, 'data-composition-id="pausas"')[0];
if (!principal || !capa) throw new Error('No encontré la composición principal o la capa de pausas en ' + comp);
const duracion = parseFloat(atributo(principal, 'data-duration')), inicio = parseFloat(atributo(capa, 'data-start'));
const redondea = (n) => Math.round(n * 1000) / 1000;
const sonidos = etiquetas(index, 'data-start="[^"]*"').filter((e) => e.startsWith('<audio')).map((e) => parseFloat(atributo(e, 'data-start')));
const pausas = etiquetas(fs.readFileSync(path.join(comp, 'compositions', 'pausas.html'), 'utf8'), 'class="[^"]*\\bclip\\b[^"]*"')
  .map((e) => ({ t: parseFloat(atributo(e, 'data-start')), d: parseFloat(atributo(e, 'data-duration')) }))
  .sort((a, b) => a.t - b.t)
  .map((c, i) => {
    const t0 = redondea(inicio + c.t), t1 = redondea(inicio + c.t + c.d), voz = etiquetas(index, 'id="voz-p' + (i + 1) + '"')[0];
    let tq = t0;
    if (voz) {
      /* fin de la pregunta: lo que dura de verdad el mp3 (o lo que dice la etiqueta, lo menor) */
      const real = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(comp, atributo(voz, 'src'))], { encoding: 'utf8' }));
      const finVoz = parseFloat(atributo(voz, 'data-start')) + Math.min(real, parseFloat(atributo(voz, 'data-duration')));
      /* + 0.3 s, pero sin llegar al siguiente sonido de la pausa (el primer tic de la cuenta) */
      const siguiente = Math.min(...sonidos.filter((x) => x > finVoz - 0.01 && x < t1), t1);
      tq = redondea(Math.max(finVoz, Math.min(finVoz + 0.3, siguiente - 0.05)));
    }
    return { t0, tq, t1 };
  });
if (!pausas.length) throw new Error('La composición no tiene pausas');

const escribeMapa = () => fs.writeFileSync(path.join(salida, id + '.json'), JSON.stringify({ duracion, pausas }, null, 2) + String.fromCharCode(10));
const resumen = () => pausas.map((p) => p.t0 + ' → ' + p.tq + ' → ' + p.t1).join(', ');
if (soloMapa) { fs.mkdirSync(salida, { recursive: true }); escribeMapa(); console.log(`listo: assets/video/${id}.json con ${pausas.length} pausas (inicio → fin de la pregunta → fin): ${resumen()}`); process.exit(0); }

/* ---------- Video: 720p en dos pasadas, al tamaño pedido ---------- */
const dura = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', origen], { encoding: 'utf8' }));
if (Math.abs(dura - duracion) > 0.2) throw new Error(`El MP4 dura ${dura} s y la composición ${duracion} s: no es el render de este video`);
const AUDIO = 80, videoK = Math.floor(MB * 8000 / duracion - AUDIO - 6);   // kbit/s (6 de margen para el contenedor)
fs.mkdirSync(salida, { recursive: true });
const mp4 = path.join(salida, id + '.mp4'), bitacora = path.join(os.tmpdir(), 'video-ligero-' + id);
const comun = ['-y', '-i', origen, '-vf', 'scale=720:1280:flags=lanczos', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.0',
  '-pix_fmt', 'yuv420p', '-b:v', videoK + 'k', '-maxrate', Math.round(videoK * 1.6) + 'k', '-bufsize', videoK * 3 + 'k', '-g', '60',
  '-force_key_frames', pausas.map((p) => p.t1).join(','), '-passlogfile', bitacora];
const corre = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
console.log(`${id}: ${duracion} s → video a ${videoK} kbit/s + audio a ${AUDIO} kbit/s (objetivo ${MB} MB)`);
corre([...comun, '-pass', '1', '-an', '-f', 'null', os.platform() === 'win32' ? 'NUL' : '/dev/null']);
corre([...comun, '-pass', '2', '-c:a', 'aac', '-b:a', AUDIO + 'k', '-ac', '2', '-movflags', '+faststart', mp4]);
for (const f of fs.readdirSync(os.tmpdir())) if (f.startsWith('video-ligero-' + id)) fs.rmSync(path.join(os.tmpdir(), f), { force: true });

escribeMapa();
console.log(`listo: assets/video/${id}.mp4 (${(fs.statSync(mp4).size / 1048576).toFixed(1)} MB) y ${id}.json con ${pausas.length} pausas (inicio → fin de la pregunta → fin): ${resumen()}`);
