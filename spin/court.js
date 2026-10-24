/* --- COURT GEOMETRY & ENTITY RENDERER --- */

export const COURT_CELLS = {
  // CPU half (Top)
  'c-opp-dp-l': { col: 0, depth: 1, half: 'opp', label: 'OP-BL' },
  'c-opp-dp-c': { col: 1, depth: 1, half: 'opp', label: 'OP-BC' },
  'c-opp-dp-r': { col: 2, depth: 1, half: 'opp', label: 'OP-BR' },
  'c-opp-sv-l': { col: 0, depth: 0, half: 'opp', label: 'OP-SL' },
  'c-opp-sv-c': { col: 1, depth: 0, half: 'opp', label: 'OP-SC' },
  'c-opp-sv-r': { col: 2, depth: 0, half: 'opp', label: 'OP-SR' },
  'c-opp-cn-l': { col: 0, depth: 1, half: 'opp', isCorner: true, parentId: 'c-opp-dp-l', label: 'OP-CN-L' },
  'c-opp-cn-r': { col: 2, depth: 1, half: 'opp', isCorner: true, parentId: 'c-opp-dp-r', label: 'OP-CN-R' },
  'c-opp-scn-l': { col: 0, depth: 0, half: 'opp', isCorner: true, isFrontCorner: true, parentId: 'c-opp-sv-l', label: 'OP-SCN-L' },
  'c-opp-scn-r': { col: 2, depth: 0, half: 'opp', isCorner: true, isFrontCorner: true, parentId: 'c-opp-sv-r', label: 'OP-SCN-R' },

  // Player half (Bottom)
  'c-ply-sv-l': { col: 0, depth: 0, half: 'ply', label: '1P-SL' },
  'c-ply-sv-c': { col: 1, depth: 0, half: 'ply', label: '1P-SC' },
  'c-ply-sv-r': { col: 2, depth: 0, half: 'ply', label: '1P-SR' },
  'c-ply-dp-l': { col: 0, depth: 1, half: 'ply', label: '1P-BL' },
  'c-ply-dp-c': { col: 1, depth: 1, half: 'ply', label: '1P-BC' },
  'c-ply-dp-r': { col: 2, depth: 1, half: 'ply', label: '1P-BR' },
  'c-ply-cn-l': { col: 0, depth: 1, half: 'ply', isCorner: true, parentId: 'c-ply-dp-l', label: '1P-CN-L' },
  'c-ply-cn-r': { col: 2, depth: 1, half: 'ply', isCorner: true, parentId: 'c-ply-dp-r', label: '1P-CN-R' },
  'c-ply-scn-l': { col: 0, depth: 0, half: 'ply', isCorner: true, isFrontCorner: true, parentId: 'c-ply-sv-l', label: '1P-SCN-L' },
  'c-ply-scn-r': { col: 2, depth: 0, half: 'ply', isCorner: true, isFrontCorner: true, parentId: 'c-ply-sv-r', label: '1P-SCN-R' }
};

export function getSpeedConfig(speed) {
  switch (speed) {
    case 'fast':
      return { duration: 380, timing: 'cubic-bezier(0.12, 0.85, 0.3, 1)' };
    case 'slow':
      return { duration: 920, timing: 'cubic-bezier(0.25, 0.85, 0.45, 1)' };
    case 'normal':
    default:
      return { duration: 620, timing: 'cubic-bezier(0.2, 0.8, 0.25, 1)' };
  }
}

export function getCellCenter(id) {
  if (!id) return { x: 0, y: 0 };
  if (typeof id === 'object' && typeof id.x === 'number' && typeof id.y === 'number') {
    return id;
  }
  const el = document.getElementById(id);
  if (!el) return { x: 0, y: 0 };
  const rect = el.getBoundingClientRect();
  const stageEl = document.getElementById('court-stage');
  const stageRect = stageEl ? stageEl.getBoundingClientRect() : { left: 0, top: 0 };
  return {
    x: rect.left - stageRect.left + rect.width / 2,
    y: rect.top - stageRect.top + rect.height / 2
  };
}

export function getCourtStageCoords() {
  const courtEl = document.getElementById('court');
  const stageEl = document.getElementById('court-stage');
  if (!courtEl || !stageEl) return { left: 0, top: 0, right: 300, bottom: 360, width: 300, height: 360 };
  const c = courtEl.getBoundingClientRect();
  const s = stageEl.getBoundingClientRect();
  return {
    left: c.left - s.left,
    top: c.top - s.top,
    right: c.right - s.left,
    bottom: c.bottom - s.top,
    width: c.width,
    height: c.height
  };
}

