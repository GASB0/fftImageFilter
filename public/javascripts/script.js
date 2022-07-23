var previewWidth = 250;
var previewHeight = 250;
var pos = { x: 0, y: 0 };

// Configuraciones para el puntero al momento de entrar o salir a la parte del canvas
pencilWidth = 10; // Diametro del pincel por defecto

// TODO: Agregar varias funciones para la forma del cursor sobre el canvas de dibujado.

const selectedCursor = document.querySelector('.roundCursor');
selectedCursor.style.visibility = 'hidden';

document.getElementById('imageResult').onwheel = (ev) => {
  ev.preventDefault();
  if (ev.deltaY < 0) {
    pencilWidth += 2;
  } else {
    pencilWidth -= 2;
  }

  selectedCursor.style.height = `${pencilWidth}px`
  selectedCursor.style.width = `${pencilWidth}px`
}

document.getElementById('imageResult').onmouseenter = () => {
  selectedCursor.style.width = pencilWidth;
  selectedCursor.style.height = pencilWidth;
  document.getElementsByTagName('body')[0].style.cursor = `none`;
  selectedCursor.style.visibility = 'visible';
}

document.getElementById('imageResult').onmouseleave = () => {
  document.getElementsByTagName('body')[0].style.cursor = 'auto';
  selectedCursor.style.visibility = 'hidden';
}

const moveCursor = (e) => {
  // Debes de llevar primero el asunto a donde se encuentra el mouse.
  // Holly fricking crap, funciono. Lo que tengo que tratar de hacer ahora 
  // entender el por que esto funciona...
  selectedCursor.style.transform = `translate3d(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%), 0)`
}

function dragOverHandler(ev) {
  ev.preventDefault();
  console.log('File in drop zone');
  ev.target.classList.add("draggedOn");
}

function dragLeaveHandler(ev) {
  ev.target.classList.remove("draggedOn");
}

function dropHandler(ev) {
  // TODO: Agregar manera de "sanitize" las imagenes que se suben.
  // Seria una buena idea tratar de limitar o ajustar de forma automatica
  // la resolucion de la imagen subida y tambien limitar el numero de formatos
  // que se pueden subir.
  let url = '/listener';
  ev.preventDefault();
  console.log('Fichero arrastrados');

  if (ev.dataTransfer.items) {
    let imageFile = ev.dataTransfer.items[0];

    // Creating preview
    previewFile(imageFile.getAsFile())
      .then((widthxheight) => {
        let formData = new FormData();
        formData.append("file", imageFile.getAsFile());
        formData.append("dimensions", widthxheight);
        return fetch(url, { method: 'POST', body: formData })
      })
      .then(response => {
        document.getElementsByTagName('body')[0].style.cursor = 'progress';
        return StreamReader(response.body.getReader());
      })
      .then(stream => { return new Response(stream) })
      .then(response => { return response.blob() })
      .then(blob => { return URL.createObjectURL(blob) })
      .then(url => {
        let img = new Image();
        img.src = url;
        img.onload = () => {
          let doodleLayer = createCanvas(img);
          document.getElementsByTagName('body')[0].style.cursor = 'auto';
          insertSubmissionButton(doodleLayer);
          insertClearButton(doodleLayer);
        }
      })

    removeDragData(ev);
    const imageField = document.getElementById('imageField');
    imageField.classList.remove('imageContainer');
    imageField.classList.remove('draggedOn');
  }

  document.getElementById("defaultText").remove();
}

function removeDragData(ev) {
  ev.dataTransfer.items.clear();
}

function previewFile(file) {
  return new Promise((resolve, reject) => {
    // Esta funcion se llama cada vez que se tira una imagen en el espacio correspondiente.
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      let img = document.createElement('img');
      img.src = reader.result;
      img.onload = () => {
        document.getElementById('imageField').appendChild(img);
        resolve([img.width, img.height]);
      }
    }
  })
}

function createCanvas(img) {
  const canvasContainer = document.getElementById('imageResult');
  const imageLayer = document.createElement('canvas');
  imageLayer.width = img.width;
  imageLayer.height = img.height;
  imageLayer.style = "position: absolute; left: 0cm; top: 0cm; z-index: 0;";
  imageLayer.id = 'layer1';

  canvasContainer.appendChild(imageLayer);

  const doodleLayer = document.createElement('canvas');
  doodleLayer.width = img.width;
  doodleLayer.height = img.height;
  doodleLayer.style = "position: absolute; left: 0cm; top: 0cm; z-index: 1;";
  doodleLayer.id = 'layer2';

  canvasContainer.appendChild(doodleLayer);

  // Dibujando la imagen
  var imageContext = imageLayer.getContext('2d');
  imageContext.drawImage(img, 0, 0);
  funcionesDeDibujado(doodleLayer, img);
  return doodleLayer;
};

