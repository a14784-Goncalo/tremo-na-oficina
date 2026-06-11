/**
 * gestures.js — Reconhecimento de letras da LGP (Língua Gestual Portuguesa)
 * baseado em análise de landmarks da mão via MediaPipe Hands.
 *
 * Estratégia: extrair features dos landmarks e compará-las com regras
 * geométricas simples (dedos abertos/fechados, direção, posição relativa).
 */

window.GestureRecognizer = (function () {

  // Índices dos landmarks MediaPipe
  const LM = {
    WRIST: 0,
    THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
    INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
    MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
    RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
    PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
  };

  function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /**
   * Retorna true se o dedo está estendido (ponta acima da base no eixo Y).
   * Em coordenadas MediaPipe Y aumenta para baixo, portanto tip.y < mcp.y = estendido.
   */
  function fingerUp(lm, tip, mcp) {
    return lm[tip].y < lm[mcp].y - 0.04;
  }

  function fingerDown(lm, tip, pip) {
    return lm[tip].y > lm[pip].y;
  }

  function thumbUp(lm) {
    return lm[LM.THUMB_TIP].x < lm[LM.THUMB_IP].x - 0.02 ||
           lm[LM.THUMB_TIP].x > lm[LM.THUMB_IP].x + 0.02
           ? dist(lm[LM.THUMB_TIP], lm[LM.INDEX_MCP]) > 0.15
           : false;
  }

  // Features compactas
  function getFeatures(lm) {
    const idx  = fingerUp(lm, LM.INDEX_TIP,  LM.INDEX_MCP);
    const mid  = fingerUp(lm, LM.MIDDLE_TIP, LM.MIDDLE_MCP);
    const ring = fingerUp(lm, LM.RING_TIP,   LM.RING_MCP);
    const pink = fingerUp(lm, LM.PINKY_TIP,  LM.PINKY_MCP);

    const thumbOut = dist(lm[LM.THUMB_TIP], lm[LM.INDEX_MCP]) > 0.12;
    const thumbIn  = !thumbOut;

    // Dedos dobrados para baixo (ponta perto da palma)
    const idxCurl  = lm[LM.INDEX_TIP].y  > lm[LM.INDEX_MCP].y  + 0.02;
    const midCurl  = lm[LM.MIDDLE_TIP].y > lm[LM.MIDDLE_MCP].y + 0.02;
    const ringCurl = lm[LM.RING_TIP].y   > lm[LM.RING_MCP].y   + 0.02;
    const pinkCurl = lm[LM.PINKY_TIP].y  > lm[LM.PINKY_MCP].y  + 0.02;

    // Distâncias úteis
    const thumbIndex = dist(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]);
    const thumbMiddle = dist(lm[LM.THUMB_TIP], lm[LM.MIDDLE_TIP]);
    const indexMiddleSep = dist(lm[LM.INDEX_TIP], lm[LM.MIDDLE_TIP]);

    // Posição vertical do polegar
    const thumbHigh = lm[LM.THUMB_TIP].y < lm[LM.WRIST].y;

    return { idx, mid, ring, pink, thumbOut, thumbIn, idxCurl, midCurl, ringCurl, pinkCurl,
             thumbIndex, thumbMiddle, indexMiddleSep, thumbHigh, lm };
  }

  /**
   * Tabela de gestos → letras.
   * Cada entrada: { letter, confidence, test(features) }
   * Baseado em aproximações da LGP estática.
   */
  const GESTURES = [
    {
      letter: 'A',
      test: f => f.idxCurl && f.midCurl && f.ringCurl && f.pinkCurl && f.thumbOut,
    },
    {
      letter: 'B',
      test: f => f.idx && f.mid && f.ring && f.pink && !f.thumbOut,
    },
    {
      letter: 'C',
      test: f => !f.idx && !f.mid && !f.ring && !f.pink && f.thumbOut &&
                 f.thumbIndex > 0.08 && f.thumbIndex < 0.25,
    },
    {
      letter: 'D',
      test: f => f.idx && !f.mid && !f.ring && !f.pink && f.thumbOut &&
                 f.thumbIndex < 0.08,
    },
    {
      letter: 'E',
      test: f => !f.idx && !f.mid && !f.ring && !f.pink && !f.thumbOut &&
                 f.thumbIndex < 0.1,
    },
    {
      letter: 'F',
      test: f => !f.idx && f.mid && f.ring && f.pink && f.thumbIndex < 0.07,
    },
    {
      letter: 'G',
      test: f => f.idx && !f.mid && !f.ring && !f.pink && !f.thumbOut &&
                 Math.abs(f.lm[LM.INDEX_TIP].y - f.lm[LM.INDEX_MCP].y) < 0.06,
    },
    {
      letter: 'H',
      test: f => f.idx && f.mid && !f.ring && !f.pink && !f.thumbOut &&
                 f.indexMiddleSep < 0.05,
    },
    {
      letter: 'I',
      test: f => !f.idx && !f.mid && !f.ring && f.pink && !f.thumbOut,
    },
    {
      letter: 'J',
      test: f => !f.idx && !f.mid && !f.ring && f.pink && f.thumbOut,
    },
    {
      letter: 'K',
      test: f => f.idx && f.mid && !f.ring && !f.pink && f.thumbOut &&
                 f.indexMiddleSep > 0.06,
    },
    {
      letter: 'L',
      test: f => f.idx && !f.mid && !f.ring && !f.pink && f.thumbOut &&
                 f.thumbHigh,
    },
    {
      letter: 'M',
      test: f => !f.idx && !f.mid && !f.ring && !f.pink && f.thumbIn &&
                 f.lm[LM.THUMB_TIP].y > f.lm[LM.MIDDLE_MCP].y,
    },
    {
      letter: 'N',
      test: f => f.idx && f.mid && !f.ring && !f.pink && !f.thumbOut &&
                 f.lm[LM.INDEX_TIP].x < f.lm[LM.MIDDLE_TIP].x - 0.01,
    },
    {
      letter: 'O',
      test: f => f.thumbIndex > 0.01 && f.thumbIndex < 0.06 &&
                 !f.idx && !f.mid,
    },
    {
      letter: 'P',
      test: f => !f.idx && f.mid && !f.ring && !f.pink && f.thumbOut,
    },
    {
      letter: 'Q',
      test: f => f.idx && !f.mid && !f.ring && !f.pink && f.thumbOut &&
                 !f.thumbHigh,
    },
    {
      letter: 'R',
      test: f => f.idx && f.mid && !f.ring && !f.pink && !f.thumbOut &&
                 f.indexMiddleSep > 0.04 && f.indexMiddleSep < 0.09,
    },
    {
      letter: 'S',
      test: f => f.idxCurl && f.midCurl && f.ringCurl && f.pinkCurl && !f.thumbOut &&
                 f.lm[LM.THUMB_TIP].x > f.lm[LM.INDEX_TIP].x,
    },
    {
      letter: 'T',
      test: f => !f.idx && !f.mid && !f.ring && !f.pink && f.thumbOut &&
                 f.lm[LM.THUMB_TIP].y < f.lm[LM.INDEX_MCP].y,
    },
    {
      letter: 'U',
      test: f => f.idx && f.mid && !f.ring && !f.pink && !f.thumbOut &&
                 f.indexMiddleSep < 0.04,
    },
    {
      letter: 'V',
      test: f => f.idx && f.mid && !f.ring && !f.pink && !f.thumbOut &&
                 f.indexMiddleSep > 0.07,
    },
    {
      letter: 'W',
      test: f => f.idx && f.mid && f.ring && !f.pink,
    },
    {
      letter: 'X',
      test: f => !f.mid && !f.ring && !f.pink &&
                 !f.idx && f.lm[LM.INDEX_DIP].y > f.lm[LM.INDEX_PIP].y,
    },
    {
      letter: 'Y',
      test: f => !f.idx && !f.mid && !f.ring && f.pink && f.thumbOut && f.thumbHigh,
    },
    {
      letter: 'Z',
      test: f => f.idx && !f.mid && !f.ring && !f.pink && f.thumbIn,
    },
  ];

  let _lastLetter = null;
  let _stableCount = 0;
  const STABLE_THRESHOLD = 6; // frames estáveis antes de confirmar

  function recognize(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      _lastLetter = null;
      _stableCount = 0;
      return { letter: null, confidence: 0 };
    }

    const f = getFeatures(landmarks);
    let best = null;
    let bestScore = 0;

    for (const g of GESTURES) {
      try {
        if (g.test(f)) {
          const score = 1.0;
          if (score > bestScore) {
            bestScore = score;
            best = g.letter;
          }
        }
      } catch (_) {}
    }

    if (best === _lastLetter) {
      _stableCount = Math.min(_stableCount + 1, STABLE_THRESHOLD + 2);
    } else {
      _lastLetter = best;
      _stableCount = 1;
    }

    const confidence = best ? Math.min(_stableCount / STABLE_THRESHOLD, 1.0) : 0;
    return { letter: best, confidence, stable: _stableCount >= STABLE_THRESHOLD };
  }

  function reset() {
    _lastLetter = null;
    _stableCount = 0;
  }

  return { recognize, reset };
})();
