/* --- MAIN CONTROLLER & GAME LOOP --- */
import {
  CARD_LIBRARY,
  calculateDynamicAccuracy,
  computeNextSpinMomentum
} from './cards.js';
import {
  initAudio,
  toggleAudio,
  playServeHit,
  playRallyHit,
  playBounce,
  playFaultSound,
  playErrorSound,
  playWinnerSound
} from './audio.js';
import {
  COURT_CELLS,
  getCellCenter,
  renderEntities,
  highlightTarget,
  clearTargetHighlights,
  getSpeedConfig,
  getNetCoords,
  getOutOfBoundsCoords,
  getReboundCoords,
  getIntermediateCell,
  getServeReturnPosition,
  getServeReturnCoords,
  getServeSetupPositions,
  getShotLandingCoords,
  getPostBounceCoords,
  getReceiverMovementTarget,
  moveEntityTo,
  triggerNetShake,
  triggerStrokeArc,
  animateBallTo,
  animateWinnerBall,
  spawnBounceMark,
  getEntityCoords,
  getNearestCell,
  calculateHitterRecovery,
  calculateReachability
} from './court.js';
import {
  gameState,
  resetPlayerDecks,
  resetCpuDecks,
  drawPlayerHand,
  drawCpuHand,
  onPlayerCardPlayed,
  onCpuCardPlayed,
  cleanUpPointHand
} from './state.js';
import {
  chooseCpuServe,
  chooseCpuRally
} from './ai.js';
import {
  updateUI,
  setFeed,
  showModal
} from './ui.js';

// Setup audio toggle button
const audioBtn = document.getElementById('audio-btn');
if (audioBtn) {
  audioBtn.addEventListener('click', () => {
    const enabled = toggleAudio();
    audioBtn.textContent = enabled ? 'SND: ON' : 'SND: OFF';
    audioBtn.classList.toggle('active', enabled);
  });
}

function getLegalServeTarget(server) {
  const isDeuce = (gameState.pointsPlayed % 2 === 0);
  if (server === '1P') {
    return isDeuce ? 'c-opp-sv-l' : 'c-opp-sv-r';
  } else {
    return isDeuce ? 'c-ply-sv-l' : 'c-ply-sv-r';
  }
}

/* --- POINT INITIALIZATION --- */
export function initPoint(isSecondServe = false) {
  clearSelection();
  gameState.selectedCardKey = null;
  gameState.cpuRevealedCard = null;
  gameState.cpuCondition = 'NEUTRAL';
  gameState.cpuStamina = 3;
  gameState.spinMomentum = 0;
  gameState.playerRecoveryDirX = 0;
  gameState.cpuRecoveryDirX = 0;
  gameState.playerLastSprintDirX = 0;
  gameState.cpuLastSprintDirX = 0;
  gameState.playerMomentumPenalty = null;
  gameState.cpuMomentumPenalty = null;

  if (!isSecondServe) {
    cleanUpPointHand();
    gameState.serveAttempt = 1;
    gameState.rallyLength = 0;
    gameState.distanceMoved = 0;
    gameState.lastShotSpeed = 'normal';
    gameState.lastShotTag = 'SERVE';
  }

  const isDeuce = (gameState.pointsPlayed % 2 === 0);

  if (gameState.currentServer === '1P') {
    gameState.turn = '1P';
    gameState.playerCondition = 'SERVE';
    gameState.stamina = 3;

    drawPlayerHand(true);
    drawCpuHand(false);

    setFeed(
      `${isSecondServe ? 'SECOND SERVE' : 'FIRST SERVE'} (1P)`,
      ""
    );
    updateUI(selectCard);

    const setup = getServeSetupPositions('1P', isDeuce);
    gameState.playerPos = setup.playerPos;
    gameState.playerCoords = setup.playerCoords;
    gameState.cpuPos = setup.cpuPos;
    gameState.cpuCoords = setup.cpuCoords;
    gameState.ballPos = setup.ballCoords;
    renderEntities(gameState.playerCoords, gameState.cpuCoords, setup.ballCoords, true);
  } else {
    // CPU Serving
    gameState.turn = 'TRANSIT';
    gameState.playerCondition = 'NEUTRAL';
    gameState.stamina = 3;

    drawCpuHand(true);
    // Draw incoming player rally hand ready for return
    drawPlayerHand(false);

    updateUI(selectCard);

    const setup = getServeSetupPositions('CPU', isDeuce);
    gameState.playerPos = setup.playerPos;
    gameState.playerCoords = setup.playerCoords;
    gameState.cpuPos = setup.cpuPos;
    gameState.cpuCoords = setup.cpuCoords;
    gameState.ballPos = setup.ballCoords;
    renderEntities(gameState.playerCoords, gameState.cpuCoords, setup.ballCoords, true);
    setFeed(`CPU Serving...`, "");
    setTimeout(executeCpuServe, 850);
  }
}

