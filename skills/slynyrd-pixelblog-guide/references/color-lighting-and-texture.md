# Color, Lighting & Texture Reference

Sources: Pixelblogs 1, 2, 5, 6, 7, 11, 36, 47, 59, 62.

---

## 1. HSB Color Ramps & Palette Construction (PB 1, 28, 36)

Design color in **HSB** (Hue `0–360°`, Saturation `0–100%`, Brightness `0–100%`):

### Building a Hue-Shifted Ramp (Mondo Method)
1. **Pick a mid-ramp anchor color** at the highest combined Saturation + Brightness you are willing to allow without "eye burn".
2. **Shift Hue across brightness**:
   - Positive hue shift (`+15°` to `+20°` per step as brightness increases; `20°` is near the practical maximum) produces natural, warm highlights and cool shadows.
   - Reverse (negative) shift works for stylized/cold palettes, and straight (0° shift) ramps only work for monochromatic looks.
   - Criss-crossing hue-shifted ramps let you pick color ramps **both horizontally and diagonally** across the palette grid for automatic harmony.
3. **Shape Saturation & Brightness curves**:
   - **Brightness (`B`)**: Monotonically increases from dark to light. Usually avoid `B = 0%` unless pure black is needed. Take smaller `B` steps near `100%`.
   - **Saturation (`S`)**: **Never combine high `S` with high `B`** (causes harsh neon eye-burn). Drop `S` at high brightness; peak `S` either in the **middle** of the ramp (natural balanced look) or **increase `S` as `B` drops** ("X pattern" for vivid, rich darks).
   - Prioritize **even perceptual contrast** between adjacent swatches over rigid math.
4. **Generate multi-ramp + neutral palettes**:
   - Duplicate a 9-swatch ramp and shift Hue by `+45°` × 8 rows to cover the `360°` wheel.
   - Duplicate the middle swatches (omitting darkest and lightest ends), desaturate them, and place alongside vibrant ramps for natural warm/cool grays and earthy neutrals.

### Low-Color & Retro Palette Rules
* **Beginner rule**: Restrict to **~5 colors** until cluster control and shading are solid (PB 7).
* **Global small-palette sweet spot**: **15–16 colors** (e.g., `Sly16`) for entire scenes/environments (PB 28, 62).
* **NES-inspired constraints** (PB 36, 38, 59, 60, 64):
  - Authentic 56-color NES master palette.
  - **3 colors + 1 shared transparency/black** per sprite or tile (`12 + 1` per scene in strict mode).
  - Outlines become much more useful when color counts are heavily restricted to keep sprites readable against backgrounds (PB 59).

---

## 2. Clusters, Linework & Resolution Philosophy (PB 5, 7, 47, 59)

* **Cluster**: Any group of touching pixels of the same color.
  - *Simple, angular, repetitive clusters* → clean, sharp, cute, readable aesthetic.
  - *Spontaneous, varied organic clusters* → painterly, natural, sketchy aesthetic.
* **Orphan pixels**: Isolated 1px dots not connected to a matching cluster. Avoid them unless they belong to an intentional sparse texture (stars, grit, stipple) where they don't read as stray errors.
* **Doubles & Jaggies**: Strip accidental L-corners (`doubles`) on 1px curves/lines, and keep segment-length transitions gradual (`1 → 2 → 3 → 2 → 1`) so diagonals don't kink.
* **Embrace Low-Spec Abstraction**:
  - Pixel art's power comes from **lack of literal information**—forcing the viewer's imagination to fill the gaps (PB 47).
  - Working at `8×8` / `8×16` (`tiny pixels`, PB 47, 59) teaches maximum economy: simplify limbs, use 1–2px shifts for turns/expressions, and cut unnecessary sub-pixel noise.
  - **Background color while editing**: Paint on a **neutral gray** canvas backdrop, never stark white, to judge values accurately and prevent eye strain (PB 5).

---

