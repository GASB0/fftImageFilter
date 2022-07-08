const express = require('express');
const fs = require('fs');
const router = express.Router();
const postgres = require('postgres');
const crypto = require('crypto');

const { spawn } = require('node:child_process');
const multer = require('multer');

// Multer configurations
const multerMemStorage = multer.memoryStorage();
const upload = multer({ storage: multerMemStorage });

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/fourier_app', function(req, res, next) {
  // Generacion del Cookie para la identificacion de la session.
  res.cookie('SessionID', crypto.randomUUID());
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
  console.log(req.file.buffer);
  fs.appendFile('dammit', req.file.buffer, err => {
    if (err) { console.log(err); return; }
    console.log('The file has been written!');
  })
  res.end('Done, m8s');
});

module.exports = router;
