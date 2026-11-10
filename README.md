# MIYO — Good mood. Good yogurt.

The MIYO Pererenan homepage and Our Story page, built from the Figma design.
The centrepiece is a scroll-controlled film: the 8-second cup-build clip is
preloaded as 192 WebP frames and painted to a canvas, with seven chapter titles
that change as each ingredient lands.

## Pages

- `index.html` — navigation, the scroll film first, hero, ribbon, flavours,
  reviews, journal, visit/map card and closing sign.
- `our-story.html` — the story page, using the same header and footer.

## The film

- Source clip: `Dispenser_filling_yoghurt_cup_e082c0ea.mp4` (8.043s, 24fps).
- Frames: `frames/f_001.webp` … `f_192.webp`, drawn to `#filmCanvas`.
- The cup is recolored frame by frame to the periwinkle body and cream MIYO
  wordmark of the hero cup (`#7D94CA` / `#F8F0DD`). `poster.webp` and
  `miyo-film-recolored.mp4` are generated from the recolored frames.
- Seven chapters in `#filmChapters`. Each `data-at` is the clip timestamp where
  that ingredient appears:

  | Chapter | `data-at` |
  | --- | --- |
  | Vessel | 0.00 |
  | Swirl | 1.45 |
  | Strawberries | 2.08 |
  | Mango | 2.62 |
  | Pistachio crumble | 3.32 |
  | Honey | 5.55 |
  | Finish | 7.55 |

- Every chapter gets an equal slice of the scroll track. Inside a slice the clip
  eases between that chapter's timestamp and the next, so titles stay with the
  action. The rail at the bottom jumps to any chapter.
- Frames start loading after the webfonts settle, six at a time with retries,
  so they never flood the connection or compete with the type on a cold load.
- With `prefers-reduced-motion` the eased scrub is disabled and the film follows
  scroll directly. Without JavaScript the source video is shown instead.

## Run

```bash
python3 -m http.server 3000
```

Then open `http://localhost:3000`.

No build step and no runtime dependencies. Keep the HTML, CSS, JS, `frames/`
and `assets/` together.

## Structure

```
index.html          homepage
our-story.html      story page
styles.css          design system, sections, film and responsive layout
app.js              menu, reveals, frame preload and canvas scrubber
frames/             192 scrubbing frames
assets/             photos, wordmark, fonts
poster.webp         first-frame fallback
Dispenser_...mp4    original source clip
miyo-film-recolored.mp4  recolored clip / noscript fallback
```

## Editing

- Colours and type tokens live at the top of `styles.css` in `:root`.
- Chapter copy, tags and `data-at` times live in `index.html`; keep the times in
  ascending order and update the rail labels and `aria-label`s to match.
- The film's scroll length is `.film__stage` (`100svh + 560vh`). The sticky
  frame and chapter column are in `.film__sticky`. The film sits before the
  hero in `index.html` so it is the first section on the page.
- The menu links, flavours, reviews, journal and visit details are plain markup
  in `index.html`.

## Credits

Design from the MIYO Figma file. Photography: Super Social / Yogi Times.
Typefaces: Anton, Instrument Serif and DM Sans, self-hosted (SIL Open Font
License).