function selectCard(cardKey) {
  gameState.selectedCardKey = cardKey;
  gameState.previewCornerTarget = false;
  updateUI(selectCard);
  clearTargetHighlights();

  const card = CARD_LIBRARY[cardKey];
  if (!card) return;

  if (gameState.playerCondition === 'SERVE') {
    const target = getLegalServeTarget('1P');
    highlightTarget(target, executePlayerShot);
  } else {
    const playerCell = COURT_CELLS[gameState.playerPos];
    const isPlayerAtNet = Boolean(playerCell && playerCell.depth === 0);

    const onCornerEnter = (id) => {
      if (COURT_CELLS[id]?.isCorner) {
        gameState.previewCornerTarget = true;
        updateUI(selectCard);
      }
    };
    const onCornerLeave = (id) => {
      if (COURT_CELLS[id]?.isCorner && gameState.previewCornerTarget) {
        gameState.previewCornerTarget = false;
        updateUI(selectCard);
      }
    };

    Object.keys(COURT_CELLS).forEach((id) => {
      const cell = COURT_CELLS[id];
      if (cell.half === 'opp') {
        const isNet = cell.depth === 0;
        const isFrontcourtSide = isNet && (cell.col === 0 || cell.col === 2);
        if (card.targets === 'any') {
          highlightTarget(id, executePlayerShot, onCornerEnter, onCornerLeave);
        } else if (card.targets === 'deep' && (!isNet || (isPlayerAtNet && isFrontcourtSide && card.tag !== 'RESET'))) {
          highlightTarget(id, executePlayerShot, onCornerEnter, onCornerLeave);
        } else if (card.targets === 'short' && isNet && !cell.isCorner) {
          highlightTarget(id, executePlayerShot);
        }
      }
    });
  }
}

function clearSelection() {
  gameState.selectedCardKey = null;
  gameState.previewCornerTarget = false;
  clearTargetHighlights();
}

/* --- IN-FLIGHT TRACKING & REACHABILITY ENGINE --- */
function startInFlightMovement(receiver, targetId, ballCoords, duration, isServe = false, incomingSpeed = 'normal', incomingTag = 'RALLY') {
  const currentPosId = (receiver === 'CPU') ? gameState.cpuPos : gameState.playerPos;
  const targetInfo = getReceiverMovementTarget(receiver, currentPosId, targetId, ballCoords, isServe, incomingSpeed, gameState.spinMomentum || 0);
  const entityId = (receiver === 'CPU') ? 'cpu-entity' : 'player-entity';
  const isCornerTarget = Boolean(COURT_CELLS[targetId]?.isCorner);

  if (receiver === '1P') {
    gameState.playerStrokeWing = targetInfo.strokeWing;
  } else {
    gameState.cpuStrokeWing = targetInfo.strokeWing;
  }

  // Measure reachability from defender's current actual position
  const currentCoords = (receiver === 'CPU' ? gameState.cpuCoords : gameState.playerCoords)
    || getEntityCoords(entityId)
    || getCellCenter(currentPosId);

  // Evaluate directional momentum penalty (wrong-footed against recovery vs. side-to-side whiplash)
  const moveDx = targetInfo.coords.x - currentCoords.x;
  const recoveryDirX = (receiver === 'CPU') ? gameState.cpuRecoveryDirX : gameState.playerRecoveryDirX;
  const lastSprintDirX = (receiver === 'CPU') ? gameState.cpuLastSprintDirX : gameState.playerLastSprintDirX;
  let momentumPenalty = null;

  if (!isServe && Math.abs(moveDx) > 22) {
    const moveDir = Math.sign(moveDx);
    if (recoveryDirX !== 0 && moveDir === -recoveryDirX) {
      // Ball hit behind the recovering player — must brake and reverse direction!
      momentumPenalty = 'WRONG_FOOTED';
    } else if (lastSprintDirX !== 0 && Math.abs(moveDx) > 45 && moveDir === -lastSprintDirX) {
      // Yanked wide to the opposite side after a wide sprint!
      momentumPenalty = 'WHIPLASH';
    }
  }

  const nextSprintDirX = (!isServe && Math.abs(moveDx) > 28) ? Math.sign(moveDx) : 0;
  if (receiver === 'CPU') {
    gameState.cpuMomentumPenalty = momentumPenalty;
    gameState.cpuLastSprintDirX = nextSprintDirX;
    gameState.cpuRecoveryDirX = 0;
  } else {
    gameState.playerMomentumPenalty = momentumPenalty;
    gameState.playerLastSprintDirX = nextSprintDirX;
    gameState.playerRecoveryDirX = 0;
  }

  const stamina = (receiver === 'CPU') ? (gameState.cpuStamina ?? 3) : gameState.stamina;
  const condition = (receiver === 'CPU') ? gameState.cpuCondition : gameState.playerCondition;
  const reach = calculateReachability(receiver, currentCoords, targetInfo.coords, duration, stamina, condition, isServe, incomingTag, isCornerTarget, momentumPenalty);

  console.log(`[DEBUG] Reachability check for ${receiver}:`, {
    distPx: reach.distPx,
    maxCoverable: reach.maxCoverable,
    canReach: reach.canReach,
    isWinner: reach.isWinner,
    incomingTag,
    isCornerTarget,
    spinMomentum: gameState.spinMomentum,
    momentumPenalty,
    resultingCondition: reach.resultingCondition
  });

  const delay = Math.min(30, Math.round(duration * 0.05));
  const moveDuration = Math.max(100, duration - delay);

  // If reachable, destination is targetInfo.coords (at the ball).
  // If unreachable, defender sprints towards the ball but can only cover maxCoverable distance, staying stranded!
  let destination;
  if (reach.canReach) {
    destination = targetInfo.coords;
  } else {
    const dx = targetInfo.coords.x - currentCoords.x;
    const dy = targetInfo.coords.y - currentCoords.y;
    const dist = Math.hypot(dx, dy) || 1;
    const rawRatio = (incomingTag === 'PUNISH') ? Math.min(0.45, (reach.maxCoverable / dist) * 0.5) : (reach.maxCoverable / dist);
    const ratio = Math.max(0.12, Math.min(0.68, rawRatio));
    destination = {
      x: currentCoords.x + ratio * dx,
      y: currentCoords.y + ratio * dy
    };
  }

  if (receiver === 'CPU') {
    gameState.cpuCoords = destination;
    gameState.cpuPos = reach.canReach ? targetInfo.cellId : getNearestCell(destination, 'opp');
  } else {
    gameState.playerCoords = destination;
    gameState.playerPos = reach.canReach ? targetInfo.cellId : getNearestCell(destination, 'ply');
  }

  setTimeout(() => {
    moveEntityTo(entityId, destination, moveDuration, 'cubic-bezier(0.25, 0.85, 0.35, 1)');
  }, delay);

  return reach;
}

