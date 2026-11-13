# Anatomy, Characters & Portraits Reference

Sources: Pixelblogs 17, 22, 29, 36, 39, 42, 49, 55, 57, 59, 60, 64.

---

## 1. Scale & Proportion Models

Choose proportion model by sprite resolution and game feel:

| Scale / Sprite Size | Head-to-Body Model | Proportions & Abstraction Rules |
| :--- | :--- | :--- |
| **`8×8` to `8×16` Micro** (PB 47, 59, 60) | `1:2` to `1:3` | Head + hair/helmet occupy ~40–50% of height. Omit faces/fingers; use 1–2px shifts for turns/poses. |
| **`16×16` Chibi / 8-Bit** (PB 22, 36) | `1:2` ("super-deformed") | Head = 1/3 to 1/2 of total sprite height; stubby limbs; high expressiveness, low animation cost. |
| **`16×32` / `26×32` 3/4 RPG** (PB 22, 42, 55) | `~1:3` to `1:4` | Fits `1×2` grid of `16×16` tiles. Longer limbs than `16×16` allow readable run/weapon arcs without rubbery stretching. |
| **`29×78` Stylized Realism** (PB 17) | **6-head model** | Compact realistic anatomy; fits small/medium side-view sprites with readable facial features. |
| **`29×96` / `48×92` Beat-'em-Up** (PB 49, 52) | **8-head model** | Adult human realism. Male & female both 8 heads (female uses a slightly smaller head unit → slightly shorter overall). |

### Spatial Alignment Landmarks (8-Head Model, PB 49)
* **Elbows** align vertically with the **belly button**.
* **Wrists** align with the **groin**.
* **Neck width**: `1/2` to `2/3` of head width (PB 17).

---

## 2. Three-Stage Character Construction Workflow (PB 17, 42, 49, 55, 57)

1. **Gesture / Wireframe**: Capture spine curve and action energy with minimal strokes, or map joint landmarks.
2. **Color-Coded Crash-Test Dummy**: Block head, neck, torso, left/right arms, and left/right legs in **distinct flat colors** (start with a nude/undergarment base). Verify proportions and limb thickness consistency *before* any gear or shading.
3. **Dress, Shade & Polish**:
   - Place armor/clothes/capes/weapons on **separate layers** if animating or supporting equipment swaps (PB 55, 58).
   - Shade broad planes from the light source first, then refine clusters.
   - Audit character colors for **motion readability**: avoid bright hair/accessories that bleed into weapon slashes or pull focus from hands/faces (PB 55).

---

## 3. Head, Face & Anime Portrait Guidelines (PB 17, 29, 39)

### Standard Realistic Head Divisions (PB 17)
* **Eyes**: Halfway between top of head and chin.
* **Face thirds**: Hairline → brow, brow → nose bottom, nose bottom → chin are equal thirds.
* **Nose bottom**: Halfway between eyes and chin; nose width ≈ 1 eye width.
* **Eye spacing**: 1 eye width between eyes.
* **Mouth**: `1/3` to `1/2` of the way down from nose bottom to chin; width ≈ distance between pupils.
* **Ears**: Top aligns with brow line; bottom aligns with nose bottom.

### Anime Faces & Hair (PB 29)
* **Subtle fisheye idealization**: Enlarge eyes for emotion, keep lips small/pouty, minimize or omit front-view nose (nose becomes a small swooped button in side profile).
* **Hair construction**:
  1. Trace **flow lines** of main locks radiating from a crown **cowlick** toward the back/sides.
  2. Blob in the entire silhouette in **one flat base color**.
  3. Carve shape and volume with large shadow clusters, then place crisp specular highlight bands across lock curves.

---

## 4. Top-Down Character Sprites: 4-Dir vs. 8-Dir (PB 22, 55, 58, 59)

* **Grid Footprint & Overlap**: Align character width/feet to `1×1` tile (`16×16` or `8×8` base) even if sprite height is `1×2` tiles. Top half may overlap tiles above it along the Y-axis for depth, **never spill horizontally** into adjacent columns (PB 22).
* **4-Direction Economy**: Create **Up, Down, Side** (flip Side for Left/Right). Works even with 8-way movement if paired with wide weapon arcs (e.g. *A Link to the Past*, PB 22, 55).
* **8-Direction Symmetry Trick**:
  - For symmetrical characters: draw only **5 orientations** (`Down`, `Down-Side`, `Side`, `Up-Side`, `Up`) and mirror the 3 side/diagonal ones.
  - For asymmetrical characters (sword in right hand, shield in left): draw unique frames for all **8 orientations** so gear doesn't teleport hands on flip (PB 55, 58).
* **Turntable Verification Trick** (PB 55): Sequence all 8 orientations into a spinning **rotation animation** and play it back. Proportion errors, drifting limb lengths, and inconsistent head/shoulder heights jump out immediately in rotation even when missed side-by-side.
* **Micro-Sprite Shortcut** (PB 59): For `8×8` tiny characters, you can use a single forward-facing idle regardless of last movement direction to maximize personality.

---

## 5. Enemy & Monster Design Rules (PB 36, 37, 57, 62, 64)

* **Match mechanics to player traversal**: Design flyers/wall-crawlers/turrets specifically to challenge the player's jump height, attack arc, and blind spots (PB 38, 64).
* **Real-world synthesis**: Combine and exaggerate real animal anatomy (e.g., mole crab + pillbug = Sand Roly; bat slow-mo flight; gorilla knuckle-walk) with fantasy/sci-fi twists (PB 36, 37, 62, 64).
* **Biome palette contrast**: Color enemies to stand out clearly against their native stage ground/background while fitting the ecosystem (PB 36, 64).
* **Recolor variants**: Reuse base silhouettes with palette swaps + minor behavior tweaks for economical enemy tiers (PB 36).
