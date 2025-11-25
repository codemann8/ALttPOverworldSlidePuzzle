# Slide Puzzle Game - AI Instructions

## Project Overview
This is a browser-based slide puzzle game with a unique 8×8 grid with mixed-size pieces and dual-gap mechanics. The project is split into three files: HTML for structure, CSS for styling, and JavaScript for game logic.

## Game Mechanics

### Board Configuration
- **Grid Size**: 8×8 (64 cells total)
- **Pieces**: 
  - 30 small pieces (1×1 unit size)
  - 8 large pieces (2×2 unit size, equivalent to 4 small pieces)
- **Gaps**: 2 movable gaps that pieces slide into
- **Image**: Uses `lightworld.png` as the puzzle image, cropped across pieces

### Default (Solved) State
Large piece top-left corners at coordinates (x,y) from top-left (0,0):
- (0,0), (3,0), (5,0)
- (0,3), (3,3), (6,3)
- (0,6), (5,6)

Default gap positions: (7,6) and (7,7)

These are defined in the [`bigHomes`](puzzle.js) and [`defaultGaps`](puzzle.js) constants.

### Controls

#### Keyboard Controls
- **Spacebar**: Toggle between the two gaps (switches `selectedGapIdx`)
- **Arrow Keys** (↑↓←→): Slide adjacent piece into selected gap
- **WASD**: Alternative arrow key controls

#### Mouse Controls
- **Left Click on Piece**: Move the piece into an adjacent gap
  - If both gaps are adjacent to the piece, uses the currently selected gap
  - If only one gap is adjacent, automatically uses that gap
- **Swipe on Piece**: Drag ≥5 pixels in a direction (up/down/left/right) to move piece that way
  - Swipe threshold: 5 pixels minimum movement
  - Direction determined by dominant axis (horizontal vs vertical)
  - Only moves if a gap exists in the swipe direction
  - Shows 15px visual preview offset during valid swipe
  - Preview animates smoothly (150ms transition)
  - Works even if mouse leaves board area during swipe
  - For large pieces, checks all 4 cells for gap adjacency
- **Drag on Piece**: Click and hold on a piece, then drag over adjacent gaps to move continuously
  - Piece moves when mouse enters the valid drag region of an adjacent gap
  - Valid region: 75% of gap area (excludes the edge closest to the piece)
  - Gap divided into 4×4 grid: accepts 12 out of 16 squares (3×4 rectangle)
  - Allows multiple moves in a single drag operation
  - Disables swipe controls for the duration of the drag
  - Works with both small (1×1) and large (2×2) pieces
  - Updates piece position after each move to enable continued dragging
- **Swipe on Gap**: Drag ≥5 pixels in a direction to swap with the other gap if adjacent
  - Same swipe mechanics as pieces (5px threshold, preview, etc.)
  - Only swaps if the other gap is adjacent in the swipe direction
- **Drag on Gap**: Click and hold on a gap, then drag over the other gap to swap
  - Swaps when mouse enters the other gap's area
  - Allows continuous swapping during a single drag operation
- **Left Click on Gap**:
  - First click on an unselected gap: Selects the gap (updates selection highlighting)
  - Click on an already-selected gap: Checks if the other gap is adjacent
    - If adjacent, swaps the two gaps
    - If not adjacent, gap remains selected

#### Button Controls
- **Reset Button**: Return to solved state (Free Play) or recreate challenge (Challenge Mode)
- **Shuffle Button**: Randomize board with 250 valid moves (Free Play only)
- **New Challenge Button**: Start a new challenge with custom or random seed
- **Give Up Button**: Return to Free Play mode (Challenge Mode only)
- **Help Button** (?): Opens controls reference dialog

### Movement Rules
1. **Small Pieces (1×1)**: Can move into any adjacent gap
2. **Large Pieces (2×2)**: Require BOTH gaps to be properly aligned on the destination face
3. **Gap Swapping**: Adjacent gaps can swap positions using arrow keys
4. **Selection**: Only the selected gap (highlighted with blue outline) accepts moves
5. **Challenge Completion**: When puzzle is solved in Challenge Mode, all moves are locked and gaps lose highlighting until reset or mode switch

## Code Architecture

### File Structure
```
puzzle.html          # Main HTML structure and page layout
puzzle.css           # All styling (tiles, gaps, animations)
puzzle.js            # Game logic and event handling
lightworld.png       # Puzzle image (8×8 tile grid)
.clinerules          # This AI instructions file
```

