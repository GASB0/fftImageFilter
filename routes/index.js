const express = require('express');
const fs = require('fs');
const router = express.Router();
const postgres = require('postgres');
const crypto = require('crypto');

const { spawn } = require('node:child_process');
const multer = require('multer');

// Postgres configuration

const sql = postgres({
  host: 'localhost',
  port: 6666,
  database: 'noise_remover',
  username: 'postgres',
  password: '',
})

// Multer configurations
const multerMemStorage = multer.memoryStorage();
const upload = multer({ storage: multerMemStorage });

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/fourier_app', function(req, res, next) {
  // Generacion del Cookie para la identificacion de la session.
  let cookieID = crypto.randomUUID();
  res.cookie('SessionID', cookieID);

  // Adicion de un nuevo cookie de session a la base de datos
  sql`
   INSERT INTO sessions (id) values (${cookieID});
  `.then(() => {
    console.log(cookieID);
  })

  // Renderizacion de la pagina que servira como interfaz.
  res.render('fourier_app', { title: 'the Fourier app!' });
});

router.post('/listener', upload.single('file'), (req, res) => {

  // Configuracion de los comandos para el procesamiento
  const convert = spawn('magick', ['-', '-fft', 'MIFF:-']);
  convert.stderr.pipe(process.stdout);
  const log_scaling = spawn('magick', ['-[0]', '-auto-level', '-evaluate', 'log', '10000', 'PNG:-']);
  log_scaling.stderr.pipe(process.stdout);

  convert.stdout.pipe(log_scaling.stdin); // Escalando las imagenes

  convert.on('spawn', () => {
    convert.stdin.write(req.file.buffer);
    convert.stdin.end();
  });

  convert.stdin.on('finish', () => {
    console.log('Ya se ha terminado de recibir la imagen.');
  });

  let bufferList = [];
  convert.stdout.on('data', (chunk) => {
    bufferList.push(chunk);
  });

  convert.stdout.on('end', () => {
    let imageBuffer = Buffer.concat(bufferList);
    const magickInfo = spawn('magick', ['-', 'info:-']);
    magickInfo.stdout.pipe(process.stdout);

    sql`
    UPDATE sessions SET fft_files = ${imageBuffer} WHERE id = ${req.cookies.SessionID};
    `.then(() => {
      console.log('Archivos de FFT insertada');
    });

    magickInfo.on('spawn', () => {
      magickInfo.stdin.write(imageBuffer);
      magickInfo.stdin.end();
    });
  });

  let logBufferList = [];
  log_scaling.stdout.on('data', (chunk) => {
    logBufferList.push(chunk)
  });

  log_scaling.stdout.on('end', () => {
    let logImageBuffer = Buffer.concat(logBufferList);
    res.status(200).send(logImageBuffer);
    res.end();
  });

});

router.post('/submit', upload.single('file'), (req, res) => {
  // TODO: Agregar mecanismos de seguridad para accede a esta ruta
  // Los unicos capaces de acceder a esta ruta son los que hayan generado un 
  // layer de doodle que vayan a enviar. Debe ser posible utilizar cookies 
  // para estos fines.
  console.log(req.cookies.SessionID);
  let doodleImageBuffer = req.file.buffer;
  console.log();

  sql`SELECT fft_files FROM sessions 
      WHERE id = ${req.cookies.SessionID}
     `.then((result) => {
    // Declaracion de los procesos para la manipulacion de las imagenes.
    const magick = spawn('convert', ['-', '-alpha', 'extract', '-negate', 'PNG:-']);

    // Extraccion de mascara a partir del doodle
    magick.stdin.write(doodleImageBuffer);
    magick.stdin.end();

    let doodleBuffer = [];
    magick.stdout.on('data', (chunk) => {
      doodleBuffer.push(chunk);
    });

    magick.stdout.on('end', () => {
      const doodleMask = Buffer.concat(doodleBuffer);

      //// Seccion de extraccion del par de imagenes del archivo .miff
      const convert = spawn('magick', ['-', '(', '-clone', '0', '-clone', '2', '-compose', 'multiply', '-composite', ')', '-swap', '0', '+delete', '+delete', '-ift', 'PNG:-']);
      convert.stderr.pipe(process.stdout);
      const ffmpeg = spawn('ffmpeg', ['-i', '-', '-f', 'image2pipe', '-vcodec', 'ppm', '-']);
      ffmpeg.stderr.pipe(process.stdout);
      ffmpeg.stdout.pipe(convert.stdin);

      const magProm = extractPNGImageFromMiff(0, result[0].fft_files);
      const phaseProm = extractPNGImageFromMiff(1, result[0].fft_files);
      magProm.then(magBuffer => {
        phaseProm.then(phaseBuffer => {
          ffmpeg.stdin.write(magBuffer);
          ffmpeg.stdin.write(phaseBuffer);
          ffmpeg.stdin.write(doodleMask);
          ffmpeg.stdin.end();

          let imageRec = [];
          convert.stdout.on('data', (chunk) => {
            imageRec.push(chunk);
          });

          convert.stdout.on('end', () => {
            let procesedImage = Buffer.concat(imageRec);
            res.status(200).send(procesedImage);
            res.end();
          });
        });
      });
    });
  });

});

function extractPNGImageFromMiff(index, miffBuffer) {
  return new Promise((resolve, rejects) => {
    const magick = spawn('magick', [`-[${index}]`, 'PNG:-']);
    magick.stdin.write(miffBuffer);
    magick.stdin.end();

    let bufferList = []
    magick.stdout.on('data', (chunk) => {
      bufferList.push(chunk);
    });

    magick.stdout.on('end', () => {
      imageBuffer = Buffer.concat(bufferList);
      resolve(imageBuffer);
    });
  })
}

module.exports = router;