// TODO: Agreagar la posiblidad de borrar elementos dibujados sobre el canvas con el pincel
function funcionesDeDibujado(doodleLayer, img) {
  const imageToResizeCanvas = img;
  const drawingContext = doodleLayer.getContext('2d');

  resize(imageToResizeCanvas);

  function resize(img) {
    drawingContext.canvas.width = img.width;
    drawingContext.canvas.height = img.height;
  }

  function setPosition(e) {
    pos.x = e.offsetX;
    pos.y = e.offsetY;
  }

  function draw(e) {
    if (e.buttons !== 1) return;
    drawingContext.lineWidth = pencilWidth;
    drawingContext.lineCap = 'round';
    drawingContext.strokeStyle = '#c0392b';

    drawingContext.beginPath();
    drawingContext.moveTo(pos.x, pos.y);
    setPosition(e);
    drawingContext.lineTo(pos.x, pos.y);
    drawingContext.stroke();
  }

  window.addEventListener('load', resize);
  window.addEventListener('resize', resize);
  document.getElementById('layer2').addEventListener('mousemove', draw);
  document.getElementById('layer2').addEventListener('mouseenter', setPosition);
  document.getElementById('layer2').addEventListener('mousedown', setPosition);
  // TODO: Encontrar una solucion mas elegante
  document.getElementById('layer2').addEventListener('click', () => {
    drawingContext.fillStyle = '#c0392b';
    drawingContext.beginPath();
    drawingContext.arc(pos.x, pos.y, pencilWidth / 2, 0, 2 * Math.PI, true);
    drawingContext.fill();
  });
}

window.onload = () => {
  console.log('Hola, el js funciona!!!');
}

function insertClearButton(doodleLayer) {
  let buttonContainer = document.getElementById('clearDoodle');
  let clearButton = document.createElement('button');

  clearButton.onclick = () => {
    doodleLayer.getContext('2d').clearRect(0, 0, doodleLayer.width, doodleLayer.height);
  }

  clearButton.innerText = 'clear doodle';
  buttonContainer.appendChild(clearButton);
}

function insertSubmissionButton(doodleLayer) {
  // TODO: Refactoriar esta seccion de codigo.
  let buttonContainer = document.getElementById('imageSubmission');
  let submissionButton = document.createElement('button');
  submissionButton.onclick = () => {
    console.log(document.cookie);
    doodleLayer.toBlob((blob) => {
      let formData = new FormData();
      formData.append('file', blob)
      fetch('/submit', {
        method: 'POST',
        body: formData,
      }).then((response) => {
        document.getElementsByTagName('body')[0].style.cursor = 'progress';
        // Dios, perdoname por lo que estoy a punto de hacer...
        let reader = response.body.getReader();
        let data = [];
        reader.read().then(function processData(result) {
          if (!result.done) {
            data.push(result.value.buffer);
            return reader.read().then(processData);
          }
          console.log('Submission Done!');
          let blob = new Blob([...data], { type: "image/png" });
          let fileReader = new FileReader();
          fileReader.readAsDataURL(blob);
          fileReader.onloadend = () => {
            let resultContainer = document.getElementById('resultContainer');
            resultContainer.src = fileReader.result;
            // TODO: Encontrar una solucion mas elegante para el rercargado de la imagen desplegada.
            // TODO: Agreagar los ejes con las unidades correspondientes al espectro de magnitudes.
            resultContainer.onload = () => {
              console.log('Se ha terminado de entregar el resultado.');
              document.getElementsByTagName('body')[0].style.cursor = 'auto';
            }
          }
        })
      });
    }, 'image/png');

  }
  submissionButton.innerText = 'Submit';
  buttonContainer.appendChild(submissionButton);
}

function StreamReader(reader) {
  return new ReadableStream({
    start(controller) {
      return pump();
      function pump() {
        return reader.read().then(readValue => {
          if (readValue.done) {
            console.log('Se ha terminado de leer el stream');
            return;
          }
          controller.enqueue(readValue.value);
          return pump();
        });
      }
    }
  })
}
