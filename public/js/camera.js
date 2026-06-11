/**
 * camera.js — Inicializa câmara, MediaPipe Hands, e chama o reconhecedor de gestos.
 * Expõe window.Camera para comunicar com game.js.
 */

window.Camera = (function () {

  const videoEl   = document.getElementById('camera');
  const overlayEl = document.getElementById('overlay');
  const ctx       = overlayEl.getContext('2d');

  const detectedLetterEl = document.getElementById('detectedLetter');
  const confidenceBarEl  = document.getElementById('confidenceBar');
  const addLetterBtn     = document.getElementById('addLetterBtn');

  let currentLetter     = null;
  let currentConfidence = 0;
  let isStable          = false;
  let addCallback       = null;

  // Redimensionar o canvas ao tamanho do wrapper
  function resizeOverlay() {
    const rect = videoEl.parentElement.getBoundingClientRect();
    overlayEl.width  = rect.width;
    overlayEl.height = rect.height;
  }
  window.addEventListener('resize', resizeOverlay);
  resizeOverlay();

  // ---- MediaPipe Hands ----
  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
  });

  hands.setOptions({
    maxNumHands:        1,
    modelComplexity:    1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence:  0.6,
  });

  hands.onResults(onResults);

  function onResults(results) {
    // Limpar canvas
    ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);

    let letter = null;
    let confidence = 0;
    let stable = false;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const lm = results.multiHandLandmarks[0];

      // Desenhar esqueleto da mão
      drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: 'rgba(108,99,255,0.6)', lineWidth: 2 });
      drawLandmarks(ctx, lm, { color: '#a78bfa', lineWidth: 1, radius: 3 });

      // Reconhecer gesto
      const result = GestureRecognizer.recognize(lm);
      letter     = result.letter;
      confidence = result.confidence;
      stable     = result.stable;
    } else {
      GestureRecognizer.reset();
    }

    currentLetter     = letter;
    currentConfidence = confidence;
    isStable          = stable;

    updateUI(letter, confidence, stable);
  }

  function updateUI(letter, confidence, stable) {
    if (letter) {
      if (detectedLetterEl.textContent !== letter) {
        detectedLetterEl.textContent = letter;
        detectedLetterEl.classList.remove('pulse');
        void detectedLetterEl.offsetWidth; // reflow
        detectedLetterEl.classList.add('pulse');
        setTimeout(() => detectedLetterEl.classList.remove('pulse'), 200);
      }
      confidenceBarEl.style.width = (confidence * 100) + '%';
      addLetterBtn.disabled = !stable || !window.Game?.canAddLetter();
    } else {
      detectedLetterEl.textContent = '—';
      confidenceBarEl.style.width  = '0%';
      addLetterBtn.disabled = true;
    }
  }

  // Botão adicionar letra
  addLetterBtn.addEventListener('click', () => {
    if (currentLetter && isStable && window.Game?.canAddLetter()) {
      window.Game.addLetter(currentLetter);
      GestureRecognizer.reset();
    }
  });

  // ---- Iniciar câmara ----
  async function init() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      videoEl.srcObject = stream;
      videoEl.onloadedmetadata = () => {
        resizeOverlay();
        startCapture();
      };
    } catch (err) {
      console.error('Câmara não disponível:', err);
      detectedLetterEl.textContent = '⚠';
      addLetterBtn.disabled = true;
    }
  }

  function startCapture() {
    const mpCamera = new Camera(videoEl, {
      onFrame: async () => {
        await hands.send({ image: videoEl });
      },
      width: 640,
      height: 480,
    });
    mpCamera.start();
  }

  init();

  return {
    getCurrentLetter: () => currentLetter,
    isStable: () => isStable,
  };

})();