## 3. Light & Shadow (PB 6, 3, 57, 62)

1. **Establish light direction at step 1**: Most natural default is **top-left** or **top-right** (creates crisp plane separation on 3D forms); use **top-center** only when horizontal mirroring of tiles/sprites is required (PB 28).
2. **Never pillow shade**: Do not ring the interior perimeter of a sprite with shadow; shade according to 3D surface planes facing toward or away from the light.
3. **Match cast shadows to atmosphere** (PB 6):
   - **Hazy / overcast sky**: Diffuse light → softer, less-defined cast shadows.
   - **Clear daylight**: Crisp, dark, well-defined shadows.
   - **Outer space (no atmosphere)**: Elongated, razor-sharp shadows with maximum contrast.
4. **Atmospheric perspective (daylight landscapes)** (PB 11, 62):
   - **Closest plane**: Highest saturation, highest light/shadow contrast, sharpest texture clusters.
   - **Receding planes**: Saturation **decreases**, lightness **increases** (toward daylight haze), and hue **shifts toward the sky color** (e.g., warm green/orange → cool blue).
   - **Reverse-hue forest case** (PB 62): When looking out from a shaded forest interior toward bright sunlit clearings, greens shift from **dark cool blue-green** (near) → **warm yellow-green** (far), while still dropping saturation and increasing lightness.
5. **Color reuse across depth planes**: Reuse sky-band colors as mountain shadows or distant silhouette fills to fit whole landscapes into `<= 15` colors (PB 62).

---

## 4. Texturing Principles & Recipes (PB 2, 13, 15, 43, 45)

Follow SLYNYRD's **5 Texturing Principles** (PB 2):
1. **Simplify**: Abstract materials into simple recurring shapes; never draw every leaf or blade.
2. **Repetition**: Build textures from 2–4 recurring cluster shapes distributed in varied patterns.
3. **Balance**: Distribute visual weight evenly so no single blotch creates an obvious grid seam when tiled.
4. **Contrast & Negative Space**: Leave open flat areas where texture is implied. Alternate busy textures with quiet textures (e.g., detailed dirt beside airy grass).
5. **Avoid Orphan Pixels**: Keep texture marks grouped into intentional 2px+ clusters or rhythmic streaks.

### Material Recipes
* **Grass** (PB 2, 20, 62): Mix flat negative space with short 2–3px vertical blade clusters and occasional flower dots; shrink blade height to `1–2px` in mid-distance planes and drop individual blades entirely in far planes.
* **Brick / Stone** (PB 2, 45): Lay `1px` grout grid first (`15`, `7`, `3`, or `1` px brick sizes inside `16×16` tiles), fill flat bricks, then age sparingly with discolored/cracked bricks or 1–2 protruding/sunken shadow highlights. Avoid outlining every brick starkly.
* **Sand** (PB 43): Use angled calligraphic `S` and `C` clusters with subtle irregularity—don't connect too many wiggly lines or it reads like "ramen noodles".
* **Water** (PB 43): Draw interconnected `1px` wavy blob networks, break select lines for flow, add dark drop shadows a couple pixels below bright highlight lines.
* **Clouds** (PB 2, 18): Stamp overlapping circles for base mass, carve arched highlight layers with occasional subtle spiral curls for airy volume. Know the 10 cloud types (cumulus, stratus, stratocumulus, altocumulus, nimbostratus, altostratus, cirrus, cirrocumulus, cirrostratus, cumulonimbus) for altitude-appropriate silhouettes.
* **Stars** (PB 2, 12): Create a small palette of star sizes/shapes (1px dot, cross, diamond) and sprinkle with complementary cosmic hues over dark gradients/nebulae.
* **Rocks** (PB 13, 21): Match environment geology (granite, limestone, oxidized canyon rock) and share hues with nearby dirt. Use angular outline→fill for large sharp boulders; use color-blocking→chiseling for small rocks.