### UI Layout

#### Toolbar Structure
The toolbar uses flexbox layout with two groups:
- **`.toolbar`**: Main container with `justify-content: space-between` and `max-width` set to puzzle width (8 tiles)
- **`.toolbar-left`**: Left-aligned button group containing:
  - Reset button
  - Shuffle button (hidden in Challenge Mode)
  - New Challenge button
  - Give Up button (shown only in Challenge Mode)
- **`.toolbar-right`**: Right-aligned button group containing:
  - Help button (?) - Opens controls reference dialog
  - Theme toggle button (💡) - Toggles dark mode theme
  
This structure ensures the right buttons stay aligned with the puzzle width rather than extending to the window edge.

### Game Modes

The game has two distinct modes:

#### Free Play Mode (Default)
- **Purpose**: Casual play with no tracking or restrictions
- **Features**:
  - Shuffle button available to randomize the puzzle
  - Reset button returns puzzle to solved state
  - No move counting or time tracking
  - Gap selection highlighting always visible
- **UI Elements**: Reset, Shuffle, New Challenge buttons visible

#### Challenge Mode
- **Purpose**: Solve a specific puzzle configuration with move tracking and timing
- **Activation**:
  - Click "New Challenge" button and provide:
    - **Seed**: Numeric value (leave empty for random, range: 0 to 2^32-1)
    - **Steps**: Number of shuffle moves (default 250)
  - Or load via URL parameters: `puzzle.html?seed=12345&steps=250`
- **Features**:
  - Deterministic puzzle generation using seeded RNG
  - Move counter tracks player moves (starts at 0)
  - Timer tracks elapsed time (starts after shuffle completes)
  - Pause/Resume button (⏸/▶) to pause timer and prevent moves
  - Shuffle button hidden (puzzle is fixed)
  - Reset button recreates the same challenge
  - Challenge info box displays seed, steps, move count, and timer
  - Give Up button switches back to Free Play mode
  - **No shuffle animations**: Shuffle executes instantly without visible transitions
  - **URL synchronization**: Browser URL automatically updates to reflect current mode
- **Challenge Info Layout**:
  - Displays seed and shuffling steps as compact text rows
  - Move Count and Timer displayed side-by-side below
  - Each stat has a small label (0.875rem) above large value (1.425rem)
  - Timer includes pause/resume button (⏸/▶) next to time display
  - Challenge box has min-width of 220px to accommodate "M:SS" time without layout shifts
- **Timer Behavior**:
  - Automatically starts when shuffle completes
  - Can be paused/resumed using the pause button (⏸/▶)
  - Pause button has fixed 28x28px size for consistent appearance
  - When paused, all moves and gap switching are disabled
  - When paused, puzzle board applies blur effect (`filter: blur(8px)`)
  - Blur is isolated to board only using `isolation: isolate` to prevent bleeding onto neighbors
  - When resumed, focus returns to the board automatically for immediate keyboard control
  - Stops automatically when puzzle is solved (without blur effect)
  - Timer button is disabled when puzzle is solved (no pause/resume after completion)
  - Displays in M:SS format (e.g., 2:34 for times under 1 hour, 62:15 for 1 hour 2 minutes)
- **Win Condition**:
  - When puzzle is solved, congratulations dialog appears, showing moves and time
  - All moves and gap switching are locked
  - Timer is frozen
  - Gap selection highlighting is removed
  - "Give Up" button changes to "Free Play"
  - Player can reset challenge or return to Free Play
- **UI Elements**: Reset Challenge, Give Up, New Challenge buttons visible
- **Info Display**: Shows "Challenge", seed number, shuffle steps, move count, and timer with pause button

### Key Data Structures

#### State Variables
```javascript
grid                 // 2D array: null for gaps, objects for pieces
smallTiles[]         // Array of {id, x, y, homeX, homeY, el}
bigTiles[]           // Array of {id, x, y, homeX, homeY, el}
tileById             // Map for quick tile lookup by ID
gaps[]               // [{id, x, y, homeX, homeY}] - 2 gap objects
selectedGapIdx       // 0 or 1, indicates which gap is selected
gameMode             // 'freeplay' or 'challenge'
challengeSeed        // Seed used for current challenge (null in Free Play)
challengeSteps       // Number of shuffle steps for challenge (null in Free Play)
challengeMoveCount   // Player's move count in Challenge Mode
isShuffling          // Flag to prevent move counting during shuffle
challengeSolved      // Flag indicating if challenge is completed
timerStartTime       // Timestamp when timer started (null when stopped)
timerElapsedTime     // Accumulated elapsed time in milliseconds
timerInterval        // Interval ID for timer updates (100ms)
timerPaused          // Boolean flag indicating if timer is paused
```