/* --- HITTER DYNAMIC RECOVERY ENGINE --- */
function startHitterRecovery(hitter, cardTag = 'RALLY', cardKey = '', condition = 'NEUTRAL', shotDuration = 620) {
  const is1P = (hitter === '1P');
  const entityId = is1P ? 'player-entity' : 'cpu-entity';
  const currentCoords = (is1P ? gameState.playerCoords : gameState.cpuCoords)
    || getEntityCoords(entityId)
    || getCellCenter(is1P ? gameState.playerPos : gameState.cpuPos);

  const recovery = calculateHitterRecovery(hitter, currentCoords, condition, cardTag, cardKey);
  const recoveryDuration = Math.round(shotDuration * 0.75);
  const recoveredCell = getNearestCell(recovery.coords, is1P ? 'ply' : 'opp');
  const recDx = recovery.coords.x - currentCoords.x;
  const recoveryDirX = Math.abs(recDx) > 18 ? Math.sign(recDx) : 0;

  console.log(`[DEBUG] Hitter recovery for ${hitter}:`, {
    ratio: recovery.ratio,
    targetCoords: recovery.coords,
    recoveredCell,
    recoveryDirX,
    cardKey,
    condition
  });

  if (is1P) {
    gameState.playerCoords = recovery.coords;
    gameState.playerPos = recoveredCell;
    gameState.playerRecoveryDirX = recoveryDirX;
  } else {
    gameState.cpuCoords = recovery.coords;
    gameState.cpuPos = recoveredCell;
    gameState.cpuRecoveryDirX = recoveryDirX;
  }

  setTimeout(() => {
    moveEntityTo(entityId, recovery.coords, recoveryDuration, 'ease-out');
  }, 40);
}