export function getNetCoords(hitterPosId, targetPosId) {
  const court = getCourtStageCoords();
  const netEl = document.querySelector('.net-separator');
  const stageEl = document.getElementById('court-stage');
  let y = court.top + court.height / 2;
  if (netEl && stageEl) {
    const nr = netEl.getBoundingClientRect();
    const sr = stageEl.getBoundingClientRect();
    y = nr.top - sr.top + nr.height / 2;
  }

  const hCoords = getCellCenter(hitterPosId);
  const tCoords = getCellCenter(targetPosId);
  const dy = tCoords.y - hCoords.y;
  let t = 0.5;
  if (Math.abs(dy) > 0.001) {
    t = (y - hCoords.y) / dy;
  }
  t = Math.max(0.15, Math.min(0.85, t));
  const x = hCoords.x + t * (tCoords.x - hCoords.x);
  return { x, y };
}

export function getOutOfBoundsCoords(hitterPosId, targetPosId, errorType = 'long') {
  const court = getCourtStageCoords();
  const hCoords = getCellCenter(hitterPosId);
  const tCoords = getCellCenter(targetPosId);

  if (errorType === 'long') {
    const dx = tCoords.x - hCoords.x;
    const dy = tCoords.y - hCoords.y;
    const isHittingUp = dy < 0; // towards CPU
    const outY = isHittingUp ? (court.top - 28) : (court.bottom + 28);
    const scale = Math.abs((outY - hCoords.y) / (dy || 1));
    const outX = Math.max(court.left - 15, Math.min(court.right + 15, hCoords.x + dx * scale));
    return { x: outX, y: outY };
  } else if (errorType === 'wide-left') {
    return { x: court.left - 28, y: tCoords.y };
  } else { // wide-right
    return { x: court.right + 28, y: tCoords.y };
  }
}

export function getReboundCoords(landingPos, fromPos, reboundDist = 75) {
  const court = getCourtStageCoords();
  const landing = (typeof landingPos === 'object' && landingPos !== null && 'x' in landingPos)
    ? landingPos
    : getCellCenter(landingPos);
  const from = (typeof fromPos === 'object' && fromPos !== null && 'x' in fromPos)
    ? fromPos
    : getCellCenter(fromPos);

  const dx = landing.x - from.x;
  const dy = landing.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  // Project ray to the end of the court (past baseline or sideline)
  const targetY = uy < 0 ? (court.top - 24) : (court.bottom + 24);
  const distToEndY = Math.abs(uy) > 0.05 ? Math.abs((targetY - landing.y) / uy) : reboundDist;
  let effectiveDist = Math.max(reboundDist, distToEndY);

  if (Math.abs(ux) > 0.05) {
    const targetX = ux < 0 ? (court.left - 24) : (court.right + 24);
    const distToEndX = Math.abs((targetX - landing.x) / ux);
    effectiveDist = Math.min(effectiveDist, Math.max(reboundDist, distToEndX));
  }

  return {
    x: landing.x + ux * effectiveDist,
    y: landing.y + uy * effectiveDist
  };
}

export function getIntermediateCell(currentPosId, targetPosId) {
  const cur = COURT_CELLS[currentPosId];
  const tgt = COURT_CELLS[targetPosId];
  if (!cur || !tgt) return currentPosId;

  const half = cur.half;
  let nextCol = cur.col;
  let nextDepth = cur.depth;

  if (cur.col < tgt.col) nextCol = cur.col + 1;
  else if (cur.col > tgt.col) nextCol = cur.col - 1;
  else if (cur.depth < tgt.depth) nextDepth = cur.depth + 1;
  else if (cur.depth > tgt.depth) nextDepth = cur.depth - 1;

  for (const [id, cell] of Object.entries(COURT_CELLS)) {
    if (cell.half === half && !cell.isCorner && cell.col === nextCol && cell.depth === nextDepth) {
      return id;
    }
  }
  return currentPosId;
}

export function triggerNetShake() {
  const netEl = document.querySelector('.net-separator');
  if (!netEl) return;
  netEl.classList.remove('net-hit');
  void netEl.offsetWidth; // force reflow
  netEl.classList.add('net-hit');
  setTimeout(() => netEl.classList.remove('net-hit'), 350);
}

export function triggerStrokeArc(entityId, strokeWing = 'FOREHAND') {
  const el = document.getElementById(entityId);
  if (!el) return;

  const isCPU = (entityId === 'cpu-entity');
  const isBH = (strokeWing === 'BACKHAND');

  const animClass = isCPU
    ? (isBH ? 'swing-cpu-backhand' : 'swing-cpu-forehand')
    : (isBH ? 'swing-backhand' : 'swing-forehand');

  el.classList.remove('swing-forehand', 'swing-backhand', 'swing-cpu-forehand', 'swing-cpu-backhand');
  void el.offsetWidth; // Force CSS reflow to re-trigger
  el.classList.add(animClass);
  setTimeout(() => {
    el.classList.remove(animClass);
  }, 290);
}