#### Grid Cell Format
- `null`: Empty cell (gap)
- `{type:'small', id}`: Small piece
- `{type:'big', id, ox, oy}`: Part of big piece (ox,oy = offset within 2×2)

### Core Functions

#### Initialization
- [`initTiles()`](puzzle.js): Creates tile DOM elements and data structures
  - Builds big tiles first from [`bigHomes`](puzzle.js) array
  - Creates small tiles for remaining uncovered, non-gap cells
  - Sets background-position for each tile to show correct image crop
- [`buildGridFromState()`](puzzle.js): Rebuilds grid array from current tile positions
  - Places big tiles (occupying 2×2 cells each)
  - Places small tiles (occupying 1 cell each)
  - Carves out gaps (sets cells to null)
- [`resetState()`](puzzle.js): Resets to solved state
  - Removes existing tile DOM elements
  - Calls [`initTiles()`](puzzle.js) to recreate tiles
  - Initializes gaps with identity and home positions
  - Calls [`buildGridFromState()`](puzzle.js) and [`renderAll()`](puzzle.js)

#### Rendering
- [`renderAll()`](puzzle.js): Updates all tile positions in DOM
  - Iterates through [`smallTiles`](puzzle.js) and [`bigTiles`](puzzle.js)
  - Sets CSS `left` and `top` properties based on x,y coordinates
  - Calls [`renderGaps()`](puzzle.js)
- [`renderGaps()`](puzzle.js): Updates gap positions and selection highlight
  - Positions gap DOM elements at current gap coordinates
  - Toggles `.selected` class based on [`selectedGapIdx`](puzzle.js)

#### Movement Logic
- [`tryMove(dir)`](puzzle.js): Main movement function
  - **CRITICAL**: The `dir` parameter is counterintuitive - it specifies where to look for something to move INTO the gap, NOT the direction of movement
    - `tryMove('right')` looks at `g.x - 1` (to the LEFT of the gap)
    - `tryMove('left')` looks at `g.x + 1` (to the RIGHT of the gap)
    - `tryMove('down')` looks at `g.y - 1` (ABOVE the gap)
    - `tryMove('up')` looks at `g.y + 1` (BELOW the gap)
  - **For gap swapping**: To swap with a gap that's to the RIGHT, call `tryMove('left')` (not `tryMove('right')`)
  - Calculates source cell and direction vector from selected gap
  - **Gap Swapping**: If adjacent cell is the other gap, swaps their positions
  - **Small Piece Moves**: Moves piece into gap, gap takes piece's former position
  - **Big Piece Moves**:
    - Calculates destination face cells (must be both gaps)
    - Validates both gaps are properly aligned
    - Moves piece and repositions both gaps to freed cells
    - Maintains gap alignment by row/column
  - Returns true on success, false if move is invalid
- [`enumerateValidMoves()`](puzzle.js): Returns all legal moves for current state
  - Iterates through both gaps and all four directions
  - Checks validity of each potential move
  - Tags each move with metadata: `isBig` (large piece move) and `isGapSwap` (gap swap move)
  - Used by [`shuffle()`](puzzle.js) function

#### Shuffling
- [`shuffle(steps, seed)`](puzzle.js): Performs intelligent random valid moves with weighted priorities
  - Disables buttons during shuffle
  - Calls [`enumerateValidMoves()`](puzzle.js) to get legal moves
  - **Anti-reversal logic**: Remembers last move and filters out immediate reversals unless no other options exist
  - **Weighted selection** creates varied, interesting shuffles:
    - **Big piece moves**: 3x weight (highest priority) - encourages moving large pieces
    - **Small piece moves**: 1x weight (normal priority)
    - **Gap swaps**: Very low priority (~10% chance when other moves available) - only used frequently when no alternatives
  - Randomly selects from weighted move pool
  - **Animation behavior**:
    - **Free Play Mode**: Shows smooth 80ms transitions, yields to UI every 10 moves
    - **Challenge Mode**: Disables all transitions via `.no-transitions` class, no delays, instant execution
  - Re-enables buttons when complete
  - Default 250 moves provides good randomization with meaningful piece movements

