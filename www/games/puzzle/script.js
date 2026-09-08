(function(){
  const BOARD_W = 600, BOARD_H = 450;
  const fileInput = document.getElementById('fileInput');
  const puzzleArea = document.getElementById('puzzleArea');
  const board = document.getElementById('board');
  const emptyState = document.getElementById('emptyState');
  const diffGroup = document.getElementById('diffGroup');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const guideBtn = document.getElementById('guideBtn');
  const movesStat = document.getElementById('movesStat');
  const timeStat = document.getElementById('timeStat');
  const placedStat = document.getElementById('placedStat');
  const winBanner = document.getElementById('winBanner');
  const winSummary = document.getElementById('winSummary');
  const winShuffleBtn = document.getElementById('winShuffleBtn');

  let rows = 3, cols = 3;
  let sourceImage = null;
  let bigCanvas = null;
  let pieceEls = [];
  let lockedCount = 0, totalPieces = 0, movesCount = 0;
  let timerInterval = null, startTime = 0, timerStarted = false;
  let topZ = 50;
  let guideOn = false;
  let dragOffsetX = 0, dragOffsetY = 0;

  // ---------- difficulty selection ----------
  diffGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    [...diffGroup.children].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    rows = parseInt(btn.dataset.rows, 10);
    cols = parseInt(btn.dataset.cols, 10);
    if (sourceImage) generatePuzzle();
  });

  // ---------- file upload ----------
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        sourceImage = img;
        shuffleBtn.disabled = false;
        guideBtn.disabled = false;
        generatePuzzle();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  shuffleBtn.addEventListener('click', () => { if (sourceImage) generatePuzzle(); });
  winShuffleBtn.addEventListener('click', () => { if (sourceImage) generatePuzzle(); });

  guideBtn.addEventListener('click', () => {
    guideOn = !guideOn;
    guideBtn.classList.toggle('on', guideOn);
    applyGuide();
  });

  function applyGuide(){
    if (guideOn && bigCanvas) {
      board.style.backgroundImage = `url(${bigCanvas.toDataURL()})`;
      board.style.backgroundSize = 'cover';
      board.style.opacity = '1';
      board.style.setProperty('--guide-opacity','1');
      board.querySelector('.guide-layer') && board.querySelector('.guide-layer').remove();
      let layer = document.createElement('div');
      layer.className='guide-layer';
    }
    // simpler: toggle a low-opacity image div behind pieces
    let existing = document.getElementById('guideImg');
    if (guideOn && bigCanvas) {
      if (!existing) {
        existing = document.createElement('img');
        existing.id = 'guideImg';
        existing.style.position='absolute';
        existing.style.top='0'; existing.style.left='0';
        existing.style.width=BOARD_W+'px'; existing.style.height=BOARD_H+'px';
        existing.style.borderRadius='10px';
        existing.style.opacity='0.28';
        existing.style.pointerEvents='none';
        puzzleArea.insertBefore(existing, board.nextSibling);
      }
      existing.src = bigCanvas.toDataURL();
      existing.style.display='block';
    } else if (existing) {
      existing.style.display='none';
    }
  }

  // ---------- puzzle generation ----------
  function coverCrop(img, w, h){
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / scale, sh = h / scale;
    const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    return c;
  }

  function bulgeArc(ctx, mid, u, axis2, r, steps){
    for (let k = 1; k < steps; k++){
      const theta = Math.PI - (Math.PI * k / steps);
      const x = mid.x + u.x * r * Math.cos(theta) + axis2.x * r * Math.sin(theta);
      const y = mid.y + u.y * r * Math.cos(theta) + axis2.y * r * Math.sin(theta);
      ctx.lineTo(x, y);
    }
  }

  function drawEdge(ctx, p0, p1, u, o, sign, r){
    const mid = { x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2 };
    if (sign === 0){ ctx.lineTo(p1.x, p1.y); return; }
    const bumpStart = { x: mid.x - u.x*r, y: mid.y - u.y*r };
    const bumpEnd   = { x: mid.x + u.x*r, y: mid.y + u.y*r };
    const axis2 = { x: o.x*sign, y: o.y*sign };
    ctx.lineTo(bumpStart.x, bumpStart.y);
    bulgeArc(ctx, mid, u, axis2, r, 14);
    ctx.lineTo(bumpEnd.x, bumpEnd.y);
    ctx.lineTo(p1.x, p1.y);
  }

  function piecePath(ctx, cw, ch, pad, top, right, bottom, left, r){
    const TL = {x:pad, y:pad}, TR = {x:pad+cw, y:pad}, BR = {x:pad+cw, y:pad+ch}, BL = {x:pad, y:pad+ch};
    ctx.beginPath();
    ctx.moveTo(TL.x, TL.y);
    drawEdge(ctx, TL, TR, {x:1,y:0}, {x:0,y:-1}, top, r);
    drawEdge(ctx, TR, BR, {x:0,y:1}, {x:1,y:0}, right, r);
    drawEdge(ctx, BR, BL, {x:-1,y:0}, {x:0,y:1}, bottom, r);
    drawEdge(ctx, BL, TL, {x:0,y:-1}, {x:-1,y:0}, left, r);
    ctx.closePath();
  }

  function generatePuzzle(){
    // reset state
    clearInterval(timerInterval);
    timerStarted = false;
    movesCount = 0; lockedCount = 0; topZ = 50;
    winBanner.style.display = 'none';
    updateStats();
    timeStat.textContent = '0:00';
    pieceEls.forEach(p => p.remove());
    pieceEls = [];
    const oldGuide = document.getElementById('guideImg');
    if (oldGuide) oldGuide.remove();
    emptyState.style.display = 'none';

    bigCanvas = coverCrop(sourceImage, BOARD_W, BOARD_H);
    applyGuide();

    const cellW = BOARD_W / cols, cellH = BOARD_H / rows;
    const r = Math.min(cellW, cellH) * 0.16;
    const pad = Math.ceil(r + 6);

    const vTab = []; // rows x (cols-1)
    for (let i=0;i<rows;i++){ vTab.push([]); for(let j=0;j<cols-1;j++) vTab[i].push(Math.random()<0.5?1:-1); }
    const hTab = []; // (rows-1) x cols
    for (let i=0;i<rows-1;i++){ hTab.push([]); for(let j=0;j<cols;j++) hTab[i].push(Math.random()<0.5?1:-1); }

    totalPieces = rows*cols;
    const order = [];

    for (let row=0; row<rows; row++){
      for (let col=0; col<cols; col++){
        const top = row===0 ? 0 : -hTab[row-1][col];
        const bottom = row===rows-1 ? 0 : hTab[row][col];
        const left = col===0 ? 0 : -vTab[row][col-1];
        const right = col===cols-1 ? 0 : vTab[row][col];

        const pc = document.createElement('canvas');
        pc.width = Math.round(cellW + 2*pad);
        pc.height = Math.round(cellH + 2*pad);
        const pctx = pc.getContext('2d');
        piecePath(pctx, cellW, cellH, pad, top, right, bottom, left, r);
        pctx.save();
        pctx.clip();
        pctx.drawImage(bigCanvas, col*cellW-pad, row*cellH-pad, cellW+2*pad, cellH+2*pad, 0, 0, cellW+2*pad, cellH+2*pad);
        pctx.restore();
        pctx.lineWidth = 1.25;
        pctx.strokeStyle = 'rgba(15,10,5,0.35)';
        pctx.stroke();

        pc.className = 'piece';
        pc._correctLeft = col*cellW - pad;
        pc._correctTop = row*cellH - pad;
        pc._snap = Math.max(16, Math.min(cellW, cellH) * 0.3);

        attachDragHandlers(pc);
        puzzleArea.appendChild(pc);
        pieceEls.push(pc);
        order.push(pc);
      }
    }

    // scatter into tray, shuffled
    for (let i = order.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const pieceW = order[0].width, pieceH = order[0].height;
    const gap = 10;
    const trayTop = BOARD_H + 26;
    const trayCols = Math.max(1, Math.floor((puzzleArea.clientWidth || BOARD_W) / (pieceW + gap)));
    order.forEach((pc, idx) => {
      const tr = Math.floor(idx / trayCols), tc = idx % trayCols;
      pc.style.left = (tc*(pieceW+gap)) + 'px';
      pc.style.top = (trayTop + tr*(pieceH+gap)) + 'px';
      pc.style.zIndex = 50;
    });
    const trayRows = Math.ceil(order.length / trayCols);
    puzzleArea.style.height = (trayTop + trayRows*(pieceH+gap) + 10) + 'px';

    placedStat.textContent = `0/${totalPieces}`;
  }

  function attachDragHandlers(pc){
    pc.addEventListener('pointerdown', (e) => {
      if (pc.dataset.locked === '1') return;
      e.preventDefault();
      pc.setPointerCapture(e.pointerId);
      const rect = pc.getBoundingClientRect();
      const areaRect = puzzleArea.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      pc.classList.add('dragging');
      pc.style.zIndex = ++topZ;
      if (!timerStarted){
        timerStarted = true;
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 250);
      }
    });
    pc.addEventListener('pointermove', (e) => {
      if (!pc.classList.contains('dragging')) return;
      const areaRect = puzzleArea.getBoundingClientRect();
      const nx = e.clientX - areaRect.left - dragOffsetX;
      const ny = e.clientY - areaRect.top - dragOffsetY;
      pc.style.left = nx + 'px';
      pc.style.top = ny + 'px';
    });
    pc.addEventListener('pointerup', (e) => {
      if (!pc.classList.contains('dragging')) return;
      pc.classList.remove('dragging');
      movesCount++; updateStats();
      const curLeft = parseFloat(pc.style.left), curTop = parseFloat(pc.style.top);
      const dx = curLeft - pc._correctLeft, dy = curTop - pc._correctTop;
      if (Math.hypot(dx, dy) < pc._snap){
        pc.style.left = pc._correctLeft + 'px';
        pc.style.top = pc._correctTop + 'px';
        pc.dataset.locked = '1';
        pc.classList.add('locked');
        pc.style.zIndex = 20;
        lockedCount++;
        updateStats();
        checkWin();
      }
    });
  }

  function updateTimer(){
    const secs = Math.floor((Date.now()-startTime)/1000);
    const m = Math.floor(secs/60), s = secs%60;
    timeStat.textContent = `${m}:${s.toString().padStart(2,'0')}`;
  }

  function updateStats(){
    movesStat.textContent = movesCount;
    placedStat.textContent = `${lockedCount}/${totalPieces}`;
  }

  function checkWin(){
    if (lockedCount === totalPieces){
      clearInterval(timerInterval);
      winSummary.textContent = `${timeStat.textContent} · ${movesCount} moves · ${rows}×${cols}`;
      winBanner.style.display = 'flex';
    }
  }
})();