/* --- 1P SHOT EXECUTION --- */
function executePlayerShot(targetId) {
  const card = CARD_LIBRARY[gameState.selectedCardKey];
  if (!card) return;

  const selectedKey = gameState.selectedCardKey;
  gameState.previewCornerTarget = false;
  clearTargetHighlights();
  gameState.turn = 'TRANSIT';
  gameState.stamina -= card.cost;
  const isCornerTarget = Boolean(COURT_CELLS[targetId]?.isCorner);
  const incomingSpin = gameState.spinMomentum || 0;

  // Nuance dynamic accuracy check
  const nuanceContext = {
    distanceMoved: gameState.distanceMoved,
    incomingSpeed: gameState.lastShotSpeed,
    rallyLength: gameState.rallyLength,
    stamina: gameState.stamina + card.cost,
    playerCondition: gameState.playerCondition,
    isServe: gameState.playerCondition === 'SERVE',
    strokeWing: gameState.playerStrokeWing || 'FOREHAND',
    isCornerTarget,
    spinMomentum: incomingSpin,
    momentumPenalty: gameState.playerMomentumPenalty || null
  };
  const dynamicAcc = calculateDynamicAccuracy(selectedKey, nuanceContext);

  console.log('[DEBUG] 1P Shot executed:', card.name, 'Target:', targetId, 'Spin:', incomingSpin, 'Momentum:', gameState.playerMomentumPenalty, 'Dynamic Accuracy:', dynamicAcc);

  const roll = Math.random();
  if (roll > dynamicAcc.accuracy) {
    // Shot execution failure
    onPlayerCardPlayed(selectedKey);
    updateUI(selectCard);

    const isServe = (gameState.playerCondition === 'SERVE');
    if (isServe) playServeHit(); else playRallyHit(card.speed === 'fast');
    triggerStrokeArc('player-entity', gameState.playerStrokeWing || 'FOREHAND');

    // Error distribution biased by corner target or heavy accumulated spin (slice -> net, topspin -> long)
    const errRand = Math.random();
    const wideSide = COURT_CELLS[targetId].col === 0 ? 'wide-left' : 'wide-right';
    let errorType;
    if (isCornerTarget) {
      errorType = errRand < 0.15 ? 'net' : (errRand < 0.575 ? 'long' : wideSide);
    } else if (!isServe && incomingSpin <= -2) {
      errorType = errRand < 0.68 ? 'net' : (errRand < 0.84 ? 'long' : wideSide);
    } else if (!isServe && incomingSpin >= 2) {
      errorType = errRand < 0.30 ? 'net' : (errRand < 0.78 ? 'long' : wideSide);
    } else {
      errorType = errRand < 0.5 ? 'net' : (errRand < 0.75 ? 'long' : wideSide);
    }

    if (errorType === 'net') {
      const netCoords = getNetCoords(gameState.playerCoords || gameState.playerPos, targetId);
      animateBallTo(netCoords, 280, 'ease-out', () => {
        triggerNetShake();
        playFaultSound();
        const dropCoords = { x: netCoords.x, y: netCoords.y + 10 };
        animateBallTo(dropCoords, 180, 'ease-in', () => {
          if (isServe) {
            if (gameState.serveAttempt === 1) {
              setFeed("FAULT!", "1st serve into the net. Second serve.");
              gameState.serveAttempt = 2;
              setTimeout(() => initPoint(true), 1100);
            } else {
              setFeed("DOUBLE FAULT!", "Second serve dumped into the net. Point to CPU.");
              setTimeout(() => registerPointWin('CPU', '1P Double Fault (Net).'), 900);
            }
          } else {
            setFeed("UNFORCED ERROR!", "Shot dumped into the net. Point to CPU.");
            setTimeout(() => registerPointWin('CPU', `1P error into the net with ${card.name}.`), 900);
          }
        });
      });
      return;
    } else {
      // Long or wide
      const outCoords = getOutOfBoundsCoords(gameState.playerCoords || gameState.playerPos, targetId, errorType);
      const speedCfg = getSpeedConfig(card.speed);
      animateBallTo(outCoords, speedCfg.duration, speedCfg.timing, () => {
        spawnBounceMark(outCoords);
        playBounce();
        playErrorSound();
        if (isServe) {
          if (gameState.serveAttempt === 1) {
            setFeed("FAULT!", errorType === 'long' ? "1st serve long past service line. Second serve." : "1st serve wide. Second serve.");
            gameState.serveAttempt = 2;
            setTimeout(() => initPoint(true), 1100);
          } else {
            setFeed("DOUBLE FAULT!", errorType === 'long' ? "Second serve long past the box. Point to CPU." : "Second serve wide. Point to CPU.");
            setTimeout(() => registerPointWin('CPU', '1P Double Fault (Out).'), 900);
          }
        } else {
          setFeed("OUT!", errorType === 'long' ? "Shot sailed long over baseline. Point to CPU." : "Shot sprayed wide past sideline. Point to CPU.");
          setTimeout(() => registerPointWin('CPU', `1P error with ${card.name} (Out).`), 900);
        }
      });
      return;
    }
  }

  // Shot succeeded: update accumulated spin momentum
  onPlayerCardPlayed(selectedKey);
  gameState.spinMomentum = computeNextSpinMomentum(incomingSpin, selectedKey);
  const speedCfg = getSpeedConfig(card.speed);

  if (gameState.playerCondition === 'SERVE') {
    playServeHit();
  } else {
    playRallyHit(card.speed === 'fast');
  }
  triggerStrokeArc('player-entity', gameState.playerStrokeWing || 'FOREHAND');

  setFeed(`1P: ${card.name} ──► ${targetId.replace('c-opp-', '').toUpperCase()}`, `Speed: ${card.speed.toUpperCase()}`);
  gameState.ballPos = targetId;
  updateUI(selectCard);

  // Measure initial distance before in-flight tracking
  const initialPosId = gameState.cpuPos;
  const curCell = COURT_CELLS[initialPosId];
  const tgtCell = COURT_CELLS[targetId];
  const initialDist = Math.abs(tgtCell.col - curCell.col) + Math.abs(tgtCell.depth - curCell.depth);

  const isServe = (card.tag === 'SERVE' || gameState.playerCondition === 'SERVE');
  const ballStart = getEntityCoords('ball-entity') || gameState.playerCoords || getCellCenter(gameState.playerPos);
  const landingCoords = getShotLandingCoords(targetId, card.id, isServe, gameState.spinMomentum);

  if (isServe) {
    const serveReturn = getServeReturnCoords('CPU', targetId, landingCoords, ballStart, card.id);
    const shotVector = { from: ballStart, to: serveReturn.coords };
    const reach = startInFlightMovement('CPU', serveReturn.cellId, serveReturn.coords, speedCfg.duration, true, card.speed, card.tag);
    startHitterRecovery('1P', card.tag, card.id, gameState.playerCondition, speedCfg.duration);
    const endCoords = (reach && reach.isWinner)
      ? getReboundCoords(landingCoords, ballStart, 85)
      : serveReturn.coords;

    animateWinnerBall(ballStart, landingCoords, endCoords, speedCfg.duration, () => {
      playBounce();
    }, () => {
      const servePressureDist = (card.id === 'slice_serve' || card.id === 't_cannon_serve') ? 1 : 0;
      resolveShotArrival('CPU', serveReturn.cellId, card.speed, card.tag, servePressureDist, initialPosId, reach, shotVector, true);
    });
    return;
  }

  const isSmashSetup = (card.tag === 'RESET' || card.tag === 'DEFENSE' || (curCell && curCell.depth === 0 && card.speed !== 'fast'));
  const strikeCoords = isSmashSetup
    ? landingCoords
    : getPostBounceCoords(landingCoords, ballStart, targetId, card.id, card.speed, gameState.spinMomentum);
  const shotVector = { from: ballStart, to: strikeCoords };

  // In-flight movement with real reachability check toward the strike point (post-bounce except for smashes)
  const reach = startInFlightMovement('CPU', targetId, strikeCoords, speedCfg.duration, false, card.speed, card.tag);

  // Hitter recovery: 1P immediately begins recovering toward baseline center
  startHitterRecovery('1P', card.tag, card.id, gameState.playerCondition, speedCfg.duration);

  const isWinnerShot = ((reach && reach.isWinner) || card.tag === 'PUNISH');
  if (isWinnerShot) {
    // Unreturnable Winner: Single smooth continuous flight -> bounce -> rebound (NO PAUSE!)
    const reboundCoords = getReboundCoords(landingCoords, ballStart, 75);
    animateWinnerBall(ballStart, landingCoords, reboundCoords, speedCfg.duration, () => {
      playBounce();
    }, () => {
      resolveShotArrival('CPU', targetId, card.speed, card.tag, initialDist, initialPosId, reach, shotVector, true);
    });
  } else if (isSmashSetup) {
    // Smash setup: receiver intercepts right on the bounce/high point
    animateBallTo(landingCoords, speedCfg.duration, speedCfg.timing, () => {
      resolveShotArrival('CPU', targetId, card.speed, card.tag, initialDist, initialPosId, reach, shotVector, false);
    });
  } else {
    // Standard rally shot: bounces at landingCoords then rises/decelerates to strikeCoords where receiver hits it
    animateWinnerBall(ballStart, landingCoords, strikeCoords, speedCfg.duration, () => {
      playBounce();
    }, () => {
      resolveShotArrival('CPU', targetId, card.speed, card.tag, initialDist, initialPosId, reach, shotVector, true);
    });
  }
}

