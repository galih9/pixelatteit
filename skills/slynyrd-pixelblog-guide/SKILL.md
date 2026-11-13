---
name: slynyrd-pixelblog-guide
description: >-
  Comprehensive, AI-optimized synthesis of all 64 SLYNYRD Pixelblog tutorials
  (by Raymond Schlitter). Use when designing, generating, critiquing, scaling,
  coloring, tiling, projecting, or animating pixel art assets, sprites,
  tilesets, backgrounds, VFX, or retro game UI/UX.
---

# SLYNYRD Pixelblog Master Guide

Structured distillation of **Pixelblogs 1–64** from [slynyrd.com/pixelblog-catalogue](https://www.slynyrd.com/pixelblog-catalogue) for AI-assisted pixel art creation, critique, and game asset planning.

> **Webapp Integration**: When executing edits inside this repository's Pixel Editor (`window.pixelEditor`), pair these artistic rules with [comprehensive_pixelart_skill.md](../comprehensive_pixelart_skill.md).

---

## Reference Modules (Progressive Disclosure)

Load only the reference file(s) needed for the current task:

| Module | Use When Working On | Source Pixelblogs |
| :--- | :--- | :--- |
| [Color, Lighting & Texture](./references/color-lighting-and-texture.md) | HSB palettes, hue-shifting, cluster control, shading, dithering, textures, tiny-pixel abstraction | 1, 2, 5, 6, 7, 11, 36, 47, 59, 62 |
| [Projections & Isometric](./references/projections-and-isometric.md) | 3/4 top-down, 3/4 side-view, cabinet projection, 2:1 isometric geometry, cubes, organic iso forms | 3, 4, 41, 54, 61, 64 |
| [Anatomy, Characters & Portraits](./references/anatomy-characters-and-portraits.md) | Proportions (8×8 to 8-head), dummy templates, top-down 4/8-dir sprites, anime faces/hair | 17, 22, 29, 36, 39, 42, 49, 55, 57, 59, 60 |
| [Animation & Motion FX](./references/animation-and-fx.md) | Walk/run/idle loops, melee & combat timing, smears/hit-stop/overshoot, water, wind, fire, explosions, parallax math, faux-3D | 8, 9, 10, 23, 24, 25, 31, 33, 40, 45, 46, 48, 50, 52, 53, 55, 56, 58, 59, 60, 63, 64 |
| [Tilesets & Environments](./references/tilesets-and-environments.md) | 8×8 / 16×16 seamless tiles, autotile sets, rocks, walls, interiors, modular trees, landscape depth layers | 2, 11, 13, 14, 15, 20, 21, 23, 28, 34, 35, 43, 44, 45, 51, 61, 62, 64 |
| [Game Genres, Props & UI](./references/game-genres-props-and-ui.md) | Native 16:9 / 4:3 resolutions, shmups, platformers, run-'n-gun, NES/Genesis constraints, mecha, items, food, UX/UI | 12, 16, 18, 19, 24, 26, 27, 30, 31, 32, 34, 37, 38, 39, 42, 46, 48, 51, 57, 60, 61, 63, 64 |
| [Catalogue Index (1–64)](./references/catalogue-index.md) | Looking up a specific Pixelblog number, URL, or topic | 1–64 |

---

## Core Non-Negotiable Rules

1. **Intention Defines Pixel Art**: Every pixel must be placed deliberately as part of clean **clusters** (contiguous same-color pixel groups). Eliminate accidental **orphan pixels** (isolated 1px dots unrelated to a texture) and unintended **doubles** (L-shaped corners on 1px curves).
2. **Restrict Palette Early**: Beginners/prototypes should start with ~5 colors; full sprites/props typically use **3–7 colors**; full environments/scenes rarely need more than **15–16 colors** (e.g., `Sly16`, NES palette) or a unified ramp master palette (e.g., `Mondo`).
3. **Hue-Shift Every Ramp**: Never build straight lightness-only ramps (unless intentionally monochromatic). Shift hue toward warmer/brighter tones as brightness rises (commonly `+15°` to `+20°` per step) and drop saturation at high brightness to prevent eye-burn.
4. **Lock Projection & Light Source First**: Establish one global light direction (commonly top-left or top-right, or top-center when horizontal mirroring is required) and one graphical projection before detailing. Never mix projections in one scene.
5. **Less Information = More Imagination**: Avoid over-detailing. Push cluster refinement only until the viewer's brain fills in the rest; excessive micro-detail creates noise—especially in animation.
6. **Gameplay Over Realism**: In game assets, prioritize silhouette readability, snappy low-latency response (skip long jump/attack wind-ups when instant input matters), and background/foreground value separation.
7. **Integer Scaling & Zero Auto-AA**: Export and present only at whole-number multiples (`2×`, `3×`, `4×`; avoid >`4×` unless micro-res) using **nearest-neighbor** resampling. Never apply automatic anti-aliasing, blur, or sub-pixel fractional scaling.

---

## Standard Construction Pipelines

### Static Sprite / Prop Pipeline
1. **Canvas & Grid**: Pick sprite bounds aligned to the project's tile unit (`8×8`, `16×16`, `16×32`, `32×32`, etc.). Work against a **neutral gray background**, not pure white.
2. **Silhouette / Blocking**:
   - *Small sprites / organic shapes*: **Block solid** color shapes immediately (`blocking` method), then sculpt edges.
   - *Large / angular / architectural / mechanical sprites*: Draft clean **1px outlines** or **color-coded geometric wireframes** first, then fill planes by light direction.
3. **Form Shading**: Block large light/mid/shadow clusters from the global light source before adding surface texture. Avoid pillow shading.
4. **Cluster Polish & Selective Outlines**: Clean jaggies, refine clusters, and apply outlines only if needed for background separation (prefer **darker-shade colored outlines** over pure black unless matching an 8-bit aesthetic).

### Animated Character Pipeline
1. **Proportions & Base Grid**: Define character size relative to environment tiles (e.g., `1×2` tiles = `16×32` or `26×32`; micro = `8×8` or `8×16`; realistic 8-head = `29×96`; 6-head = `29×78`).
2. **Color-Coded Crash-Test Dummy**: Assign distinct flat colors per body part (head, neck, torso, front/back arms, front/back legs). Never detail clothes or armor before motion reads cleanly on the dummy.
3. **Keyframes Before In-Betweens**: Lock extreme poses (contact, pass, wind-up, full extension/impact) and verify energy at target `ms` timings. Add in-betweens/smears only where needed.
4. **Layer Separation & Dress-Up**: Split independently moving parts (torso vs. legs for run-'n-gun, weapons, shields, cape/hair secondary motion, dust FX) onto separate layers, then apply costume, fabric folds, and sub-pixel polish.
5. **Noise Audit at Playback Speed**: Watch the loop at real speed (`1×`–`2×`). Any flickering sub-pixel or merging cluster that distracts from motion must be simplified.

---

## Quick Decision Tables

### Target 16:9 Native Resolutions (Pixel-Perfect into 1920×1080)
| Native Resolution | Integer Scale to 1080p | Visual Feel & Best Fit |
| :--- | :--- | :--- |
| `320×180` | `6×` | Chunky retro, `8×8` / `16×16` tiles, tight platformer / run-'n-gun |
| `480×270` (`470×240` 4×*) | `4×` | Balanced `16×16` top-down RPGs & vertical/horizontal shmups |
| `640×360` | `3×` | Crisp high-detail pixel art, fast scrolling shmups |

*\*`470×240` is cited in Pixelblog 63 for 4× scaling near 1080p height; `192×144` (4:3) works for windowed RPG battles.*

### Animation Frame Economy Reference
| Cycle / Action | Minimal (8-bit) | Standard Balanced | Smooth / High-Res |
| :--- | :--- | :--- | :--- |
| **Idle** | 1 static or 2-frame march (`~200ms`) | 4–6 frames (offset holds at extremes) | 8 frames (`100ms` rise / `50ms` drop) |
| **Walk / Run** | 2–3 frames (Mega Man style: 2 strides + shared pass) | 4–6 frames (`80–160ms`; 6f is the sweet spot) | 8 frames (`60–100ms`; contact/down/pass/up × 2) |
| **Melee / Attack** | 2–4 frames (fast strike + recover) | 6 frames (`anticipation → smear → hit → follow-through → recover`) | 6–8+ frames with `load` + `pull` + `rebound` |
| **Water / Wind / Fire** | 2 frames (hard swap or 50% opacity blend) | 4 frames (breeze rustle, `100–200ms`) | 6–16 frames (flags, waterfalls, waves, fire) |
