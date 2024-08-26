const satelliteCanvas = document.getElementById("satelliteCanvas");
const easementCanvas = document.getElementById("easementCanvas");
const satelliteCtx = satelliteCanvas.getContext("2d");
const easementCtx = easementCanvas.getContext("2d");
const satelliteInput = document.getElementById("satelliteInput");
const easementInput = document.getElementById("easementInput");
const processButton = document.getElementById("processButton");
const clearSatellitePoints = document.getElementById("clearSatellitePoints");
const clearEasementPoints = document.getElementById("clearEasementPoints");

let satelliteImage = null;
let easementImage = null;
let satellitePolygon = [];
let easementPolygon = [];
let satelliteScale = 1;
let easementScale = 1;

satelliteInput.addEventListener("change", (e) => loadImage(e, "satellite"));
easementInput.addEventListener("change", (e) => loadImage(e, "easement"));
satelliteCanvas.addEventListener("click", (e) => addPoint(e, "satellite"));
easementCanvas.addEventListener("click", (e) => addPoint(e, "easement"));
processButton.addEventListener("click", processImages);
clearSatellitePoints.addEventListener("click", () => clearPoints("satellite"));
clearEasementPoints.addEventListener("click", () => clearPoints("easement"));

function loadImage(e, type) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      const canvas = type === "satellite" ? satelliteCanvas : easementCanvas;
      const ctx = canvas.getContext("2d");

      // Set canvas size to match the image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image at full size
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // Calculate scale
      const scale = img.width / canvas.offsetWidth;
      if (type === "satellite") {
        satelliteImage = img;
        satelliteScale = scale;
      } else {
        easementImage = img;
        easementScale = scale;
      }

      drawPolygon(type);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function addPoint(e, type) {
  const canvas = type === "satellite" ? satelliteCanvas : easementCanvas;
  const polygon = type === "satellite" ? satellitePolygon : easementPolygon;
  const scale = type === "satellite" ? satelliteScale : easementScale;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  polygon.push({ x, y });
  drawPolygon(type);
}

function drawPolygon(type) {
  const canvas = type === "satellite" ? satelliteCanvas : easementCanvas;
  const ctx = canvas.getContext("2d");
  const image = type === "satellite" ? satelliteImage : easementImage;
  const polygon = type === "satellite" ? satellitePolygon : easementPolygon;
  const color = type === "satellite" ? "red" : "blue";

  // Clear the canvas and redraw the image
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (image) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }

  // Draw the polygon
  if (polygon.length > 0) {
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i].x, polygon[i].y);
    }
    if (polygon.length > 2) {
      ctx.closePath();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw points
    polygon.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }
}

function clearPoints(type) {
  if (type === "satellite") {
    satellitePolygon = [];
  } else {
    easementPolygon = [];
  }
  drawPolygon(type);
}

function calculateBoundingBox(polygon) {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function scalePolygon(polygon, originalSize, newSize) {
  const [originalWidth, originalHeight] = originalSize;
  const [newWidth, newHeight] = newSize;

  const widthRatio = newWidth / originalWidth;
  const heightRatio = newHeight / originalHeight;

  return polygon.map((point) => ({
    x: Math.round(point.x * widthRatio),
    y: Math.round(point.y * heightRatio),
  }));
}

function extractPolygon(image, polygon) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(image, 0, 0);

  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i].x, polygon[i].y);
  }
  ctx.closePath();
  ctx.fill();

  const bbox = calculateBoundingBox(polygon);
  const extracted = ctx.getImageData(
    bbox.minX,
    bbox.minY,
    bbox.maxX - bbox.minX,
    bbox.maxY - bbox.minY
  );

  const adjustedPolygon = polygon.map((point) => ({
    x: point.x - bbox.minX,
    y: point.y - bbox.minY,
  }));

  return { extracted, adjustedPolygon, bbox };
}

function processImages() {
  if (
    !satelliteImage ||
    !easementImage ||
    satellitePolygon.length < 3 ||
    easementPolygon.length < 3
  ) {
    alert(
      "Please load both satellite and easement images and select areas for each."
    );
    return;
  }

  // Extract polygons from images
  const {
    extracted: satelliteExtracted,
    adjustedPolygon: satelliteAdjustedPolygon,
    bbox: satelliteBbox,
  } = extractPolygon(satelliteImage, satellitePolygon);
  const {
    extracted: easementExtracted,
    adjustedPolygon: easementAdjustedPolygon,
    bbox: easementBbox,
  } = extractPolygon(easementImage, easementPolygon);

  // Create canvases for satellite and easement
  const satelliteCanvas = document.createElement("canvas");
  satelliteCanvas.width = satelliteExtracted.width;
  satelliteCanvas.height = satelliteExtracted.height;
  const satelliteCtx = satelliteCanvas.getContext("2d");
  satelliteCtx.putImageData(satelliteExtracted, 0, 0);

  const easementCanvas = document.createElement("canvas");
  easementCanvas.width = easementExtracted.width;
  easementCanvas.height = easementExtracted.height;
  const easementCtx = easementCanvas.getContext("2d");
  easementCtx.putImageData(easementExtracted, 0, 0);

  // Create the result canvas with the size of the larger extracted image
  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = Math.max(satelliteCanvas.width, easementCanvas.width);
  resultCanvas.height = Math.max(satelliteCanvas.height, easementCanvas.height);
  const resultCtx = resultCanvas.getContext("2d");

  // Calculate scaling factors
  const satelliteScaleX = resultCanvas.width / satelliteCanvas.width;
  const satelliteScaleY = resultCanvas.height / satelliteCanvas.height;
  const easementScaleX = resultCanvas.width / easementCanvas.width;
  const easementScaleY = resultCanvas.height / easementCanvas.height;

  // Draw the satellite extracted image
  resultCtx.drawImage(
    satelliteCanvas,
    0,
    0,
    resultCanvas.width,
    resultCanvas.height
  );

  // Draw the easement extracted image with transparency
  resultCtx.globalAlpha = 0.5;
  resultCtx.drawImage(
    easementCanvas,
    0,
    0,
    resultCanvas.width,
    resultCanvas.height
  );
  resultCtx.globalAlpha = 1.0;

  // Scale polygons
  const scaledSatellitePolygon = satelliteAdjustedPolygon.map((point) => ({
    x: point.x * satelliteScaleX,
    y: point.y * satelliteScaleY,
  }));
  const scaledEasementPolygon = easementAdjustedPolygon.map((point) => ({
    x: point.x * easementScaleX,
    y: point.y * easementScaleY,
  }));

  // Draw scaled polygons
  drawPolygonOnContext(resultCtx, scaledSatellitePolygon, "red");
  drawPolygonOnContext(resultCtx, scaledEasementPolygon, "blue");

  // Display the result
  const resultImage = document.getElementById("resultImage");
  resultImage.innerHTML = ""; // Clear previous results
  const img = document.createElement("img");
  img.src = resultCanvas.toDataURL("image/png");
  resultImage.appendChild(img);
}

function drawPolygonOnContext(context, polygon, color) {
  context.beginPath();
  polygon.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.stroke();
}

function displayCroppedImage(imageData, elementId) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);

  const img = document.createElement("img");
  img.src = canvas.toDataURL("image/png");

  const container = document.getElementById(elementId);
  container.innerHTML = "";
  container.appendChild(img);
}

function displayResult(canvas) {
  const img = document.createElement("img");
  img.src = canvas.toDataURL("image/png");

  const container = document.getElementById("resultImage");
  container.innerHTML = "";
  container.appendChild(img);
}
