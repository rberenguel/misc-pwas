const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const uploadScreen = document.getElementById('upload-screen');
const viewerScreen = document.getElementById('viewer-screen');
const canvas = document.getElementById('canvas');
const video = document.getElementById('video');
const btnRotate = document.getElementById('btn-rotate');
const btnNew = document.getElementById('btn-new');
const btnVideo = document.getElementById('btn-video');

let img = null;
let rotation = 0;
let stream = null;
let inVideoMode = false;
let rafId = null;

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const newImg = new Image();
  newImg.onload = () => {
    if (img) URL.revokeObjectURL(img.src);
    img = newImg;
    rotation = 0;
    redraw();
    uploadScreen.hidden = true;
    viewerScreen.hidden = false;
  };
  newImg.src = url;
});

function redraw() {
  if (!img) return;

  const swap = rotation === 90 || rotation === 270;
  const w = swap ? img.naturalHeight : img.naturalWidth;
  const h = swap ? img.naturalWidth : img.naturalHeight;

  // Only reset dimensions when they actually change (resetting clears the canvas)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  ctx.restore();
}

function enterVideoMode() {
  redraw();

  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = canvas.captureStream(30);
  video.srcObject = stream;
  video.play().catch(e => console.error('play:', e.name, e.message));

  // Keep canvas alive with an rAF loop — display:none kills captureStream on iOS
  function tick() {
    redraw();
    if (inVideoMode) rafId = requestAnimationFrame(tick);
  }
  inVideoMode = true;
  rafId = requestAnimationFrame(tick);

  video.classList.add('active');
  btnRotate.disabled = true;
  btnVideo.textContent = '✕';
  btnVideo.title = 'Back to image';
}

function exitVideoMode() {
  inVideoMode = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  video.pause();
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  video.srcObject = null;
  video.classList.remove('active');
  btnRotate.disabled = false;
  btnVideo.textContent = '✦';
  btnVideo.title = 'Convert to video';
}

btnVideo.addEventListener('click', () => {
  if (inVideoMode) exitVideoMode();
  else enterVideoMode();
});

btnRotate.addEventListener('click', () => {
  rotation = (rotation + 90) % 360;
  redraw();
});

btnNew.addEventListener('click', () => {
  if (inVideoMode) exitVideoMode();
  viewerScreen.hidden = true;
  uploadScreen.hidden = false;
  fileInput.value = '';
  img = null;
});
