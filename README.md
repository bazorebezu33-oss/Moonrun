# MOONRUN

A 2D sci-fi lunar auto-runner built with React, TypeScript, and Canvas 2D.

## Overview

You play as an astronaut stranded on the lunar surface racing to reach an escape spacecraft at the end of a 1,000-meter course. Cosmic tentacles pursue you from behind. Oxygen serves as a dual-purpose resource: it is consumed continuously for breathing and drained rapidly when using the thruster boost.

## Running Locally

**No API keys or backend services required.** The entire simulation, procedural Web Audio synthesizer, and Canvas 2D rendering run strictly client-side in the browser. You do **not** need a `GEMINI_API_KEY` or external services to install and play.

### Prerequisites

- Node.js 20+ (Node 22 recommended)
- npm 10+

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. To launch directly into the active gameplay run (bypassing the title screen), open:

```
http://localhost:3000/?autostart=1
```

### Production Build

```bash
npm run build
npm run preview
```

### Running Tests

Unit tests run with Node's native test runner without any external test framework:

```bash
node --test src/game/rules.test.ts
```

## Controls

- **Space** or **Arrow Up**: Jump (low lunar gravity with variable jump cut)
- **Hold Shift**: Thruster Speed Boost (consumes oxygen rapidly)
- **P** or **Escape**: Pause / Resume
- **R**: Restart run
- **M**: Toggle Sound (mute/unmute)
- **Touch**: Large dedicated on-screen **JUMP** and **BOOST** buttons for mobile devices