#### Challenge Management
- [`startChallenge(seed, steps)`](puzzle.js): Initializes a new challenge
  - Sets game mode to 'challenge'
  - Stores seed and steps for reset functionality
  - Resets move counter to 0
  - Calls [`stopTimer()`](puzzle.js) to clear any previous timer state
  - Updates URL with seed and steps parameters
  - Resets to solved state then shuffles with seed (no animations)
  - Starts timer after shuffle completes
- [`switchToFreePlay()`](puzzle.js): Returns to Free Play mode
  - Clears challenge data
  - Stops and resets timer
  - Removes URL parameters
  - Restores gap highlighting
  - Keeps current board state
- [`updateURL()`](puzzle.js): Synchronizes browser URL with game state
  - Adds `?seed=X&steps=Y` parameters in Challenge Mode
  - Removes parameters in Free Play mode
  - Uses `window.history.pushState()` for seamless updates
- [`checkURLParams()`](puzzle.js): Auto-starts challenge from URL on page load
  - Parses `seed` and `steps` query parameters
  - Automatically enters Challenge Mode if both parameters present
  - Enables direct linking and bookmarking of specific challenges
- [`checkWinCondition()`](puzzle.js): Verifies if puzzle is solved
  - Checks all tiles are in home positions
  - Checks gaps are in default positions
- [`handleWin()`](puzzle.js): Handles challenge completion
  - Sets `challengeSolved` flag
  - Calls [`freezeTimer()`](puzzle.js) to stop timer without blur
  - Removes gap highlighting
  - Waits for animation to complete
  - Shows congratulations dialog with move count and time
- [`updateUIForMode()`](puzzle.js): Updates UI based on current mode
  - Shows/hides appropriate buttons
  - Updates button text
  - Displays/hides challenge info

#### Timer Functions
- [`startTimer()`](puzzle.js): Starts the challenge timer
  - Resets elapsed time to 0
  - Sets start timestamp
  - Creates 100ms interval to update display
  - Sets pause button to ⏸ icon
- [`pauseTimer()`](puzzle.js): Pauses the timer and blurs board
  - Stops timer interval
  - Accumulates elapsed time
  - Sets paused flag to true
  - Adds 'paused' class to board (triggers blur effect)
  - Changes button to ▶ icon
- [`resumeTimer()`](puzzle.js): Resumes the timer from pause
  - Resets start timestamp
  - Clears paused flag
  - Removes 'paused' class from board (removes blur)
  - Returns focus to board for immediate keyboard control
  - Changes button back to ⏸ icon
- [`stopTimer()`](puzzle.js): Completely stops and resets timer
  - Clears interval
  - Resets all timer state variables
  - Removes 'paused' class
  - Resets display to "0:00"
  - Changes button back to ⏸ icon
- [`freezeTimer()`](puzzle.js): Stops timer without blur (used on win)
  - Clears interval
  - Resets timer state but keeps elapsed time in display
  - Does NOT add blur effect (unlike pauseTimer)
  - Preserves final time for congratulations dialog
- [`formatTime(ms)`](puzzle.js): Converts milliseconds to M:SS format
  - Returns string like "2:34" or "62:15" (no hour formatting)
  - Pads seconds with leading zero
- [`updateTimer()`](puzzle.js): Updates timer display
  - Calculates elapsed time since start + accumulated time
  - Calls formatTime and updates display element

#### Mouse Control Utilities
The mouse control system uses shared utility functions to eliminate code duplication between swipe and drag controls:

- [`getCellsForTile(tile, clickedCell, gridX, gridY)`](puzzle.js): Returns array of cells to check for a tile
  - Small pieces (1×1): Returns single cell `[{x, y}]`
  - Big pieces (2×2): Returns all 4 cells of the piece
  - Used by all control methods for consistent cell enumeration

- [`findAdjacentGaps(cells, gaps)`](puzzle.js): Determines which gaps are adjacent to given cells
  - Returns `{gap0: {adjacent, dx, dy}, gap1: {adjacent, dx, dy}}`
  - Checks all cells against both gaps
  - Stores direction vectors for later use
  - Eliminates duplicate adjacency checking logic

