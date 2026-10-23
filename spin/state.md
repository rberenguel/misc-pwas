[ 1. SERVE SETUP ]
   │
   ├─► Determine Server & Side (Deuce/Ad based on points played).
   ├─► Server chooses Serve Card:
   │     • Flat (Fast, high stamina, narrow target).
   │     • Kick/Slice (Curved vector, forces receiver wide, higher bounce).
   │     • Safe/Body (Guaranteed in, slow speed, low initiative).
   ├─► Roll/Check Serve Accuracy:
   │     • IF Fail ──► Fault (Second serve, or Double Fault = Receiver Point).
   │     • IF Success ──► Transition to Flight Phase.
   │
   ▼
[ 2. BALL FLIGHT & READ PHASE ]
   │
   ├─► Calculate Ball Trajectory (Origin ──► Destination cell) & Flight Speed.
   ├─► Hitter Recovery:
   │     • IF Hitter retains surplus stamina ──► May step toward Tactical Center.
   │     • ELSE ──► Trapped out of position.
   │
   ▼
[ 3. INTERCEPTION & ARRIVAL RESOLUTION ]
   │
   ├─► Calculate Distance: d = ManhattanDistance(Receiver, Target)
   ├─► Check Movement Budget:
   │     • d == 0 : "In Position" ──► Full shot menu unlocked (Power / Neutral / Touch).
   │     • d == 1 : "Standard Step" ──► Neutral & Touch unlocked; Power requires +1 Stamina.
   │     • d == 2 : "Full Stretch"
   │         ├─► IF Speed == "Fast":
   │         │     • Can receiver discard a "Sprint" or spend 2 Stamina to reach?
   │         │     • IF NO ──► Clean WINNER for Hitter.
   │         │     • IF YES ──► "Defensive Scramble" state.
   │         └─► IF Speed == "Normal / Slow":
   │               • Receiver enters "Defensive Scramble" state (-1 Stamina).
   │     • d >= 3 : "Unreachable" ──► WINNER for Hitter.
   │
   ▼
[ 4. RECEIVER ACTION & CARD SELECTION ]
   │
   ├─► Filter Playable Cards by Receiver State:
   │     • "In Position" ──────► All legal cards available.
   │     • "Standard Step" ────► Standard cards available.
   │     • "Defensive Scramble" ► FORCED options: Weak Deep Lob, Floater Slice, or
   │                              High-Risk Counter (high mis-hit/error rate).
   │
   ├─► Receiver selects card and assigns Target Zone.
   ├─► Compute Shot Attributes:
   │     • Speed (Fast, Normal, Slow, Drop)
   │     • Depth (Baseline, Mid-court, Short/Net)
   │     • Spin/Angle (Straight, Crosscourt, Sharp Angle)
   │
   ▼
[ 5. IMPACT & STAMINA CYCLE ]
   │
   ├─► Deduct Card Cost + Sprint/Reach Costs.
   ├─► Passive Stamina Tick (+X per rally shot, or deck-driven energy draw).
   ├─► Check for Forced Error (e.g., if player tried an aggressive winner from Scramble state):
   │     • IF Out / Net ──► Point ends.
   │     • IF In ──► Loop back to [ 2. BALL FLIGHT & READ PHASE ] with roles swapped.