export function getShotLandingCoords(targetId, cardKey = '', isServe = false, spinMomentum = 0) {
  const el = document.getElementById(targetId);
  const stageEl = document.getElementById('court-stage');
  if (!el || !stageEl) return getCellCenter(targetId);

  const rect = el.getBoundingClientRect();
  const stageRect = stageEl.getBoundingClientRect();
  const cell = COURT_CELLS[targetId];
  const isCorner = Boolean(cell && cell.isCorner);

  const centerX = rect.left - stageRect.left + rect.width / 2;
  const centerY = rect.top - stageRect.top + rect.height / 2;
  const maxOffsetX = isCorner ? Math.max(3, rect.width * 0.22) : Math.max(8, rect.width * 0.32);
  const maxOffsetY = isCorner ? Math.max(3, rect.height * 0.22) : Math.max(6, rect.height * 0.28);

  let offsetX = (Math.random() - 0.5) * 2 * maxOffsetX;
  let offsetY = (Math.random() - 0.5) * 2 * maxOffsetY;

  if (isCorner) {
    const cornerDirX = (cell.col === 0) ? -1 : 1;
    if (cell.isFrontCorner) {
      // Front drop pocket: land tight near the net and sideline
      const netDirY = (cell.half === 'ply') ? -1 : 1;
      offsetX = cornerDirX * (maxOffsetX * 0.25) + (Math.random() - 0.5) * (maxOffsetX * 0.35);
      offsetY = netDirY * (maxOffsetY * 0.25) + (Math.random() - 0.5) * (maxOffsetY * 0.30);
    } else {
      // Deep corner pocket: bounce in the front-inner part so post-bounce carry exits through the corner
      const cornerDirY = (cell.half === 'ply') ? 1 : -1;
      offsetX = cornerDirX * (maxOffsetX * 0.25) + (Math.random() - 0.5) * (maxOffsetX * 0.35);
      offsetY = -cornerDirY * (maxOffsetY * 0.15) + (Math.random() - 0.5) * (maxOffsetY * 0.35);
    }
  } else if (isServe) {
    const tDir = (cell && cell.col === 0) ? 1 : -1;
    const deepDir = (cell && cell.half === 'ply') ? 1 : -1;
    if (cardKey === 't_cannon_serve') {
      // Paint the center T line so post-bounce trajectory cuts sharply toward the middle
      offsetX = tDir * (maxOffsetX * (1.15 + Math.random() * 0.55));
      offsetY = deepDir * (maxOffsetY * 0.55) + (Math.random() - 0.5) * (maxOffsetY * 0.25);
    } else if (cardKey === 'slice_serve' || cardKey === 'kick_twist_serve') {
      // Slice / twist kick serve pulls wide toward the outer sideline
      offsetX = -tDir * (maxOffsetX * (0.25 + Math.random() * 0.45));
      offsetY = deepDir * (maxOffsetY * 0.15) + (Math.random() - 0.5) * (maxOffsetY * 0.25);
    } else if (cardKey === 'flat_serve') {
      // Flat serve targets either the T corner or the wide corner
      const goT = Math.random() < 0.55;
      offsetX = goT
        ? tDir * (maxOffsetX * (0.95 + Math.random() * 0.55))
        : -tDir * (maxOffsetX * (0.10 + Math.random() * 0.40));
      offsetY = deepDir * (maxOffsetY * 0.55) + (Math.random() - 0.5) * (maxOffsetY * 0.25);
    } else {
      // Safe kick serve lands comfortably in the middle of the box
      offsetX = tDir * (maxOffsetX * 0.45) + (Math.random() - 0.5) * (maxOffsetX * 0.25);
      offsetY = deepDir * (maxOffsetY * 0.25) + (Math.random() - 0.5) * (maxOffsetY * 0.25);
    }
  } else {
    const baseDir = (cell && cell.half === 'ply') ? 1 : -1;
    if (cardKey === 'disguised_drop' || cardKey === 'feather_drop') {
      const netDir = -baseDir;
      offsetY = netDir * (maxOffsetY * 0.78) + (Math.random() - 0.5) * (maxOffsetY * 0.18);
    } else if (cardKey === 'emergency_slice') {
      // Weak defensive floater bounces shallow near the service line
      const netDir = -baseDir;
      offsetY = netDir * (maxOffsetY * 0.85) + (Math.random() - 0.5) * (maxOffsetY * 0.15);
    } else if (cardKey === 'crosscourt_drive' || cardKey === 'topspin' || cardKey === 'inside_out_laser' || cardKey === 'heavy_looper') {
      // Bounces mid-deep inside the court before kicking through to the baseline
      offsetY = baseDir * (maxOffsetY * 0.15) + (Math.random() - 0.5) * (maxOffsetY * 0.25);
    } else if (cardKey === 'control_slice') {
      // Slice bounces shorter/shallower in the box
      offsetY = -baseDir * (maxOffsetY * 0.45) + (Math.random() - 0.5) * (maxOffsetY * 0.25);
    } else {
      // Neutral rally / lob bounce inside the backcourt cell
      offsetY = -baseDir * (maxOffsetY * 0.08) + (Math.random() - 0.5) * (maxOffsetY * 0.25);
    }

    // Accumulated spin shifts bounce depth
    if (cell && cell.depth === 1 && spinMomentum !== 0) {
      offsetY += baseDir * (spinMomentum * 3.0);
    }
  }

  const padX = isCorner ? 4 : 8;
  const padY = isCorner ? 4 : 6;
  const clampedX = Math.max(rect.left - stageRect.left + padX, Math.min(rect.right - stageRect.left - padX, centerX + offsetX));
  const clampedY = Math.max(rect.top - stageRect.top + padY, Math.min(rect.bottom - stageRect.top - padY, centerY + offsetY));

  return { x: clampedX, y: clampedY };
}

