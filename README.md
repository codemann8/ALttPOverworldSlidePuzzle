# Slide Puzzle Game

A browser-based slide puzzle game featuring an 8×8 grid with mixed-size pieces and dual-gap mechanics.

## Features

- **Mixed Piece Sizes**: 30 small (1×1) pieces and 8 large (2×2) pieces
- **Dual-Gap System**: Two movable gaps that pieces slide into
- **Two Game Modes**:
  - **Free Play**: Casual play with shuffle and reset options
  - **Challenge Mode**: Solve seeded puzzles with move tracking and shareable URLs

## Controls

### Keyboard
- **Spacebar**: Toggle between gaps
- **Arrow Keys** or **WASD**: Move pieces into selected gap

### Mouse
- **Click on Piece**: Move it into an adjacent gap (uses selected gap if both adjacent)
- **Swipe on Piece**: Drag in a direction to move piece that way (also works with gaps)
- **Drag on Piece**: Hold and drag over adjacent gaps to move continuously (works similarly with gaps)
- **Click on Gap**: Select that gap

### Buttons
- **Reset**: Return to solved state (Free Play) or restart challenge
- **Shuffle**: Randomize the puzzle (Free Play only)
- **New Challenge**: Start a seeded puzzle with move tracking
- **Give Up**: Return to Free Play mode (Challenge Mode only)

## Challenge Mode

Create deterministic puzzles that can be shared via URL:
```
puzzle.html?seed=12345&steps=250
```

- Enter a numeric seed (or leave empty for random)
- Specify shuffle steps (default: 250)
- Track your moves and compete for best solutions
- Share challenges via URL

## Technical Details

For comprehensive technical documentation, game mechanics, and development guidelines, see [`.kilocode/rules/general.md`](.kilocode/rules/general.md).

## Quick Start

1. Open [`puzzle.html`](puzzle.html) in a modern web browser
2. Use keyboard or mouse to slide pieces
3. Try the shuffle button or start a challenge!

## Requirements

- Modern web browser with ES6+ support
- No installation or build process required