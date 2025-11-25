(() => {
  const SIZE = 8;
  const tilePx = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || 64;
  const boardEl = document.getElementById('board');
  const resetBtn = document.getElementById('resetBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const challengeBtn = document.getElementById('challengeBtn');
  const giveUpBtn = document.getElementById('giveUpBtn');
  const challengeDialog = document.getElementById('challengeDialog');
  const challengeStartBtn = document.getElementById('challengeStartBtn');
  const challengeCancelBtn = document.getElementById('challengeCancelBtn');
  const dailyChallengeBtn = document.getElementById('dailyChallengeBtn');
  const seedInput = document.getElementById('seedInput');
  const stepsInput = document.getElementById('stepsInput');
  const challengeInfo = document.getElementById('challengeInfo');
  const challengeSeedDisplay = document.getElementById('challengeSeedDisplay');
  const challengeStepsDisplay = document.getElementById('challengeStepsDisplay');
  const challengeMovesDisplay = document.getElementById('challengeMovesDisplay');
  const congratsDialog = document.getElementById('congratsDialog');
  const congratsMessage = document.getElementById('congratsMessage');
  const congratsOkBtn = document.getElementById('congratsOkBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const helpBtn = document.getElementById('helpBtn');
  const helpDialog = document.getElementById('helpDialog');
  const helpCloseBtn = document.getElementById('helpCloseBtn');
  const challengeTimerDisplay = document.getElementById('challengeTimerDisplay');
  const timerToggleBtn = document.getElementById('timerToggleBtn');

  // Seeded Random Number Generator (LCG algorithm)
  // This ensures deterministic results across all browsers and operating systems
  class SeededRandom {
    constructor(seed) {
      // Seed must be a number
      this.seed = Number(seed);
      this.current = this.seed;
    }

    // Linear Congruential Generator
    // Using parameters from Numerical Recipes
    next() {
      this.current = (this.current * 1664525 + 1013904223) % 4294967296;
      return this.current / 4294967296;
    }

    // Return random integer between 0 (inclusive) and max (exclusive)
    nextInt(max) {
      return Math.floor(this.next() * max);
    }
  }

  // Big piece default top-lefts (x,y)
  const bigHomes = [
    {x:0,y:0}, {x:3,y:0}, {x:5,y:0},
    {x:0,y:3}, {x:3,y:3}, {x:6,y:3},
    {x:0,y:6}, {x:5,y:6}
  ];
  const defaultGaps = [{x:7,y:6},{x:7,y:7}];

  // State
  let grid; // 2D array: null=gaps; or {type:'small'|'big', id, ox, oy}
  let smallTiles = []; // {id, x,y, homeX,homeY, el}
  let bigTiles = [];   // {id, x,y, homeX,homeY, el} x,y are top-left
  let tileById = new Map();
  // gaps carry identity (to keep their default crop) and current pos
  let gaps = []; // [{id:'G0'|'G1', x,y, homeX,homeY}]
  let selectedGapIdx = 0;

  // Game mode state
  let gameMode = 'freeplay'; // 'freeplay' or 'challenge'
  let challengeSeed = null;
  let challengeSteps = null;
  let challengeMoveCount = 0;
  let isShuffling = false; // Flag to prevent move counting during shuffle
  let challengeSolved = false; // Flag to track if challenge is solved
  
  // Timer state
  let timerStartTime = null;
  let timerElapsedTime = 0;
  let timerInterval = null;
  let timerPaused = false;

  // Gap marker DOM (wrapper + inner gap element for each identity)
  const gapWrappers = [document.createElement('div'), document.createElement('div')];
  const gapEls = [document.createElement('div'), document.createElement('div')];
  gapWrappers.forEach((wrapper, i) => {
    wrapper.className = 'gap-wrapper';
    gapEls[i].className = 'gap';
    wrapper.appendChild(gapEls[i]);
    boardEl.appendChild(wrapper);
  });

  function initTiles() {
    smallTiles = [];
    bigTiles = [];
    tileById.clear();

    // Make a quick mask for big home coverage
    const covered = [...Array(SIZE)].map(()=>Array(SIZE).fill(false));
    bigHomes.forEach(({x,y})=>{
      for(let dy=0; dy<2; dy++){
        for(let dx=0; dx<2; dx++){
          covered[y+dy][x+dx] = true;
        }
      }
    });
    // Create big tiles first
    bigHomes.forEach((home, i) => {
      const id = `B${i}`;
      const el = document.createElement('div');
      el.className = 'tile big';
      el.style.backgroundPosition = `-${home.x*tilePx}px -${home.y*tilePx}px`;
      boardEl.appendChild(el);
      const t = { id, x: home.x, y: home.y, homeX: home.x, homeY: home.y, el };
      bigTiles.push(t);
      tileById.set(id, t);
    });

    // Create small tiles on cells not covered by bigs and not default gaps
    const isDefaultGap = (x,y) => defaultGaps.some(g => g.x===x && g.y===y);
    let sIdx = 0;
    for(let y=0; y<SIZE; y++){
      for(let x=0; x<SIZE; x++){
        if(covered[y][x]) continue;
        if(isDefaultGap(x,y)) continue;
        const id = `S${sIdx++}`;
        const el = document.createElement('div');
        el.className = 'tile small';
        el.style.backgroundPosition = `-${x*tilePx}px -${y*tilePx}px`;
        boardEl.appendChild(el);
        const t = { id, x, y, homeX: x, homeY: y, el };
        smallTiles.push(t);
        tileById.set(id, t);
      }
    }
  }

  function buildGridFromState() {
    grid = [...Array(SIZE)].map(()=>Array(SIZE).fill(null));
    // Place big tiles
    for (const t of bigTiles) {
      for(let dy=0; dy<2; dy++){
        for(let dx=0; dx<2; dx++){
          grid[t.y+dy][t.x+dx] = { type:'big', id: t.id, ox: dx, oy: dy };
        }
      }
    }
    // Place small tiles
    for (const t of smallTiles) {
      grid[t.y][t.x] = { type:'small', id: t.id };
    }
    // Carve gaps (null) last
    for (const g of gaps) {
      grid[g.y][g.x] = null;
    }
  }

  function resetState() {
    // Remove any previous tile DOM (will be re-added in initTiles)
    boardEl.querySelectorAll('.tile').forEach(el => el.remove());
    initTiles();

    // Initialize gaps with identity and home crop
    gaps = [
      { id:'G0', x: defaultGaps[0].x, y: defaultGaps[0].y, homeX: defaultGaps[0].x, homeY: defaultGaps[0].y },
      { id:'G1', x: defaultGaps[1].x, y: defaultGaps[1].y, homeX: defaultGaps[1].x, homeY: defaultGaps[1].y },
    ];
    // Fix their background cropping based on home, once
    gapEls.forEach((el, i) => {
      el.style.backgroundPosition = `-${gaps[i].homeX*tilePx}px -${gaps[i].homeY*tilePx}px`;
    });

    selectedGapIdx = 0;
    buildGridFromState();
    renderAll();
  }

  function updateUIForMode() {
    if (gameMode === 'challenge') {
      // Challenge mode: hide Shuffle, show Give Up, show challenge info
      shuffleBtn.style.display = 'none';
      giveUpBtn.style.display = 'inline-block';
      challengeInfo.style.display = 'block';
      challengeSeedDisplay.textContent = challengeSeed;
      challengeStepsDisplay.textContent = challengeSteps;
      challengeMovesDisplay.textContent = challengeMoveCount;
      resetBtn.textContent = 'Reset Challenge';
      // Update Give Up button text based on solved state
      giveUpBtn.textContent = challengeSolved ? 'Free Play' : 'Give Up';
    } else {
      // Free Play mode: show Shuffle, hide Give Up, hide challenge info
      shuffleBtn.style.display = 'inline-block';
      giveUpBtn.style.display = 'none';
      challengeInfo.style.display = 'none';
      resetBtn.textContent = 'Reset';
    }
  }

  function updateMoveCount() {
    if (gameMode === 'challenge') {
      challengeMovesDisplay.textContent = challengeMoveCount;
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function updateTimer() {
    if (!timerPaused && timerStartTime !== null) {
      const currentTime = Date.now();
      const elapsed = Math.floor((currentTime - timerStartTime + timerElapsedTime) / 1000);
      challengeTimerDisplay.textContent = formatTime(elapsed);
    }
  }

  function startTimer() {
    if (gameMode !== 'challenge') return;
    
    timerStartTime = Date.now();
    timerElapsedTime = 0;
    timerPaused = false;
    challengeTimerDisplay.textContent = '0:00';
    timerToggleBtn.textContent = '⏸';
    timerToggleBtn.setAttribute('aria-label', 'Pause timer');
    timerToggleBtn.setAttribute('title', 'Pause');
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 100);
  }

  function pauseTimer() {
    if (timerPaused || !timerStartTime) return;
    
    timerPaused = true;
    const currentTime = Date.now();
    timerElapsedTime += (currentTime - timerStartTime);
    timerToggleBtn.textContent = '▶';
    timerToggleBtn.setAttribute('aria-label', 'Resume timer');
    timerToggleBtn.setAttribute('title', 'Resume');
    boardEl.classList.add('paused');
  }

  function resumeTimer() {
    if (!timerPaused) return;
    
    timerPaused = false;
    timerStartTime = Date.now();
    timerToggleBtn.textContent = '⏸';
    timerToggleBtn.setAttribute('aria-label', 'Pause timer');
    timerToggleBtn.setAttribute('title', 'Pause');
    boardEl.classList.remove('paused');
    boardEl.focus();
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerStartTime = null;
    timerElapsedTime = 0;
    timerPaused = false;
    boardEl.classList.remove('paused');
    challengeTimerDisplay.textContent = '0:00';
    timerToggleBtn.textContent = '⏸';
    timerToggleBtn.setAttribute('aria-label', 'Pause timer');
    timerToggleBtn.setAttribute('title', 'Pause');
  }

  function freezeTimer() {
    // Stop timer updates without applying blur (used when puzzle is solved)
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerStartTime = null;
    // Keep timerPaused as false to prevent blur
    timerPaused = false;
    boardEl.classList.remove('paused');
  }

  function updateURL() {
    // Update browser URL to reflect current game mode
    const url = new URL(window.location);
    
    if (gameMode === 'challenge' && challengeSeed !== null && challengeSteps !== null) {
      // Challenge mode: add seed and steps parameters
      url.searchParams.set('seed', challengeSeed);
      url.searchParams.set('steps', challengeSteps);
    } else {
      // Free Play mode: remove parameters
      url.searchParams.delete('seed');
      url.searchParams.delete('steps');
    }
    
    // Update URL without reloading the page
    window.history.pushState({}, '', url);
  }

  function switchToFreePlay() {
    gameMode = 'freeplay';
    challengeSeed = null;
    challengeSteps = null;
    challengeMoveCount = 0;
    challengeSolved = false;
    stopTimer();
    updateUIForMode();
    updateURL(); // Update URL when switching to Free Play
    renderGaps(); // Restore gap highlighting for Free Play mode
    // Don't reset the board - keep current state
  }

  async function startChallenge(seed, steps) {
    gameMode = 'challenge';
    challengeSeed = seed;
    challengeSteps = steps;
    challengeMoveCount = 0;
    challengeSolved = false;
    
    // Stop any existing timer and remove paused state
    stopTimer();
    
    updateUIForMode();
    updateURL(); // Update URL when starting challenge
    
    // Reset to solved state first
    resetState();
    
    // Then shuffle with the challenge seed
    await shuffle(steps, seed);
    
    // Start timer after shuffle completes
    startTimer();
  }

  function checkWinCondition() {
    // Check if all tiles are in their home positions
    for (const t of smallTiles) {
      if (t.x !== t.homeX || t.y !== t.homeY) return false;
    }
    for (const t of bigTiles) {
      if (t.x !== t.homeX || t.y !== t.homeY) return false;
    }
    // Also check gaps are in default positions
    for (let i = 0; i < gaps.length; i++) {
      if (gaps[i].x !== defaultGaps[i].x || gaps[i].y !== defaultGaps[i].y) return false;
    }
    return true;
  }

  async function handleWin() {
    challengeSolved = true;
    freezeTimer(); // Stop timer without blur effect
    updateUIForMode();
    renderGaps(); // Remove gap selection highlighting immediately
    
    // Wait for animation to complete (80ms transition time)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get final time
    const finalTime = challengeTimerDisplay.textContent;
    
    // Show custom congratulations dialog
    congratsMessage.textContent = `You solved the challenge in ${challengeMoveCount} moves and with a time of ${finalTime}!`;
    congratsDialog.style.display = 'flex';
  }

  function renderAll() {
    // Position tiles
    for (const t of smallTiles) {
      t.el.style.left = `${t.x*tilePx}px`;
      t.el.style.top  = `${t.y*tilePx}px`;
    }
    for (const t of bigTiles) {
      t.el.style.left = `${t.x*tilePx}px`;
      t.el.style.top  = `${t.y*tilePx}px`;
    }
    renderGaps();
  }

  function renderGaps() {
    gaps.forEach((g,i) => {
      const wrapper = gapWrappers[i];
      wrapper.style.left = `${g.x*tilePx}px`;
      wrapper.style.top  = `${g.y*tilePx}px`;
      // Don't show selection if challenge is solved
      if (gameMode === 'challenge' && challengeSolved) {
        wrapper.classList.remove('selected');
      } else {
        wrapper.classList.toggle('selected', i === selectedGapIdx);
      }
    });
  }

  function tryMove(dir) {
    // Prevent moves if challenge is solved or timer is paused
    if (gameMode === 'challenge' && (challengeSolved || timerPaused)) {
      return false;
    }
    
    // IMPORTANT: The 'dir' parameter is COUNTERINTUITIVE!
    // It specifies where to look for something to move INTO the gap, NOT the direction of movement.
    // - tryMove('right') looks at g.x - 1 (to the LEFT)
    // - tryMove('left') looks at g.x + 1 (to the RIGHT)
    // - tryMove('down') looks at g.y - 1 (ABOVE)
    // - tryMove('up') looks at g.y + 1 (BELOW)
    //
    // For gap swapping: To swap with a gap to the RIGHT, call tryMove('left')!
    // When implementing swipe/drag controls, always REVERSE the direction.
    
    // dir: 'up'|'down'|'left'|'right'
    const g = gaps[selectedGapIdx];
    let fromX = g.x, fromY = g.y, dx = 0, dy = 0;
    if (dir === 'up') { fromY = g.y + 1; fromX = g.x; dx = 0; dy = -1; }
    if (dir === 'down') { fromY = g.y - 1; fromX = g.x; dx = 0; dy = 1; }
    if (dir === 'left') { fromX = g.x + 1; fromY = g.y; dx = -1; dy = 0; }
    if (dir === 'right'){ fromX = g.x - 1; fromY = g.y; dx = 1; dy = 0; }

    if (fromX < 0 || fromX >= SIZE || fromY < 0 || fromY >= SIZE) return false;

    // If adjacent cell is the other gap, swap the gaps
    const otherIdx = 1 - selectedGapIdx;
    if (gaps[otherIdx].x === fromX && gaps[otherIdx].y === fromY) {
      const tmp = { x:g.x, y:g.y };
      g.x = gaps[otherIdx].x; g.y = gaps[otherIdx].y;
      gaps[otherIdx].x = tmp.x; gaps[otherIdx].y = tmp.y;
      // Selection stays on the gap identity that moved
      buildGridFromState();
      renderGaps();
      if (gameMode === 'challenge' && !isShuffling) {
        challengeMoveCount++;
        updateMoveCount();
        if (checkWinCondition()) {
          handleWin();
        }
      }
      return true;
    }

    const occ = grid[fromY][fromX];
    if (!occ) return false;

    if (occ.type === 'small') {
      // Move small tile into the selected gap, and move that gap to the tile's former spot
      const t = tileById.get(occ.id);

      // Update tile position
      t.x += dx; t.y += dy;

      // Move selected gap identity to the freed cell (tile's former position)
      g.x = fromX; g.y = fromY;

      // Rebuild grid and render (keeps selection on the moved gap, i.e., the newly created gap)
      buildGridFromState();
      // DOM updates
      t.el.style.left = `${t.x*tilePx}px`;
      t.el.style.top  = `${t.y*tilePx}px`;
      renderGaps();
      if (gameMode === 'challenge' && !isShuffling) {
        challengeMoveCount++;
        updateMoveCount();
        if (checkWinCondition()) {
          handleWin();
        }
      }
      return true;
    }

    if (occ.type === 'big') {
      const t = tileById.get(occ.id);
      // Determine destination face cells (must be both gaps), and freed cells after move
      let dest = [], freed = [];
      if (dx === 1) { // right
        if (t.x + 2 >= SIZE) return false;
        dest = [{x:t.x+2, y:t.y}, {x:t.x+2, y:t.y+1}];
        freed = [{x:t.x, y:t.y}, {x:t.x, y:t.y+1}];
      } else if (dx === -1) { // left
        if (t.x - 1 < 0) return false;
        dest = [{x:t.x-1, y:t.y}, {x:t.x-1, y:t.y+1}];
        freed = [{x:t.x+1, y:t.y}, {x:t.x+1, y:t.y+1}];
      } else if (dy === 1) { // down
        if (t.y + 2 >= SIZE) return false;
        dest = [{x:t.x, y:t.y+2}, {x:t.x+1, y:t.y+2}];
        freed = [{x:t.x, y:t.y}, {x:t.x+1, y:t.y}];
      } else if (dy === -1) { // up
        if (t.y - 1 < 0) return false;
        dest = [{x:t.x, y:t.y-1}, {x:t.x+1, y:t.y-1}];
        freed = [{x:t.x, y:t.y+1}, {x:t.x+1, y:t.y+1}];
      }

      // Both dest must be gaps, and the selected gap must be one of them
      const destAreGaps = dest.every(d => grid[d.y][d.x] === null);
      const selectedIsDest = dest.some(d => d.x === g.x && d.y === g.y);
      if (!(destAreGaps && selectedIsDest)) return false;

      // Map which gap is at which dest, then move each gap to the corresponding freed cell
      // Keep gaps aligned by row/col so it behaves like a swap with the piece face
      const gapIdxAt = (c) => (gaps[0].x===c.x && gaps[0].y===c.y) ? 0 : (gaps[1].x===c.x && gaps[1].y===c.y) ? 1 : -1;
      const map = [];
      if (dx !== 0) {
        // Align by y
        for (const d of dest) {
          const gi = gapIdxAt(d);
          if (gi === -1) return false;
          const target = freed.find(f => f.y === d.y);
          map.push({ gi, target });
        }
      } else {
        // dy !== 0, align by x
        for (const d of dest) {
          const gi = gapIdxAt(d);
          if (gi === -1) return false;
          const target = freed.find(f => f.x === d.x);
          map.push({ gi, target });
        }
      }
      // Move the piece
      t.x += dx; t.y += dy;

      // Move each gap identity to its mapped freed cell
      for (const {gi, target} of map) {
        gaps[gi].x = target.x;
        gaps[gi].y = target.y;
      }

      // Keep selection on the same gap identity; it's now one of the freed cells
      buildGridFromState();
      // DOM updates
      t.el.style.left = `${t.x*tilePx}px`;
      t.el.style.top  = `${t.y*tilePx}px`;
      renderGaps();
      if (gameMode === 'challenge' && !isShuffling) {
        challengeMoveCount++;
        updateMoveCount();
        if (checkWinCondition()) {
          handleWin();
        }
      }
      return true;
    }

    return false;
  }

  function enumerateValidMoves() {
    const moves = [];
    const dirs = ['up','down','left','right'];
    for (let gi=0; gi<2; gi++) {
      const g = gaps[gi];
      for (const dir of dirs) {
        let fromX = g.x, fromY = g.y, dx = 0, dy = 0;
        if (dir === 'up') { fromY = g.y + 1; fromX = g.x; dx = 0; dy = -1; }
        if (dir === 'down') { fromY = g.y - 1; fromX = g.x; dx = 0; dy = 1; }
        if (dir === 'left') { fromX = g.x + 1; fromY = g.y; dx = -1; dy = 0; }
        if (dir === 'right'){ fromX = g.x - 1; fromY = g.y; dx = 1; dy = 0; }
        if (fromX < 0 || fromX >= SIZE || fromY < 0 || fromY >= SIZE) continue;

        // gap-gap swap allowed
        const otherIdx = 1 - gi;
        if (gaps[otherIdx].x === fromX && gaps[otherIdx].y === fromY) {
          moves.push({gapIdx: gi, dir, isBig: false, isGapSwap: true});
          continue;
        }

        const occ = grid[fromY][fromX];
        if (!occ) continue;

        if (occ.type === 'small') {
          moves.push({gapIdx: gi, dir, isBig: false, isGapSwap: false});
          continue;
        }
        if (occ.type === 'big') {
          const t = tileById.get(occ.id);
          const dest = [];
          if (dx === 1) { if (t.x + 2 >= SIZE) continue; dest.push({x:t.x+2, y:t.y},{x:t.x+2,y:t.y+1}); }
          if (dx === -1){ if (t.x - 1 < 0) continue; dest.push({x:t.x-1, y:t.y},{x:t.x-1,y:t.y+1}); }
          if (dy === 1) { if (t.y + 2 >= SIZE) continue; dest.push({x:t.x, y:t.y+2},{x:t.x+1,y:t.y+2}); }
          if (dy === -1){ if (t.y - 1 < 0) continue; dest.push({x:t.x, y:t.y-1},{x:t.x+1,y:t.y-1}); }
          const bothNull = dest.every(c => grid[c.y][c.x] === null);
          const selectedIsDest = dest.some(c => c.x === g.x && c.y === g.y);
          if (bothNull && selectedIsDest) moves.push({gapIdx: gi, dir, isBig: true, isGapSwap: false});
        }
      }
    }
    return moves;
  }

  async function shuffle(steps = 400, seed = null) {
    shuffleBtn.disabled = true; resetBtn.disabled = true; challengeBtn.disabled = true;
    isShuffling = true; // Set flag to prevent move counting
    
    // In Challenge Mode, disable animations to hide shuffle sequence
    const isChallenge = gameMode === 'challenge';
    if (isChallenge) {
      boardEl.classList.add('no-transitions');
    }
    
    // Create random number generator (seeded or random)
    const rng = seed !== null ? new SeededRandom(seed) : null;
    const random = () => rng ? rng.next() : Math.random();
    const randomInt = (max) => rng ? rng.nextInt(max) : Math.floor(Math.random() * max);
    
    let lastMove = null; // Remember last move to avoid immediate reversal
    try {
      for (let i=0; i<steps; i++) {
        const moves = enumerateValidMoves();
        if (moves.length === 0) break;
        
        // Filter out the reverse of the last move if there are other options
        let filteredMoves = moves;
        if (lastMove !== null) {
          const reverseDir = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
          };
          const reverse = reverseDir[lastMove.dir];
          const nonReverseMoves = moves.filter(m =>
            !(m.gapIdx === lastMove.gapIdx && m.dir === reverse)
          );
          // Only use filtered moves if there are alternatives
          if (nonReverseMoves.length > 0) {
            filteredMoves = nonReverseMoves;
          }
        }
        
        // Create weighted array with priorities:
        // - Big piece moves: 3x weight (high priority)
        // - Small piece moves: 1x weight (normal priority)
        // - Gap swaps: only if no other moves available, otherwise very low priority
        const weightedMoves = [];
        const hasNonGapSwapMoves = filteredMoves.some(m => !m.isGapSwap);
        
        for (const move of filteredMoves) {
          if (move.isBig) {
            // Add big piece moves 3 times for higher probability
            weightedMoves.push(move, move, move);
          } else if (move.isGapSwap) {
            // Only add gap swaps if there are no other moves, or add with very low weight
            if (!hasNonGapSwapMoves) {
              weightedMoves.push(move);
            }
            // If there are other moves, gap swaps get very low priority (1/10 of normal)
            // We add them occasionally but rarely
            else if (random() < 0.1) {
              weightedMoves.push(move);
            }
          } else {
            // Small piece moves get normal weight
            weightedMoves.push(move);
          }
        }
        
        // If weighted moves is empty (rare edge case), fall back to filtered moves
        if (weightedMoves.length === 0) {
          weightedMoves.push(...filteredMoves);
        }
        
        const m = weightedMoves[randomInt(weightedMoves.length)];
        selectedGapIdx = m.gapIdx;
        tryMove(m.dir);
        lastMove = m; // Remember this move for next iteration
        
        // Only yield to UI in Free Play mode (for animation visibility)
        // In Challenge Mode, run at full speed without delays
        if (!isChallenge && (i < 40 || i % 10 === 0)) {
          await new Promise(r=>setTimeout(r, 0));
        }
      }
    } finally {
      // Re-enable transitions after shuffle completes
      if (isChallenge) {
        boardEl.classList.remove('no-transitions');
      }
      
      isShuffling = false; // Clear flag after shuffle completes
      shuffleBtn.disabled = false; resetBtn.disabled = false; challengeBtn.disabled = false;
    }
  }

  // Event listeners
  boardEl.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      // Prevent gap switching if challenge is solved or timer is paused
      if (gameMode === 'challenge' && (challengeSolved || timerPaused)) {
        return;
      }
      selectedGapIdx = 1 - selectedGapIdx;
      renderGaps();
      return;
    }
    const keyMap = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right'
    };
    const dir = keyMap[e.key];
    if (dir) {
      e.preventDefault();
      tryMove(dir);
    }
  });

  // ============================================================================
  // SHARED UTILITY FUNCTIONS FOR MOUSE CONTROLS
  // ============================================================================
  
  /**
   * Get all cells that should be checked for a tile (1 for small, 4 for big)
   * @param {Object} tile - The tile object
   * @param {Object} clickedCell - The grid cell data
   * @param {number} gridX - Grid X coordinate (for small pieces)
   * @param {number} gridY - Grid Y coordinate (for small pieces)
   * @returns {Array} Array of {x, y} cell coordinates
   */
  function getCellsForTile(tile, clickedCell, gridX, gridY) {
    if (clickedCell.type === 'big') {
      return [
        {x: tile.x, y: tile.y},
        {x: tile.x + 1, y: tile.y},
        {x: tile.x, y: tile.y + 1},
        {x: tile.x + 1, y: tile.y + 1}
      ];
    }
    return [{x: gridX, y: gridY}];
  }

  /**
   * Find which gaps are adjacent to given cells and in which direction
   * @param {Array} cells - Array of {x, y} cell coordinates to check
   * @param {Array} gaps - The gaps array
   * @returns {Object} {gap0: {adjacent, dx, dy}, gap1: {adjacent, dx, dy}}
   */
  function findAdjacentGaps(cells, gaps) {
    const result = {
      gap0: {adjacent: false, dx: 0, dy: 0},
      gap1: {adjacent: false, dx: 0, dy: 0}
    };
    
    for (const cell of cells) {
      // Check gap 0
      const dx0 = gaps[0].x - cell.x;
      const dy0 = gaps[0].y - cell.y;
      if ((Math.abs(dx0) === 1 && dy0 === 0) || (dx0 === 0 && Math.abs(dy0) === 1)) {
        result.gap0.adjacent = true;
        result.gap0.dx = dx0;
        result.gap0.dy = dy0;
      }
      
      // Check gap 1
      const dx1 = gaps[1].x - cell.x;
      const dy1 = gaps[1].y - cell.y;
      if ((Math.abs(dx1) === 1 && dy1 === 0) || (dx1 === 0 && Math.abs(dy1) === 1)) {
        result.gap1.adjacent = true;
        result.gap1.dx = dx1;
        result.gap1.dy = dy1;
      }
    }
    
    return result;
  }

  /**
   * Convert direction vector to tryMove() direction string
   * Note: tryMove() direction is INVERTED (specifies where to look, not where to move)
   * @param {number} dx - Delta X
   * @param {number} dy - Delta Y
   * @param {boolean} invert - Whether to invert the direction (for gap drag control)
   * @returns {string|null} Direction string ('up'/'down'/'left'/'right') or null
   */
  function vectorToDirection(dx, dy, invert = false) {
    if (invert) {
      // For gap drag: reverse the direction (pulling piece toward gap)
      if (dx === 1 && dy === 0) return 'left';
      if (dx === -1 && dy === 0) return 'right';
      if (dx === 0 && dy === 1) return 'up';
      if (dx === 0 && dy === -1) return 'down';
    } else {
      // For piece drag: normal direction (gap is in this direction from piece)
      if (dx === 1 && dy === 0) return 'right';
      if (dx === -1 && dy === 0) return 'left';
      if (dx === 0 && dy === 1) return 'down';
      if (dx === 0 && dy === -1) return 'up';
    }
    return null;
  }

  /**
   * Check if mouse position is in valid drag region (75% of cell, excluding edge closest to source)
   * @param {number} mouseX - Mouse X position within cell (0 to tilePx)
   * @param {number} mouseY - Mouse Y position within cell (0 to tilePx)
   * @param {number} sourceDx - Direction from source to target (X)
   * @param {number} sourceDy - Direction from source to target (Y)
   * @returns {boolean} True if in valid region
   */
  function isInValidDragRegion(mouseX, mouseY, sourceDx, sourceDy) {
    const quarterTile = tilePx / 4;
    
    // Exclude the edge closest to the source (1/4 of the cell)
    if (sourceDx === 1 && mouseX < quarterTile) return false;        // Source is left, exclude left edge
    if (sourceDx === -1 && mouseX >= 3 * quarterTile) return false;  // Source is right, exclude right edge
    if (sourceDy === 1 && mouseY < quarterTile) return false;        // Source is above, exclude top edge
    if (sourceDy === -1 && mouseY >= 3 * quarterTile) return false;  // Source is below, exclude bottom edge
    
    return true;
  }

  /**
   * Detect swipe direction from mouse movement
   * @param {Object} startPos - {x, y} starting position
   * @param {Object} currentPos - {x, y} current position
   * @param {number} threshold - Minimum distance for swipe detection
   * @returns {string|null} Direction string or null if below threshold
   */
  function detectSwipeDirection(startPos, currentPos, threshold) {
    const dx = currentPos.x - startPos.x;
    const dy = currentPos.y - startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < threshold) return null;
    
    // Determine direction based on dominant axis
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  /**
   * Check if a gap is in the given swipe direction relative to cells
   * @param {Array} cells - Array of {x, y} cell coordinates
   * @param {Object} gap - Gap object with x, y
   * @param {string} swipeDir - Swipe direction ('up'/'down'/'left'/'right')
   * @returns {boolean} True if gap is in swipe direction
   */
  function isGapInSwipeDirection(cells, gap, swipeDir) {
    for (const cell of cells) {
      const dx = gap.x - cell.x;
      const dy = gap.y - cell.y;
      
      if (swipeDir === 'right' && dx === 1 && dy === 0) return true;
      if (swipeDir === 'left' && dx === -1 && dy === 0) return true;
      if (swipeDir === 'down' && dx === 0 && dy === 1) return true;
      if (swipeDir === 'up' && dx === 0 && dy === -1) return true;
    }
    return false;
  }

  // ============================================================================
  // MOUSE CONTROL STATE
  // ============================================================================
  
  let mouseDownPos = null;
  let mouseDownTime = null;
  let mouseDownGridPos = null;
  let mouseDownSelectedGapIdx = null; // Track which gap was selected when mousedown occurred
  let swipePreviewActive = false;
  let swipePreviewTile = null;
  let swipePreviewOffset = { x: 0, y: 0 };
  let lastDragGapPos = null; // Track last gap position we dragged over to prevent repeated moves
  let dragControlUsed = false; // Flag to disable swipe controls after drag control is used

  boardEl.addEventListener('mousedown', (e) => {
    // Prevent mousedown if challenge is solved
    if (gameMode === 'challenge' && challengeSolved) {
      return;
    }

    // Get mouse position relative to board
    const rect = boardEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert to grid coordinates
    const gridX = Math.floor(clickX / tilePx);
    const gridY = Math.floor(clickY / tilePx);
    
    // Check bounds
    if (gridX < 0 || gridX >= SIZE || gridY < 0 || gridY >= SIZE) {
      return;
    }

    // Store mouse down position and time
    mouseDownPos = { x: e.clientX, y: e.clientY };
    mouseDownTime = Date.now();
    mouseDownGridPos = { x: gridX, y: gridY };
    mouseDownSelectedGapIdx = selectedGapIdx; // Store which gap was selected before this mousedown
    lastDragGapPos = null; // Reset drag tracking for new drag session
    dragControlUsed = false; // Reset drag control flag for new drag session
    
    // Check if we clicked on a gap and select it
    const clickedGapIdx = gaps.findIndex(g => g.x === gridX && g.y === gridY);
    if (clickedGapIdx !== -1) {
      selectedGapIdx = clickedGapIdx;
      renderGaps();
    }
  });

  boardEl.addEventListener('mousemove', (e) => {
    // Only process if we have a valid mousedown
    if (!mouseDownPos || !mouseDownTime || !mouseDownGridPos) {
      return;
    }

    // Prevent mousemove if challenge is solved
    if (gameMode === 'challenge' && challengeSolved) {
      return;
    }

    // Get current mouse position relative to board
    const rect = boardEl.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Convert to grid coordinates
    const currentGridX = Math.floor(currentX / tilePx);
    const currentGridY = Math.floor(currentY / tilePx);
    
    // Check if we started on a gap
    const startedOnGap = grid[mouseDownGridPos.y][mouseDownGridPos.x] === null;
    
    if (startedOnGap) {
      // GAP DRAG CONTROL: Started on a gap, check if we're over a piece or the other gap
      if (currentGridX >= 0 && currentGridX < SIZE && currentGridY >= 0 && currentGridY < SIZE) {
        const currentCell = grid[currentGridY][currentGridX];
        
        // Check if we're over the other gap
        const startGapIdx = gaps.findIndex(g => g.x === mouseDownGridPos.x && g.y === mouseDownGridPos.y);
        if (startGapIdx === -1) return; // Safety check
        const otherGapIdx = 1 - startGapIdx;
        const otherGap = gaps[otherGapIdx];
        
        if (currentCell === null && otherGap && otherGap.x === currentGridX && otherGap.y === currentGridY) {
          // We're over the other gap - check if it's adjacent
          const dx = currentGridX - mouseDownGridPos.x;
          const dy = currentGridY - mouseDownGridPos.y;
          
          if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
            // Other gap is adjacent - swap them
            const gapPosKey = `${currentGridX},${currentGridY}`;
            
            if (lastDragGapPos !== gapPosKey) {
              const swapDir = vectorToDirection(dx, dy, true); // Invert for gap swap
              
              if (swapDir) {
                const moveSuccess = tryMove(swapDir);
                
                if (moveSuccess) {
                  dragControlUsed = true;
                  lastDragGapPos = gapPosKey;
                  // Clear any swipe preview
                  if (swipePreviewActive && swipePreviewTile) {
                    swipePreviewTile.el.style.transform = '';
                    swipePreviewActive = false;
                    swipePreviewTile = null;
                    swipePreviewOffset = { x: 0, y: 0 };
                  }
                  // Update mouseDownGridPos to the new gap position after the swap
                  mouseDownGridPos = { x: gaps[selectedGapIdx].x, y: gaps[selectedGapIdx].y };
                }
              }
            }
          }
        } else if (currentCell !== null) {
          // We're over a piece - check if it's in the valid drag region
          const cellX = currentX - (currentGridX * tilePx);
          const cellY = currentY - (currentGridY * tilePx);
          
          const tile = tileById.get(currentCell.id);
          if (tile) {
            // Get cells to check for adjacency
            const cellsToCheck = getCellsForTile(tile, currentCell, currentGridX, currentGridY);
            
            // Find if piece is adjacent to gap and check valid drag region
            let isAdjacent = false;
            let adjacentDir = null;
            
            for (const cell of cellsToCheck) {
              const dx = cell.x - mouseDownGridPos.x;
              const dy = cell.y - mouseDownGridPos.y;
              
              if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
                isAdjacent = true;
                // Check if mouse is in valid drag region
                if (isInValidDragRegion(cellX, cellY, dx, dy)) {
                  adjacentDir = vectorToDirection(dx, dy, true); // Invert for gap drag
                }
                break;
              }
            }
            
            if (isAdjacent && adjacentDir) {
              const piecePosKey = `${currentGridX},${currentGridY}`;
              
              // Only trigger move if this is a different piece than the last one we dragged over
              if (lastDragGapPos !== piecePosKey) {
                const moveSuccess = tryMove(adjacentDir);
                
                if (moveSuccess) {
                  dragControlUsed = true;
                  lastDragGapPos = piecePosKey;
                  // Clear any swipe preview
                  if (swipePreviewActive && swipePreviewTile) {
                    swipePreviewTile.el.style.transform = '';
                    swipePreviewActive = false;
                    swipePreviewTile = null;
                    swipePreviewOffset = { x: 0, y: 0 };
                  }
                  // Update mouseDownGridPos to the new gap position after the move
                  mouseDownGridPos = { x: gaps[selectedGapIdx].x, y: gaps[selectedGapIdx].y };
                }
              }
            }
          }
        }
      }
    } else {
      // PIECE DRAG CONTROL: Started on a piece
      if (currentGridX >= 0 && currentGridX < SIZE && currentGridY >= 0 && currentGridY < SIZE) {
        const currentCell = grid[currentGridY][currentGridX];
        
        if (currentCell === null) {
          // We're over a gap - check if it's in the valid drag region
          const cellX = currentX - (currentGridX * tilePx);
          const cellY = currentY - (currentGridY * tilePx);
          
          const clickedCell = grid[mouseDownGridPos.y][mouseDownGridPos.x];
          if (clickedCell) {
            const tile = tileById.get(clickedCell.id);
            if (tile) {
              // Get cells to check for adjacency
              const cellsToCheck = getCellsForTile(tile, clickedCell, mouseDownGridPos.x, mouseDownGridPos.y);
              
              // Find if gap is adjacent to piece and check valid drag region
              let isAdjacent = false;
              let adjacentDir = null;
              
              for (const cell of cellsToCheck) {
                const dx = currentGridX - cell.x;
                const dy = currentGridY - cell.y;
                
                if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
                  isAdjacent = true;
                  // Check if mouse is in valid drag region (exclude edge closest to piece)
                  if (isInValidDragRegion(cellX, cellY, dx, dy)) {
                    adjacentDir = vectorToDirection(dx, dy, false); // Normal direction for piece drag
                  }
                  break;
                }
              }
              
              if (isAdjacent && adjacentDir) {
                const gapPosKey = `${currentGridX},${currentGridY}`;
                
                // Only trigger move if this is a different gap than the last one we dragged over
                if (lastDragGapPos !== gapPosKey) {
                  const gapIdx = gaps.findIndex(g => g.x === currentGridX && g.y === currentGridY);
                  if (gapIdx !== -1) {
                    selectedGapIdx = gapIdx;
                    const moveSuccess = tryMove(adjacentDir);
                    
                    if (moveSuccess) {
                      dragControlUsed = true;
                      lastDragGapPos = gapPosKey;
                      if (swipePreviewActive && swipePreviewTile) {
                        swipePreviewTile.el.style.transform = '';
                        swipePreviewActive = false;
                        swipePreviewTile = null;
                        swipePreviewOffset = { x: 0, y: 0 };
                      }
                      mouseDownGridPos = { x: currentGridX, y: currentGridY };
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Only process swipe controls if drag control hasn't been used
    if (!dragControlUsed) {
      const SWIPE_THRESHOLD = 5;
      const swipeDir = detectSwipeDirection(mouseDownPos, {x: e.clientX, y: e.clientY}, SWIPE_THRESHOLD);

      if (swipeDir) {
        const gridX = mouseDownGridPos.x;
        const gridY = mouseDownGridPos.y;
        const clickedCell = grid[gridY][gridX];

        if (!clickedCell) {
          // Swiping on a gap - check for adjacent piece or other gap
          let targetX = gridX, targetY = gridY;
          if (swipeDir === 'right') targetX++;
          else if (swipeDir === 'left') targetX--;
          else if (swipeDir === 'down') targetY++;
          else if (swipeDir === 'up') targetY--;
          
          if (targetX >= 0 && targetX < SIZE && targetY >= 0 && targetY < SIZE) {
            const targetCell = grid[targetY][targetX];
            
            // Check if target is the other gap
            const clickedGapIdx = gaps.findIndex(g => g.x === gridX && g.y === gridY);
            const otherGapIdx = 1 - clickedGapIdx;
            const otherGap = gaps[otherGapIdx];
            const isOtherGap = (targetCell === null && otherGap && otherGap.x === targetX && otherGap.y === targetY);
            
            if (isOtherGap) {
              // No preview for gap swaps
              if (swipePreviewActive && swipePreviewTile) {
                swipePreviewTile.el.style.transform = '';
                swipePreviewActive = false;
                swipePreviewTile = null;
                swipePreviewOffset = { x: 0, y: 0 };
              }
            } else if (targetCell) {
              // Show preview for piece moving into gap
              const tile = tileById.get(targetCell.id);
              if (tile) {
                if (swipePreviewActive && swipePreviewTile && swipePreviewTile !== tile) {
                  swipePreviewTile.el.style.transform = '';
                }
                
                const previewOffset = 15;
                let offsetX = 0, offsetY = 0;
                
                // Piece moves opposite to swipe direction
                if (swipeDir === 'right') offsetX = -previewOffset;
                if (swipeDir === 'left') offsetX = previewOffset;
                if (swipeDir === 'down') offsetY = -previewOffset;
                if (swipeDir === 'up') offsetY = previewOffset;
                
                swipePreviewActive = true;
                swipePreviewTile = tile;
                swipePreviewOffset = { x: offsetX, y: offsetY };
                tile.el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
              }
            } else {
              // Clear preview if no valid target
              if (swipePreviewActive && swipePreviewTile) {
                swipePreviewTile.el.style.transform = '';
                swipePreviewActive = false;
                swipePreviewTile = null;
                swipePreviewOffset = { x: 0, y: 0 };
              }
            }
          }
          return;
        }

        // Swiping on a piece
        const tile = tileById.get(clickedCell.id);
        if (!tile) return;

        const cellsToCheck = getCellsForTile(tile, clickedCell, gridX, gridY);
        
        // Check if either gap is in swipe direction
        const validSwipe = isGapInSwipeDirection(cellsToCheck, gaps[selectedGapIdx], swipeDir) ||
                          isGapInSwipeDirection(cellsToCheck, gaps[1 - selectedGapIdx], swipeDir);

        if (validSwipe) {
          const previewOffset = 15;
          let offsetX = 0, offsetY = 0;

          if (swipeDir === 'right') offsetX = previewOffset;
          if (swipeDir === 'left') offsetX = -previewOffset;
          if (swipeDir === 'down') offsetY = previewOffset;
          if (swipeDir === 'up') offsetY = -previewOffset;

          if (!swipePreviewActive || swipePreviewTile !== tile) {
            swipePreviewActive = true;
            swipePreviewTile = tile;
          }

          swipePreviewOffset = { x: offsetX, y: offsetY };
          tile.el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        } else {
          // Clear preview if swipe is invalid
          if (swipePreviewActive && swipePreviewTile) {
            swipePreviewTile.el.style.transform = '';
            swipePreviewActive = false;
            swipePreviewTile = null;
            swipePreviewOffset = { x: 0, y: 0 };
          }
        }
      } else {
        // Below threshold, clear preview
        if (swipePreviewActive && swipePreviewTile) {
          swipePreviewTile.el.style.transform = '';
          swipePreviewActive = false;
          swipePreviewTile = null;
          swipePreviewOffset = { x: 0, y: 0 };
        }
      }
    }
  });

  document.addEventListener('mouseup', (e) => {
    // Prevent mouseup if challenge is solved
    if (gameMode === 'challenge' && challengeSolved) {
      mouseDownPos = null;
      mouseDownTime = null;
      mouseDownGridPos = null;
      mouseDownSelectedGapIdx = null;
      lastDragGapPos = null;
      dragControlUsed = false;
      return;
    }

    // Check if we have a valid mousedown
    if (!mouseDownPos || !mouseDownTime || !mouseDownGridPos) {
      return;
    }

    // Clear swipe preview
    if (swipePreviewActive && swipePreviewTile) {
      swipePreviewTile.el.style.transform = '';
      swipePreviewActive = false;
      swipePreviewTile = null;
      swipePreviewOffset = { x: 0, y: 0 };
    }

    // If drag control was used, skip all click/swipe logic
    if (dragControlUsed) {
      // Reset mouse tracking
      mouseDownPos = null;
      mouseDownTime = null;
      mouseDownGridPos = null;
      mouseDownSelectedGapIdx = null;
      lastDragGapPos = null;
      dragControlUsed = false;
      return;
    }

    // Only process swipe/click logic if drag control wasn't used
    const SWIPE_THRESHOLD = 5;
    const swipeDir = detectSwipeDirection(mouseDownPos, {x: e.clientX, y: e.clientY}, SWIPE_THRESHOLD);

    // Use the original grid position from mousedown for determining the clicked cell
    const gridX = mouseDownGridPos.x;
    const gridY = mouseDownGridPos.y;

    // Check if clicked on a gap
    const clickedGapIdx = gaps.findIndex(g => g.x === gridX && g.y === gridY);
    
    // Store whether this gap was already selected BEFORE mousedown changed it
    const wasAlreadySelected = (mouseDownSelectedGapIdx === clickedGapIdx);
    
    // Reset mouse tracking
    mouseDownPos = null;
    mouseDownTime = null;
    mouseDownGridPos = null;
    mouseDownSelectedGapIdx = null;
    lastDragGapPos = null;
    dragControlUsed = false;

    if (clickedGapIdx !== -1) {
      // Clicked on a gap
      
      if (swipeDir) {
        // Swipe detected - handle swipe behavior
        selectedGapIdx = clickedGapIdx;
        
        // Check if the other gap is adjacent in the swipe direction
        const otherGapIdx = 1 - clickedGapIdx;
        const otherGap = gaps[otherGapIdx];
        const dx = otherGap.x - gridX;
        const dy = otherGap.y - gridY;
        
        // Check if other gap is adjacent and in swipe direction
        // tryMove direction is OPPOSITE of where the gap is (it's the direction things move INTO the gap)
        let gapSwapDir = null;
        if (swipeDir === 'right' && dx === 1 && dy === 0) gapSwapDir = 'left';   // other gap is right, so move from left
        if (swipeDir === 'left' && dx === -1 && dy === 0) gapSwapDir = 'right';  // other gap is left, so move from right
        if (swipeDir === 'down' && dx === 0 && dy === 1) gapSwapDir = 'up';      // other gap is down, so move from up
        if (swipeDir === 'up' && dx === 0 && dy === -1) gapSwapDir = 'down';     // other gap is up, so move from down
        
        if (gapSwapDir) {
          // Swap gaps
          tryMove(gapSwapDir);
          return;
        } else {
          // Swipe on gap - move adjacent piece in the OPPOSITE direction into the gap
          // (we're pulling the piece toward us, not pushing the gap away)
          const reverseDir = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
          };
          tryMove(reverseDir[swipeDir]);
          return;
        }
      }
      
      // No swipe detected - handle click behavior
      if (wasAlreadySelected) {
        // Gap was already selected - check if the other gap is adjacent and swap if so
        const otherGapIdx = 1 - clickedGapIdx;
        const otherGap = gaps[otherGapIdx];
        const dx = otherGap.x - gridX;
        const dy = otherGap.y - gridY;
        
        if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
          // Adjacent gap exists - swap them
          // Determine swap direction (tryMove direction is OPPOSITE of where the gap is)
          let gapSwapDir = null;
          if (dx === 1 && dy === 0) gapSwapDir = 'left';   // other gap is right, so move from left
          if (dx === -1 && dy === 0) gapSwapDir = 'right';  // other gap is left, so move from right
          if (dx === 0 && dy === 1) gapSwapDir = 'up';      // other gap is down, so move from up
          if (dx === 0 && dy === -1) gapSwapDir = 'down';   // other gap is up, so move from down
          
          if (gapSwapDir) {
            tryMove(gapSwapDir);
          }
        }
        return;
      } else {
        // Gap was not selected - just select it
        selectedGapIdx = clickedGapIdx;
        renderGaps();
        return;
      }
    }
    
    // Check what's at the clicked position
    const clickedCell = grid[gridY][gridX];
    if (!clickedCell) return; // No piece at clicked position
    
    const tile = tileById.get(clickedCell.id);
    if (!tile) return;
    
    // Get cells to check for adjacency
    const cellsToCheck = getCellsForTile(tile, clickedCell, gridX, gridY);
    
    // Find which gaps are adjacent
    const adjacency = findAdjacentGaps(cellsToCheck, gaps);
    
    // Determine which gap to use
    let targetGapIdx = -1;
    let targetDx = 0, targetDy = 0;

    if (swipeDir) {
      // Swipe detected - use gap in swipe direction
      if (adjacency.gap0.adjacent && isGapInSwipeDirection(cellsToCheck, gaps[0], swipeDir)) {
        targetGapIdx = 0;
        targetDx = adjacency.gap0.dx;
        targetDy = adjacency.gap0.dy;
      } else if (adjacency.gap1.adjacent && isGapInSwipeDirection(cellsToCheck, gaps[1], swipeDir)) {
        targetGapIdx = 1;
        targetDx = adjacency.gap1.dx;
        targetDy = adjacency.gap1.dy;
      } else {
        return; // Swipe doesn't match any adjacent gap
      }
    } else {
      // Click - use adjacency logic
      const adjacentCount = (adjacency.gap0.adjacent ? 1 : 0) + (adjacency.gap1.adjacent ? 1 : 0);

      if (adjacentCount === 0) {
        return; // No adjacent gaps
      } else if (adjacentCount === 1) {
        // Use the only adjacent gap
        if (adjacency.gap0.adjacent) {
          targetGapIdx = 0;
          targetDx = adjacency.gap0.dx;
          targetDy = adjacency.gap0.dy;
        } else {
          targetGapIdx = 1;
          targetDx = adjacency.gap1.dx;
          targetDy = adjacency.gap1.dy;
        }
      } else {
        // Both gaps adjacent - use selected gap
        targetGapIdx = selectedGapIdx;
        if (targetGapIdx === 0) {
          targetDx = adjacency.gap0.dx;
          targetDy = adjacency.gap0.dy;
        } else {
          targetDx = adjacency.gap1.dx;
          targetDy = adjacency.gap1.dy;
        }
      }
    }
    
    // Execute the move
    selectedGapIdx = targetGapIdx;
    const dir = vectorToDirection(targetDx, targetDy, false);
    if (dir) {
      tryMove(dir);
    }
  });

  resetBtn.addEventListener('click', () => {
    if (gameMode === 'challenge') {
      // In challenge mode, reset recreates the challenge
      startChallenge(challengeSeed, challengeSteps);
    } else {
      // In free play mode, reset returns to solved state
      resetState();
    }
  });
  
  shuffleBtn.addEventListener('click', () => shuffle(250));
  
  giveUpBtn.addEventListener('click', () => {
    switchToFreePlay();
    boardEl.focus();
  });

  // Timer toggle button handler
  timerToggleBtn.addEventListener('click', () => {
    // Disable button when challenge is solved
    if (challengeSolved) return;
    
    if (timerPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  });

  // Challenge dialog handlers
  challengeBtn.addEventListener('click', () => {
    challengeDialog.style.display = 'flex';
    seedInput.focus();
  });

  // Difficulty preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const steps = btn.getAttribute('data-steps');
      stepsInput.value = steps;
      stepsInput.focus();
    });
  });

  challengeCancelBtn.addEventListener('click', () => {
    challengeDialog.style.display = 'none';
    boardEl.focus();
  });

  // Daily Challenge button handler
  dailyChallengeBtn.addEventListener('click', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dailySeed = `${year}${month}${day}`;
    seedInput.value = dailySeed;
  });

  challengeStartBtn.addEventListener('click', async () => {
    const seedValue = seedInput.value.trim();
    const steps = parseInt(stepsInput.value) || 250;
    
    // Close dialog
    challengeDialog.style.display = 'none';
    
    // Determine seed: use provided value or generate random
    let seed;
    if (seedValue === '') {
      // Generate random seed (0 to 2^32-1 for LCG compatibility)
      seed = Math.floor(Math.random() * 4294967296);
      console.log(`Random seed generated: ${seed}`);
    } else {
      // Use provided numeric seed
      seed = parseInt(seedValue);
      console.log(`Using seed: ${seed}`);
    }
    
    // Start the challenge
    await startChallenge(seed, steps);
    
    boardEl.focus();
  });

  // Allow Enter key to start challenge
  challengeDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      challengeStartBtn.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      challengeCancelBtn.click();
    }
  });

  // Congratulations dialog handler
  congratsOkBtn.addEventListener('click', () => {
    congratsDialog.style.display = 'none';
    boardEl.focus();
  });

  // Allow Enter/Escape to close congrats dialog
  congratsDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      congratsOkBtn.click();
    }
  });

  // Theme toggle handler
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
  });

  // Load saved theme preference
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
  }

  // Help dialog handlers
  helpBtn.addEventListener('click', () => {
    helpDialog.style.display = 'flex';
    helpCloseBtn.focus();
  });

  helpCloseBtn.addEventListener('click', () => {
    helpDialog.style.display = 'none';
    boardEl.focus();
  });

  // Allow Enter/Escape to close help dialog
  helpDialog.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      helpCloseBtn.click();
    }
  });

  // Close dialogs when clicking outside (on overlay)
  challengeDialog.addEventListener('mousedown', (e) => {
    if (e.target === challengeDialog) {
      challengeCancelBtn.click();
    }
  });

  congratsDialog.addEventListener('mousedown', (e) => {
    if (e.target === congratsDialog) {
      congratsOkBtn.click();
    }
  });

  helpDialog.addEventListener('mousedown', (e) => {
    if (e.target === helpDialog) {
      helpCloseBtn.click();
    }
  });

  // Parse URL query parameters and auto-start challenge if present
  function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    const stepsParam = urlParams.get('steps');
    
    // Only auto-start if both parameters exist and are non-empty
    if (seedParam !== null && seedParam.trim() !== '' &&
        stepsParam !== null && stepsParam.trim() !== '') {
      const seed = parseInt(seedParam);
      const steps = parseInt(stepsParam) || 250;
      
      console.log(`Auto-starting challenge from URL: seed=${seed}, steps=${steps}`);
      
      // Start challenge after initialization
      setTimeout(async () => {
        await startChallenge(seed, steps);
        boardEl.focus();
      }, 0);
    }
  }

  // Initialize
  resetState();
  boardEl.focus();
  checkURLParams();
})();