/**
 * Computes the post-bounce strike coordinates where the ball carries after hitting landingCoords.
 * Also aligns landingCoords.x if the post-bounce trajectory is clamped by the sideline so
 * (fromCoords -> landingCoords -> strikeCoords) is strictly collinear.
 */
export function getPostBounceCoords(landingCoords, fromCoords, targetId, cardKey = '', speed = 'normal', spinMomentum = 0) {
  const court = getCourtStageCoords();
  const cell = COURT_CELLS[targetId];
  const is1PTarget = Boolean(cell && cell.half === 'ply');
  const isDeepCell = Boolean(cell && cell.depth === 1);

  const from = (typeof fromCoords === 'object' && fromCoords !== null && 'x' in fromCoords)
    ? fromCoords
    : getCellCenter(fromCoords);
  const landing = (typeof landingCoords === 'object' && landingCoords !== null && 'x' in landingCoords)
    ? landingCoords
    : getCellCenter(targetId);

  let carryDist = 38;
  if (cardKey === 'feather_drop') {
    carryDist = 11;
  } else if (cardKey === 'disguised_drop') {
    carryDist = 15;
  } else if (cardKey === 'emergency_slice') {
    carryDist = 24;
  } else if (cardKey === 'control_slice') {
    carryDist = 28;
  } else if (cardKey === 'moonball_lob' || cardKey === 'heavy_looper') {
    carryDist = 41;
  } else if (speed === 'fast') {
    carryDist = 46;
  } else if (speed === 'normal') {
    carryDist = 38;
  }

  if (isDeepCell && spinMomentum !== 0) {
    carryDist = Math.max(20, carryDist + spinMomentum * 4.5);
  }

  const dx = landing.x - from.x;
  const dy = landing.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const t = (dist + carryDist) / dist;

  const rawStrikeX = from.x + dx * t;
  const rawStrikeY = from.y + dy * t;

  const padX = (cell && cell.isCorner) ? 5 : 10;
  const minTop = (!is1PTarget && isDeepCell) ? (court.top - 14 - Math.max(0, spinMomentum * 3)) : (court.top + 8);
  const maxBottom = (is1PTarget && isDeepCell) ? (court.bottom + 14 + Math.max(0, spinMomentum * 3)) : (court.bottom - 8);

  const strikeX = Math.max(court.left + padX, Math.min(court.right - padX, rawStrikeX));
  const strikeY = Math.max(minTop, Math.min(maxBottom, rawStrikeY));

  // Keep landing.x collinear with (from -> strike) so the ball never kinks at the bounce
  if (Math.abs(strikeY - from.y) > 1) {
    const ratioY = (landing.y - from.y) / (strikeY - from.y);
    landing.x = from.x + (strikeX - from.x) * ratioY;
  }

  return {
    x: strikeX,
    y: strikeY
  };
}

export function getReceiverMovementTarget(receiver, currentPosId, targetId, ballCoords, isServe = false, incomingSpeed = 'normal', spinMomentum = 0) {
  const is1P = (receiver === '1P');
  const cell = COURT_CELLS[targetId];
  const col = cell ? cell.col : 1;

  let strokeWing = 'FOREHAND';
  let offsetX = 0;
  // ballCoords is already the post-bounce strike point; stand slightly behind it
  const offsetY = is1P ? 4 : -4;

  if (is1P) {
    // 1P right-handed: col 0 is Backhand wing, col 2 is Forehand wing, col 1 is center
    if (col === 0) {
      if (incomingSpeed === 'slow') {
        // Slow ball: step around backhand into an Inside-Out Forehand drive!
        strokeWing = 'INSIDE_OUT_FOREHAND';
        offsetX = -20; // Position to the LEFT of the ball
      } else {
        // Fast or normal ball: jammed on Backhand
        strokeWing = 'BACKHAND';
        offsetX = 18; // Position to the RIGHT of the ball
      }
    } else {
      // col 1 or 2: natural Forehand
      strokeWing = 'FOREHAND';
      offsetX = -18; // Position to the LEFT of the ball
    }
  } else {
    // CPU right-handed (top): col 0 is Forehand wing, col 2 is Backhand wing
    if (col === 2) {
      if (incomingSpeed === 'slow') {
        // Step around to forehand
        strokeWing = 'INSIDE_OUT_FOREHAND';
        offsetX = 20; // Position to the RIGHT of the ball (screen space)
      } else {
        // Jammed on Backhand
        strokeWing = 'BACKHAND';
        offsetX = -18; // Position to the LEFT of the ball (screen space)
      }
    } else {
      // col 0 or 1: natural Forehand
      strokeWing = 'FOREHAND';
      offsetX = 18; // Position to the RIGHT of the ball (screen space)
    }
  }

  const court = getCourtStageCoords();
  // Allow receiver to stand behind the baseline to meet deep post-bounce balls
  const minTop = !is1P ? (court.top - 18) : (court.top + 8);
  const maxBottom = is1P ? (court.bottom + 18) : (court.bottom - 8);
  const clampedX = Math.max(court.left + 12, Math.min(court.right - 12, ballCoords.x + offsetX));
  const clampedY = Math.max(minTop, Math.min(maxBottom, ballCoords.y + offsetY));

  return {
    cellId: (cell && cell.parentId) ? cell.parentId : targetId,
    strokeWing,
    coords: {
      x: clampedX,
      y: clampedY
    }
  };
}