/* --- CPU SERVE & SHOT ENGINE --- */
function executeCpuServe() {
  const chosenKey = chooseCpuServe() || 'safe_kick_serve';
  const card = CARD_LIBRARY[chosenKey] || CARD_LIBRARY['safe_kick_serve'];
  const targetId = getLegalServeTarget('CPU');
  const preShotStamina = gameState.cpuStamina ?? 3;
  gameState.cpuStamina = Math.max(0, preShotStamina - card.cost);

  updateUI(selectCard);

  const nuanceContext = {
    distanceMoved: 0,
    incomingSpeed: 'normal',
    rallyLength: 0,
    stamina: preShotStamina,
    playerCondition: 'SERVE',
    isServe: true
  };
  const dynamicAcc = calculateDynamicAccuracy(chosenKey, nuanceContext);

  if (Math.random() > dynamicAcc.accuracy) {
    onCpuCardPlayed(chosenKey);
    playServeHit();
    triggerStrokeArc('cpu-entity', 'FOREHAND');
    const errRand = Math.random();
    const errorType = errRand < 0.5 ? 'net' : (errRand < 0.75 ? 'long' : (COURT_CELLS[targetId].col === 0 ? 'wide-left' : 'wide-right'));

    if (errorType === 'net') {
      const netCoords = getNetCoords(gameState.cpuCoords || gameState.cpuPos, targetId);
      animateBallTo(netCoords, 280, 'ease-out', () => {
        triggerNetShake();
        playFaultSound();
        const dropCoords = { x: netCoords.x, y: netCoords.y - 10 };
        animateBallTo(dropCoords, 180, 'ease-in', () => {
          if (gameState.serveAttempt === 1) {
            setFeed("CPU: FAULT", "CPU serve into the net. Moving to 2nd serve.");
            gameState.serveAttempt = 2;
            setTimeout(() => initPoint(true), 1100);
          } else {
            setFeed("CPU: DOUBLE FAULT!", "CPU 2nd serve dumped into net! Point to 1P.");
            setTimeout(() => registerPointWin('1P', "CPU Double Fault (Net)."), 900);
          }
        });
      });
      return;
    } else {
      const outCoords = getOutOfBoundsCoords(gameState.cpuCoords || gameState.cpuPos, targetId, errorType);
      const speedCfg = getSpeedConfig(card.speed);
      animateBallTo(outCoords, speedCfg.duration, speedCfg.timing, () => {
        spawnBounceMark(outCoords);
        playBounce();
        playErrorSound();
        if (gameState.serveAttempt === 1) {
          setFeed("CPU: FAULT", errorType === 'long' ? "CPU serve long past service box. 2nd serve." : "CPU serve wide. 2nd serve.");
          gameState.serveAttempt = 2;
          setTimeout(() => initPoint(true), 1100);
        } else {
          setFeed("CPU: DOUBLE FAULT!", errorType === 'long' ? "CPU 2nd serve out long! Point to 1P." : "CPU 2nd serve wide! Point to 1P.");
          setTimeout(() => registerPointWin('1P', "CPU Double Fault (Out)."), 900);
        }
      });
      return;
    }
  }

  // Shot succeeded
  onCpuCardPlayed(chosenKey);
  gameState.spinMomentum = computeNextSpinMomentum(0, chosenKey);
  playServeHit();
  triggerStrokeArc('cpu-entity', 'FOREHAND');
  const speedCfg = getSpeedConfig(card.speed);
  setFeed(`CPU: ${card.name} ──► ${targetId.replace('c-ply-', '').toUpperCase()}`, "Incoming serve!");
  gameState.ballPos = targetId;

  const initialPosId = gameState.playerPos;
  const ballStart = getEntityCoords('ball-entity') || gameState.cpuCoords || getCellCenter(gameState.cpuPos);
  const landingCoords = getShotLandingCoords(targetId, chosenKey, true, gameState.spinMomentum);
  const serveReturn = getServeReturnCoords('1P', targetId, landingCoords, ballStart, chosenKey);
  const shotVector = { from: ballStart, to: serveReturn.coords };

  // Trigger player movement along the baseline to receive the serve after the bounce
  const reach = startInFlightMovement('1P', serveReturn.cellId, serveReturn.coords, speedCfg.duration, true, card.speed, 'SERVE');

  // Hitter recovery: CPU server immediately recovers to baseline center
  startHitterRecovery('CPU', 'SERVE', chosenKey, 'SERVE', speedCfg.duration);

  const endCoords = (reach && reach.isWinner)
    ? getReboundCoords(landingCoords, ballStart, 85)
    : serveReturn.coords;

  // Animate serve through service-box bounce to baseline return spot (or past baseline on an Ace)
  animateWinnerBall(ballStart, landingCoords, endCoords, speedCfg.duration, () => {
    playBounce();
  }, () => {
    const servePressureDist = (chosenKey === 'slice_serve' || chosenKey === 't_cannon_serve') ? 1 : 0;
    resolveShotArrival('1P', serveReturn.cellId, card.speed, 'SERVE', servePressureDist, initialPosId, reach, shotVector, true);
  });
}

