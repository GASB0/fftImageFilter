var previewWidth = 250;
var previewHeight = 250;
var pos = { x: 0, y: 0 };

function dragOverHandler(ev) {
  ev.preventDefault();
  console.log('File in drop zone');
  ev.target.classList.add("draggedOn");
}

function dragLeaveHandler(ev) {
  ev.target.classList.remove("draggedOn");
}

function dropHandler(ev) {
  let url = '/listener';
  ev.preventDefault();
  console.log('Fichero arrastrados');

  if (ev.dataTransfer.items) {
    let theFile = ev.dataTransfer.items[0];

    // Creating preview
    previewFile(theFile.getAsFile());

    let formData = new FormData();
    formData.append("file", theFile.getAsFile());

    fetch(url, {
      method: 'POST',
      body: formData,
    })
      .then(response => {
        let reader = response.body.getReader();
        let data = [];
        reader.read().then(function processData(result) {
          if (!result.done) {
            data.push(result.value.buffer);
            return reader.read().then(processData);
          }
          console.log('Ya se termino de recibir el asunto');

          let blob = new Blob([...data], { type: "image/png" });
          let fileReader = new FileReader();
          fileReader.readAsDataURL(blob);
          fileReader.onloadend = () => {
            const img = new Image();
            img.src = fileReader.result;
            img.onload = () => {
              let doodleLayer = createCanvas(img); // -> Crea un canvas con las dimensiones de la imagen transformada.
              insertSubmissionButton(doodleLayer);
            }
          }
        }).catch((err) => {
          console.log('sorry, m8. Something went wrong');
          console.log(err);
        });
      });
    removeDragData(ev);
    const imageField = document.getElementById('imageField');
    imageField.classList.remove('imageContainer');
    imageField.classList.remove('draggedOn');
  }
}

function removeDragData(ev) {
  ev.dataTransfer.items.clear();
}

function previewFile(file) {
  // Esta funcion se llama cada vez que se tira una imagen en el espacio correspondiente.
  let reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = () => {
    let img = document.createElement('img');
    img.src = reader.result;
    // img.width = previewWidth;
    // img.height = previewHeight;
    img.onload = () => {
      document.getElementById('imageField').appendChild(img);
    }
  }
}

function createCanvas(img) {
  // TODO: Arreglar las dimensiones de este canvas (deben de ser de la imagen transformada)
  console.log(img.width, img.height);

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
    drawingContext.lineWidth = 20;
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
  document.addEventListener('mousemove', draw);
  document.addEventListener('mouseenter', setPosition);
  document.addEventListener('mousedown', setPosition);
}

window.onload = () => {
  console.log('Hola, el js funciona!!!');
}

function insertSubmissionButton(doodleLayer) {
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
            const img = new Image();
            img.src = fileReader.result;
            img.onload = () => {
              let resultSection = document.getElementById('imageSubmission');
              let containerDiv = document.createElement('div');
              containerDiv.classList.add('column')
              resultSection.appendChild(containerDiv);
              resultSection.appendChild(document.createElement('br'));
              let textoDescriptivo = document.createElement('p');
              textoDescriptivo.textContent = 'Resultado del filtrado de la imagen';

              containerDiv.appendChild(textoDescriptivo);
              containerDiv.appendChild(img);
            }
          }

        })

      });
    }, 'image/png');

  }
  submissionButton.innerText = 'Submit';
  buttonContainer.appendChild(submissionButton);
}