- [`vectorToDirection(dx, dy, invert)`](puzzle.js): Converts direction vector to tryMove() direction string
  - Normal mode: `dx=1, dy=0` → `'right'` (for piece drag)
  - Inverted mode: `dx=1, dy=0` → `'left'` (for gap drag)
  - Handles the counterintuitive tryMove() direction semantics
  - Used by all control methods for consistent direction calculation

- [`isInValidDragRegion(mouseX, mouseY, sourceDx, sourceDy)`](puzzle.js): Checks if mouse is in valid 75% drag region
  - Excludes the 1/4 edge closest to the source
  - Works for both piece→gap and gap→piece scenarios
  - Uses quarter-tile calculations for precise region detection

- [`detectSwipeDirection(startPos, currentPos, threshold)`](puzzle.js): Detects swipe direction from mouse movement
  - Returns direction string or `null` if below threshold
  - Uses dominant axis to determine direction
  - Consistent swipe detection across all handlers

- [`isGapInSwipeDirection(cells, gap, swipeDir)`](puzzle.js): Checks if gap is in swipe direction relative to cells
  - Iterates through cells checking gap position
  - Returns boolean for quick validation
  - Simplifies swipe validation logic

#### Event Handling
- **Keyboard Events**: Attached to [`boardEl`](puzzle.js)
  - Spacebar: Toggles [`selectedGapIdx`](puzzle.js) and calls [`renderGaps()`](puzzle.js) (blocked when challenge solved)
  - Arrow keys/WASD: Calls [`tryMove()`](puzzle.js) with appropriate direction (blocked when challenge solved)

- **Mouse Events**: Use shared utility functions for consistent behavior
  - **Mousedown** (on [`boardEl`](puzzle.js)): Records initial position, time, and grid cell
  - **Mousemove** (on [`boardEl`](puzzle.js)): Handles drag and swipe preview
    - **Gap Drag Control**: Uses [`getCellsForTile()`](puzzle.js), [`isInValidDragRegion()`](puzzle.js), and [`vectorToDirection()`](puzzle.js) with invert=true
    - **Piece Drag Control**: Uses [`getCellsForTile()`](puzzle.js), [`isInValidDragRegion()`](puzzle.js), and [`vectorToDirection()`](puzzle.js) with invert=false
    - **Swipe Preview**: Uses [`detectSwipeDirection()`](puzzle.js), [`getCellsForTile()`](puzzle.js), and [`isGapInSwipeDirection()`](puzzle.js)
    - Applies 5px threshold for swipe detection
    - Shows 15px visual preview offset during valid swipe
    - Clears preview if swipe becomes invalid or drops below threshold
  - **Mouseup** (on `document`): Completes click or swipe action
    - Uses [`detectSwipeDirection()`](puzzle.js) for swipe detection
    - Uses [`getCellsForTile()`](puzzle.js) for cell enumeration
    - Uses [`findAdjacentGaps()`](puzzle.js) for adjacency checking
    - Uses [`isGapInSwipeDirection()`](puzzle.js) for swipe validation
    - Uses [`vectorToDirection()`](puzzle.js) for direction calculation
    - Clears swipe preview transform
    - If swipe detected (≥5px), moves piece in swipe direction if gap exists
    - If no swipe, uses click behavior (selected gap or only adjacent gap)
  - **Clicking on gap**:
    - First click on unselected gap: Selects the gap (updates [`selectedGapIdx`](puzzle.js))
    - Click on already-selected gap: Checks if the other gap is adjacent
      - If adjacent, swaps the two gaps using [`tryMove()`](puzzle.js)
      - If not adjacent, gap remains selected
    - All gap interactions blocked when challenge is solved

- **Button Events**:
  - Reset button: Calls [`resetState()`](puzzle.js) in Free Play or [`startChallenge()`](puzzle.js) in Challenge Mode
  - Shuffle button: Calls [`shuffle(250)`](puzzle.js) (Free Play only)
  - New Challenge button: Opens challenge dialog
  - Give Up button: Calls [`switchToFreePlay()`](puzzle.js) (Challenge Mode only)

