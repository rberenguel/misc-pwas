let ghostPiece = null;
let placementPlane = null;
let lastSelectedPiece = null;
const container = document.getElementById("container");
let scene, camera, renderer;
let raycaster, pointer;

const pieces = [];
const gridUnit = 1;
let selectedPiece = null;
const baseEmissive = new THREE.Color(0x000000);
const highlightEmissive = new THREE.Color(0xb58900); // Solarized Yellow

let pointerStartPos = { x: 0, y: 0 };
let pieceStartPos = new THREE.Vector3();
let isDragging = false;

let solutionGrid;
let alignmentLine;

// Corrected piece definitions for the 7 Soma pieces
const pieceDefs = [
  {
    color: 0x268bd2,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ],
    pivot: [0, 0, 0],
  }, // V-piece (Blue)
  {
    color: 0x6c71c4,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [0, 1, 0],
    ],
    pivot: [1, 0, 0],
  }, // L-piece (Violet)
  {
    color: 0xb58900,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [1, 1, 0],
    ],
    pivot: [1, 0, 0],
  }, // T-piece (Yellow)
  {
    color: 0x859900,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [2, 1, 0],
    ],
    pivot: [1, 1, 0],
  }, // Z-piece (Green)
  {
    color: 0xdc322f,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [1, 0, 1],
    ],
    pivot: [1, 0, 0],
  }, // P-piece (Red)
  {
    color: 0xd33682,
    shape: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    pivot: [0, 0, 0],
  }, // A-Chiral (Magenta)
  {
    color: 0xcb4b16,
    shape: [
      [1, 0, 0],
      [0, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    pivot: [1, 0, 0],
  }, // B-Chiral (Orange)
];

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x01171c); // Use darker background

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(8, 8, 12);
  camera.lookAt(scene.position);
  camera.position.setLength(15);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  const ambientLight = new THREE.AmbientLight(0x93a1a1, 1.0);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight.position.set(10, 20, 5);
  scene.add(dirLight);

  const targetGeometry = new THREE.BoxGeometry(3, 3, 3);
  const edges = new THREE.EdgesGeometry(targetGeometry);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x586e75 }),
  );
  line.position.set(0, 1, 0);
  scene.add(line);

  const planeGeo = new THREE.PlaneGeometry(100, 100);
  const planeMat = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide,
  });
  placementPlane = new THREE.Mesh(planeGeo, planeMat);
  placementPlane.rotation.x = -Math.PI / 2;
  scene.add(placementPlane);

  createSomaPieces();
  updateGridAndCheckWin();
  addEventListeners();
  animate();
}

function createSomaPieces() {
  pieceDefs.forEach((def, i) => {
    const piece = createPiece(def.shape, def.pivot, def.color);
    const angle = (i / pieceDefs.length) * Math.PI * 2;
    const radius = 5;
    piece.position.set(
      Math.round(Math.cos(angle) * radius),
      1,
      Math.round(Math.sin(angle) * radius),
    );
    pieces.push(piece);
    scene.add(piece);
  });
}

function createPiece(shapeCoords, pivot, color) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.1,
    emissive: baseEmissive,
  });
  const group = new THREE.Group();
  const pivotVec = new THREE.Vector3(pivot[0], pivot[1], pivot[2]);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x073642,
    linewidth: 2,
  });
  shapeCoords.forEach((posArr) => {
    const cubeGroup = new THREE.Group();
    const cubeGeo = new THREE.BoxGeometry(
      gridUnit * 0.95,
      gridUnit * 0.95,
      gridUnit * 0.95,
    );
    const cubeMesh = new THREE.Mesh(cubeGeo, material);
    const edges = new THREE.EdgesGeometry(cubeGeo);
    const line = new THREE.LineSegments(edges, edgeMaterial);
    cubeGroup.add(cubeMesh);
    cubeGroup.add(line);
    cubeGroup.position.set(
      posArr[0] - pivotVec.x,
      posArr[1] - pivotVec.y,
      posArr[2] - pivotVec.z,
    );
    group.add(cubeGroup);
  });
  group.position.add(pivotVec);
  group.userData.isPiece = true;
  return group;
}

function getPointerCoords(event) {
  const touch = event.touches ? event.touches[0] : event;
  return { x: touch.clientX, y: touch.clientY };
}

function updatePointer(event) {
  const coords = getPointerCoords(event);
  pointer.x = (coords.x / window.innerWidth) * 2 - 1;
  pointer.y = -(coords.y / window.innerHeight) * 2 + 1;
}

function getIntersectedObject() {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(pieces, true);
  if (intersects.length > 0) {
    let object = intersects[0].object;
    while (object.parent && !object.userData.isPiece) object = object.parent;
    return object;
  }
  return null;
}

function selectPiece(piece) {
  if (selectedPiece) deselectPiece();

  selectedPiece = piece;
  lastSelectedPiece = piece; // Remember this piece as the last one touched

  // Create a ghost copy for placement
  ghostPiece = selectedPiece.clone(true);
  ghostPiece.userData.isPiece = false;
  ghostPiece.children.forEach((g) => {
    g.children[0].material = g.children[0].material.clone();
    g.children[0].material.transparent = true;
    g.children[0].material.opacity = 0.6;
    g.children[0].material.emissive.set(highlightEmissive);
  });
  scene.add(ghostPiece);

  selectedPiece.visible = false;
}