export function getServeReturnPosition(receiver, serveTargetId) {
  const tgt = COURT_CELLS[serveTargetId];
  const col = tgt ? tgt.col : 1;
  const colLetter = col === 0 ? 'l' : (col === 1 ? 'c' : 'r');
  return receiver === 'CPU' ? `c-opp-dp-${colLetter}` : `c-ply-dp-${colLetter}`;
}

export function getServeReturnCoords(receiver, serveTargetId, bounceCoords, fromCoords, cardKey = '') {
  const returnCellId = getServeReturnPosition(receiver, serveTargetId);
  const returnCenter = getCellCenter(returnCellId);
  const tgt = COURT_CELLS[serveTargetId];
  const tDir = (tgt && tgt.col === 0) ? 1 : -1; // +1 toward center T on left box, -1 on right box
  const court = getCourtStageCoords();
  const is1P = (receiver === '1P');
  const from = (typeof fromCoords === 'object' && fromCoords !== null && 'x' in fromCoords)
    ? fromCoords
    : getCellCenter(fromCoords);
  const bounce = (typeof bounceCoords === 'object' && bounceCoords !== null && 'x' in bounceCoords)
    ? bounceCoords
    : getCellCenter(serveTargetId);

  const returnY = is1P ? (court.bottom + 2) : (court.top - 2);
  let targetReturnX;

  if (cardKey === 't_cannon_serve') {
    // Fires sharply down the center T away from the returner
    targetReturnX = returnCenter.x + tDir * (36 + Math.random() * 24);
  } else if (cardKey === 'flat_serve') {
    // Targets either the T or wide corner
    const dir = Math.random() < 0.55 ? tDir : -tDir;
    targetReturnX = returnCenter.x + dir * (30 + Math.random() * 26);
  } else if (cardKey === 'slice_serve' || cardKey === 'kick_twist_serve') {
    // Slices / kicks wide toward the sideline
    targetReturnX = returnCenter.x - tDir * (34 + Math.random() * 22);
  } else {
    // Safe kick serve lands comfortably near the returner
    targetReturnX = returnCenter.x + (Math.random() - 0.5) * 20;
  }

  const padX = (cardKey === 'slice_serve' || cardKey === 'kick_twist_serve') ? 2 : 8;
  const returnX = Math.max(court.left + padX, Math.min(court.right - padX, targetReturnX));

  // Keep bounce.x strictly collinear on the line from server -> receiver so the bounce mark never drifts left/right
  if (Math.abs(returnY - from.y) > 1) {
    const ratioY = (bounce.y - from.y) / (returnY - from.y);
    bounce.x = from.x + (returnX - from.x) * ratioY;
  }

  return {
    cellId: returnCellId,
    coords: { x: returnX, y: returnY }
  };
}

export function getServeSetupPositions(server = '1P', isDeuce = true) {
  const court = getCourtStageCoords();
  const playerCellId = (server === '1P')
    ? (isDeuce ? 'c-ply-dp-r' : 'c-ply-dp-l')
    : (isDeuce ? 'c-ply-dp-l' : 'c-ply-dp-r');
  const cpuCellId = (server === '1P')
    ? (isDeuce ? 'c-opp-dp-l' : 'c-opp-dp-r')
    : (isDeuce ? 'c-opp-dp-r' : 'c-opp-dp-l');

  const pCenter = getCellCenter(playerCellId);
  const cCenter = getCellCenter(cpuCellId);

  const playerCoords = {
    x: pCenter.x,
    y: court.bottom + 8
  };
  const cpuCoords = {
    x: cCenter.x,
    y: court.top - 8
  };

  const ballCoords = (server === '1P')
    ? { x: playerCoords.x + (isDeuce ? -6 : 6), y: playerCoords.y - 8 }
    : { x: cpuCoords.x + (isDeuce ? -6 : 6), y: cpuCoords.y + 8 };

  return {
    playerPos: playerCellId,
    playerCoords,
    cpuPos: cpuCellId,
    cpuCoords,
    ballCoords
  };
}