### CSS Variables & Styling
Defined in [`puzzle.css`](puzzle.css):
- `--tile`: 64px (base tile size)
- `.tile.small`: 1×1 tile (64px)
- `.tile.big`: 2×2 tile (128px)
- `.gap.selected`: Blue outline (rgb(100,200,255))
- Transitions:
  - Position: 80ms ease for smooth sliding animation
  - Transform: 150ms ease for swipe preview animation
- `will-change`: left, top, transform (for GPU acceleration)
- `.no-transitions`: Disables all tile and gap transitions (used during Challenge Mode shuffle)

### Background Image Positioning
Each piece shows its "home" portion of the image:
```javascript
backgroundPosition: `-${homeX*tilePx}px -${homeY*tilePx}px`
```
Gaps show darkened version (brightness 0.5) of their default positions, maintaining their identity even when moved.

## Development Guidelines

### When Modifying Mouse Controls
1. Use the shared utility functions to maintain consistency:
   - [`getCellsForTile()`](puzzle.js) for cell enumeration
   - [`findAdjacentGaps()`](puzzle.js) for adjacency checking
   - [`vectorToDirection()`](puzzle.js) for direction conversion
   - [`isInValidDragRegion()`](puzzle.js) for drag region validation
   - [`detectSwipeDirection()`](puzzle.js) for swipe detection
   - [`isGapInSwipeDirection()`](puzzle.js) for swipe validation
2. When adding new control methods, reuse these utilities to avoid code duplication
3. Test all control methods (click, swipe, drag) after making changes
4. Remember that [`vectorToDirection()`](puzzle.js) has an `invert` parameter for gap drag control

### When Modifying Movement Logic
1. Always update both the tile/gap positions AND rebuild the grid
2. Call [`buildGridFromState()`](puzzle.js) after position changes
3. Update DOM with [`renderAll()`](puzzle.js) or specific render functions
4. Test with both small and large pieces
5. Ensure gap identity is preserved (gaps remember their home crop)
6. **IMPORTANT**: Remember that [`tryMove(dir)`](puzzle.js) direction is inverted - it looks in the OPPOSITE direction of where you want to move something. The [`vectorToDirection()`](puzzle.js) utility handles this automatically.

### When Adding Features
- Keep the three-file structure (HTML/CSS/JS separation)
- Maintain the 80ms transition timing for consistency in [`puzzle.css`](puzzle.css)
- Preserve the gap identity system (gaps remember their home crop)
- Ensure keyboard focus on board element for controls to work
- Follow the existing pattern of disabling buttons during operations

### When Debugging
- Check [`grid`](puzzle.js) array state (should match visual board)
- Verify [`selectedGapIdx`](puzzle.js) matches visual selection
- Ensure large pieces maintain 2×2 coverage in grid
- Validate gap positions are always null in grid
- Check that [`tileById`](puzzle.js) Map is properly populated

### Image Requirements
- Image must be square and divisible by 8
- Default: 512×512px (64px per tile)
- Format: PNG with transparency support
- Filename: `lightworld.png` (referenced in [`puzzle.css`](puzzle.css) for `.tile` and `.gap` classes)

## Common Modifications

### Change Board Size
1. Update [`SIZE`](puzzle.js) constant
2. Adjust [`bigHomes`](puzzle.js) and [`defaultGaps`](puzzle.js) arrays
3. Update CSS `--tile` variable in [`puzzle.css`](puzzle.css) if needed
4. Provide appropriately sized image

### Change Tile Size
1. Modify CSS variable in [`puzzle.css`](puzzle.css): `--tile: 64px;`
2. Image dimensions should be `SIZE * tile_size`
3. No JavaScript changes needed (uses computed style in [`puzzle.js`](puzzle.js))

### Seeded Random Number Generator
The game includes a [`SeededRandom`](puzzle.js) class for deterministic puzzle generation:
- **Accepts numeric seeds only** (0 to 2^32-1 for optimal LCG performance)
- Uses Linear Congruential Generator (LCG) algorithm with parameters from Numerical Recipes
- Ensures identical puzzles across all browsers and operating systems
- Used by [`shuffle()`](puzzle.js) when seed is provided
- Random seed generation uses full 32-bit range: `Math.floor(Math.random() * 4294967296)`

### Move Counting System
In Challenge Mode, moves are tracked:
- `challengeMoveCount` increments on every successful move
- Counter does NOT increment during shuffle (controlled by `isShuffling` flag)
- Counter resets to 0 when starting or resetting a challenge
- Displayed in challenge info box during gameplay
- Shown in congratulations dialog when puzzle is solved