function deselectPiece() {
  if (!selectedPiece) return;

  // Show the original piece again
  selectedPiece.visible = true;

  // Remove the ghost
  if (ghostPiece) {
    scene.remove(ghostPiece);
    // Proper disposal is good practice but omitted here for brevity
    ghostPiece = null;
  }

  selectedPiece = null;
  updateGridAndCheckWin();
}

function addEventListeners() {
    document.getElementById('zoom-slider').addEventListener('input', (e) => {
        camera.position.setLength(e.target.value);
    });

    const rotatePiece = (axis) => {
        // Rotate the ghost if we're placing, otherwise rotate the last piece we touched.
        const target = ghostPiece || lastSelectedPiece;
        if (!target) return;

        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(axis, Math.PI / 2);
        target.quaternion.premultiply(quaternion);
        
        // Snap to nearest 90-degree angle to prevent floating point drift
        const euler = new THREE.Euler().setFromQuaternion(target.quaternion, 'YXZ');
        euler.x = Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2);
        euler.y = Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2);
        euler.z = Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2);
        target.quaternion.setFromEuler(euler);

        // If we are rotating a piece that is already placed (no ghost), we must update the grid.
        if (!ghostPiece) {
            updateGridAndCheckWin();
        }
    };

    document.getElementById('rot-x').addEventListener('pointerdown', (e) => { e.stopPropagation(); rotatePiece(new THREE.Vector3(1, 0, 0)); });
    document.getElementById('rot-y').addEventListener('pointerdown', (e) => { e.stopPropagation(); rotatePiece(new THREE.Vector3(0, 1, 0)); });
    document.getElementById('rot-z').addEventListener('pointerdown', (e) => { e.stopPropagation(); rotatePiece(new THREE.Vector3(0, 0, 1)); });

    document.addEventListener('keyup', e => {
        console.log(e.key)
        if(e.key.toLowerCase() === "a"){
            e.stopPropagation(); rotatePiece(new THREE.Vector3(1, 0, 0));
        }
        if(e.key.toLowerCase() === "r"){
            e.stopPropagation(); rotatePiece(new THREE.Vector3(0, 1, 0));
        }
        if(e.key.toLowerCase() === "s"){
            e.stopPropagation(); rotatePiece(new THREE.Vector3(0, 0, 1));
        }
    })

    container.addEventListener('pointerdown', (event) => {
        if (event.target !== renderer.domElement) return;
        
        isDragging = false;
        pointerStartPos = getPointerCoords(event);
        updatePointer(event);
        
        const intersected = getIntersectedObject();
        
        if (intersected) {
            if (selectedPiece !== intersected) {
                selectPiece(intersected);
            }
        } else if (selectedPiece) {
            selectedPiece.position.copy(ghostPiece.position);
            selectedPiece.quaternion.copy(ghostPiece.quaternion);
            deselectPiece();
        }
    });

    container.addEventListener('pointermove', (event) => {
        if (event.target !== renderer.domElement) return;
        if (event.pointerType === 'mouse' && event.buttons !== 1) return;
        if (event.touches && event.touches.length > 1) return;

        const currentPos = getPointerCoords(event);
        const deltaX = currentPos.x - pointerStartPos.x;
        const deltaY = currentPos.y - pointerStartPos.y;
        
        if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
            isDragging = true;
        }

        if (selectedPiece && ghostPiece) {
            updatePointer(event);
            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObject(placementPlane);
            if (intersects.length > 0) {
                const point = intersects[0].point;
                ghostPiece.position.set(Math.round(point.x), Math.round(point.y), Math.round(point.z));
            }
        } else if (isDragging) {
            const camRotSensitivity = 0.004;
            const up = new THREE.Vector3(0, 1, 0);
            const right = new THREE.Vector3().crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3()).negate()).normalize();
            camera.position.applyAxisAngle(up, -deltaX * camRotSensitivity);
            camera.position.applyAxisAngle(right, -deltaY * camRotSensitivity);
            camera.lookAt(scene.position);
            pointerStartPos = currentPos;
        }
    });

    container.addEventListener('pointerup', (event) => {
        if (event.target !== renderer.domElement) return;

        if (selectedPiece && ghostPiece) {
            if (isDragging) {
                selectedPiece.position.copy(ghostPiece.position);
            }
            // IMPORTANT: Copy the final rotation from the ghost to the real piece
            selectedPiece.quaternion.copy(ghostPiece.quaternion);
            deselectPiece();
        }
        isDragging = false;
    });
}

function updateGridAndCheckWin() {
  const gridSize = 3;
  solutionGrid = Array(gridSize)
    .fill(0)
    .map(() =>
      Array(gridSize)
        .fill(0)
        .map(() => Array(gridSize).fill(null)),
    );
  let occupiedCount = 0;

  for (const piece of pieces) {
    for (const cubeGroup of piece.children) {
      const worldPos = new THREE.Vector3();
      cubeGroup.getWorldPosition(worldPos);

      const gx = Math.round(worldPos.x) + 1;
      const gy = Math.round(worldPos.y);
      const gz = Math.round(worldPos.z) + 1;

      if (
        gx >= 0 &&
        gx < gridSize &&
        gy >= 0 &&
        gy < gridSize &&
        gz >= 0 &&
        gz < gridSize
      ) {
        if (solutionGrid[gx][gy][gz]) {
          document.getElementById("win-message").style.display = "none";
          return;
        }
        solutionGrid[gx][gy][gz] = piece;
        occupiedCount++;
      }
    }
  }

  if (occupiedCount === 27) {
    document.getElementById("win-message").style.display = "block";
  } else {
    document.getElementById("win-message").style.display = "none";
  }
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

init();