export function getEntityCoords(entityId) {
  const el = document.getElementById(entityId);
  if (!el) return null;
  const left = parseFloat(el.style.left);
  const top = parseFloat(el.style.top);
  if (!isNaN(left) && !isNaN(top)) {
    return { x: left, y: top };
  }
  return null;
}

export function getNearestCell(coords, half = 'ply') {
  if (!coords) return half === 'ply' ? 'c-ply-dp-c' : 'c-opp-dp-c';
  let nearestId = half === 'ply' ? 'c-ply-dp-c' : 'c-opp-dp-c';
  let minDist = Infinity;
  for (const [id, cell] of Object.entries(COURT_CELLS)) {
    if (cell.half === half && !cell.isCorner) {
      const center = getCellCenter(id);
      const d = Math.hypot(coords.x - center.x, coords.y - center.y);
      if (d < minDist) {
        minDist = d;
        nearestId = id;
      }
    }
  }
  return nearestId;
}

export function calculateHitterRecovery(hitter, currentCoords, condition = 'NEUTRAL', cardTag = 'RALLY', cardKey = '') {
  const is1P = (hitter === '1P');
  const baselineCenterId = is1P ? 'c-ply-dp-c' : 'c-opp-dp-c';
  const centerCoords = getCellCenter(baselineCenterId);
  const start = currentCoords || centerCoords;

  if (condition === 'SERVE' || cardTag === 'SERVE') {
    // Serving player recovers ~78% toward baseline center mark so deep returns to the open side can apply pressure
    const court = getCourtStageCoords();
    const centerX = court.left + court.width / 2;
    const baseY = is1P ? (court.bottom - 10) : (court.top + 10);
    return {
      coords: {
        x: start.x + 0.78 * (centerX - start.x),
        y: baseY
      },
      ratio: 0.78
    };
  }

  let ratioX = 0.85; // standard neutral recovery reaches baseline center column
  let ratioY = 0.85;

  if (cardTag === 'RESET' || cardKey === 'moonball_lob') {
    // High hanging lob: buys full recovery to baseline center even out of scramble
    ratioX = 0.96;
    ratioY = 0.96;
  } else if (cardKey === 'emergency_slice' || cardTag === 'DEFENSE') {
    // High-arc defensive chip: buys strong recovery back into center
    ratioX = 0.78;
    ratioY = 0.78;
  } else if (cardKey === 'control_slice' || cardKey === 'heavy_looper') {
    // Slow floating slice / high looper: plenty of time to recover to center
    ratioX = 0.88;
    ratioY = 0.88;
  } else if (cardKey === 'disguised_drop' || cardKey === 'feather_drop') {
    // Touch drop: recovers laterally toward center while staying slightly closer in depth
    ratioX = 0.78;
    ratioY = 0.50;
  } else if (condition === 'OPPORTUNITY') {
    // Aggressive attack balance
    ratioX = 0.85;
    ratioY = 0.80;
  } else if (condition === 'SCRAMBLE') {
    if (cardTag === 'HAIL-MARY' || cardKey === 'running_slap' || cardKey === 'topspin' || cardKey === 'inside_out_laser') {
      // Desperate fast gamble on the run: limited recovery
      ratioX = 0.42;
      ratioY = 0.42;
    } else {
      // Controlled rally return while stretched: recovers into center territory
      ratioX = 0.68;
      ratioY = 0.68;
    }
  }

  const recX = start.x + ratioX * (centerCoords.x - start.x);
  const recY = start.y + ratioY * (centerCoords.y - start.y);

  return {
    coords: { x: recX, y: recY },
    ratio: ratioX
  };
}