### Win Detection System
Challenge Mode includes automatic win detection:
- [`checkWinCondition()`](puzzle.js) called after each move
- Verifies all tiles are in home positions
- Verifies gaps are in default positions
- When solved:
  - [`handleWin()`](puzzle.js) is called
  - All moves are blocked
  - Gap highlighting is removed
  - Congratulations dialog appears after animation
  - "Give Up" button changes to "Free Play"

### Add Undo Functionality
1. Maintain move history stack in [`puzzle.js`](puzzle.js)
2. Store state snapshots (tile positions, gap positions, selectedGapIdx)
3. Implement reverse move logic in [`puzzle.js`](puzzle.js)
4. Add undo button in [`puzzle.html`](puzzle.html) that pops from history and restores state

## Testing Checklist

### Free Play Mode
- [ ] Small pieces move in all 4 directions
- [ ] Large pieces move only with both gaps aligned
- [ ] Gap selection toggles with spacebar
- [ ] Adjacent gaps can swap positions
- [ ] Reset button returns to solved state
- [ ] Shuffle creates solvable configuration
- [ ] Image crops display correctly on all pieces
- [ ] Transitions are smooth (80ms)
- [ ] Keyboard focus works after page load
- [ ] WASD keys work as alternative controls

### Challenge Mode
- [ ] New Challenge dialog opens and accepts numeric seed/steps
- [ ] Random seed generates when field is empty (0 to 2^32-1)
- [ ] Same seed produces identical puzzle
- [ ] Shuffle executes instantly without visible animations
- [ ] URL updates with seed and steps parameters
- [ ] Direct URL access auto-starts challenge (e.g., `?seed=12345&steps=250`)
- [ ] Move counter starts at 0 and increments correctly
- [ ] Move counter doesn't increment during shuffle
- [ ] Shuffle button is hidden
- [ ] Give Up button is visible
- [ ] Challenge info displays seed, steps, and moves
- [ ] Reset Challenge recreates same puzzle
- [ ] Win detection triggers when puzzle is solved
- [ ] Congratulations dialog shows after animation
- [ ] All moves are blocked when solved
- [ ] Gap highlighting is removed when solved
- [ ] "Give Up" changes to "Free Play" when solved
- [ ] Switching to Free Play preserves board state and removes URL parameters
- [ ] Gap highlighting restores when switching to Free Play

## Performance Notes
- [`shuffle()`](puzzle.js) behavior varies by mode:
  - **Free Play**: Uses `await` every 10 moves to prevent UI freezing, shows animations
  - **Challenge Mode**: Runs at full speed with no delays, disables transitions for instant execution
- CSS transitions in [`puzzle.css`](puzzle.css) handled by browser (GPU accelerated with `will-change`)
- `.no-transitions` class disables all tile/gap transitions during Challenge Mode shuffle
- [`buildGridFromState()`](puzzle.js) is O(n²) but n=8 so negligible
- No memory leaks: tiles reused on reset via [`initTiles()`](puzzle.js)
- [`tileById`](puzzle.js) Map provides O(1) tile lookup

## Browser Compatibility
- Modern browsers (ES6+ required)
- CSS Grid and Flexbox support needed
- Tested on Chrome, Firefox, Safari, Edge
- Mouse and keyboard controls supported
- Touch events: Mouse click events work on touch devices
- Uses `will-change` CSS property for performance

## Dark Mode

The game includes a dark mode theme that can be toggled by clicking the lightbulb icon (💡) in the toolbar:

- **Theme Toggle Button**: Lightbulb icon (💡) in right toolbar group
- **Persistence**: Theme preference saved to localStorage and restored on page load
- **Implementation**: Adds/removes `dark-mode` class on body element
- **Styling**: Dark mode styles defined in [`puzzle.css`](puzzle.css)
  - Background: #1a1a1a (dark)
  - Text: #e0e0e0 (light)
  - Buttons: #2a2a2a background with #555 borders
  - Challenge info: Translucent blue background maintained
  - Dialogs: #2a2a2a background with adjusted colors
  - Form inputs: Dark backgrounds with light text
  - Primary buttons: Adjusted blue tones for dark mode
  - All UI elements styled for consistency in dark mode

## Dialogs

