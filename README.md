# TeachBoard — Visual Lesson Planner

TeachBoard is a **Next.js** app for building seamless, connected lessons on an infinite canvas. Create lesson cards (text, image, YouTube), connect them with visual links, and track student participation with a lightweight class leaderboard.

## Features

- **Infinite canvas**: pan/zoom, minimap, grid background
- **Lesson cards**:
  - Text notes
  - Images (paste, drag & drop, or upload; large images are downscaled before saving)
  - YouTube embeds (paste a link or video id)
  - Optional schedule fields (date, time, duration)
  - Resizable cards and color themes
- **Connectors**: drag from card handles to create animated arrows between cards
- **Student leaderboard**: add/rename/remove students and bump “summary” counts
- **Local persistence**: saves automatically in the browser
- **Import/Export**: download/upload a board as JSON

## Tech stack

- **Next.js** (App Router)
- **React**
- **TypeScript**
- **Tailwind CSS**
- **@xyflow/react** (React Flow) for the canvas/graph
- **Radix UI**-based components

## Getting started

### Prerequisites

- **Node.js** (recommended: current LTS)
- npm (or your preferred package manager)

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Scripts

- **dev**: `npm run dev` — start the dev server
- **build**: `npm run build` — production build
- **start**: `npm run start` — run the production server
- **lint**: `npm run lint` — run ESLint

## How to use

- **Add a card**: use the top toolbar → **Add** → Text / Image / YouTube
- **Edit a card**: hover a card header → click the pencil icon
- **Connect cards**: drag from the small circle handles on a card to another card
- **Resize a card**: select a card, then drag its resize handles
- **Students**: use the right panel to manage the roster and increment/decrement summary counts
- **Export/Import**: toolbar → Export downloads JSON; Import loads a saved JSON file

## Data & storage

- Boards are stored in **browser localStorage** under the key `teachboard:v3`.
- Data is saved automatically whenever the board changes.
- Exported files are plain JSON snapshots of the board (nodes, edges, students, name).

## Notes

- `next.config.mjs` is configured to **ignore TypeScript build errors**. If you want stricter builds, remove that setting.
- Next image optimization is disabled (`images.unoptimized = true`), which is friendly for static exports and simple hosting.

## Project structure (high level)

- `app/` — Next.js App Router entrypoints
- `components/teach-board.tsx` — main canvas + persistence + import/export
- `components/nodes/lesson-node.tsx` — lesson card UI + editing + image paste/upload
- `components/students-panel.tsx` — class leaderboard
- `lib/storage.ts` — localStorage + import/export helpers
- `lib/types.ts` — shared types

## License

No license file detected. Add a `LICENSE` if you plan to distribute this project.

