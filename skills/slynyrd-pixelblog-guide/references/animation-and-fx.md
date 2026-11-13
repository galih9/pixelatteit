# Animation & Motion FX Reference

Sources: Pixelblogs 8, 9, 10, 23, 24, 25, 31, 33, 40, 45, 46, 48, 50, 52, 53, 55, 56, 58, 59, 60, 63, 64.

---

## 1. Core Animation Principles (PB 8, 9, 25, 50, 58)

1. **Animate the Color-Coded Dummy First**: Animate **legs → arms → head/torso bounce → hair/fabric/gear** on separate layers. Never paint fine shading or outfits until raw motion reads cleanly (PB 22, 25, 50, 55).
2. **Trust Keyframes Over Excessive In-Betweens**: Smoothness != energy. Too many in-betweens make motion sluggish. Build strong **keyframes** (extremes of motion) first; even with in-betweens deleted, the action must read clearly (PB 8).
3. **Triangle-Wave Head Bob > Sine Wave**: In walk/run cycles, head height across frames should form a sharp **triangle wave** (fast upward push at the *pass* frame, gradual drop into *contact*), not a uniform sine wave which feels robotic (PB 50, 55).
4. **Non-Uniform Frame Timing**: Hold extremes slightly longer than transition frames (e.g., `100ms` rise vs `50ms` drop in idle breathing; longer hold on *hit*/*follow-through* frames) to sell gravity and weight (PB 9, 52, 53, 55, 56).
5. **Smear Frames**: Single fast non-keyframe (`~50ms`) bridging two wide poses with angular/blurred color trails. **Use smears only in the forward strike direction**, never on anticipation wind-ups or recovery returns (PB 9, 53, 56).
6. **Overshoot**: Any fast stop slightly passes the rest pose by `1px` for 1 frame before settling back (PB 9, 53).
7. **Anchor Center of Gravity**: In low-frame loops (`2–3f`), keep a core anchor pixel column stable so the sprite doesn't jitter sideways (PB 38).
8. **Kill Flickering Noise at Full Speed**: Test at real playback speed; simplify sub-pixels or colliding clusters that strobe during motion (PB 8, 58).

---

## 2. Character Locomotion & Idle Reference

### Walk & Run Cycles
* **2-Frame Minimal** (PB 36, 45, 59): Same 2 frames serve idle (`~200ms`) and walk/run (`~100ms`).
* **3-Frame Mega Man Run** (PB 8, 38): `Stride A → Pass → Stride B → Pass` (3 unique sprites, 4-beat loop). Extend limbs aggressively, tilt torso forward, add `1px` vertical bounce.
* **4-Frame / 6-Frame / 8-Frame Reduction** (PB 8, 50, 55):
  - **8-frame standard**: `Contact → Down → Pass → High/Swing` (×2 sides). Example `80ms`/frame (`120ms` walk / `60ms` run in PB 60).
  - **6-frame sweet spot** (PB 8, 50, 55): Drop the *recoil* frames (redundant with contact). Example top-down head bob: `-1px, -1px, +2px` per stride (PB 55). Timings: `100ms` uniform or `100, 150, 100, 100, 150, 100` (PB 59).
  - **4-frame high-energy**: Keep only `Contact` and `Pass` poses, double hold time (`160ms`/frame vs `80ms` in 8f) to preserve speed (PB 8).
* **Quadruped Walk** (PB 25): Treat as two coupled biped pairs; back leg steps 1 phase behind opposite front leg. Front shoulders and rear pelvis bob in opposite, equal vertical arcs; match stride distance front-to-back to prevent accordion stretching. (Running quadrupeds *bound* with left/right pairs in parallel.)
* **Bird Flight (8f)** (PB 25): Start front-view wireframe with explicit wing **joint pivots** (prevents rubbery wings), lock extreme up/down keyframes + smear, then add body bob last.

### Idle Fighting Stance (8-Frame Gravity-Weighted, PB 52)
* `48×92` character breathing loop: legs/knees compress `1px` per frame while shoulders/elbows drop `2px` and fists drop `2–4px` with slight forearm angle shifts.
* **Timing**: Frames 1–4 (rising) = `100ms` each; Frames 5–8 (dropping/compressing) = `50ms` each → accents gravity.

### Split-Layer Run-'n-Gun & Action Platformer Rules (PB 37, 60, 64)
* **Torso / Legs Split**: Separate upper torso+weapon from legs on distinct layers so walk/run/jump cycles run continuously under 3-frame shooting animations (PB 60).
* **Zero-Delay Jumps**: Skip knee-bend anticipation frames on jump start in action games—instant launch reads crisper (`1` shared crouch/jump frame at minimum, or `2` frames: ascending + descending to telegraph jump apex) (PB 37, 60).
* **Landing**: Optional 1-frame `1px` head/arm dip (`60ms`) reusing crouch pose, or trigger only after long falls so movement never stalls (PB 60).

---

## 3. Melee & Weapon Attack Timing Tables (PB 9, 53, 56, 58)

### Gameplay Balance Rule
* Long anticipation = readable wind-up / heavy damage, but feels like **input lag**.
* Long recovery = high commitment/punish window, feels sticky if overused.
* Fast button-mash attacks (jab) skip wind-up and start straight on **Smear** (PB 53).

### Side-View Beat-'em-Up Attacks (PB 53)
| Attack | Frame Sequence | Notes |
| :--- | :--- | :--- |
| **Jab (Fast)** | `Smear → Hit (longer hold) → Follow-Through (+1px arm) → Recover → Overshoot (-1px whole sprite)` | Zero wind-up; hips/torso lean 2–3px. |
| **Cross / Round Kick (Heavy)** | `Load → Pull/Spring → Smear → Hit (longer hold + hit FX + screen shake) → Follow-Through → Recover → Overshoot` | Two prep frames telegraph heavy blow; smear starts on Load only if moving *toward* target (round kick), never backward (cross pull). |

### Top-Down 8-Dir 6-Frame Weapon Attacks (PB 56, 58)
All 8 directions share a 6-frame phase skeleton (`Anticipation → Smear ×3 → Follow-Through → Recover`, or `Rebound` for ground-impact weapons):

| Weapon | Frame Timings (`ms`) | Total Cycle | Feel & Hitbox |
| :--- | :--- | :--- | :--- |
| **Short Sword** | `100, 50, 50, 50, 100, 50` | `400ms` | Quick slash, wide sweeping arc |
| **Spear** | `200, 50, 50, 50, 150, 50` | `550ms` | Longer commit wind-up & thrust hold, narrow long reach |
| **Heavy Hammer** | `250, 50, 50, 50, 300, 100` | `800ms` | Heavy overhead smash + ground rebound + screen shake |

---

## 4. Environmental & VFX Animation Recipes

* **Water Waves** (PB 10): Chain uniform ovals (circles = steep short waves; wide ovals = shallow waves; asymmetric pairs = realistic crests) to trace a tileable sine guide, then shift horizontally.
* **Waterfalls** (PB 10): Split into 3 synced elements: bright reflective **mouth**, downward-sagging/darkening **flow bands** that break apart near the bottom, and looping **splash** + linear surface sparkles (`6f`).
* **Water Tile Swap** (PB 43): Alternate 2 seamless water tiles directly (retro hard cut) or insert a 50%-opacity blended transition frame (anime-style smooth flow). Isometric water (PB 61): shift line texture `1px`/frame down while alternating sub-pixel highlights over `16` frames.
* **Wind Swirls & Dust** (PB 33): Abstract curving particle trails or ground-hugging dust puffs.
* **Flags, Capes & Hair** (PB 33): Place evenly spaced flow points (e.g., `12px` apart, moving `2px`/frame for a `6f` loop); waves start small at the anchor and expand toward the free tip.
* **Foliage & Falling Leaves** (PB 33):
  - *Canopy wave*: Offset layered leaf balls sequentially (`+1px up/right, -1px down, -1px left` at `200ms`/frame).
  - *Leaf rustle*: Cascade `2–4` single-leaf positions down-wind in a `4f` loop.
  - *Falling leaf*: Start with `2×2px` particle moving `1px`/frame; delete top half every other frame (or inner pivot pixel during loops) to fake tumbling.
* **Fire** (PB 45): Animate an upward-tapering `S`-curve flame breaking into smaller `S` particles (`6f` @ `100ms`, inner highlight flickers @ `50ms`).
* **Explosions** (PB 31, 36):
  - *Full explosion*: Start from concentric circles that thin into expanding rings—**fast initial expansion, slow deceleration** as heat cools; transition `white-hot → warm yellow/orange → dark red → gray smoke` as dark gaps break blobs apart.
  - *8-bit vaporize*: `3f` circular pop + `2f` high-speed alternating hazard blast, or `1f` `32×32` burst using player palette (PB 36, 38).
* **Hit Flash & Impact** (PB 36, 38): Swap enemy to red-shifted + color-inverted frames (`2f`) or swap to the player's warm orange/red palette (`0` extra colors needed!). Overlay `X`-shaped strike flashes with an empty blank frame between for snappy flicker.
* **Thrusters & Rotors** (PB 48, 59, 63): `2f` thruster flame @ `50ms`; `4f` helicopter blade @ `50ms` (rotate base blade `22.5°` per step, or rotate circle + squish Y for 3/4 view).

---

## 5. Pixel-Perfect Parallax Scrolling Math (PB 23, 46, 63)

To loop a multi-layer parallax scene with zero sub-pixel jitter:
1. Choose canvas movement dimension `W` (e.g., `96px`, `192px`, `240px`) with **many integer divisors**.
   - Example `W = 96`: divisors `1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48`.
   - Example `W = 192` (192 frames @ `50ms`): layer speeds `32, 24, 16, 6, 4, 3, 2, 1, 0.5` ppf (PB 46).
   - Example `W = 240` (`50ms`/frame): speeds `4, 3, 2, 1, 0.5, 0` ppf (PB 63).
2. **Total frames in loop = `W`** (for `1px`/frame slowest layer; avoid `<1 ppf` except `0.5 ppf` = `1px` every 2 frames, which requires repeating that layer 2× across `W`).
3. **Layer strip length = `N × W`**, where `N` = pixels moved per frame (`ppf`) for that layer.
4. Any secondary animated sprite (car wheels, thruster) inside the loop must have a frame count that **evenly divides `W`** (e.g., `4f` divides `96`).

---

## 6. Faux-3D Pixel Animation Tricks (PB 40)

* **1-Point Corridor Dungeon (`96×58`)**: Divide walls with perspective panels widening away from center vanishing point; add dithered darkness toward center. Core forward step = `4f` shifting vertical wall dividers one panel closer. Turn 90° = `7f` in-between (build middle `45°` convex/concave corner keyframe first, animate `3f` to it, mirror for second half).
* **Hyperspace Streaks (`24f`)**: Radiate 10° perspective guide rays from center; thin/dark streaks = far (`1` segment), thick/bright streaks = near (`2–3` segments, never cropped at canvas edge, growing longer outward).
* **Rotating Cube**: Prepare a wide brightness ramp; paint `0°` flush keyframe and `45°` corner keyframe; sweep the corner edge slowly at outer edges and faster across center (natural ease-in/ease-out) while shifting face values continuously.