All dialogs support the following dismissal methods:
- Clicking outside the dialog (on the overlay background) using mousedown event
- Keyboard shortcuts (Enter/Escape as appropriate for each dialog)
- Clicking the designated close/cancel button

### Help Dialog
- Opened by clicking the "?" help button in the toolbar
- Displays comprehensive controls reference organized by input method:
  - **Keyboard**: Spacebar for gap switching, arrow keys/WASD for movement
  - **Mouse Click**: Click piece to move, click gap to select
  - **Mouse Swipe**: Swipe piece or gap to move in that direction
  - **Mouse Drag**: Drag piece over gaps or gap over pieces for continuous movement
- Includes note about large piece and gap swap mechanics
- Contains "Got it" button to close
- Enter/Escape keys close dialog
- Click outside dialog to close
- Returns focus to board when closed

### Challenge Dialog
- Opened by "New Challenge" button
- Contains:
  - Seed input field (type="number", optional, min=0)
    - "Daily Challenge" button next to seed input
    - Clicking "Daily Challenge" populates seed with today's date in YYYYMMDD format (e.g., 20251125)
    - Enables sharing daily challenges with consistent seeds across all players
  - Steps input field (type="number", default 250, min=1, max=10000)
  - Difficulty preset buttons: Easy (50), Normal (250), Hard (1000), Very Hard (10000)
  - Start Challenge button
  - Cancel button
- Enter key starts challenge
- Escape key cancels
- Click outside dialog to cancel
- Generates random seed (0 to 2^32-1) if field is empty
- Only accepts numeric seeds for deterministic LCG behavior

### Congratulations Dialog
- Appears when challenge is solved
- Shows after 100ms delay (allows animation to complete)
- Displays move count
- Contains OK button
- Enter/Escape keys close dialog
- Click outside dialog to close
- Returns focus to board when closed

## Key Implementation Details

### Gap Identity System
Gaps maintain their identity throughout the game:
- Each gap has an `id` ('G0' or 'G1')
- Each gap remembers its `homeX` and `homeY` for image cropping
- Gap DOM elements have fixed `background-position` based on home
- When gaps move, their identity follows them (not their position)

### Large Piece Movement Algorithm
In [`tryMove()`](puzzle.js) for big pieces:
1. Calculate destination face cells (2 cells in movement direction)
2. Calculate freed cells (2 cells on opposite face)
3. Verify both destination cells are gaps
4. Verify selected gap is one of the destination cells
5. Map each gap to corresponding freed cell (aligned by row/col)
6. Move piece and reposition both gaps simultaneously

### Shuffle Algorithm
[`shuffle(steps, seed)`](puzzle.js) ensures solvability with intelligent move selection:
- Only uses valid moves from current state
- Never creates impossible configurations
- Uses [`enumerateValidMoves()`](puzzle.js) to get legal moves with metadata
- **Animation control**: Detects game mode and disables transitions in Challenge Mode

**Move Selection Strategy:**
1. **Anti-reversal**: Tracks last move (`lastMove` variable local to shuffle function)
   - Filters out moves that would immediately reverse the previous move
   - Only allows reversal if it's the only available move
   - Prevents pointless back-and-forth oscillations

2. **Weighted Priorities**: Creates weighted array for random selection
   - **Big piece moves** (2×2 tiles): Added 3 times → 3x probability
     - Encourages more frequent large piece movements
     - Makes shuffles more visually interesting and challenging
   - **Small piece moves** (1×1 tiles): Added 1 time → normal probability
   - **Gap swaps** (adjacent gaps swapping positions): Very low priority
     - Only 10% chance of being included when other moves exist
     - Used normally only when they're the sole available move
     - Prevents excessive gap repositioning without piece movement

3. **Fallback Safety**: If weighted array is empty (rare edge case), uses all filtered moves

4. **Mode-Specific Behavior**:
   - **Free Play Mode**: Shows animations, yields to UI periodically
   - **Challenge Mode**: Adds `.no-transitions` class to board, runs at full speed, no delays

**Result**: Default 250 moves creates well-randomized, solvable puzzles with:
- Frequent large piece movements (more challenging)
- Minimal pointless gap swaps (more purposeful)
- No immediate move reversals (more efficient randomization)
- Guaranteed solvability (only valid moves used)
- Hidden shuffle sequence in Challenge Mode (no information leakage)