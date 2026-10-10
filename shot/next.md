# next.md — generative gameplay roadmap

Each step is self-contained and leaves the game playable. Tackle them in order.

---

## Step 1 — Procedural map generator

Replace the hardcoded rooms, walls, and doors with a generator that runs at game-start (or on "new run").

**What to build:**
- `generateMap(seed, roomCount)` → returns an array of room descriptors
  - Each room has: `{ id, name, width, depth, zStart, zEnd, coverSlots[] }`
  - Width varies 18–28u, depth varies 14–30u
  - Room names drawn from a small themed pool, shuffled each run
- Place outer perimeter walls and cross-walls from the room descriptors instead of hardcoding them
- Cover slots: place 2–5 low-ledge cover boxes per room at randomised x positions (avoid centre corridor)
- Blast doors at each room boundary (zStart of rooms 1..N), same as now
- Total map length: 3–6 rooms (random each run), scale depth so the whole thing stays ≤ ~120u

**What stays the same:** floor texture, wall materials, blast door logic, player start at z=+2.

---

## Step 2 — Procedural enemy placement

Replace the hardcoded `createTacticalEnemy` calls with a placement pass that runs after map gen.

**What to build:**
- `populateRoom(roomDesc, difficulty)` — spawns enemies based on room index / difficulty
  - Room 0 (armory): always clear, no enemies
  - Rooms 1..N: enemy budget scales with `difficulty = roomIndex / totalRooms`
  - Budget → pick from: sentry (cheap), patrol (medium), shielded (expensive)
  - Sentries placed near cover; patrols get a 2–4 waypoint route spanning the room width
  - Max 4 enemies per room to keep it readable at low res

**Constraint:** shielded enemies only appear in the last two rooms.

---

## Step 3 — Procedural prop placement

Replace hardcoded `spawnBreakableProp` calls.

**What to build:**
- After placing enemies, fill remaining cover slots with props (crate/vase/conduit weighted by room depth)
- Avoid spawning props directly on top of enemies (min distance check 2u)
- Each room gets 2–6 props; later rooms skew toward conduits (they take 2 hits → more drama)

---

## Step 4 — Win / loss state + new-run loop

Right now the game just… continues after the last room. Add a proper loop.

**What to build:**
- **Win screen**: when all rooms are cleared and all blast doors breached, show a "FACILITY SECURED" overlay with a run summary (rooms cleared, enemies killed, props shattered, time)
- **Loss screen**: when `playerHealth <= 0`, show "KIA" overlay
- Both screens have a `[ NEW RUN ]` button that re-runs the map generator with a new seed and resets all state (enemies, breakables, doors, player position/health/ammo)
- Show the seed on the win screen so good runs can be replayed

---

## Step 5 — Health pickups

Add a simple loot drop system.

**What to build:**
- Each enemy has a 30% chance on death to drop a health pack (green octahedron, same style as existing geometry)
- Health pack floats + bobs in place; auto-collect when player walks within 1.2u
- Restores 25 HP (capped at 100)
- Add a brief `+25 HP` flash banner (reuse dry-fire banner pattern)
- Health packs despawn after 20s if not collected

---

## Step 6 — Ammo drops

- Each enemy has a 25% chance to drop a shell pack (two tiny red cylinders like the HUD shells)
- Collecting adds +2 ammo (i.e. one full reload's worth), capped at 6 total shells
- Extend the HUD ammo display to show up to 6 shells (2 loaded + up to 4 reserve)
- Reserve shells are consumed automatically when you reload empty

---

## Step 7 — New enemy: Dasher

A fast melee-range enemy that closes distance and rams the player instead of shooting.

**What to build:**
- Appearance: flat diamond shape (low octahedron), cyan wireframe, moves along the floor
- Behaviour: when player enters room, charges in a straight line toward last-known player position; stops 0.5u away and deals 15 damage; then a 1.5s cooldown before next dash
- Telegraph: spins up for 0.3s before dashing (visible spin acceleration, distinct sound)
- 1 HP — dies in one shot, but fast enough that it punishes staying still
- Add to room budget (cheap, appears from room 2 onward)

---

## Step 8 — New enemy: Bomber

A slow enemy that lobs a arcing projectile instead of a laser.

**What to build:**
- Appearance: tall box (1×2×1), dark orange, slow wobble
- Behaviour: lobs a projectile on a parabolic arc toward player's position at time of fire; 1.2s flight time; explodes in a 2u radius on impact (deals 30 damage if player is inside radius)
- Visual: projectile is a large octahedron (0.35u), same orange; on impact, `triggerPillowSplosion` with orange palette
- Telegraph: 0.8s (longer than sentry) — they're dangerous if you ignore them
- 3 HP; immune to stagger (shotgun stagger doesn't apply)
- Only appears in the last room

---

## Step 9 — Environmental hazard: floor vents

Occasional floor tiles that deal 5 damage/s if stood on.

**What to build:**
- Placed procedurally (1–2 per room from room 2 onward), marked visually as a glowing red grate (flat box at y=0.01, red wireframe + solid dark panel)
- Damage check in `updatePlayer`: if player x/z overlaps a vent AABB, apply damage over time
- Vent is always-on (not toggle); just adds a reason to keep moving

---

## Later / maybe

- Locked-key rooms: one room per run has a key item; blast door to next room requires the key instead of shotgun hits
- Difficulty presets (selectable on start screen): affect enemy count, attack speed, player HP
- Score system: time bonus, accuracy %, combo for consecutive kills, displayed on win screen
- Persistent seed leaderboard (localStorage): top 5 fastest clears per seed
- Sound: ambient dungeon hum (LFO-modulated low-frequency drone via Web Audio) per room
- Visual variety: alternate wall colour accent per room (currently all blue wireframe)
