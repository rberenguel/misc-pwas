/* --- AUDIO --- */
let audioEnabled = false;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playHitTone(freq, dur, type = "sine") {
  if (!audioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}

document.getElementById('audio-btn').addEventListener('click', () => {
  initAudio();
  audioEnabled = !audioEnabled;
  const btn = document.getElementById('audio-btn');
  btn.textContent = audioEnabled ? 'SND: ON' : 'SND: OFF';
  btn.classList.toggle('active', audioEnabled);
});

/* --- RELATIVE HALF-COURT TOPOLOGY --- */
const COURT_CELLS = {
  'c-opp-dp-l': { col: 0, depth: 1, half: 'opp' },
  'c-opp-dp-c': { col: 1, depth: 1, half: 'opp' },
  'c-opp-dp-r': { col: 2, depth: 1, half: 'opp' },
  'c-opp-sv-l': { col: 0, depth: 0, half: 'opp' },
  'c-opp-sv-c': { col: 1, depth: 0, half: 'opp' },
  'c-opp-sv-r': { col: 2, depth: 0, half: 'opp' },

  'c-ply-sv-l': { col: 0, depth: 0, half: 'ply' },
  'c-ply-sv-c': { col: 1, depth: 0, half: 'ply' },
  'c-ply-sv-r': { col: 2, depth: 0, half: 'ply' },
  'c-ply-dp-l': { col: 0, depth: 1, half: 'ply' },
  'c-ply-dp-c': { col: 1, depth: 1, half: 'ply' },
  'c-ply-dp-r': { col: 2, depth: 1, half: 'ply' }
};

/* --- CARD ARSENAL & SUCCESS PROBABILITIES --- */
const CARD_LIBRARY = {
  // SERVES
  flat_serve: { 
    name: 'Ace Flat Serve', cost: 1, speed: 'fast', targets: 'serve', tag: 'SERVE',
    accuracy: 0.68, desc: 'High speed ace attempt. High fault risk.' 
  },
  kick_serve: { 
    name: 'Safe Kick Serve', cost: 1, speed: 'normal', targets: 'serve', tag: 'SERVE',
    accuracy: 0.94, desc: 'High spin safe serve. Rarely faults.' 
  },

  // NEUTRAL / ATTACK RALLY
  topspin: { 
    name: 'Topspin Rocket', cost: 2, speed: 'fast', targets: 'deep', tag: 'ATTACK',
    accuracy: 0.82, desc: 'Heavy deep drive. Pressures opponent into scramble.' 
  },
  drive: { 
    name: 'Crosscourt Drive', cost: 1, speed: 'normal', targets: 'deep', tag: 'RALLY',
    accuracy: 0.92, desc: 'Reliable baseline rally shot.' 
  },
  slice: { 
    name: 'Control Slice', cost: 1, speed: 'slow', targets: 'deep', tag: 'RALLY',
    accuracy: 0.90, desc: 'Low-skidding rally ball. Reliable return.' 
  },
  drop: { 
    name: 'Disguised Drop', cost: 2, speed: 'slow', targets: 'short', tag: 'TOUCH',
    accuracy: 0.78, desc: 'Pulls deep opponent toward net.' 
  },

  // OPPORTUNITY / SHORT BALL ATTACK
  smash_winner: { 
    name: 'Overhead Smash', cost: 1, speed: 'fast', targets: 'any', tag: 'PUNISH',
    accuracy: 0.96, desc: 'Devastating putaway off weak floaters.' 
  },

  // SCRAMBLE / DEFENSIVE
  emergency_slice: { 
    name: 'Emergency Slice', cost: 1, speed: 'slow', targets: 'deep', tag: 'DEFENSE',
    accuracy: 0.85, desc: 'Slow defensive reset. Leaves you exposed.' 
  },
  high_lob: { 
    name: 'Moonball Lob', cost: 1, speed: 'slow', targets: 'deep', tag: 'RESET',
    accuracy: 0.88, desc: 'Buys time to recover to center.' 
  },
  desperation_winner: { 
    name: 'Running Slap', cost: 2, speed: 'fast', targets: 'deep', tag: 'HAIL-MARY',
    accuracy: 0.45, desc: 'All-or-nothing running winner. 55% error rate.' 
  }
};

/* --- STATE MACHINE --- */
let gameState = {
  playerScore: 0,
  cpuScore: 0,
  pointsPlayed: 0,
  currentServer: 'CPU', // '1P' or 'CPU' (flipped to CPU so 1P returns at start)
  serveAttempt: 1,     // 1st or 2nd serve
  turn: '1P',          // '1P', 'CPU', 'TRANSIT'
  playerCondition: 'SERVE', // 'SERVE', 'IN_POSITION', 'OPPORTUNITY', 'SCRAMBLE'
  cpuCondition: 'NEUTRAL',
  stamina: 3,
  maxStamina: 3,
  selectedCardKey: null,
  playerPos: 'c-ply-dp-r',
  cpuPos: 'c-opp-dp-l',
  ballPos: null,
  hand: []
};

function getCellCenter(id) {
  const el = document.getElementById(id);
  const rect = el.getBoundingClientRect();
  const stageRect = document.getElementById('court-stage').getBoundingClientRect();
  return {
    x: rect.left - stageRect.left + rect.width / 2,
    y: rect.top - stageRect.top + rect.height / 2
  };
}

function renderEntities() {
  const pCoords = getCellCenter(gameState.playerPos);
  const playerEl = document.getElementById('player-entity');
  playerEl.style.left = `${pCoords.x}px`;
  playerEl.style.top = `${pCoords.y}px`;

  const cCoords = getCellCenter(gameState.cpuPos);
  const cpuEl = document.getElementById('cpu-entity');
  cpuEl.style.left = `${cCoords.x}px`;
  cpuEl.style.top = `${cCoords.y}px`;

  const ballEl = document.getElementById('ball-entity');
  if (gameState.ballPos) {
    const bCoords = getCellCenter(gameState.ballPos);
    ballEl.style.display = 'block';
    ballEl.style.left = `${bCoords.x}px`;
    ballEl.style.top = `${bCoords.y}px`;
  } else {
    ballEl.style.display = 'none';
  }
}

/* --- POINT INITIALIZATION --- */
function initPoint(isSecondServe = false) {
  clearSelection();
  gameState.selectedCardKey = null;

  if (!isSecondServe) {
    gameState.serveAttempt = 1;
  }

  // Parity by points played (Deuce = even, Ad = odd)
  const isDeuce = (gameState.pointsPlayed % 2 === 0);

  if (gameState.currentServer === '1P') {
    gameState.playerPos = isDeuce ? 'c-ply-dp-r' : 'c-ply-dp-l';
    gameState.cpuPos = isDeuce ? 'c-opp-dp-l' : 'c-opp-dp-r';
    gameState.ballPos = gameState.playerPos;
    gameState.turn = '1P';
    gameState.playerCondition = 'SERVE';
    gameState.stamina = 3;
    gameState.hand = ['flat_serve', 'kick_serve'];
    setFeed(
      `${isSecondServe ? 'SECOND SERVE' : 'FIRST SERVE'} (1P)`,
      `Target opponent's diagonal service box.`
    );
    updateUI();
    renderEntities();
  } else {
    // CPU Serving
    gameState.cpuPos = isDeuce ? 'c-opp-dp-r' : 'c-opp-dp-l';
    gameState.playerPos = isDeuce ? 'c-ply-dp-l' : 'c-ply-dp-r';
    gameState.ballPos = gameState.cpuPos;
    gameState.turn = 'TRANSIT';
    gameState.playerCondition = 'NEUTRAL';
    updateUI();
    renderEntities();
    setFeed(`CPU Serving...`, `${isSecondServe ? 'Second serve.' : 'First serve.'}`);
    setTimeout(executeCpuServe, 800);
  }
}

function getLegalServeTarget(server) {
  const isDeuce = (gameState.pointsPlayed % 2 === 0);
  if (server === '1P') {
    return isDeuce ? 'c-opp-sv-l' : 'c-opp-sv-r';
  } else {
    return isDeuce ? 'c-ply-sv-l' : 'c-ply-sv-r';
  }
}

/* --- CARD SELECTION & UI --- */
function updateUI() {
  document.getElementById('score-display').textContent = getTennisScoreString();
  document.getElementById('server-indicator').textContent = `SERVER: ${gameState.currentServer}`;
  document.getElementById('stamina-label').textContent = `STAMINA: ${gameState.stamina} / ${gameState.maxStamina}`;
  document.getElementById('status-tag').textContent = `STATE: ${gameState.playerCondition}`;

  const scroll = document.getElementById('cards-scroll');
  scroll.innerHTML = '';

  gameState.hand.forEach((cardKey) => {
    const card = CARD_LIBRARY[cardKey];
    const el = document.createElement('div');
    el.className = 'card';
    if (gameState.selectedCardKey === cardKey) el.classList.add('selected');

    const isTurn = (gameState.turn === '1P');
    const canAfford = (gameState.stamina >= card.cost);
    const isPlayable = isTurn && canAfford;

    if (!isPlayable) el.classList.add('disabled');

    el.innerHTML = `
      <div>
        <div class="card-title">${card.name}</div>
        <div class="card-meta">${card.tag} | ${card.speed.toUpperCase()}</div>
        <div class="card-stats">ACC: ${Math.round(card.accuracy * 100)}%</div>
      </div>
      <div class="card-cost">COST: ${card.cost}</div>
    `;

    el.addEventListener('click', () => {
      if (!isPlayable) return;
      selectCard(cardKey);
    });

    scroll.appendChild(el);
  });
}

function setFeed(main, sub) {
  document.getElementById('feed-main').textContent = main;
  document.getElementById('feed-sub').textContent = sub;
}

function selectCard(cardKey) {
  gameState.selectedCardKey = cardKey;
  updateUI();
  clearTargetHighlights();

  const card = CARD_LIBRARY[cardKey];
  if (gameState.playerCondition === 'SERVE') {
    highlightTarget(getLegalServeTarget('1P'));
  } else {
    Object.keys(COURT_CELLS).forEach((id) => {
      if (COURT_CELLS[id].half === 'opp') {
        const isNet = COURT_CELLS[id].depth === 0;
        if (card.targets === 'any') highlightTarget(id);
        else if (card.targets === 'deep' && !isNet) highlightTarget(id);
        else if (card.targets === 'short' && isNet) highlightTarget(id);
      }
    });
  }
}

function highlightTarget(id) {
  const el = document.getElementById(id);
  el.classList.add('selectable-target');
  el.onclick = () => executePlayerShot(id);
}

function clearTargetHighlights() {
  document.querySelectorAll('.cell').forEach((el) => {
    el.classList.remove('selectable-target');
    el.onclick = null;
  });
}

function clearSelection() {
  gameState.selectedCardKey = null;
  clearTargetHighlights();
}

/* --- 1P SHOT EXECUTION --- */
function executePlayerShot(targetId) {
  const card = CARD_LIBRARY[gameState.selectedCardKey];
  clearTargetHighlights();
  gameState.turn = 'TRANSIT';
  gameState.stamina -= card.cost;
  const surplusStamina = gameState.stamina;

  // 1. Check Execution Failure (Fault / Unforced Error)
  const roll = Math.random();
  if (roll > card.accuracy) {
    if (gameState.playerCondition === 'SERVE') {
      playHitTone(180, 0.25, "sawtooth");
      if (gameState.serveAttempt === 1) {
        setFeed("FAULT!", "1st serve into the net. Second serve.");
        gameState.serveAttempt = 2;
        setTimeout(() => initPoint(true), 1100);
      } else {
        setFeed("DOUBLE FAULT!", "Second serve missed. Point lost.");
        setTimeout(() => registerPointWin('CPU', 'Double fault by 1P.'), 900);
      }
      return;
    } else {
      // Rally Unforced Error
      playHitTone(160, 0.25, "sawtooth");
      const isLong = Math.random() > 0.5;
      setFeed("UNFORCED ERROR!", isLong ? "Shot sprayed wide / over the baseline." : "Shot dumped into the net.");
      setTimeout(() => registerPointWin('CPU', `1P unforced error (${card.name}).`), 900);
      return;
    }
  }

  // Shot succeeded
  playHitTone(gameState.playerCondition === 'SERVE' ? 520 : 440, 0.12);
  setFeed(`1P: ${card.name} ──► ${targetId.replace('c-opp-', '').toUpperCase()}`, "Ball in flight.");

  gameState.ballPos = targetId;
  renderEntities();

  // In-flight recovery to center if surplus stamina available
  setTimeout(() => {
    const pCell = COURT_CELLS[gameState.playerPos];
    if (surplusStamina >= 1 && pCell.depth === 1 && pCell.col !== 1) {
      gameState.playerPos = 'c-ply-dp-c';
      renderEntities();
    }
  }, 280);

  // Resolve flight arrival
  setTimeout(() => {
    resolveShotArrival('CPU', targetId, card.speed, card.tag);
  }, 700);
}

/* --- CPU SERVE & SHOT ENGINE --- */
function executeCpuServe() {
  const isSecond = (gameState.serveAttempt === 2);
  const chosenCardKey = isSecond ? 'kick_serve' : (Math.random() > 0.4 ? 'flat_serve' : 'kick_serve');
  const card = CARD_LIBRARY[chosenCardKey];
  const targetId = getLegalServeTarget('CPU');

  if (Math.random() > card.accuracy) {
    playHitTone(180, 0.25, "sawtooth");
    if (gameState.serveAttempt === 1) {
      setFeed("CPU: FAULT", "CPU missed 1st serve. Moving to 2nd serve.");
      gameState.serveAttempt = 2;
      setTimeout(() => initPoint(true), 1100);
    } else {
      setFeed("CPU: DOUBLE FAULT!", "CPU 2nd serve out! Point to 1P.");
      setTimeout(() => registerPointWin('1P', "CPU Double Fault."), 900);
    }
    return;
  }

  playHitTone(500, 0.12);
  setFeed(`CPU: ${card.name} ──► ${targetId.replace('c-ply-', '').toUpperCase()}`, "Incoming serve!");
  gameState.ballPos = targetId;
  renderEntities();

  setTimeout(() => {
    resolveShotArrival('1P', targetId, card.speed, 'SERVE');
  }, 700);
}

function executeCpuRally() {
  const pCoord = COURT_CELLS[gameState.playerPos];
  let chosenKey = 'drive';
  let targetId = 'c-ply-dp-c';

  if (gameState.cpuCondition === 'OPPORTUNITY') {
    // Punish weak short ball with smash or deep flat drive
    chosenKey = Math.random() > 0.3 ? 'smash_winner' : 'topspin';
    targetId = pCoord.col === 0 ? 'c-ply-dp-r' : 'c-ply-dp-l';
  } else if (gameState.cpuCondition === 'SCRAMBLE') {
    // Scrambling: forced into high lob or slice
    chosenKey = Math.random() > 0.5 ? 'high_lob' : 'emergency_slice';
    targetId = 'c-ply-dp-c';
  } else {
    // Normal rally
    const possibleTargets = ['c-ply-dp-l', 'c-ply-dp-r', 'c-ply-sv-l', 'c-ply-sv-r'];
    possibleTargets.sort((a, b) => {
      const da = Math.abs(COURT_CELLS[a].col - pCoord.col) + Math.abs(COURT_CELLS[a].depth - pCoord.depth);
      const db = Math.abs(COURT_CELLS[b].col - pCoord.col) + Math.abs(COURT_CELLS[b].depth - pCoord.depth);
      return db - da;
    });
    targetId = possibleTargets[0];
    chosenKey = COURT_CELLS[targetId].depth === 0 ? 'drop' : (Math.random() > 0.4 ? 'topspin' : 'drive');
  }

  const card = CARD_LIBRARY[chosenKey];

  // CPU execution error check
  if (Math.random() > card.accuracy) {
    playHitTone(160, 0.25, "sawtooth");
    setFeed("CPU UNFORCED ERROR!", `CPU missed the ${card.name}. Point to 1P.`);
    setTimeout(() => registerPointWin('1P', "Opponent error."), 800);
    return;
  }

  playHitTone(400, 0.12);
  setFeed(`CPU: ${card.name} ──► ${targetId.replace('c-ply-', '').toUpperCase()}`, `Speed: ${card.speed.toUpperCase()}`);
  gameState.ballPos = targetId;
  renderEntities();

  // CPU auto-recovery
  setTimeout(() => {
    const cCell = COURT_CELLS[gameState.cpuPos];
    if (cCell.depth === 1 && cCell.col !== 1) {
      gameState.cpuPos = 'c-opp-dp-c';
      renderEntities();
    }
  }, 280);

  setTimeout(() => {
    resolveShotArrival('1P', targetId, card.speed, card.tag);
  }, 700);
}

/* --- ARRIVAL, REACHABILITY & INITIATIVE ENGINE --- */
function resolveShotArrival(receiver, targetId, shotSpeed, incomingTag) {
  const currentPosId = receiver === 'CPU' ? gameState.cpuPos : gameState.playerPos;
  const rec = COURT_CELLS[currentPosId];
  const tgt = COURT_CELLS[targetId];

  // NET INTERCEPTION VOLLEY
  if (rec.depth === 0 && tgt.depth === 1 && rec.col === tgt.col) {
    if (receiver === 'CPU') {
      playHitTone(540, 0.08);
      setFeed("CPU Volley Intercept!", "CPU cut the ball off at the net.");
      gameState.cpuCondition = 'OPPORTUNITY';
      setTimeout(executeCpuRally, 500);
    } else {
      playHitTone(540, 0.08);
      setFeed("1P Interception Volley!", "You closed down the net. Opportunity attack!");
      enterPlayerTurn('OPPORTUNITY', 3);
    }
    return;
  }

  const dist = Math.abs(tgt.col - rec.col) + Math.abs(tgt.depth - rec.depth);

  // CLEAN WINNER TEST
  // Fast shot + wide distance (dist >= 2) OR Smash tag = Unreturnable Winner
  if ((dist >= 2 && shotSpeed === 'fast') || incomingTag === 'PUNISH') {
    const winner = (receiver === 'CPU') ? '1P' : 'CPU';
    playHitTone(120, 0.35, "triangle");
    showModal("CLEAN WINNER!", `${winner} crushed a winner out of reach.`);
    registerPointWin(winner, "Unreturnable winner.");
    return;
  }

  // RESOLVE POSITIONING & SET NEXT STATE
  if (receiver === 'CPU') {
    gameState.cpuPos = targetId;
    renderEntities();
    playHitTone(300, 0.08);

    // Determine CPU condition based on movement stress
    if (dist >= 2) {
      gameState.cpuCondition = 'SCRAMBLE';
    } else if (tgt.depth === 0 && incomingTag === 'TOUCH') {
      gameState.cpuCondition = 'SCRAMBLE'; // Pulled to net by drop shot
    } else {
      gameState.cpuCondition = 'NEUTRAL';
    }

    setTimeout(executeCpuRally, 550);
  } else {
    // 1P Receives
    gameState.playerPos = targetId;
    renderEntities();
    playHitTone(300, 0.08);

    if (incomingTag === 'RESET' || (tgt.depth === 0 && incomingTag === 'DEFENSE')) {
      // Opponent floated a weak ball / short ball: 1P gets attacking opportunity!
      enterPlayerTurn('OPPORTUNITY', 3);
      setFeed("SIT-UP OPPORTUNITY!", "Weak floater in mid-court! Putaway chance.");
    } else if (dist >= 2) {
      // Player stretched wide: Scramble
      enterPlayerTurn('SCRAMBLE', 1);
      setFeed("DEFENSIVE SCRAMBLE!", "Stretched wide! Limited shot selection.");
    } else {
      // Standard rally
      console.log('[DEBUG] 1P in position to return/rally. Shot incoming:', { targetId, shotSpeed, incomingTag });
      enterPlayerTurn('IN_POSITION', 3);
      setFeed("In Position.", "Choose your play.");
    }
  }
}

function enterPlayerTurn(state, stamina) {
  console.log('[DEBUG] Entering player turn:', { state, stamina });
  gameState.turn = '1P';
  gameState.playerCondition = state;
  gameState.stamina = stamina;

  if (state === 'OPPORTUNITY') {
    gameState.hand = ['smash_winner', 'topspin', 'drop'];
  } else if (state === 'SCRAMBLE') {
    gameState.hand = ['emergency_slice', 'high_lob', 'desperation_winner'];
  } else {
    gameState.hand = ['topspin', 'drive', 'slice', 'drop'];
  }
  console.log('[DEBUG] 1P Hand populated:', gameState.hand);
  updateUI();
}

/* --- AUTHENTIC SCORING & SET ROTATION --- */
function getTennisScoreString() {
  const p = gameState.playerScore;
  const c = gameState.cpuScore;

  if (p >= 3 && c >= 3) {
    if (p === c) return "DEUCE";
    if (p === c + 1) return "AD - 40";
    if (c === p + 1) return "40 - AD";
  }

  const map = ['0', '15', '30', '40'];
  const pStr = map[p] !== undefined ? map[p] : '40';
  const cStr = map[c] !== undefined ? map[c] : '40';
  return `${pStr} - ${cStr}`;
}

function registerPointWin(winner, reason = "") {
  if (winner === '1P') {
    gameState.playerScore++;
  } else {
    gameState.cpuScore++;
  }
  gameState.pointsPlayed++;

  const p = gameState.playerScore;
  const c = gameState.cpuScore;
  const isGameWon = (p >= 4 || c >= 4) && Math.abs(p - c) >= 2;

  if (isGameWon) {
    const pWon = p > c;
    showModal("GAME COMPLETE", pWon ? "1P WINS THE GAME!" : "CPU WINS THE GAME!");
    document.getElementById('modal-next-btn').onclick = () => {
      gameState.playerScore = 0;
      gameState.cpuScore = 0;
      gameState.pointsPlayed = 0;
      // Swap server on completed game
      gameState.currentServer = gameState.currentServer === '1P' ? 'CPU' : '1P';
      document.getElementById('modal-overlay').style.display = 'none';
      initPoint();
    };
    return;
  }

  showModal(winner === '1P' ? "POINT TO 1P" : "POINT TO CPU", reason);
  document.getElementById('modal-next-btn').onclick = () => {
    document.getElementById('modal-overlay').style.display = 'none';
    initPoint();
  };
}

function showModal(title, msg) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent = msg;
  document.getElementById('modal-overlay').style.display = 'flex';
}

window.addEventListener('load', () => {
  initPoint();
});
window.addEventListener('resize', renderEntities);
