(() => {
  'use strict';
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const levelNames = ['ALPINE PASS', 'COASTAL HIGHWAY', 'NEON DISTRICT', 'DESERT RUN', 'NORTHSTAR CIRCUIT'];
  const worldNames = ['ALPINE PASS', 'COASTAL HIGHWAY', 'NEON DISTRICT', 'DESERT RUN', 'NORTHSTAR CIRCUIT'];
  const worlds = [
    { sky1:'#7895a0', sky2:'#d7aa83', mountain:'#475a61', far:'#77827d', ground:'#526249', road:'#434849', accent:'#e4d8c5' },
    { sky1:'#58a8b8', sky2:'#f3c28d', mountain:'#436c72', far:'#69a293', ground:'#286859', road:'#41494b', accent:'#f1e0c3' },
    { sky1:'#281d4b', sky2:'#df6a6d', mountain:'#302c4b', far:'#564565', ground:'#242b38', road:'#292a34', accent:'#8ef4ec' },
    { sky1:'#a6533d', sky2:'#efb46f', mountain:'#774737', far:'#b88359', ground:'#756044', road:'#48403d', accent:'#f6ddab' },
    { sky1:'#567e9a', sky2:'#d9c7b1', mountain:'#435a70', far:'#85909a', ground:'#667c7d', road:'#42494c', accent:'#dce5eb' }
  ];
  const cars = [
    { brand:'AUDI', model:'R8 V10', title:'R8 V10', class:'SPORT CLASS', color:'#cbd2cf', stats:[82,79,88], price:0, owned:true, desc:'Precision-engineered for the perfect racing line. All-wheel drive grip meets mid-engine balance.' },
    { brand:'BMW', model:'M4 COUPÉ', title:'M4 COUPÉ', class:'SPORT CLASS', color:'#315f9b', stats:[78,81,84], price:0, owned:true, desc:'A confident rear-drive coupe with a beautifully balanced chassis and a soundtrack to match.' },
    { brand:'TOYOTA', model:'GR SUPRA', title:'GR SUPRA', class:'SPORT CLASS', color:'#d64735', stats:[76,85,80], price:0, owned:true, desc:'Light on its feet and eager through every corner. The mountain road is its natural habitat.' },
    { brand:'AUDI', model:'RS 6 AVANT', title:'RS 6 AVANT', class:'GRAND TOURER', color:'#6d7880', stats:[88,86,75], price:1200, owned:false, desc:'A storm in a tailored suit. All-weather traction and formidable power for the long haul.' },
    { brand:'BMW', model:'M8 COMPETITION', title:'M8 COMPETITION', class:'SUPER GT', color:'#bba66c', stats:[94,91,78], price:1900, owned:false, desc:'Flagship performance with effortless speed. Built to make the horizon feel closer.' },
    { brand:'TOYOTA', model:'GR86', title:'GR86', class:'CLUB SPORT', color:'#4a8272', stats:[68,73,93], price:900, owned:false, desc:'Pure driver focus, rear-wheel drive, and a chassis that rewards a clean, committed line.' }
  ];
  const saved = (() => { try { return JSON.parse(localStorage.apexDrive || '{}'); } catch { return {}; } })();
  let coins = Number.isFinite(saved.coins) ? saved.coins : 2450;
  let maxLevel = Math.max(1, Math.min(121, saved.maxLevel || 1));
  let selectedCar = Math.max(0, Math.min(cars.length - 1, saved.selectedCar || 0));
  cars.forEach((car, i) => { if (saved.ownedCars?.includes(i)) car.owned = true; });
  let currentLevel = 1, activeView = 'home', gameState = 'menu', lastTime = 0, width = innerWidth, height = innerHeight, dpr = 1;
  let run = null, toastTimer = 0, sceneTime = 0, keyLeft = false, keyRight = false, nitroKey = false, pointerSteer = 0;
  const road = { horizon: .34, curve: 0, playerX: 0 };
  const rand = (seed) => { let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function persist() { localStorage.apexDrive = JSON.stringify({ coins, maxLevel, selectedCar, ownedCars: cars.map((c,i) => c.owned ? i : -1).filter(i => i >= 0) }); }
  function resize() { width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio || 1, 1.7); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); canvas.style.width = width + 'px'; canvas.style.height = height + 'px'; ctx.setTransform(dpr,0,0,dpr,0,0); }
  addEventListener('resize', resize); resize();
  function worldIndex(level = currentLevel) { return Math.min(4, Math.floor((level - 1) / 25)); }
  function updateStats() { $('coin-count').textContent = coins.toLocaleString(); $('progress-level').textContent = String(maxLevel).padStart(2,'0'); $('progress-fill').style.width = `${Math.max(1, (maxLevel - 1) / 120 * 100)}%`; $('car-count').textContent = `${cars.filter(c => c.owned).length.toString().padStart(2,'0')} CARS`; $('featured-car').textContent = cars[selectedCar].model; }
  function showToast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200); }
  function setView(view) {
    activeView = view;
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    if (view === 'home') { $('home-view').classList.add('active'); gameState = 'menu'; }
    else if (view === 'game') { $('game-view').classList.add('active'); }
    else { $(`${view}-view`).classList.add('active'); }
    document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    if (view === 'garage') renderGarage();
    if (view === 'levels') renderLevels();
  }
  function renderGarage() {
    const car = cars[selectedCar];
    $('garage-brand').textContent = car.brand; $('garage-model').textContent = car.model; $('garage-title').innerHTML = car.title.replace(/ (.*)/, ' <em>$1</em>');
    $('garage-category').textContent = car.class; $('garage-description').textContent = car.desc; $('garage-number').textContent = String(selectedCar + 1).padStart(2,'0');
    $('garage-car-shape').style.setProperty('--car-color', car.color); $('stat-speed').style.width = car.stats[0] + '%'; $('stat-accel').style.width = car.stats[1] + '%'; $('stat-handling').style.width = car.stats[2] + '%';
    const owned = car.owned; $('select-car').querySelector('span').textContent = owned ? (selectedCar === Number(saved.selectedCar || 0) ? 'SELECT THIS CAR' : 'SELECT THIS CAR') : `UNLOCK · ${car.price.toLocaleString()} ◆`;
    $('owned-label').textContent = owned ? '✓ OWNED' : 'LOCKED'; $('owned-label').style.color = owned ? '#84daa5' : '#f2b65c';
    $('car-picker').innerHTML = cars.map((item,i) => `<button class="car-chip ${i===selectedCar?'active':''}" data-car="${i}" title="${item.brand} ${item.model}">${item.brand.slice(0,1)}${String(i+1).padStart(2,'0')}</button>`).join('');
    $('car-picker').querySelectorAll('[data-car]').forEach(btn => btn.addEventListener('click', () => { selectedCar = Number(btn.dataset.car); renderGarage(); }));
  }
  function renderLevels(world = null) {
    const chosen = world === null ? worldIndex(currentLevel) : world;
    $('level-worlds').innerHTML = worldNames.map((name,i) => `<button class="world-tab ${chosen===i?'active':''}" data-world="${i}">${String(i*25+1).padStart(2,'0')}—${Math.min(121,(i+1)*25)} · ${name}</button>`).join('');
    $('level-worlds').querySelectorAll('[data-world]').forEach(btn => btn.addEventListener('click', () => renderLevels(Number(btn.dataset.world))));
    const start = chosen*25+1, end = Math.min(121,(chosen+1)*25);
    $('level-grid').innerHTML = Array.from({length:end-start+1},(_,n) => { const level=start+n, locked=level>maxLevel; return `<button class="level-tile ${locked?'locked':level===maxLevel?'current':level<maxLevel?'done':''}" data-level="${level}" ${locked?'disabled':''}>${String(level).padStart(2,'0')}<small>${locked?'LOCKED':level<maxLevel?'✓':'PLAY'}</small></button>`; }).join('');
    $('level-grid').querySelectorAll('[data-level]:not([disabled])').forEach(btn => btn.addEventListener('click', () => startRace(Number(btn.dataset.level))));
  }
  function startRace(level = maxLevel) {
    currentLevel = Math.max(1, Math.min(maxLevel, level));
    run = { distance:0, score:0, speed:0, lane:0, targetLane:0, nitro:100, coins:0, entities:[], spawn:1.1, elapsed:0, collisionFlash:0, finished:false, boost:false };
    $('race-level').textContent = String(currentLevel).padStart(2,'0'); $('race-location').textContent = levelNames[worldIndex(currentLevel)];
    $('pause-overlay').classList.remove('show'); $('result-overlay').classList.remove('show'); $('race-toast').classList.remove('show');
    setView('game'); gameState = 'racing'; showRaceToast('READY · SET · GO'); setTimeout(() => $('race-toast').classList.remove('show'), 1450);
  }
  function showRaceToast(text) { const el=$('race-toast'); el.textContent=text; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1050); }
  function finishRace() {
    if (!run || run.finished) return; run.finished=true; gameState='result';
    const complete = run.distance >= 1450; const reward = complete ? Math.round(300 + run.score/700) : Math.round(70 + run.distance/24);
    coins += reward; if (complete) maxLevel=Math.max(maxLevel,Math.min(121,currentLevel+1)); persist(); updateStats();
    $('result-kicker').textContent = complete ? 'STAGE COMPLETE' : 'RUN COMPLETE'; $('result-title').innerHTML = complete ? 'NICE<br /><em>DRIVING.</em>' : 'KEEP<br /><em>PUSHING.</em>';
    $('result-score').textContent = Math.floor(run.score).toLocaleString(); $('result-distance').textContent = `${Math.floor(run.distance).toLocaleString()} M`; $('result-reward').textContent = reward;
    $('next-stage').querySelector('span').textContent = complete && currentLevel < 121 ? 'CONTINUE TOUR' : 'RACE AGAIN';
    $('result-overlay').classList.add('show');
  }
  function togglePause(force) {
    if (gameState === 'racing' || (force === false && gameState === 'paused')) { gameState = force === false ? 'racing' : 'paused'; $('pause-overlay').classList.toggle('show', gameState === 'paused'); }
  }
  function steer(direction) { if (gameState !== 'racing' || !run) return; run.targetLane = Math.max(-1, Math.min(1, run.targetLane + direction)); }
  $('play-button').addEventListener('click', () => startRace(maxLevel)); $('quick-race').addEventListener('click', () => startRace(maxLevel)); $('continue-card').addEventListener('click', () => startRace(maxLevel));
  document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => setView(el.dataset.view)));
  document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => setView(el.dataset.open)));
  $('pause-button').addEventListener('click', () => togglePause()); $('resume-button').addEventListener('click', () => togglePause(false)); $('exit-race').addEventListener('click', () => { setView('home'); }); $('quit-button').addEventListener('click', () => setView('home'));
  $('result-home').addEventListener('click', () => setView('home'));
  $('next-stage').addEventListener('click', () => startRace(Math.min(121, currentLevel < maxLevel ? currentLevel + 1 : currentLevel)));
  $('select-car').addEventListener('click', () => { const car=cars[selectedCar]; if (!car.owned) { if (coins < car.price) return showToast(`You need ${(car.price-coins).toLocaleString()} more ◆`); coins-=car.price; car.owned=true; showToast(`${car.brand} ${car.model} added to your collection`); } else { selectedCar=Number(selectedCar); showToast(`${car.brand} ${car.model} selected`); } persist(); updateStats(); renderGarage(); });
  document.querySelectorAll('[data-steer]').forEach(button => { button.addEventListener('pointerdown', e => { e.preventDefault(); pointerSteer=Number(button.dataset.steer); steer(pointerSteer); }); button.addEventListener('pointerup', () => pointerSteer=0); button.addEventListener('pointerleave', () => pointerSteer=0); });
  $('nitro-button').addEventListener('pointerdown', e => {e.preventDefault();nitroKey=true}); $('nitro-button').addEventListener('pointerup',()=>nitroKey=false); $('nitro-button').addEventListener('pointerleave',()=>nitroKey=false);
  addEventListener('keydown', e => { if(['ArrowLeft','ArrowRight',' ','ArrowUp'].includes(e.key)) e.preventDefault(); if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){if(!keyLeft)steer(-1);keyLeft=true} if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){if(!keyRight)steer(1);keyRight=true} if(e.key===' '){nitroKey=true} if(e.key==='Escape'||e.key==='p'||e.key==='P'){if(gameState==='racing')togglePause();else if(gameState==='paused')togglePause(false)} });
  addEventListener('keyup', e => { if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')keyLeft=false; if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')keyRight=false; if(e.key===' ')nitroKey=false; });
  function spawnEntity() {
    const lane = Math.floor(rand(run.elapsed*9 + currentLevel*22)*3)-1;
    const type = rand(run.elapsed*5.7+8) > .84 ? 'coin' : 'traffic';
    run.entities.push({lane,type,p:0,variant:Math.floor(rand(run.elapsed*17)*3),passed:false});
  }
  function update(dt) {
    sceneTime += dt;
    if (gameState !== 'racing' || !run) return;
    run.elapsed += dt;
    const boost = nitroKey && run.nitro > 0;
    run.boost = boost;
    if (boost) run.nitro = Math.max(0,run.nitro-32*dt); else run.nitro = Math.min(100,run.nitro+5.5*dt);
    const targetSpeed = boost ? 270 : 190;
    run.speed += (targetSpeed-run.speed)*Math.min(1,dt*1.7);
    run.lane += (run.targetLane-run.lane)*Math.min(1,dt*7.5);
    const multiplier = run.speed / 190;
    run.distance += run.speed/3.6 * dt;
    run.score += (run.speed*.7 + (boost?14:0))*dt;
    road.curve = Math.sin(run.elapsed*.21 + currentLevel*.5)*.24 + Math.sin(run.elapsed*.09)*.15;
    run.spawn -= dt;
    if(run.spawn<=0){spawnEntity();run.spawn=.9+rand(run.elapsed*17)*.9;}
    for (const entity of run.entities) {
      entity.p += dt*(.18 + multiplier*.045);
      if(!entity.passed && entity.p>.83){
        entity.passed=true;
        if(entity.lane===Math.round(run.lane)){
          if(entity.type==='coin'){run.coins++;run.score+=250;showRaceToast('+ 1 ◆');}
          else {run.speed=Math.max(65,run.speed*.64);run.score=Math.max(0,run.score-180);run.collisionFlash=.28;showRaceToast('CONTACT!');}
        } else if(entity.type==='traffic') run.score+=85;
      }
    }
    run.entities=run.entities.filter(e=>e.p<1.12);
    run.collisionFlash=Math.max(0,run.collisionFlash-dt);
    $('speed-value').textContent=String(Math.round(run.speed*1.16)).padStart(3,'0');
    $('speed-fill').style.width=`${Math.min(100,run.speed/2.7)}%`;
    $('distance-value').textContent=Math.floor(run.distance).toLocaleString();
    $('distance-fill').style.width=`${Math.min(100,run.distance/1450*100)}%`;
    $('score-value').textContent=String(Math.floor(run.score)).padStart(6,'0'); $('race-coins').textContent=run.coins;
    $('boost-fill').style.width=`${run.nitro}%`;
    if(run.distance>=1450)finishRace();
  }
  function poly(points, fill, stroke=null, lineWidth=1) { ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); if(fill){ctx.fillStyle=fill;ctx.fill()} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke()} }
  function drawMountains(palette, y, heightScale, color, seed, jagged=12) {
    ctx.beginPath();ctx.moveTo(0,height);
    for(let i=0;i<=jagged;i++){
      const x=i/jagged*width;
      const peak= y - rand(seed+i*3)*heightScale;
      ctx.lineTo(x,peak);
      ctx.lineTo(x+width/jagged*.45,peak+heightScale*(.12+rand(seed+i*5)*.18));
    }
    ctx.lineTo(width,height);ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function centerAt(y) {
    const h=height*road.horizon, p=Math.max(0,Math.min(1,(y-h)/(height-h)));
    return width*.5 + Math.sin(sceneTime*.24+currentLevel*.41+p*2.7)*width*.19*p + Math.sin(sceneTime*.12+p*1.5)*width*.055*p;
  }
  function roadWidthAt(y) {
    const p=Math.max(0,Math.min(1,(y-height*road.horizon)/(height-height*road.horizon)));
    return width*(.065 + p*.62);
  }
  function drawTree(x,y,size,color,seed) {
    const trunk=size*.12;
    ctx.fillStyle='rgba(8,12,13,.46)';ctx.beginPath();ctx.ellipse(x,y+size*.05,size*.6,size*.11,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=color;ctx.fillRect(x-trunk/2,y-size*.25,trunk,size*.35);
    for(let j=0;j<3;j++){
      const w=size*(.55-j*.1), yy=y-size*(.25+j*.26);
      poly([[x-w,yy+size*.24],[x,yy-size*(.36+rand(seed+j)*.18)],[x+w,yy+size*.24]],j===0?color:shade(color,j*-.08));
    }
  }
  function shade(hex, amount) { const n=parseInt(hex.slice(1),16),r=Math.max(0,Math.min(255,(n>>16)+255*amount)),g=Math.max(0,Math.min(255,((n>>8)&255)+255*amount)),b=Math.max(0,Math.min(255,(n&255)+255*amount));return `rgb(${r|0},${g|0},${b|0})`; }
  function drawScenery(palette) {
    const sky=ctx.createLinearGradient(0,0,0,height*.55);sky.addColorStop(0,palette.sky1);sky.addColorStop(1,palette.sky2);ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const sunX=width*(.72-Math.sin(sceneTime*.08)*.025), sunY=height*.19;
    const glow=ctx.createRadialGradient(sunX,sunY,4,sunX,sunY,width*.17);glow.addColorStop(0,'rgba(255,231,184,.68)');glow.addColorStop(.12,'rgba(255,218,165,.25)');glow.addColorStop(1,'rgba(255,218,165,0)');ctx.fillStyle=glow;ctx.fillRect(sunX-width*.18,sunY-width*.18,width*.36,width*.36);
    ctx.fillStyle='#ffe2ad';ctx.beginPath();ctx.arc(sunX,sunY,Math.max(14,width*.018),0,Math.PI*2);ctx.fill();
    drawMountains(palette,height*.4,height*.25,palette.mountain,5+worldIndex()*9,12);
    drawMountains(palette,height*.48,height*.15,palette.far,33+worldIndex()*9,15);
    const ground=ctx.createLinearGradient(0,height*.48,0,height);ground.addColorStop(0,palette.ground);ground.addColorStop(1,shade(palette.ground,-.34));ctx.fillStyle=ground;ctx.fillRect(0,height*.48,width,height*.52);
    // Scrolling roadside trees, scaled with perspective.
    for(let side of [-1,1]) for(let i=0;i<13;i++){
      const phase=(i/13 + (sceneTime*.055)%1)%1, p=phase;
      const y=height*road.horizon+p*(height-height*road.horizon), rw=roadWidthAt(y);
      const x=centerAt(y)+side*(rw*.62+width*(.18+p*.15));
      const size=5+p*height*.11;
      if(x>-size&&x<width+size)drawTree(x,y,size,worldIndex()===2?(i%2?'#344150':'#3e354e'):(i%2?'#315846':'#415c47'),i+side*22);
    }
  }
  function drawRoad() {
    const hz=height*road.horizon;
    // Road shoulders and asphalt are built from perspective slices.
    for(let i=0;i<54;i++){
      const p1=i/54,p2=(i+1)/54,y1=hz+p1*(height-hz),y2=hz+p2*(height-hz),c1=centerAt(y1),c2=centerAt(y2),w1=roadWidthAt(y1),w2=roadWidthAt(y2),strip=Math.floor((sceneTime*16+p1*12))%2===0;
      poly([[c1-w1*.57,y1],[c1+w1*.57,y1],[c2+w2*.57,y2],[c2-w2*.57,y2]],strip?'rgba(234,229,214,.8)':'rgba(52,57,58,.65)');
      poly([[c1-w1*.5,y1],[c1+w1*.5,y1],[c2+w2*.5,y2],[c2-w2*.5,y2]],strip?'#484d4e':'#414748');
    }
    const horizonGlow=ctx.createLinearGradient(0,hz,0,hz+height*.14);horizonGlow.addColorStop(0,'rgba(255,233,193,.2)');horizonGlow.addColorStop(1,'rgba(255,233,193,0)');ctx.fillStyle=horizonGlow;ctx.fillRect(0,hz,width,height*.14);
    // Road markings.
    for(let lane=1;lane<=2;lane++) for(let i=0;i<18;i++){
      const phase=(i/18+(sceneTime*.34)%1)%1;
      const y=hz+phase*(height-hz), y2=Math.min(height,y+(height-hz)*(.009+phase*.025));
      const c=centerAt(y), w=roadWidthAt(y), x=c-w*.5+w*lane/3;
      ctx.fillStyle='rgba(229,230,221,.63)';ctx.fillRect(x-Math.max(1,w*.004),y,Math.max(2,w*.008),y2-y);
    }
    // Faint racing-line glow.
    ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle=worlds[worldIndex()].accent;ctx.lineWidth=Math.max(1,width*.003);ctx.beginPath();ctx.moveTo(centerAt(height*.5),height*.5);ctx.bezierCurveTo(centerAt(height*.67)-width*.06,height*.67,centerAt(height*.82)+width*.07,height*.8,centerAt(height*.97),height);ctx.stroke();ctx.restore();
    // Guard rails and posts.
    for(const side of [-1,1]){
      ctx.beginPath();for(let i=0;i<=26;i++){const p=i/26,y=hz+p*(height-hz),x=centerAt(y)+side*roadWidthAt(y)*.57; i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
      ctx.strokeStyle='rgba(221,220,205,.57)';ctx.lineWidth=Math.max(1,width*.003);ctx.stroke();
      for(let i=0;i<14;i++){const p=(i/14+(sceneTime*.2)%1)%1,y=hz+p*(height-hz),x=centerAt(y)+side*roadWidthAt(y)*.58;ctx.fillStyle='rgba(225,221,207,.65)';ctx.fillRect(x-Math.max(1,width*.002),y,Math.max(2,width*.004),2+height*p*.018)}
    }
  }
  function drawCar(x,y,w,color,style=0,player=false) {
    const h=w*.52;
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(0,h*.36,w*.57,h*.18,0,0,Math.PI*2);ctx.fill();
    // Wheels
    ctx.fillStyle='#0a0c0e';ctx.fillRect(-w*.5,h*.1,w*.13,h*.32);ctx.fillRect(w*.37,h*.1,w*.13,h*.32);
    const body=ctx.createLinearGradient(-w*.5,-h*.4,w*.5,h*.5);body.addColorStop(0,shade(color,.23));body.addColorStop(.45,color);body.addColorStop(1,shade(color,-.29));
    poly([[-w*.49,h*.17],[-w*.44,-h*.03],[-w*.28,-h*.13],[-w*.19,-h*.47],[w*.17,-h*.47],[w*.34,-h*.17],[w*.47,-h*.02],[w*.5,h*.17],[w*.4,h*.3],[-w*.4,h*.3]],body);
    poly([[-w*.25,-h*.15],[-w*.16,-h*.42],[w*.13,-h*.42],[w*.28,-h*.16]],style===1?'#18262c':'#152128');
    ctx.fillStyle=player?'#fff5dc':'#ffe6c1';ctx.shadowColor=player?'#ffd9a3':'#ffd9a3';ctx.shadowBlur=w*.12;ctx.fillRect(-w*.43,h*.05,w*.12,h*.035);ctx.fillRect(w*.31,h*.05,w*.12,h*.035);ctx.shadowBlur=0;
    if(player){ctx.fillStyle='#ff402d';ctx.fillRect(-w*.41,h*.25,w*.12,h*.05);ctx.fillRect(w*.29,h*.25,w*.12,h*.05);if(run?.boost){ctx.fillStyle='rgba(76,214,255,.75)';ctx.shadowColor='#57d9ff';ctx.shadowBlur=w*.35;poly([[-w*.24,h*.28],[-w*.13,h*.29],[-w*.18,h*.9]],'rgba(65,205,255,.8)');poly([[w*.13,h*.28],[w*.24,h*.29],[w*.18,h*.9]],'rgba(65,205,255,.8)');ctx.shadowBlur=0;}}
    ctx.restore();
  }
  function drawEntities() {
    if(!run)return;
    const ordered=run.entities.slice().sort((a,b)=>a.p-b.p);
    for(const e of ordered){
      const p=e.p,y=height*road.horizon+p*(height-height*road.horizon),rw=roadWidthAt(y),x=centerAt(y)+e.lane*rw*.31;
      const size=Math.max(4,rw*.19*p+.5);
      if(e.type==='coin'){
        ctx.save();ctx.translate(x,y-size*.35);ctx.scale(.7+Math.abs(Math.sin(sceneTime*5+e.p*10))*.3,1);ctx.fillStyle='#f6bc53';ctx.shadowColor='#ffd270';ctx.shadowBlur=size*.35;ctx.beginPath();ctx.arc(0,0,size*.22,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff0bd';ctx.lineWidth=Math.max(1,size*.04);ctx.stroke();ctx.restore();
      } else drawCar(x,y,size,['#d84a38','#317d9a','#d2a952'][e.variant],e.variant,false);
    }
  }
  function drawPlayer() {
    const y=height*.87, rw=roadWidthAt(y), x=centerAt(y)+run.lane*rw*.31;
    const carWidth=Math.min(width*.19,Math.max(58,height*.16));
    if(run.collisionFlash>0){ctx.fillStyle=`rgba(255,50,37,${run.collisionFlash*.45})`;ctx.fillRect(0,0,width,height)}
    drawCar(x,y,carWidth,cars[selectedCar].color,0,true);
    if(run.boost){ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#74dfff';ctx.fillRect(x-carWidth*.34,y+carWidth*.4,carWidth*.68,height*.2);ctx.restore()}
  }
  function draw() {
    const palette=worlds[worldIndex()];
    drawScenery(palette);drawRoad();
    if(run && gameState!=='menu' && activeView==='game'){drawEntities();if(gameState!=='result')drawPlayer()}
    else if(activeView==='home'||activeView==='garage'||activeView==='levels'){
      // Feature car on the home screen.
      const x=width*.69,y=height*.77,w=Math.min(width*.32,400);
      drawCar(x,y,w,cars[selectedCar].color,0,false);
      const glow=ctx.createRadialGradient(x,y+w*.16,3,x,y+w*.16,w*.95);glow.addColorStop(0,'rgba(255,96,53,.13)');glow.addColorStop(1,'rgba(255,96,53,0)');ctx.fillStyle=glow;ctx.fillRect(x-w,y-w*.3,w*2,w*1.2);
    }
    if(gameState==='paused'||gameState==='result'){
      ctx.fillStyle='rgba(5,8,11,.34)';ctx.fillRect(0,0,width,height);
    }
  }
  function frame(now) { const dt=Math.min(.04,(now-lastTime)/1000||0); lastTime=now;update(dt);draw();requestAnimationFrame(frame); }
  updateStats();requestAnimationFrame(frame);
})();