function executeCpuRally() {
  const { cardKey, targetId } = chooseCpuRally();
  const validKey = (cardKey && CARD_LIBRARY[cardKey]) ? cardKey : 'safe_drive';
  const card = CARD_LIBRARY[validKey];
  const isCornerTarget = Boolean(COURT_CELLS[targetId]?.isCorner);
  const incomingSpin = gameState.spinMomentum || 0;
  const preShotStamina = gameState.cpuStamina ?? 3;
  gameState.cpuStamina = Math.max(0, preShotStamina - card.cost);

  updateUI(selectCard);

  const nuanceContext = {
    distanceMoved: gameState.distanceMoved,
    incomingSpeed: gameState.lastShotSpeed,
    rallyLength: gameState.rallyLength,
    stamina: preShotStamina,
    playerCondition: gameState.cpuCondition,
    isServe: false,
    strokeWing: gameState.cpuStrokeWing || 'FOREHAND',
    isCornerTarget,
    spinMomentum: incomingSpin,
    momentumPenalty: gameState.cpuMomentumPenalty || null
  };
  const dynamicAcc = calculateDynamicAccuracy(validKey, nuanceContext);

  console.log('[DEBUG] CPU Shot executed:', card.name, 'Target:', targetId, 'Spin:', incomingSpin, 'Momentum:', gameState.cpuMomentumPenalty, 'Dynamic Accuracy:', dynamicAcc);

  if (Math.random() > dynamicAcc.accuracy) {
    onCpuCardPlayed(validKey);
    playRallyHit(card.speed === 'fast');
    triggerStrokeArc('cpu-entity', gameState.cpuStrokeWing || 'FOREHAND');
    const errRand = Math.random();
    const wideSide = COURT_CELLS[targetId].col === 0 ? 'wide-left' : 'wide-right';
    let errorType;
    if (isCornerTarget) {
      errorType = errRand < 0.15 ? 'net' : (errRand < 0.575 ? 'long' : wideSide);
    } else if (incomingSpin <= -2) {
      errorType = errRand < 0.68 ? 'net' : (errRand < 0.84 ? 'long' : wideSide);
    } else if (incomingSpin >= 2) {
      errorType = errRand < 0.30 ? 'net' : (errRand < 0.78 ? 'long' : wideSide);
    } else {
      errorType = errRand < 0.5 ? 'net' : (errRand < 0.75 ? 'long' : wideSide);
    }

    if (errorType === 'net') {
      const netCoords = getNetCoords(gameState.cpuCoords || gameState.cpuPos, targetId);
      animateBallTo(netCoords, 280, 'ease-out', () => {
        triggerNetShake();
        playFaultSound();
        const dropCoords = { x: netCoords.x, y: netCoords.y - 10 };
        animateBallTo(dropCoords, 180, 'ease-in', () => {
          setFeed("CPU UNFORCED ERROR!", `CPU dumped the ${card.name} into the net! Point to 1P.`);
          setTimeout(() => registerPointWin('1P', `CPU error into net with ${card.name}.`), 900);
        });
      });
      return;
    } else {
      const outCoords = getOutOfBoundsCoords(gameState.cpuCoords || gameState.cpuPos, targetId, errorType);
      const speedCfg = getSpeedConfig(card.speed);
      animateBallTo(outCoords, speedCfg.duration, speedCfg.timing, () => {
        spawnBounceMark(outCoords);
        playBounce();
        playErrorSound();
        setFeed("CPU OUT!", errorType === 'long' ? `CPU ${card.name} long past baseline! Point to 1P.` : `CPU ${card.name} sprayed wide! Point to 1P.`);
        setTimeout(() => registerPointWin('1P', `CPU error with ${card.name} (Out).`), 900);
      });
      return;
    }
  }

  // Shot succeeded: update accumulated spin momentum
  onCpuCardPlayed(validKey);
  gameState.spinMomentum = computeNextSpinMomentum(incomingSpin, validKey);
  playRallyHit(card.speed === 'fast');
  triggerStrokeArc('cpu-entity', gameState.cpuStrokeWing || 'FOREHAND');
  const speedCfg = getSpeedConfig(card.speed);
  setFeed(`CPU: ${card.name} ──► ${targetId.replace('c-ply-', '').toUpperCase()}`, `Speed: ${card.speed.toUpperCase()}`);
  gameState.ballPos = targetId;

  // Measure initial distance before in-flight tracking
  const initialPosId = gameState.playerPos;
  const curCell = COURT_CELLS[initialPosId];
  const tgtCell = COURT_CELLS[targetId];
  const initialDist = Math.abs(tgtCell.col - curCell.col) + Math.abs(tgtCell.depth - curCell.depth);

  const ballStart = getEntityCoords('ball-entity') || gameState.cpuCoords || getCellCenter(gameState.cpuPos);
  const landingCoords = getShotLandingCoords(targetId, validKey, false, gameState.spinMomentum);
  const isSmashSetup = (card.tag === 'RESET' || card.tag === 'DEFENSE' || (curCell && curCell.depth === 0 && card.speed !== 'fast'));
  const strikeCoords = isSmashSetup
    ? landingCoords
    : getPostBounceCoords(landingCoords, ballStart, targetId, validKey, card.speed, gameState.spinMomentum);
  const shotVector = { from: ballStart, to: strikeCoords };

  // Trigger player movement toward the post-bounce strike point (or bounce point on smash setups)
  const reach = startInFlightMovement('1P', targetId, strikeCoords, speedCfg.duration, false, card.speed, card.tag);

  // Hitter recovery: CPU immediately begins recovering toward baseline center
  startHitterRecovery('CPU', card.tag, validKey, gameState.cpuCondition, speedCfg.duration);

  // Animate ball from its current position on court through bounce to strike/rebound coords
  const isWinnerShot = (reach && reach.isWinner) || card.tag === 'PUNISH';
  if (isWinnerShot) {
    const reboundCoords = getReboundCoords(landingCoords, ballStart, 75);
    animateWinnerBall(ballStart, landingCoords, reboundCoords, speedCfg.duration, () => {
      playBounce();
    }, () => {
      resolveShotArrival('1P', targetId, card.speed, card.tag, initialDist, initialPosId, reach, shotVector, true);
    });
  } else if (isSmashSetup) {
    animateBallTo(landingCoords, speedCfg.duration, speedCfg.timing, () => {
      resolveShotArrival('1P', targetId, card.speed, card.tag, initialDist, initialPosId, reach, shotVector, false);
    });
  } else {
    animateWinnerBall(ballStart, landingCoords, strikeCoords, speedCfg.duration, () => {
      playBounce();
    }, () => {
      resolveShotArrival('1P', targetId, card.speed, card.tag, initialDist, initialPosId, reach, shotVector, true);
    });
  }
}