export function calculateReachability(receiver, defenderCoords, targetCoords, duration = 620, stamina = 3, condition = 'NEUTRAL', isServe = false, incomingTag = 'RALLY', isCornerTarget = false, momentumPenalty = null) {
  const distPx = Math.hypot(targetCoords.x - defenderCoords.x, targetCoords.y - defenderCoords.y);

  if (isServe) {
    // Fast serves (flat_serve / t_cannon_serve, duration <= 400) leave a tight reaction window;
    // serves painted into the T or wide corner beyond maxCoverable result in a clean ACE!
    const serveMaxCoverable = (duration <= 400) ? 33 : 40;
    if (distPx > serveMaxCoverable) {
      return {
        canReach: false,
        isWinner: true,
        distPx: Math.round(distPx),
        maxCoverable: serveMaxCoverable,
        endCoords: targetCoords,
        sprintDuration: duration,
        resultingCondition: 'SCRAMBLE'
      };
    }
    const isStretchedServe = distPx > serveMaxCoverable * 0.75;
    return {
      canReach: true,
      isWinner: false,
      distPx: Math.round(distPx),
      maxCoverable: serveMaxCoverable,
      endCoords: targetCoords,
      sprintDuration: duration,
      resultingCondition: isStretchedServe ? 'SCRAMBLE' : 'IN_POSITION'
    };
  }

  // Base sprint speed in px/ms calibrated so a player at baseline center (~135-175px from corners)
  // can reach fast corner shots (in scramble) while a player pulled wide (~230-300px) can be passed cleanly.
  const baseSpeed = 0.48;

  let staminaMod = 1.0;
  if (stamina >= 2) staminaMod = 1.04;
  else if (stamina === 1) staminaMod = 0.96;
  else staminaMod = 0.86;

  let condMod = 1.0;
  if (condition === 'SCRAMBLE') condMod = 0.85;
  else if (condition === 'OPPORTUNITY') condMod = 1.10;

  let momentumMod = 1.0;
  if (momentumPenalty === 'WRONG_FOOTED') momentumMod = 0.88; // Braking against recovery momentum
  else if (momentumPenalty === 'WHIPLASH') momentumMod = 0.93; // Alternating side-to-side direction change

  const sprintSpeed = baseSpeed * staminaMod * condMod * momentumMod;
  const rawMaxCoverable = duration * sprintSpeed;
  // Corner targets tighten the effective reach window (punishing defenders out of position)
  const maxCoverable = isCornerTarget ? (rawMaxCoverable * 0.86) : rawMaxCoverable;
  const sprintDuration = Math.round(distPx / (sprintSpeed || 0.25));

  if (distPx > maxCoverable || incomingTag === 'PUNISH') {
    // Unreachable or Punish Smash: Clean Winner!
    // Defender actively tracks the ball at full sprint speed toward targetCoords
    return {
      canReach: false,
      isWinner: true,
      distPx: Math.round(distPx),
      maxCoverable: Math.round(maxCoverable),
      endCoords: targetCoords,
      sprintDuration,
      resultingCondition: 'SCRAMBLE'
    };
  }

  // Reachable! Corner targets or wrong-footing stretch the defender earlier
  let stretchThreshold = isCornerTarget ? 0.48 : 0.72;
  if (momentumPenalty === 'WRONG_FOOTED') stretchThreshold -= 0.08;
  else if (momentumPenalty === 'WHIPLASH') stretchThreshold -= 0.05;

  const isStretched = (distPx > stretchThreshold * maxCoverable);
  return {
    canReach: true,
    isWinner: false,
    distPx: Math.round(distPx),
    maxCoverable: Math.round(maxCoverable),
    endCoords: targetCoords,
    sprintDuration,
    resultingCondition: isStretched ? 'SCRAMBLE' : 'IN_POSITION'
  };
}

export function moveEntityTo(entityId, cellId, duration = 350, timing = 'ease-out') {
  const el = document.getElementById(entityId);
  if (!el || !cellId) return;
  const coords = getCellCenter(cellId);
  if (!coords) return;

  if (duration <= 0) {
    el.style.transition = 'none';
    el.style.left = `${coords.x}px`;
    el.style.top = `${coords.y}px`;
    requestAnimationFrame(() => {
      el.style.transition = '';
    });
  } else {
    el.style.transition = `left ${duration}ms ${timing}, top ${duration}ms ${timing}`;
    el.style.left = `${coords.x}px`;
    el.style.top = `${coords.y}px`;
  }
}

export function spawnBounceMark(pos) {
  const stageEl = document.getElementById('court-stage');
  if (!stageEl || !pos) return;
  const coords = (typeof pos === 'object' && pos !== null && 'x' in pos) ? pos : getCellCenter(pos);
  if (!coords) return;

  const mark = document.createElement('div');
  mark.className = 'bounce-mark';
  mark.style.left = `${coords.x}px`;
  mark.style.top = `${coords.y}px`;
  stageEl.appendChild(mark);

  setTimeout(() => {
    mark.remove();
  }, 440);
}

export function animateBallTo(pos, duration = 600, timing = 'cubic-bezier(0.2, 0.8, 0.25, 1)', onComplete = null) {
  const ballEl = document.getElementById('ball-entity');
  if (!ballEl) return;
  const targetCoords = (typeof pos === 'object' && pos !== null && 'x' in pos) ? pos : getCellCenter(pos);
  if (!targetCoords) return;

  ballEl.style.display = 'block';
  void ballEl.offsetWidth; // Ensure current left/top are committed before applying transition
  ballEl.style.transition = `left ${duration}ms ${timing}, top ${duration}ms ${timing}, transform ${duration}ms ease-out`;
  ballEl.style.left = `${targetCoords.x}px`;
  ballEl.style.top = `${targetCoords.y}px`;

  if (onComplete) {
    setTimeout(onComplete, duration);
  }
}

