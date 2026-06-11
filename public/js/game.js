/**
 * game.js — Lógica completa do TREMO.
 * - Palavra aleatória de 5 letras
 * - 7 tentativas
 * - Feedback: verde (sítio certo), amarelo (na palavra, sítio errado), cinzento (não está)
 * - Teclado visual com estado por letra
 */

window.Game = (function () {

  const MAX_ATTEMPTS = 7;
  const WORD_LENGTH  = 5;

  const ALPHABET_ROWS = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M'],
  ];

  const gridEl         = document.getElementById('grid');
  const currentTilesEl = document.getElementById('currentTiles');
  const submitBtn      = document.getElementById('submitBtn');
  const backspaceBtn   = document.getElementById('backspaceBtn');
  const modal          = document.getElementById('modal');
  const modalIcon      = document.getElementById('modalIcon');
  const modalTitle     = document.getElementById('modalTitle');
  const modalMessage   = document.getElementById('modalMessage');
  const modalWord      = document.getElementById('modalWord');
  const playAgainBtn   = document.getElementById('playAgainBtn');
  const keyboardEl     = document.getElementById('keyboard');

  let targetWord   = '';
  let attempts     = [];   // array de strings (tentativas submetidas)
  let currentInput = '';
  let gameOver     = false;
  let wordList     = [];
  let keyStates    = {};   // { letter: 'correct'|'present'|'absent' }

  // ---- Carregar palavras ----
  async function loadWords() {
    try {
      const res  = await fetch('words/palavras.json');
      wordList   = await res.json();
    } catch (e) {
      // fallback mínimo
      wordList = ['GESTO','AMIGO','LIVRO','TREMO','CAMPO','PORTA','SALTO'];
    }
    newGame();
  }

  function pickWord() {
    const w = wordList[Math.floor(Math.random() * wordList.length)];
    return w.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ---- Novo jogo ----
  function newGame() {
    targetWord   = pickWord();
    attempts     = [];
    currentInput = '';
    gameOver     = false;
    keyStates    = {};

    renderGrid();
    renderCurrentTiles();
    renderKeyboard();
    updateButtons();
    modal.classList.add('hidden');

    console.log('[TREMO] Palavra:', targetWord); // para debug
  }

  // ---- Grelha de tentativas anteriores ----
  function renderGrid() {
    gridEl.innerHTML = '';
    // Apenas as tentativas já submetidas
    for (let i = 0; i < attempts.length; i++) {
      const row = document.createElement('div');
      row.className = 'grid-row';
      const result = evaluateGuess(attempts[i]);
      for (let j = 0; j < WORD_LENGTH; j++) {
        const tile = document.createElement('div');
        tile.className = `tile ${result[j]}`;
        tile.textContent = attempts[i][j];
        // animação flip com delay por coluna
        tile.style.animationDelay = `${j * 80}ms`;
        tile.classList.add('flip');
        row.appendChild(tile);
      }
      gridEl.appendChild(row);
    }
  }

  // ---- Linha de input atual ----
  function renderCurrentTiles() {
    currentTilesEl.innerHTML = '';
    if (gameOver) return;

    for (let i = 0; i < WORD_LENGTH; i++) {
      const tile = document.createElement('div');
      tile.className = i < currentInput.length ? 'current-tile' : 'current-tile empty';
      tile.textContent = currentInput[i] || '_';
      currentTilesEl.appendChild(tile);
    }
  }

  // ---- Teclado ----
  function renderKeyboard() {
    keyboardEl.innerHTML = '';
    for (const row of ALPHABET_ROWS) {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      for (const letter of row) {
        const btn = document.createElement('button');
        btn.className  = 'kb-key' + (keyStates[letter] ? ` ${keyStates[letter]}` : '');
        btn.textContent = letter;
        btn.id = `kb-${letter}`;
        btn.addEventListener('click', () => {
          if (!gameOver) addLetter(letter);
        });
        rowEl.appendChild(btn);
      }
      keyboardEl.appendChild(rowEl);
    }
  }

  function updateKeyboard(guess, result) {
    for (let i = 0; i < WORD_LENGTH; i++) {
      const l = guess[i];
      const prev = keyStates[l];
      // Prioridade: correct > present > absent
      if (result[i] === 'correct') {
        keyStates[l] = 'correct';
      } else if (result[i] === 'present' && prev !== 'correct') {
        keyStates[l] = 'present';
      } else if (!prev) {
        keyStates[l] = 'absent';
      }
      const keyEl = document.getElementById(`kb-${l}`);
      if (keyEl) keyEl.className = `kb-key ${keyStates[l]}`;
    }
  }

  // ---- Avaliação do guess ----
  function evaluateGuess(guess) {
    const result = Array(WORD_LENGTH).fill('absent');
    const targetArr = targetWord.split('');
    const guessArr  = guess.split('');
    const usedTarget = Array(WORD_LENGTH).fill(false);
    const usedGuess  = Array(WORD_LENGTH).fill(false);

    // 1ª passagem: corretos
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessArr[i] === targetArr[i]) {
        result[i]      = 'correct';
        usedTarget[i]  = true;
        usedGuess[i]   = true;
      }
    }

    // 2ª passagem: presentes
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (usedGuess[i]) continue;
      for (let j = 0; j < WORD_LENGTH; j++) {
        if (usedTarget[j]) continue;
        if (guessArr[i] === targetArr[j]) {
          result[i]     = 'present';
          usedTarget[j] = true;
          break;
        }
      }
    }

    return result;
  }

  // ---- Submissão ----
  function submitGuess() {
    if (gameOver || currentInput.length < WORD_LENGTH) return;

    const guess  = currentInput;
    const result = evaluateGuess(guess);

    attempts.push(guess);
    currentInput = '';

    renderGrid();
    renderCurrentTiles();
    updateKeyboard(guess, result);
    updateButtons();

    const won = result.every(r => r === 'correct');

    if (won) {
      gameOver = true;
      setTimeout(() => showModal(true), 600);
    } else if (attempts.length >= MAX_ATTEMPTS) {
      gameOver = true;
      setTimeout(() => showModal(false), 600);
    }
  }

  // ---- Modal ----
  function showModal(won) {
    modalWord.textContent = targetWord;
    if (won) {
      const msgs = ['Incrível!','Fantástico!','Muito bem!','Excelente!','Brilhante!'];
      modalIcon.textContent  = '🎉';
      modalTitle.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      modalMessage.textContent = `Acertaste em ${attempts.length} tentativa${attempts.length !== 1 ? 's' : ''}.`;
    } else {
      modalIcon.textContent  = '😔';
      modalTitle.textContent = 'Quase!';
      modalMessage.textContent = 'Não foi desta vez. Tenta novamente!';
    }
    modal.classList.remove('hidden');
  }

  // ---- Botões ----
  function updateButtons() {
    submitBtn.disabled   = currentInput.length < WORD_LENGTH || gameOver;
    backspaceBtn.disabled = currentInput.length === 0 || gameOver;
  }

  // ---- API pública ----
  function addLetter(letter) {
    if (gameOver || currentInput.length >= WORD_LENGTH) return;
    currentInput += letter.toUpperCase();
    renderCurrentTiles();
    updateButtons();
  }

  function backspace() {
    if (gameOver || currentInput.length === 0) return;
    currentInput = currentInput.slice(0, -1);
    renderCurrentTiles();
    updateButtons();
  }

  function canAddLetter() {
    return !gameOver && currentInput.length < WORD_LENGTH;
  }

  // ---- Eventos ----
  submitBtn.addEventListener('click', submitGuess);

  backspaceBtn.addEventListener('click', backspace);

  playAgainBtn.addEventListener('click', newGame);

  // Teclado físico
  document.addEventListener('keydown', e => {
    if (gameOver) return;
    if (e.key === 'Enter') { submitGuess(); return; }
    if (e.key === 'Backspace') { backspace(); return; }
    const letter = e.key.toUpperCase();
    if (/^[A-Z]$/.test(letter)) addLetter(letter);
  });

  // ---- Arranque ----
  loadWords();

  return { addLetter, backspace, canAddLetter };

})();
