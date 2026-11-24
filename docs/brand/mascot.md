# OctoGrab mascot — illustrated mint direction

Updated: 11 October 2026.

The current direction follows the logo supplied by the user: a rounded mint octopus with a dark teal outline, circular highlighted eyes, coral cheeks, and a simple smile.

## Reference

[User-provided OctoGrab logo](https://raw.githubusercontent.com/ayoub-sahraoui/octograb/main/public/octograb-logo.png)

## Character

- Large rounded head and a compact, front-facing silhouette.
- Four prominently visible short curled arms, following the stylized reference.
- Mint fill, dark teal contours, coral cheeks, and pale graphic highlights.
- Smooth outlined 2D illustration with restrained aqua shading.
- A transparent background and fully visible extremities.

## Assets

- Current mascot: `../../public/mascot/octograb-mascot-v4-corrected.png`
- Previous mint version: `./archive/octograb-mascot-v3-mint.png`
- Earlier flat study: `./archive/octograb-mascot-v2-flat.png`
- Earlier 3D study: `./archive/octograb-mascot-v1.png`

The approved master is a transparent raster PNG. It is integrated into the app header, favicon, and extension icons. The header uses a lossless 128 × 128 WebP export at `../../public/brand/octograb-mark.webp`; Chrome icons are PNG exports at 16, 32, 48, and 128 pixels. Editable SVG conversion remains deferred.

## App brand

- Light theme: teal `#13545A` actions on mint-tinted surfaces, with dark teal text.
- Dark theme: mint `#99D8C4` actions on deep teal surfaces.
- Coral remains an illustration accent rather than a primary action color.
- [Companion illustrations and prompts](./illustrations.md) cover the empty editor, empty library, and unmatched searches.
- Earlier concepts and the old icon are archived outside `public` so they are not shipped in the extension.

## Generation

Generated with the built-in image generation tool using the downloaded user-provided logo as the image reference. Transparency was checked after copying the resulting file into the project.

### Reference-based generation prompt

```text
Use case: logo-brand / illustrated mascot.
Image 1 is the user's PRIMARY shape and style reference for the OctoGrab mascot. Create a fresh, polished logo mascot very close to THIS reference's visual language.

One front-facing adorable mint-green octopus, a large smooth rounded oval/dome head, two dark teal circular eyes each with one simple small white highlight, a small curved dark teal smile, two soft coral-pink oval cheeks. Four prominently visible short chunky curling arms form a compact symmetric silhouette like the reference: two outer arms curl upward, two lower arms curl inward. Generous rounded curves, uncluttered face, pleasing symmetry. The face sits slightly below the middle of the large round head. Preserve this recognizable round-headed octopus silhouette and friendly expression.

Style: clean modern 2D cartoon brand mark with a consistent bold dark teal outline, smooth vector-like curves, pale mint main fill, restrained flat aqua shading patches, and just two simple pale-mint graphic shine shapes near the top-left of the head. Match the supplied image's gentle mint/teal/coral palette. Make the linework cleaner and more consistent, simplify its shading. The secondary color areas are flat graphic shapes, not realistic volume. Avoid gradients, texture, bevels, realistic lighting, cast shadows, 3D toy rendering, or glossy material effects.

Use the reference image exclusively. Do not include any folded paper corner, square head, blueprint tile, golden building block, separate props, costume, suction cups, typography, wordmark, badge, or icon background. Those belong to earlier rejected concepts and must not appear.

Square composition, centered single mascot, every curve and limb completely visible, roughly 12% clear padding around the entire character so nothing touches the image boundary. Truly transparent alpha background instead of the reference's pale blue backdrop. No background scene, floor, checkerboard drawing, watermark, extra characters, or text.
```

### Local retouch

The marked upper-forehead patch at (58.2%, 29.2%) was smoothed with the built-in image generation tool. The corrected asset preserves transparent RGBA and the original canvas dimensions. The original image is retained for comparison.

```text
Use case: precise-object-edit.
Image 1 is the exact OctoGrab mascot logo to repair. Make a LOCAL RETOUCH only.

The user marked a small issue at x=58.2% and y=29.2% of the image canvas, on the otherwise empty mint-green upper forehead above the eyes (approximately pixel 730,366 on the 1254×1254 source). Repair the faint uneven, grainy, discolored or smudged mint surface at that location. Clean and smooth this small patch so it blends seamlessly with the surrounding mint color. The surface should have clean consistent color without speckles, cloudy blotches, seams, dents, or an obvious retouched boundary. Add no new feature at that point.

Preserve the mascot's exact appearance everywhere else: same rounded head silhouette, four visible curled arms, dark teal outline and its thickness, round eyes and white glints, coral cheeks, smile, pale top-left highlight shapes, pale rim band, aqua side shading, proportions, placement, and palette. Do not redraw, redesign, restyle, reframe, resize, crop, change facial expression, or add elements. Maintain the existing 2D illustrated style. Preserve the original canvas and transparent alpha background; no solid background, fake checkerboard, floor, shadow, text, or watermark.
```