export function animateWinnerBall(startCoords, landingCoords, reboundCoords, flightDuration = 600, onBounce = null, onComplete = null) {
  const ballEl = document.getElementById('ball-entity');
  if (!ballEl) return;

  const start = (typeof startCoords === 'object' && startCoords !== null && 'x' in startCoords)
    ? startCoords
    : getCellCenter(startCoords);
  const landing = (typeof landingCoords === 'object' && landingCoords !== null && 'x' in landingCoords)
    ? landingCoords
    : getCellCenter(landingCoords);
  const rebound = (typeof reboundCoords === 'object' && reboundCoords !== null && 'x' in reboundCoords)
    ? reboundCoords
    : getCellCenter(reboundCoords);

  const d1 = Math.hypot(landing.x - start.x, landing.y - start.y) || 1;
  const d2 = Math.hypot(rebound.x - landing.x, rebound.y - landing.y) || 1;
  // Pre-bounce is fast linear flight; post-bounce loses pace off the turf and decelerates to strike height
  const bounceOffset = Math.min(0.70, Math.max(0.45, d1 / (d1 + d2 * 1.85)));
  const totalDuration = Math.round(flightDuration * 1.12);
  const bounceDelay = Math.max(80, Math.round(totalDuration * bounceOffset));
  const postDuration = Math.max(80, totalDuration - bounceDelay);

  ballEl.style.display = 'block';
  ballEl.style.transition = 'none';
  ballEl.style.left = `${start.x}px`;
  ballEl.style.top = `${start.y}px`;
  void ballEl.offsetWidth; // Commit start position

  // Phase 1: Fast linear flight from racket to bounce point
  ballEl.style.transition = `left ${bounceDelay}ms linear, top ${bounceDelay}ms linear`;
  ballEl.style.left = `${landing.x}px`;
  ballEl.style.top = `${landing.y}px`;

  // Phase 2: Ground impact + post-bounce deceleration to strike/rebound point
  setTimeout(() => {
    spawnBounceMark(landing);
    if (onBounce) onBounce();
    void ballEl.offsetWidth;
    ballEl.style.transition = `left ${postDuration}ms cubic-bezier(0.15, 0.78, 0.32, 1), top ${postDuration}ms cubic-bezier(0.15, 0.78, 0.32, 1)`;
    ballEl.style.left = `${rebound.x}px`;
    ballEl.style.top = `${rebound.y}px`;
  }, bounceDelay);

  if (typeof onComplete === 'function') {
    setTimeout(onComplete, totalDuration);
  }
}

export function renderEntities(playerPos, cpuPos, ballPos, instantBall = false) {
  if (playerPos) {
    const pCoords = getCellCenter(playerPos);
    const playerEl = document.getElementById('player-entity');
    if (playerEl) {
      if (instantBall) playerEl.style.transition = 'none';
      playerEl.style.left = `${pCoords.x}px`;
      playerEl.style.top = `${pCoords.y}px`;
      if (instantBall) {
        requestAnimationFrame(() => { playerEl.style.transition = ''; });
      }
    }
  }

  if (cpuPos) {
    const cCoords = getCellCenter(cpuPos);
    const cpuEl = document.getElementById('cpu-entity');
    if (cpuEl) {
      if (instantBall) cpuEl.style.transition = 'none';
      cpuEl.style.left = `${cCoords.x}px`;
      cpuEl.style.top = `${cCoords.y}px`;
      if (instantBall) {
        requestAnimationFrame(() => { cpuEl.style.transition = ''; });
      }
    }
  }

  // Only update or hide ball if ballPos is explicitly provided (not undefined)
  if (ballPos !== undefined) {
    const ballEl = document.getElementById('ball-entity');
    if (ballEl) {
      if (ballPos) {
        const bCoords = (typeof ballPos === 'object' && ballPos !== null && 'x' in ballPos)
          ? ballPos
          : getCellCenter(ballPos);
        if (instantBall) {
          ballEl.style.transition = 'none';
        }
        ballEl.style.display = 'block';
        ballEl.style.left = `${bCoords.x}px`;
        ballEl.style.top = `${bCoords.y}px`;
        if (instantBall) {
          requestAnimationFrame(() => {
            ballEl.style.transition = '';
          });
        }
      } else {
        ballEl.style.display = 'none';
      }
    }
  }
}

export function clearTargetHighlights() {
  document.querySelectorAll('.cell').forEach((el) => {
    el.classList.remove('selectable-target');
    el.onclick = null;
    el.onmouseenter = null;
    el.onmouseleave = null;
  });
}

export function highlightTarget(id, onSelect, onHoverEnter = null, onHoverLeave = null) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('selectable-target');
  el.onclick = (e) => {
    if (e) e.stopPropagation();
    if (typeof onSelect === 'function') {
      onSelect(id);
    }
  };
  if (typeof onHoverEnter === 'function') {
    el.onmouseenter = () => onHoverEnter(id);
  }
  if (typeof onHoverLeave === 'function') {
    el.onmouseleave = () => onHoverLeave(id);
  }
}
