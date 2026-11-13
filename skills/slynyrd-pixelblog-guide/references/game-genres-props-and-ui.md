# Game Genres, Props & UI Reference

Sources: Pixelblogs 12, 16, 18, 19, 24, 26, 27, 30, 31, 32, 34, 37, 38, 39, 42, 46, 48, 51, 57, 60, 61, 63, 64.

---

## 1. Native Screen Resolutions & Hardware Studies

### Modern Pixel-Perfect Display Targets (PB 22, 31, 47, 60, 62, 63, 64)
* **16:9 HD-compatible (`1920×1080`)**:
  - `320×180` (`6×` integer scale): Chunky 8-bit feel; great for `8×8` / `16×16` platformers and run-'n-gun.
  - `480×270` (`4×` scale; or `470×240` in PB 63): Sweet spot for `16×16` top-down RPGs and shmups.
  - `640×360` (`3×` scale): Smaller relative pixels, fast action shmups.
* **Classic 4:3 / Retro Targets**:
  - `256×240` (NES PAL) / `256×224` (NES NTSC / SNES).
  - `192×144` (RPG battle window framed by UI/borders, PB 62).
* **CRT Consideration**: Old console sprites relied on CRT phosphor blur to soften harsh clusters. For crisp modern HD displays, clean jarring clusters while respecting retro proportions (PB 37, 38, 62).

### Authentic Hardware Inspiration Rules
* **NES (8-bit, PB 36, 37, 38)**: 56-color master palette; `3 colors + 1 shared transparent/black` per sprite or tile; `12 + 1` per scene; `8×8` / `16×16` grid; jump height and knockback snapped cleanly to tile multiples (e.g., `2 tiles` jump/knockback, `0.5 tile` stair steps in PB 37).
* **Sega Master System / Genesis (PB 28, 39)**: **16-color** global scene limit (`Sly16`) or **6-bit RGB (64 colors)** master palette.

---

## 2. Shoot-'em-Up (Shmup) Design Rules (PB 31, 32, 48, 63)

### Player Ship & Controls
* **5-Orientation Roll**: `Neutral` + `2 shallow/steep left` + `2 shallow/steep right` frames (bank vertically in horizontal shmups so nose stays level for straight-ahead fire, PB 31, 63).
* **Zero Movement Inertia**: Never add momentum/drift to player controls in twitch shmups; drive roll animation frames strictly by input hold duration (PB 63).
* **Screen Presence**: Add orbiting **Options/Pods** and clear outgoing fire + `2f` thrusters (`50ms`) so the player always senses ship position via peripheral vision while watching enemy bullets (PB 63).
* **Directional Lighting Warning**: If lighting comes from one side, draw unique left/right roll sprites instead of flipping horizontally (PB 31).

### Hitboxes & Bullet Readability
* **Hitbox Asymmetry** (PB 63):
  - *Player damage hitbox*: Small circle at center mass (smaller in bullet-hell, never larger than sprite pixels), **stationary across all roll frames**.
  - *Player pickup hitbox*: Much larger than damage hitbox for effortless item collection.
  - *Player bullets & enemy bodies*: Generous bounds so shots feel fair.
  - *Enemy bullets*: Small central circle inside the visual sprite for tight grazing.
* **Projectile Visibility** (PB 31, 63):
  - Projectiles must be the **brightest, highest-saturation** elements on screen.
  - Use **white outlines** or **double outlines** (bright inner + dark outer) so bullets read over both dark voids and bright explosions.
  - Alternate `2` frames for a **flashing pulse** (avoid extreme brightness flicker on ultra-fast bullets) or rotate/spin symmetrical shapes.
  - **Dim backgrounds**: Lower background Saturation (`-20`), Contrast (`-15`), and slightly raise Brightness (`+15`) if sprites/bullets blend in (PB 63).

### Weapons, Pickups & Level Pacing (PB 32)
* **Weapon Archetypes**:
  - *Vulcan/Spread*: Fast fire, scales wide across upgrades.
  - *Laser*: Narrow, high power, pierces solids; brief off-intervals reduce visual fatigue vs. constant beams.
  - *Homing*: Spinning omni-directional bullets, low damage per hit (scales down usefulness on bosses).
* **Pickups**: Distinguish visually from hazards via bright color + consistent idle motion (`bob` or `sparkle`).
* **Level Memorability**: Break generic tile expanses with **unique landmarks** and varied pacing (full ground → open space → right-edge mass → left-edge mass) so players orient instantly by background cues.

---

## 3. Items, Food, Mecha & Thematic Props

* **Items (`16×16`, `<= 6` colors, PB 24)**:
  - Match item scale to tile size (`16×16`).
  - Keep silhouette/metaphor instantly readable (potion, coin, key, heart).
  - **Idle consistency**: Ground items *bounce*; floating items *bob*; currency *sparkles*.
  - **Pickup feedback**: Non-consumables (coins) spark at pickup location; stat/healing items play radial/aura feedback *attached to the player* (or HUD).
* **Food (`32×32`–`48×48`, PB 30)**: Sample warm appetizing hues from photo refs, reuse shared palette colors across dishes, and add crisp outlines so items stay stylized pixel art rather than downscaled photos.
* **Modular Vehicles, Airships & Mecha (PB 12, 18, 19, 46, 48, 61)**:
  - Design swappable kits (cockpits, wings, tails, turrets on separate layers) with bold paint stripes wrapping 3D planes for scale and depth.
  - Scale check: Juxtapose mecha with tiny human silhouettes/pilots to sell colossal size (PB 19).
  - Top-down aircraft drop shadows: Copy sprite, scale `50%`, fill flat dark shadow color (PB 48).
* **Cyberpunk Lighting (PB 42)**: Build drab brown/gray concrete city bases (`modular 1-story units`), add **warm desaturated street-level under-glow** fading upward into **cool night-sky hues**, then layer bright neon signs & holograms last.

---

## 4. Game UX & UI Design Rules (PB 26)

* **UX Goals**: Intuitive navigation without thinking; responsive, zero-lag feedback; minimal menu depth.
* **UI Goals**:
  1. **Unified Visual Language**: Lock one font family, border/9-slice style, and gauge orientation (do not mix vertical and horizontal bars arbitrarily).
  2. **Theme Alignment**: Match UI material/metaphor to the world (e.g., bruised portrait in *Doom*, lamp smoke in *Aladdin*).
  3. **Readability Over Decoration**: Health/status bars must read in peripheral vision without flickering or pulling eyes off gameplay hazards; place critical hit/heal feedback near the player sprite during action.
* **Health Gauge Tradeoffs**:
  - *Discrete icons (hearts)*: Charming, instant low-number read, bulky at high HP.
  - *Continuous bars*: Compact, scalable, clear at a glance.
  - *Exact digits*: Accurate for RPG math, slow to parse in twitch action.
