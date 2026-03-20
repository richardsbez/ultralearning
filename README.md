# UltraLearn

> A desktop study tracker built on the 9 principles of Scott Young's *Ultralearning* book.

![Electron](https://img.shields.io/badge/Electron-28-47848F?style=flat&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-a3e635?style=flat)

---

## What is UltraLearn?

UltraLearn is a desktop application that helps you deliberately track your learning across the 9 principles of ultralearning — **Metalearning, Focus, Direct Practice, Drilling, Retrieval, Feedback, Retention, Intuition, and Experimentation**. Each subject you study gets its own space with checklists, progress bars, a visual roadmap canvas, a resource library, and free notes.

Everything is saved as plain Markdown files (`.ul.md`) in a folder of your choice — readable in any text editor or Obsidian.

---

## Features

### 📋 9-Principle Tracker

- Each of the 9 ultralearning principles has an editable checklist with 7 items
- Add, edit, and remove checklist items per principle
- Progress bars per principle and overall score
- "Reviewed today" button with staleness alerts after 7+ days without review

### 🗺️ Visual Roadmap Canvas

Full-featured interactive canvas inspired by Obsidian Canvas:

- **5 node types:** default steps, checklists, text notes (post-its), images, and groups/frames
- Pan, zoom (scroll), multi-select (Shift+drag), box select
- Smart 4-directional Bezier arrows with click-to-delete
- Connect mode for drawing relationships between nodes
- Undo/Redo (60 states), Copy/Paste, Duplicate
- Snap to grid, minimap, fit-view
- Context menu with 7-color palette
- Drag & drop images directly onto the canvas

### 📚 Resource Library

Card-based library with multi-attachment support per resource:

- **9 resource types:** Book, Course, Video, Article, Link, PDF, Image, Audio, Other
- Attach **multiple files per resource** — mix 2 PDFs + 3 images + 2 audio files in a single card
- Images open fullscreen in-app
- PDFs open with the system's default PDF reader
- Audio plays with an in-app player
- Filter by type, status badges (queued / in use / done)

### 📝 Free Notes

Per-subject textarea for general notes, links, and insights.

### 🌍 4 Languages

Full UI translation including all 9 principle names, checklist items, and all roadmap strings:

- 🇧🇷 Portuguese
- 🇺🇸 English
- 🇪🇸 Spanish
- 🇨🇳 Chinese

Switch language from the topbar — only the selected language is loaded at startup (lazy loading). The app reloads and applies the new language without losing any data.

### 💾 Auto-save & Data Safety

- Debounced auto-save (300ms after any change)
- Synchronous flush before window close or language reload — no data loss
- Files saved as standard YAML front-matter Markdown, compatible with Obsidian

### 🎬 Boot Screen

Animated terminal-style loading sequence showing all 9 principles initializing on startup.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 28 |
| UI framework | React 18 + TypeScript |
| Bundler | electron-vite |
| Serialization | js-yaml (Obsidian-compatible Markdown) |
| Styling | Plain CSS with CSS variables |
| Canvas | Custom SVG + HTML (no canvas library) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone the repo
git clone https://github.com/your-username/ultralearn.git
cd ultralearn

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Build for Production

```bash
npm run build
```

The packaged app will be in the `dist/` folder.

---

## File Format

Each subject is saved as a `.ul.md` file in the folder you choose. The format is standard YAML front-matter Markdown — fully readable in any editor and compatible with Obsidian:

```markdown
---
title: Calculus
motivation: intrinsic
why: Understand the math behind machine learning
targetHours: 100
hoursSpent: 12
principles:
  meta:
    checklist:
      - id: '1'
        text: Defined why I'm learning this
        checked: true
    notes: ''
    lastReviewed: '2025-03-15'
    roadmap: []
  focus:
    ...
resources: []
---

Free notes go here as regular Markdown body text.
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘Z` / `⌘⇧Z` | Undo / Redo (roadmap canvas) |
| `⌘C` / `⌘V` | Copy / Paste nodes |
| `⌘D` | Duplicate selected nodes |
| `⌘A` | Select all nodes |
| `⌘F` | Fit all nodes in view |
| `Del` / `Backspace` | Delete selected nodes |
| `Esc` | Deselect / exit connect mode |
| `Enter` (checklist item) | Add new item below |
| `Backspace` (empty item) | Remove item |

---

## Project Structure

```
ultralearn/
├── src/
│   ├── main/               # Electron main process (IPC, file system)
│   ├── preload/            # Context bridge (window.api)
│   └── renderer/
│       └── src/
│           ├── components/
│           │   ├── Roadmap.tsx        # Canvas editor
│           │   ├── ResourceList.tsx   # Resource library with attachments
│           │   ├── SubjectDetail.tsx  # 3-panel layout
│           │   ├── Dashboard.tsx      # Overview with KPIs
│           │   └── LangContext.tsx    # i18n context + lazy loading
│           ├── i18n/
│           │   ├── pt.ts             # Portuguese
│           │   ├── en.ts             # English
│           │   ├── es.ts             # Spanish
│           │   └── zh.ts             # Chinese
│           ├── utils/
│           │   ├── markdown.ts       # YAML parse/serialize
│           │   └── defaults.ts       # Principle defaults
│           ├── types.ts
│           └── App.tsx
```

---

## The 9 Ultralearning Principles

This app is built around the framework from **Ultralearning** by Scott H. Young (2019):

| # | Principle | Core Idea |
|---|---|---|
| 1 | **Metalearning** | Research how to learn the subject before diving in |
| 2 | **Focus** | Fight procrastination and maintain quality concentration |
| 3 | **Direct Practice** | Practice in the real context where you'll use the skill |
| 4 | **Drilling** | Isolate and attack weak sub-skills directly |
| 5 | **Retrieval** | Test yourself actively instead of passively reviewing |
| 6 | **Feedback** | Seek honest, frequent feedback on your performance |
| 7 | **Retention** | Ensure what you learn stays long-term |
| 8 | **Intuition** | Understand deeply from first principles, don't just memorize |
| 9 | **Experimentation** | Explore different methods and develop your own style |

---

## Roadmap

- [ ] Pomodoro timer with automatic hours tracking
- [ ] Progress graphs over time (weekly score snapshots)
- [ ] Radar chart of all 9 principles at once
- [ ] GitHub-style activity heatmap
- [ ] Spaced repetition reminders per principle (1d → 3d → 7d → 14d → 30d)
- [ ] Export subject as PDF report
- [ ] Feynman Technique field in Principle 8 (Intuition)
- [ ] Global search palette (⌘K)

---

## License

MIT © 2025