/* --- ARRIVAL, REACHABILITY & WINNER ENGINE --- */
function resolveShotArrival(receiver, targetId, shotSpeed, incomingTag, initialDist, initialPosId, reachResult, shotVector, alreadyRebounded = false) {
  const currentPosId = receiver === 'CPU' ? gameState.cpuPos : gameState.playerPos;
  const rec = COURT_CELLS[initialPosId || currentPosId];
  const tgt = COURT_CELLS[targetId];
  const isCornerTarget = Boolean(tgt && tgt.isCorner);
  const gridDist = (initialDist !== undefined) ? initialDist : (Math.abs(tgt.col - rec.col) + Math.abs(tgt.depth - rec.depth));
  const isServe = (incomingTag === 'SERVE');
  const isUnreachable = Boolean(reachResult && reachResult.isWinner);
  const isCleanWinner = isUnreachable || (!isServe && incomingTag === 'PUNISH');

  // Compute effective movement effort from actual reachability when available
  let dist = gridDist;
  if (!isServe && reachResult && reachResult.maxCoverable > 0) {
    const effortRatio = reachResult.distPx / reachResult.maxCoverable;
    if (effortRatio > 0.72) dist = 2;
    else if (effortRatio > 0.35) dist = 1;
    else dist = 0;
  }

  // Deep corner targets count as +1 effective distance unit further away from the defender
  if (!isServe && isCornerTarget) {
    dist += 1;
  }

  // Clean Winner / Ace Check via Reachability Engine
  if (isCleanWinner) {
    const winner = (receiver === 'CPU') ? '1P' : 'CPU';

    // Defender stays stranded at their sprint reach on court (no sudden teleport)
    const defEntity = (receiver === 'CPU') ? 'cpu-entity' : 'player-entity';
    const defPos = getEntityCoords(defEntity);
    if (defPos) {
      if (receiver === 'CPU') {
        gameState.cpuCoords = defPos;
        gameState.cpuPos = getNearestCell(defPos, 'opp');
      } else {
        gameState.playerCoords = defPos;
        gameState.playerPos = getNearestCell(defPos, 'ply');
      }
    }

    playWinnerSound();
    if (isServe) {
      setFeed("ACE!", `${winner} fired an unreturnable Ace!`);
    } else {
      setFeed("CLEAN WINNER!", `${winner} hit an unreturnable winner${isCornerTarget ? ' into the corner pocket' : ' past the court'}!`);
    }

    setTimeout(() => {
      registerPointWin(winner, isServe ? "Ace." : "Unreturnable winner.");
    }, 450);
    return;
  }

  // Update position & rally nuance tracking
  gameState.rallyLength++;
  gameState.lastShotSpeed = shotSpeed;
  gameState.lastShotTag = incomingTag;
  gameState.distanceMoved = dist;

  if (!alreadyRebounded) {
    if (shotVector && shotVector.to) {
      spawnBounceMark(shotVector.to);
    }
    playBounce();
  }

  const isScramble = !isServe && (
    (reachResult && reachResult.resultingCondition === 'SCRAMBLE')
    || (!reachResult && dist >= 2)
    || (isCornerTarget && dist >= 2)
    || (tgt.depth === 0 && incomingTag === 'TOUCH')
  );

  const resolvedCellId = (tgt && tgt.parentId) ? tgt.parentId : targetId;
  // Defenders require additional stamina expenditure to return balls struck cleanly into the corners
  const cornerStaminaTax = (!isServe && isCornerTarget && dist >= 2) ? 1 : 0;

  const wasAtNet = Boolean(COURT_CELLS[initialPosId]?.depth === 0);
  const isHighBall = (incomingTag === 'RESET' || incomingTag === 'DEFENSE');
  const isNetSmashSetup = !isServe && !isScramble && wasAtNet && shotSpeed !== 'fast';
  const isOpportunity = !isServe && (isHighBall || isNetSmashSetup);

  if (receiver === 'CPU') {
    gameState.cpuPos = resolvedCellId;
    gameState.cpuCondition = isOpportunity ? 'OPPORTUNITY' : (isScramble ? 'SCRAMBLE' : 'IN_POSITION');
    gameState.cpuStamina = Math.max(1, (isScramble ? 2 : 3) - cornerStaminaPenalty(cornerStaminaTax));
    drawCpuHand(false);
    const isCpuAtNet = Boolean(COURT_CELLS[gameState.cpuPos]?.depth === 0);
    if ((isOpportunity || (isCpuAtNet && !isScramble)) && !gameState.cpuHand.includes('smash_winner')) {
      gameState.cpuHand[1] = 'smash_winner';
    }
    setTimeout(executeCpuRally, 180);
  } else {
    // 1P Receives
    gameState.playerPos = resolvedCellId;

    if (isOpportunity) {
      enterPlayerTurn('OPPORTUNITY', 3, dist, shotSpeed, incomingTag);
      setFeed(isHighBall ? "HIGH BALL — SMASH OPPORTUNITY!" : "NET INTERCEPT — SMASH OPPORTUNITY!", "");
    } else if (isScramble) {
      const nextStamina = Math.max(1, 2 - cornerStaminaTax);
      enterPlayerTurn('SCRAMBLE', nextStamina, dist, shotSpeed, incomingTag);
      setFeed(isCornerTarget ? "CORNER SCRAMBLE!" : "DEFENSIVE SCRAMBLE!", isCornerTarget ? "Pinned in deep corner (+1 dist / stamina tax)!" : "");
    } else {
      const nextStamina = Math.max(1, 3 - cornerStaminaTax);
      enterPlayerTurn('IN_POSITION', nextStamina, dist, shotSpeed, incomingTag);
      setFeed("In Position", "");
    }
  }
}

