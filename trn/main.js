(async () => {
    // --- Game Configuration ---
    const PLAYER_SPEED = 4.6;
    const TURN_SPEED = 0.05;
    const TRAIL_WIDTH = 6;
    const GRID_SIZE = 50;
    const PLAYER_COLLISION_GRACE_PERIOD = 15;
    const WORLD_BOUNDS = 1500;

    const PLAYER_COLOR = 0x00FFFF; // Cyan
    const TRAIL_COLOR = 0x00FFFF;

    const ENEMY_COLOR = 0xFF8000; // Orange
    const ENEMY_TRAIL_COLOR = 0xFF8000;

    const GRID_COLOR = 0x40406a;

    // --- New Feature Configuration ---
    const GRIND_BOOST_MULTIPLIER = 1.2;
    const GRIND_MAX_DISTANCE = 5;
    const GRIND_ANGLE_THRESHOLD = Math.cos(Math.PI * (2 / 180)); // 88 degrees
    const GRIND_PARTICLE_COLOR = 0xFFFF00;
    const SCREEN_SHAKE_AMOUNT = 2;

    const POWERUP_SPAWN_INTERVAL = 10000; // ms
    const POWERUP_SIZE = 12;
    const POWERUP_S_BOOST = 1.1;
    const POWERUP_S_DURATION = 10 * 60; // 10 seconds in frames
    const POWERUP_T_BOOST = 3.0;
    const POWERUP_T_DURATION = 0.5 * 60; // 0.5 seconds in frames
    
    const PARTICLE_LIFETIME = 40; // frames
    const EXPLOSION_PARTICLE_COUNT = 150;

    // --- AI Configuration ---
    const AI_WHISKER_LENGTH = 50;
    const AI_WHISKER_ANGLE = Math.PI / 4;
    const AI_UPDATE_INTERVAL = 10;
    const AI_BOUNDARY_DANGER_ZONE = GRID_SIZE * 4;

    // --- PIXI App Setup ---
    const app = new PIXI.Application();
    await app.init({
        resizeTo: window,
        backgroundColor: 0x05050a,
        antialias: true,
    });
    document.body.appendChild(app.view);

    // --- Game Objects ---
    const world = new PIXI.Container();
    app.stage.addChild(world);

    const grid = new PIXI.Graphics();
    world.addChild(grid);

    const trailGraphics = new PIXI.Graphics();
    world.addChild(trailGraphics);

    const enemyTrailGraphics = new PIXI.Graphics();
    world.addChild(enemyTrailGraphics);

    const particleContainer = new PIXI.Container();
    world.addChild(particleContainer);

    const powerupContainer = new PIXI.Container();
    world.addChild(powerupContainer);

    const playerSprite = new PIXI.Graphics();
    world.addChild(playerSprite);

    const enemySprite = new PIXI.Graphics();
    world.addChild(enemySprite);

    let enemyIndicator;

    // --- Game State ---
    let player, enemy;
    let trailPoints, enemyTrailPoints;
    let turning, keys = {};
    let gameState;
    let particles = [];
    let powerups = [];

    function setupBike(sprite, color) {
        const triangleHeight = TRAIL_WIDTH * 1.8;
        const triangleHalfBase = TRAIL_WIDTH / 2;
        sprite.clear();
        sprite.beginFill(color);
        sprite.drawPolygon([
            new PIXI.Point(0, -triangleHeight / 2),
            new PIXI.Point(-triangleHalfBase, triangleHeight / 2),
            new PIXI.Point(triangleHalfBase, triangleHeight / 2)
        ]);
        sprite.endFill();
        sprite.tint = 0xFFFFFF;
    }

    function setupEnemyIndicator() {
        enemyIndicator = new PIXI.Graphics();
        enemyIndicator.beginFill(ENEMY_COLOR);
        enemyIndicator.drawCircle(0, 0, 10);
        enemyIndicator.endFill();
        app.stage.addChild(enemyIndicator);
    }
    
    function spawnPowerup() {
        const type = Math.random() < 0.5 ? 'S' : 'T';
        const color = type === 'S' ? 0x00ff00 : 0xff00ff;
        
        const powerup = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.beginFill(0x101010);
        bg.lineStyle(2, color);
        bg.drawCircle(0, 0, POWERUP_SIZE);
        bg.endFill();
        
        const text = new PIXI.Text({text: type, style: new PIXI.TextStyle({
            fontFamily: 'Inter', fontSize: 14, fontWeight: 'bold', fill: color
        })});
        text.anchor.set(0.5);

        powerup.addChild(bg);
        powerup.addChild(text);
        
        powerup.x = (Math.random() - 0.5) * WORLD_BOUNDS * 1.8;
        powerup.y = (Math.random() - 0.5) * WORLD_BOUNDS * 1.8;
        
        powerup.type = type;
        powerups.push(powerup);
        powerupContainer.addChild(powerup);
    }

    function restartGame() {
        player = { x: 0, y: 0, angle: 0, isGrinding: false, speedBoost: null, powerup: null };
        enemy = { x: 200, y: 0, angle: Math.PI, turning: 0, aiUpdateCooldown: 0, isGrinding: false, speedBoost: null, powerup: null };

        trailPoints = [new PIXI.Point(player.x, player.y)];
        enemyTrailPoints = [new PIXI.Point(enemy.x, enemy.y)];

        turning = 0;
        keys = {};
        gameState = 'playing';

        trailGraphics.clear();
        enemyTrailGraphics.clear();
        particleContainer.removeChildren();
        particles = [];
        powerupContainer.removeChildren();
        powerups = [];
        
        spawnPowerup();
        setInterval(spawnPowerup, POWERUP_SPAWN_INTERVAL);

        enemyIndicator.visible = true;

        setupBike(playerSprite, PLAYER_COLOR);
        setupBike(enemySprite, ENEMY_COLOR);
    }

    // --- Input Handling ---
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerdown', (event) => {
        if (gameState === 'playing') {
            if (event.global.x < window.innerWidth / 3) keys['touchLeft'] = true;
            else if (event.global.x > window.innerWidth * 2 / 3) keys['touchRight'] = true;
            else keys['touchCenter'] = true; // Activate powerup
        } else if (gameState === 'gameOver') {
            restartGame();
        }
    });
    app.stage.on('pointerup', () => { keys['touchLeft'] = false; keys['touchRight'] = false; keys['touchCenter'] = false; });
    app.stage.on('pointerupoutside', () => { keys['touchLeft'] = false; keys['touchRight'] = false; keys['touchCenter'] = false; });

    window.addEventListener('keydown', (e) => { keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });


    function drawGrid() {
        grid.clear();
        const worldDrawSize = WORLD_BOUNDS + GRID_SIZE;
        for (let i = -worldDrawSize; i <= worldDrawSize; i += GRID_SIZE) {
            grid.moveTo(i, -worldDrawSize).lineTo(i, worldDrawSize);
            grid.moveTo(-worldDrawSize, i).lineTo(worldDrawSize, i);
        }
        grid.stroke({ width: 1, color: GRID_COLOR });
    }

    function drawTrails() {
        trailGraphics.clear();
        trailGraphics.moveTo(trailPoints[0].x, trailPoints[0].y);
        for (let i = 1; i < trailPoints.length; i++) trailGraphics.lineTo(trailPoints[i].x, trailPoints[i].y);
        trailGraphics.stroke({width: TRAIL_WIDTH, color: TRAIL_COLOR, cap: 'round', join: 'round'});

        enemyTrailGraphics.clear();
        enemyTrailGraphics.moveTo(enemyTrailPoints[0].x, enemyTrailPoints[0].y);
        for (let i = 1; i < enemyTrailPoints.length; i++) enemyTrailGraphics.lineTo(enemyTrailPoints[i].x, enemyTrailPoints[i].y);
        enemyTrailGraphics.stroke({width: TRAIL_WIDTH, color: ENEMY_TRAIL_COLOR, cap: 'round', join: 'round'});
    }
    
    function createExplosion(x, y, color) {
        for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(color);
            particle.drawCircle(0, 0, Math.random() * 2 + 1);
            particle.endFill();
            particle.x = x;
            particle.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            particles.push({
                sprite: particle,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: PARTICLE_LIFETIME * (Math.random() * 0.5 + 0.5),
                initialLife: PARTICLE_LIFETIME,
            });
            particleContainer.addChild(particle);
        }
    }

    function emitGrindParticle(bike, side) {
        const perpAngle = bike.angle + (side === 'left' ? -Math.PI / 2 : Math.PI / 2);
        const particle = new PIXI.Graphics();
        particle.beginFill(GRIND_PARTICLE_COLOR);
        particle.drawCircle(0, 0, Math.random() * 1.5 + 0.5);
        particle.endFill();
        particle.x = bike.x + Math.sin(perpAngle) * TRAIL_WIDTH / 2;
        particle.y = bike.y - Math.cos(perpAngle) * TRAIL_WIDTH / 2;
        
        particles.push({
            sprite: particle,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life: PARTICLE_LIFETIME / 2,
            initialLife: PARTICLE_LIFETIME / 2
        });
        particleContainer.addChild(particle);
    }
    
    function updateParticles(delta) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= delta;
            if (p.life <= 0) {
                particleContainer.removeChild(p.sprite);
                p.sprite.destroy();
                particles.splice(i, 1);
            } else {
                p.sprite.x += p.vx * delta;
                p.sprite.y += p.vy * delta;
                p.sprite.alpha = p.life / p.initialLife;
            }
        }
    }

    function checkWallGrind(bike, allTrails) {
        bike.isGrinding = false;
        const bikeDirX = Math.sin(bike.angle);
        const bikeDirY = -Math.cos(bike.angle);

        for (const trail of allTrails) {
            // Check the last 100 segments for performance
            for (let i = Math.max(0, trail.length - 100); i < trail.length - 2; i++) {
                const p1 = trail[i];
                const p2 = trail[i+1];
                
                const segX = p2.x - p1.x;
                const segY = p2.y - p1.y;
                const bikeToP1X = p1.x - bike.x;
                const bikeToP1Y = p1.y - bike.y;

                const segLenSq = segX * segX + segY * segY;
                if (segLenSq === 0) continue;

                const t = Math.max(0, Math.min(1, (-bikeToP1X * segX - bikeToP1Y * segY) / segLenSq));
                const closestX = p1.x + t * segX;
                const closestY = p1.y + t * segY;

                const distSq = (bike.x - closestX)**2 + (bike.y - closestY)**2;

                if (distSq < GRIND_MAX_DISTANCE**2) {
                    const segLen = Math.sqrt(segLenSq);
                    const dot = (bikeDirX * (segX / segLen) + bikeDirY * (segY / segLen));

                    if (Math.abs(dot) > GRIND_ANGLE_THRESHOLD) {
                        bike.isGrinding = true;
                        // Determine side via cross product's z component sign
                        const crossZ = bikeDirX * (closestY - bike.y) - bikeDirY * (closestX - bike.x);
                        bike.grindingSide = crossZ > 0 ? 'left' : 'right';
                        return; // Found a grind, no need to check further
                    }
                }
            }
        }
    }
    
    function activatePowerup(bike) {
        if (!bike.powerup) return;

        if (bike.powerup === 'S') {
            bike.speedBoost = { multiplier: POWERUP_S_BOOST, duration: POWERUP_S_DURATION };
        } else if (bike.powerup === 'T') {
            bike.speedBoost = { multiplier: POWERUP_T_BOOST, duration: POWERUP_T_DURATION };
        }
        bike.powerup = null;
    }

    function isClose(obj, point) {
         const dx = obj.x - point.x;
         const dy = obj.y - point.y;
         return (dx * dx + dy * dy) < (TRAIL_WIDTH / 1.5) ** 2;
    }

    function isPointColliding(point, allTrails) {
        if (Math.abs(point.x) > WORLD_BOUNDS || Math.abs(point.y) > WORLD_BOUNDS) {
            return true;
        }
        return allTrails.some(trailPoint => {
            const dx = point.x - trailPoint.x;
            const dy = point.y - trailPoint.y;
            return (dx * dx + dy * dy) < (TRAIL_WIDTH) ** 2;
        });
    }

    function getAIInput() {
        if (enemy.powerup === 'T') activatePowerup(enemy); // AI uses Turbo immediately

        const allTrailsForAI = trailPoints.concat(enemyTrailPoints.slice(0, -PLAYER_COLLISION_GRACE_PERIOD));
        
        // Boundary Avoidance
        if (enemy.x > WORLD_BOUNDS - AI_BOUNDARY_DANGER_ZONE && Math.sin(enemy.angle) > 0) return -1;
        if (enemy.x < -WORLD_BOUNDS + AI_BOUNDARY_DANGER_ZONE && Math.sin(enemy.angle) < 0) return 1;
        if (enemy.y > WORLD_BOUNDS - AI_BOUNDARY_DANGER_ZONE && -Math.cos(enemy.angle) > 0) return 1;
        if (enemy.y < -WORLD_BOUNDS + AI_BOUNDARY_DANGER_ZONE && -Math.cos(enemy.angle) < 0) return -1;

        // Whisker-based Trail Avoidance
        const whiskerPoints = [
            { x: enemy.x + Math.sin(enemy.angle) * AI_WHISKER_LENGTH, y: enemy.y - Math.cos(enemy.angle) * AI_WHISKER_LENGTH },
            { x: enemy.x + Math.sin(enemy.angle - AI_WHISKER_ANGLE) * AI_WHISKER_LENGTH, y: enemy.y - Math.cos(enemy.angle - AI_WHISKER_ANGLE) * AI_WHISKER_LENGTH },
            { x: enemy.x + Math.sin(enemy.angle + AI_WHISKER_ANGLE) * AI_WHISKER_LENGTH, y: enemy.y - Math.cos(enemy.angle + AI_WHISKER_ANGLE) * AI_WHISKER_LENGTH }
        ];
        const [forwardBlocked, leftBlocked, rightBlocked] = whiskerPoints.map(p => isPointColliding(p, allTrailsForAI));

        if (forwardBlocked) return !leftBlocked ? -1 : (!rightBlocked ? 1 : -1);
        if (leftBlocked && !rightBlocked) return 0.5;
        if (rightBlocked && !leftBlocked) return -0.5;

        return 0;
    }

    function updateEnemyIndicator() {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;

        const angle = -player.angle;
        const screenDx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const screenDy = dx * Math.sin(angle) + dy * Math.cos(angle);

        const isOffScreen = screenDx < -app.screen.width/2 || screenDx > app.screen.width/2 || screenDy < -app.screen.height/2 || screenDy > app.screen.height/2;
        
        if (isOffScreen) {
            enemyIndicator.visible = true;
            const padding = 20;
            const indicatorAngle = Math.atan2(screenDy, screenDx);
            
            const boundedX = Math.cos(indicatorAngle) * (app.screen.width / 2 - padding) + app.screen.width / 2;
            const boundedY = Math.sin(indicatorAngle) * (app.screen.height / 2 - padding) + app.screen.height / 2;
            
            enemyIndicator.x = Math.max(padding, Math.min(boundedX, app.screen.width - padding));
            enemyIndicator.y = Math.max(padding, Math.min(boundedY, app.screen.height - padding));
        } else {
             enemyIndicator.visible = false;
        }
    }


    function endGame(loser, loserColor, loserSprite) {
        if (gameState === 'gameOver') return;
        gameState = 'gameOver';
        createExplosion(loser.x, loser.y, loserColor);
        loserSprite.tint = 0xff0000;
        enemyIndicator.visible = false;
    }

    function checkCollisions() {
        const allTrails = [trailPoints, enemyTrailPoints];
        if (trailPoints.some(p => isClose(enemy, p))) {
            endGame(enemy, ENEMY_COLOR, enemySprite); return;
        }
        if (enemyTrailPoints.slice(0, -PLAYER_COLLISION_GRACE_PERIOD).some(p => isClose(player, p))) {
            endGame(player, PLAYER_COLOR, playerSprite); return;
        }
        if (trailPoints.slice(0, -PLAYER_COLLISION_GRACE_PERIOD).some(p => isClose(player, p))) {
            endGame(player, PLAYER_COLOR, playerSprite); return;
        }
        if (enemyTrailPoints.slice(0, -PLAYER_COLLISION_GRACE_PERIOD).some(p => isClose(enemy, p))) {
            endGame(enemy, ENEMY_COLOR, enemySprite); return;
        }
        if (Math.abs(player.x) > WORLD_BOUNDS || Math.abs(player.y) > WORLD_BOUNDS) {
            endGame(player, PLAYER_COLOR, playerSprite); return;
        }
        if (Math.abs(enemy.x) > WORLD_BOUNDS || Math.abs(enemy.y) > WORLD_BOUNDS) {
            endGame(enemy, ENEMY_COLOR, enemySprite); return;
        }
    }

    function updatePowerups() {
        for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];
            
            // Check player pickup
            if (!player.powerup && (player.x - p.x)**2 + (player.y - p.y)**2 < (POWERUP_SIZE + TRAIL_WIDTH)**2) {
                 player.powerup = p.type;
                 powerupContainer.removeChild(p);
                 p.destroy();
                 powerups.splice(i, 1);
                 continue;
            }

            // Check enemy pickup
            if (!enemy.powerup && (enemy.x - p.x)**2 + (enemy.y - p.y)**2 < (POWERUP_SIZE + TRAIL_WIDTH)**2) {
                 enemy.powerup = p.type;
                 powerupContainer.removeChild(p);
                 p.destroy();
                 powerups.splice(i, 1);
            }
        }
    }

    app.ticker.add((ticker) => {
        if (gameState !== 'playing') {
            updateParticles(ticker.deltaTime); // Keep particles moving after game over
            return;
        }
        const delta = ticker.deltaTime;
        
        // --- Player Control ---
        const left = keys['ArrowLeft'] || keys['KeyA'] || keys['touchLeft'];
        const right = keys['ArrowRight'] || keys['KeyD'] || keys['touchRight'];
        turning = (right ? 1 : 0) - (left ? 1 : 0);
        if (keys['Space'] || keys['touchCenter']) activatePowerup(player);

        // --- Update Bikes ---
        [player, enemy].forEach((bike, index) => {
            if (bike.speedBoost) {
                bike.speedBoost.duration -= delta;
                if (bike.speedBoost.duration <= 0) bike.speedBoost = null;
            }
            
            const trailsToCheck = index === 0 ? [enemyTrailPoints] : [trailPoints, enemyTrailPoints];
            checkWallGrind(bike, trailsToCheck);
            if (bike.isGrinding) emitGrindParticle(bike, bike.grindingSide);
            
            const speedMultiplier = (bike.speedBoost ? bike.speedBoost.multiplier : 1) * (bike.isGrinding ? GRIND_BOOST_MULTIPLIER : 1);

            if (index === 0) { // Player
                if (turning !== 0) bike.angle += turning * TURN_SPEED * delta;
            } else { // Enemy
                bike.aiUpdateCooldown -= delta;
                if (bike.aiUpdateCooldown <= 0) {
                    bike.turning = getAIInput();
                    bike.aiUpdateCooldown = AI_UPDATE_INTERVAL;
                }
                if (bike.turning !== 0) bike.angle += bike.turning * TURN_SPEED * delta;
            }

            bike.x += Math.sin(bike.angle) * PLAYER_SPEED * speedMultiplier * delta;
            bike.y -= Math.cos(bike.angle) * PLAYER_SPEED * speedMultiplier * delta;
        });

        // --- Update Trail Points ---
        if (((player.x - trailPoints.at(-1).x)**2 + (player.y - trailPoints.at(-1).y)**2) > (TRAIL_WIDTH/2)**2) {
            trailPoints.push(new PIXI.Point(player.x, player.y));
        }
        if (((enemy.x - enemyTrailPoints.at(-1).x)**2 + (enemy.y - enemyTrailPoints.at(-1).y)**2) > (TRAIL_WIDTH/2)**2) {
            enemyTrailPoints.push(new PIXI.Point(enemy.x, enemy.y));
        }

        // --- Collisions ---
        checkCollisions();
        updatePowerups();
        
        // --- Update Visuals ---
        playerSprite.position.set(player.x, player.y);
        playerSprite.rotation = player.angle;
        enemySprite.position.set(enemy.x, enemy.y);
        enemySprite.rotation = enemy.angle;
        
        world.pivot.set(player.x, player.y);
        world.position.set(app.screen.width / 2, app.screen.height * 0.9);
        if (player.isGrinding || enemy.isGrinding) {
            world.position.x += (Math.random() - 0.5) * SCREEN_SHAKE_AMOUNT;
            world.position.y += (Math.random() - 0.5) * SCREEN_SHAKE_AMOUNT;
        }
        world.rotation = -player.angle;
        
        drawTrails();
        updateParticles(delta);
        updateEnemyIndicator();
    });

    drawGrid();
    setupEnemyIndicator();
    restartGame();
})();