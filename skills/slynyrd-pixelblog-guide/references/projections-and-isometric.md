# Graphical Projections & Isometric Reference

Sources: Pixelblogs 3, 4, 41, 54, 61, 64.

---

## 1. Core Projection Rule: Uniformity Over Realism (PB 3)

* **Never mix incompatible graphical projections** in the same scene. A stylized or mathematically imprecise projection looks cohesive as long as every object obeys the same rules.
* Depth in pixel art projections comes primarily from **value contrast between planes** (top vs. front vs. side) and small architectural ledges/overhangs catching directional light.

---

## 2. Standard 2D Projections

| Projection | Geometry & Angle Rules | Best Use Cases & Notes |
| :--- | :--- | :--- |
| **3/4 Top-Down** (PB 3, 20, 35, 51) | ~45° overhead tilt. Shows both roof/top plane and shortened front facade. **Keep roof angles clean** (preserve crisp 45°/clean pixel steps rather than squishing angles realistically). | RPGs, top-down adventures, city builders. Y-axis implies depth (lower = closer); top of tall sprites may overlap higher tiles, **never break bottom/side footprints** on grid assets. |
| **3/4 Side-View** (PB 3, 14, 19) | Rotated ~45° so viewer looks toward a corner, seeing ~3/4 of both adjacent walls while **preserving 45° roof angles**. | Architecture, cityscapes, mecha, vehicles. Omit or keep a 1px corner highlight/shadow strip depending on sharp vs. beveled look. |
| **Side-View Tilted-Top** (PB 28) | Pure side X/Y face with a narrow top strip tilted back (3/4 top rim) on ground/platform tops and corners. | Platformers—gives 3D thickness while keeping collision bounds rectangular and flat. |
| **Cabinet / Oblique** (PB 28, 64) | True orthographic X/Y front face + parallel oblique Z-axis lines (typically **45°** `1:1` or **~67.5°** `1:2` two-up-one-left steps). | Beat-'em-ups, platformer city buildings/ledges with depth. Keep Z-steps clean with zero jaggies. |
| **Isometric (Dimetric 2:1)** (PB 4, 41, 54, 61) | Rotated 45° and tilted. True 30° iso causes jagged pixel rhythms, so pixel art uses **2:1 ("2-step") lines** (`~26.565°`: 2px horizontal, 1px vertical). | Turn-based tactics, city builders, dioramas. Avoid for twitchy precision platformers/shooters due to depth ambiguity. |

---

## 3. Isometric Construction Rules (PB 4, 41, 54, 61)

### Lines, Grids & Alignment
* **2:1 Rule**: Every horizontal ground-plane axis follows a repeating **2px across, 1px up/down** staircase (`2-step` lines). Vertical axis (`Z`) is straight vertical pixels.
* **2:1 Ruler Layer**: Keep a dedicated guide layer containing a long bright-colored `2:1` line to slide around and verify alignments—counting pixels beats eyeballing (PB 4, 41, 54).
* **Even Dimensions**: Use even pixel dimensions for base tiles (`16×16`, `32×32`, `36×36`).

### Cube / Tile Corner Styles & Layering
* **Wide `2px`-corner diamond** (e.g. `32×32` cube, PB 41 `A1`, PB 61): Visually cleaner, avoids sharp pointed tips, **but** requires overlapping adjacent tiles by `1px` in consistent draw order so textures connect flush.
* **Sharp `1px`-corner diamond** (PB 41 `D1`, PB 61): Tiles flush with zero overlap (smash diamond vertically by `1px`), at the cost of sharper `1px` side tips.
* **Cuboids & Variable Height**: Keep the top diamond footprint identical across tiles, vary vertical wall height (flat ground = 0 wall, shallow water = half height, cliffs/buildings = full or stacked cubes) to create instant elevation (PB 41, 61).
* **Seamless Iso Faces**: Each of the 3 visible cuboid faces must tile seamlessly along its own axes (PB 41).

### Circles, Cylinders & Organic Forms in Isometric
1. **Isometric Circles / Ovals**:
   - Draw an isometric square diamond (using `2:1` edges) + center crosshairs (`2:1` axes).
   - Touch the ellipse to the 4 midpoints where the crosshairs meet the diamond edges; mirror corner cutouts symmetrically.
   - *Shortcut*: Draw a standard orthographic circle, apply a 2:1 skew transform, then hand-clean all doubles/jaggies (PB 41).
2. **Tapered Cylinders & Tree Trunks** (PB 54):
   - Place one flat iso oval at the base, a slightly smaller oval above it, connect outer tangents vertically (`Y`), and trace roots along `2:1` paths.
3. **Foliage & Organic Iso Props** (PB 41, 54):
   - Start from basic iso geometric volumes (spheres, `3:2` ovals, cubes) to maintain consistent projection, then sculpt leaf clusters and cast shadows onto the `2:1` ground plane.
   - Note: Simple spherical/oval tree canopies read well in both isometric and 3/4 top-down; visible branches and trunks betray the projection and must obey `2:1` rules (PB 54).

### Complex Multi-Part Iso Assets (Vehicles, Houses, Mechs)
1. **Build hidden geometry first**: Draw the full wireframe/outline of every component—even occluded back edges—on **separate layers** (color-coded by part) to guarantee proportions and `2:1` alignment before filling (PB 41, 54).
2. **Plane-based value separation**: Assign distinct lightness/warmth to top, left-facing, and right-facing planes from a strong corner light source (PB 54).
3. **Bevels & Anti-Aliasing**: Slice sharp edges with beveled strips and place rhythmic manual AA / edge highlights along angled `2:1` edges on vehicles/props (PB 54).
4. **Iso Mechs at Small Scale (`32×32`)** (PB 61):
   - Start at the torso (boxy like a tank front, jutting ahead of shoulders) and work outward.
   - Oversized shoulders above a low-set head + 1–2 bright optic pixels create strong silhouette power.
   - Omit upper-leg/groin clutter; design leg+foot as a single unified stance with wide ski/claw/hoof feet for visual stability.
   - Add accent stripes last—only where they reinforce form without adding noise.
