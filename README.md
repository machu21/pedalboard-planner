# Budol — Pedalboard Planner

Plan a guitar pedalboard to scale. Pick from 268 real pedalboards (or enter a custom size), drop in any of ~8,900 pedals, and see instantly what fits and roughly what it costs in pesos.

Pedal and board data/images come from the [PedalPlayground](https://github.com/PedalPlayground/PedalPlayground.github.io) catalog.

## Features

- **Board picker** with search, size filters, thumbnails and custom dimensions
- **Pedal library** – fast virtualised search across brands and models, with thumbnails and sizes
- **Drag from the library** onto the board, or click to auto-place in the next free spot (right-to-left, like a signal chain)
- **Fit checking** – overlapping pedals and pedals too big for the board are highlighted, plus a "space used" meter
- **Selection toolbar** – rotate, duplicate, bring to front, remove
- **Undo / redo** for every edit, with "Undo" on destructive toasts
- **Zoom** (buttons, `+`/`-`, Ctrl/⌘ + scroll) with fit-to-screen
- **Rig panel** – per-pedal market price, total estimate and Lazada search links
- Inches / centimetres, light / dark theme, keyboard shortcuts (press `?`), responsive layout for phones and tablets
- Your board is saved in the browser automatically

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Prices (optional)

Price estimates use the median of used listings on Reverb, converted to PHP. Set a Reverb API token to enable them:

```bash
# .env.local
REVERB_API=your-reverb-personal-access-token
```

Without a token the planner works normally; prices just show as unavailable.

## Project layout

| Path | What it is |
| --- | --- |
| `app/page.tsx` | Loads and normalises the catalog on the server (cached for a day) |
| `app/actions/getPrice.ts` | Server action for Reverb price lookup |
| `components/planner/` | The planner UI: header, library, workspace, rig panel, dialogs |
| `store/usePedalStore.ts` | Zustand store (persisted) with undo/redo; sizes and positions are in inches |
| `lib/catalog.ts` | Image URLs, formatting, fit/overlap geometry, auto-placement |