function cornerStaminaPenalty(tax) {
  return tax || 0;
}

function enterPlayerTurn(state, stamina, distanceMoved, incomingSpeed, incomingTag) {
  console.log('[DEBUG] enterPlayerTurn called:', { state, stamina, distanceMoved, incomingSpeed });
  gameState.turn = '1P';
  gameState.playerCondition = state;
  gameState.stamina = stamina;
  gameState.distanceMoved = distanceMoved;
  gameState.lastShotSpeed = incomingSpeed;
  gameState.lastShotTag = incomingTag;

  // Draw or refresh player's rally hand
  drawPlayerHand(false);

  // If in opportunity state or positioned at the net (non-scramble), ensure smash_winner is in hand
  const isPlayerAtNet = Boolean(COURT_CELLS[gameState.playerPos]?.depth === 0);
  if ((state === 'OPPORTUNITY' || (isPlayerAtNet && state !== 'SCRAMBLE')) && !gameState.playerHand.includes('smash_winner')) {
    gameState.playerHand[1] = 'smash_winner';
  }

  updateUI(selectCard);
}

/* --- SCORING & SET ROTATION --- */
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
    setFeed(pWon ? "GAME TO 1P!" : "GAME TO CPU!", `${reason} Switching server...`);
    updateUI();
    setTimeout(() => {
      gameState.playerScore = 0;
      gameState.cpuScore = 0;
      gameState.pointsPlayed = 0;
      gameState.currentServer = gameState.currentServer === '1P' ? 'CPU' : '1P';
      initPoint();
    }, 1600);
    return;
  }

  setFeed(winner === '1P' ? "POINT TO 1P" : "POINT TO CPU", reason);
  updateUI();

  setTimeout(() => {
    initPoint();
  }, 1100);
}

// Initial boot
function boot() {
  resetPlayerDecks();
  resetCpuDecks();
  initPoint();
}

if (document.readyState === 'loading') {
  window.addEventListener('load', boot);
} else {
  boot();
}

window.addEventListener('resize', () => {
  renderEntities(gameState.playerCoords || gameState.playerPos, gameState.cpuCoords || gameState.cpuPos, gameState.ballPos);
});
