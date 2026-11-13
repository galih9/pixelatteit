# Tilesets & Environments Reference

Sources: Pixelblogs 2, 11, 13, 14, 15, 20, 21, 23, 28, 34, 35, 43, 44, 45, 51, 61, 62, 64.

---

## 1. Tile Fundamentals & Workflow (PB 20, 28, 35, 43)

* **Standard Tile Sizes**:
  - `16×16px`: Sweet spot for detail, speed, and classic 8/16-bit feel.
  - `8×8px`: Micro-retro economy (`320×180` screen, NES-style modularity, PB 47, 59, 60).
  - `32×32px`: Practical ceiling for standard pixel tiles; mix occasional `32×32` panels with `16×16` tiles to break grid monotony (PB 20, 39).
  - Always use **even, power-of-two, square** dimensions where possible.
* **Live Tiling Is Mandatory**: Design inside a tiled/atlas preview (Aseprite *Tiled Mode*, Pyxel Edit, etc.) so seam wrapping updates in real time.
* **Core Tile Quality Rules** (PB 20, 28):
  1. **Uniform Visual Weight**: Distribute clusters evenly; wrap clusters across tile boundaries so no bright/dark spot reveals the grid seam.
  2. **Cluster Spacing**: Repeat key cluster shapes consistently, but **never let key clusters merge edge-to-edge** (creates blotchy noise). Diagonal corner-to-corner touching is OK.
  3. **Texture Contrast**: Pair busy textures (cracked dirt, masonry) with airy negative-space textures (flat grass).
  4. **Mirroring**: Symmetric light (`top-center`) lets left/right edge tiles mirror cleanly, halving tile count (PB 28).
  5. **Variants**: Create at least 1–2 alternate center tiles for frequently repeated terrain (grass, clouds, cracked bricks) to fight visual fatigue.

---

## 2. Top-Down Tile Systems (PB 20, 21, 35, 43, 45, 51)

### Layer Stack Order (PB 43, 47, 48)
Example 7-layer top-down terrain stack (bottom → top):
`1. Dirt / Base Ground` → `2. Grass (transparent cutout overlays)` → `3. Shadows 1 (universal drop-shadow tiles)` → `4. Trees & Rocks` → `5. Cliffs 1` → `6. Shadows 2` → `7. Cliffs 2`.
* Separating grass cutouts and drop shadows onto dedicated layers avoids baking every `terrain × terrain` or `wall × floor` combination into duplicate tiles (PB 43, 45).

### Terrain & Architecture Recipes
* **Cliffs & Rock Walls** (PB 43):
  1. Build a seamless 4-way **front-facing** cliff tile.
  2. Skew/reimagine it at **45°** for angled side walls, then mirror + palette-shift for the opposite side.
  3. Slice top/bottom parts of the angled wall to build corners and stepped terraces.
* **16×16 Brick & Masonry Math** (PB 45):
  - Accounting for `1px` grout lines, only brick widths/heights of **`15`, `7`, `3`, or `1` px** divide evenly into `16×16` tiles (also applies to 45° diagonal brick patterns).
  - *Wall vs. Ground Depth*: Make top-of-wall tiles brighter and taller-bricked; make vertical side-wall bricks shorter and darker. Use universal **corner columns** instead of 4 custom wall-corner intersections.
* **Short Universal Drop Shadows** (PB 21, 43, 45, 51):
  - Keep wall/building/prop shadows **compact (`<= 1 tile` length)**, cast slightly left/right and downward. Long realistic shadows cause awkward overlap/lighting mismatches when sprites step onto them.
* **Interiors & Buildings** (PB 22, 35, 51, 59):
  - Keep building **bottom and side footprints strictly snapped to the `16×16` grid**; allow roofs/spires to extend a few pixels above the top edge along Y for overlap depth (PB 51).
  - Interior buildings may expand larger inside than their exterior town footprint (classic RPG convention, PB 22, 59).

---

## 3. Side-View Platformer Tiles (PB 28, 37, 38, 60, 64)

* **Minimal 12-Tile Collision Core** (PB 60):
  - `3×3` outer box (top/bottom/left/right edges, 4 outer corners, 1 center fill = 9 tiles) + `4` inner `L`-junction corners (`4×4` diamond cutout) builds complete rectangular platformer levels.
* **3-Pass Tile Construction** (PB 28):
  1. **Color block + tilted top plane**: Reserve the top strip of ground/corner tiles as a 3/4-tilted surface for pseudo-3D thickness.
  2. **Rough clustering**: Blend texture transitions across interior fills.
  3. **Fine details + grassy overhang**: Put decorative grass/moss fronds on a non-colliding overlay layer above the flat collision line so player feet sit *behind/inside* the grass without jagged collision.
* **Support Tiles & Layer Separation** (PB 28, 38, 60):
  - Ground floating platforms with background support pillars/beams visually dimmed behind the play layer.
  - Keep collision foreground tiles distinctly higher-contrast than background walls/sky; dim distant parallax layers (e.g., Saturation `-20`, Contrast `-15`, Brightness `+15` in PB 63, or low-saturation cool atmospheric bands in PB 62).
* **Cabinet-Projection City Platforms** (PB 64): Match flat `X/Y` front tile faces with parallel oblique `Z` edges (`45°` `1:1` or `~67.5°` `1:2`) across `~6` parallax depth layers.

---

## 4. Foliage & Modular Trees (PB 2, 15, 44, 54)

### Deciduous Canopy (Modular Bundle Method, PB 2, 44)
1. **Design 1 core leaf bundle**: Build a ball-shaped cluster of varied-but-consistent geometric leaves (`2×2px` squares that never overlap, **rhombus/trapezoids** rotated upward at top and downward at bottom, or circles) using **4–5 colors**.
2. **Shading the bundle**: Shade like a sphere—crescent shadow on bottom-left, small highlight circle on upper-right, hand-clean clusters.
3. **Create 3 value variants**: Shift the bundle's hues up/down 1 notch on a shared ramp (**Light, Mid, Dark**).
4. **Stack into trees**: Layer Light/Mid/Dark bundles to form full canopies; clean only awkward seam clusters, then add a **tapered cylinder trunk** (bark stripes widest in center, narrow at edges) + cast shadow.

### Conifer Trees (Top-to-Bottom Branch Layers, PB 44)
1. Draw a vertical stick guide.
2. Build branches **top-to-bottom** (upper branches overlap lower ones!) using 1 fill + 1 outline color; mirror side branches before shading.
3. Assign Light/Mid/Dark branch tiers and add cast shadows from upper branches onto lower ones.

---

## 5. Multi-Layer Landscape Backgrounds (PB 11, 14, 46, 62)

1. **Block horizontal color bands first** (`192×144` 4:3 or widescreen) to lock horizon and atmospheric depth before drawing any detail (PB 62).
2. **Apply Atmospheric Perspective**:
   - Near ground: largest texture clusters, highest contrast, warmest/most saturated colors.
   - Mid ground: smaller `1–2px` clusters, cooler/sky-tinted shadows, bottom mist/haze band blending mountains into fields.
   - Far mountains/clouds: zero micro-texture, silhouettes pulled directly from sky palette bands (`<= 15` colors total).
3. **Cityscapes & Modular Buildings** (PB 14, 42, 51, 59):
   - Build modular single-story floor tiles, stack to arbitrary heights, place each building on its own layer for easy skyline composition, and balance rigid architectural angles with organic cloudscapes behind them.
