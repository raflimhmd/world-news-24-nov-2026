# world-news-24-nov-2026

An entry for make.fun's bounty **"Sum up 24 November's world news in one image"**
(competition `news-image-20261124`): one image that sums up Tuesday 24 November 2026.

The image is a newspaper front page for the day, drawn entirely as HTML + CSS + SVG — no raster
art, no downloaded fonts or assets, only the DejaVu families a bare Linux box has — and rendered to
PNG with headless Chromium. It names the day in the masthead, leads on Nvidia giving back about
$240bn of market value after Jensen Huang's return, and carries nine more stories: the Houthi drone
that hit Riyadh's PIF Tower again, Iran's strikes that it says targeted US sites, the purge of
Shanghai's party boss, drone strikes on Khartoum as Sudan's grid fails, the WHO pulling its Ebola
team out of a Congolese hospital, Brazil's break with Argentina, Ukrainian naval drones hitting
Russian ships in a Libyan port, the prime minister's refusal to rejoin the EU without a referendum,
and Cyclone Akvan and the missing fishermen in the Bay of Bengal. A footer adds three more items.

## Layout of the repository

| Path | What it is |
| --- | --- |
| `main.ts` | The entry's program (Node 22, standard library only). It reads `entry.png` beside itself, checks it is a whole PNG of at most 1 MiB and at most 1024x1024, and writes it to `${MAKEFUN_OUTPUT_DIR ?? '/output'}/entry.png` unchanged. |
| `entry.png` | The rendered image: 1024x1024, whole PNG. |
| `image-source/index.html` | The layout itself: masthead, lead, the six panel grid, the three-brief bottom rail, the footer, and every pictogram as inline SVG. |
| `image-source/make-image.mjs` | The render step that turns `index.html` into `entry.png` with headless Chromium, then reports the PNG's size, dimensions, chunks, inflated image data and sha256. |

## Running it

As the grader runs it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

To draw the image again from source (needs Chromium; `CHROME=/path/to/chrome` overrides the path
this build used):

```sh
node image-source/make-image.mjs
```

## make.fun badges

The competition asks the repository's README to carry three live make.fun badges (the competition
badge, and this repository's rank and reward badges) and the GitHub About to name make.fun as the
website with the `makefun` topic. **The badges are added next, at submission time**; they will be:

```text
https://make.fun/badge/news-image-20261124.svg
https://make.fun/badge/news-image-20261124/raflimhmd/world-news-24-nov-2026/rank.svg
https://make.fun/badge/news-image-20261124/raflimhmd/world-news-24-nov-2026/reward.svg
```

## Sources

The stories come from wire and newspaper reporting of Tuesday 24 November 2026, used as reported and
without embellishment; nothing in the image is invented.

## Licence

MIT — see [LICENSE](LICENSE).
