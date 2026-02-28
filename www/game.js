// === Конфигурация ===
const BOARD_SIZE = 8;
const COLORS_COUNT = 6;
const MATCH_LENGTH = 3;

// === Игровое состояние ===
let board = [];
let score = 0;
let moves = 0;
let selectedBall = null;
let isProcessing = false;
let isPaused = false;
let combo = 0;
let lastFireworksScore = 0;

// === Прогресс и сохранения ===
let gameState = {
  highScore: 0,
  bestCombo: 0,
  totalMatches: 0,
  gamesPlayed: 0,
  achievements: [],
  difficulty: 'normal', // easy, normal, hard
  dailyChallenge: null,
  dailyProgress: 0
};

// === Бонусы на доске ===
// Типы бонусов: 101=бомба(3x3), 102=линейная(гор), 103=линейная(верт), 104=радужная

// === DOM элементы ===
const gameBoardEl = document.getElementById('game-board');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const comboEl = document.getElementById('combo');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');

// === Звуки ===
const sounds = {
  pop: new Audio('pop.mp3'),
  fail: new Audio('fail.mp3'),
  combo: null,
  level: null,
  bomb: null
};

// Инициализация звуков
sounds.pop.addEventListener('error', () => console.warn('pop.mp3 не найден'));
sounds.fail.addEventListener('error', () => console.warn('fail.mp3 не найден'));

// === Определение мобильного устройства ===
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                 (window.innerWidth <= 768 && 'ontouchstart' in window);

// === Достижения ===
const ACHIEVEMENTS = [
  { id: 'first_match', name: 'Первый матч!', desc: 'Соберите первые 3 шарика', condition: (s) => s.totalMatches >= 1 },
  { id: 'combo_5', name: 'Комбо-мастер', desc: 'Сделайте комбо x5', condition: (s) => s.bestCombo >= 5 },
  { id: 'score_5000', name: 'Пять тысяч!', desc: 'Наберите 5000 очков', condition: (s) => s.highScore >= 5000 },
  { id: 'score_10000', name: 'Десять тысяч!', desc: 'Наберите 10000 очков', condition: (s) => s.highScore >= 10000 },
  { id: 'games_10', name: 'Опытный игрок', desc: 'Сыграйте 10 игр', condition: (s) => s.gamesPlayed >= 10 },
  { id: 'perfect', name: 'Идеальная игра', desc: 'Наберите 20000+ очков', condition: (s) => s.highScore >= 20000 }
];

// === Инициализация ===
function initGame() {
  loadProgress();
  generateDailyChallenge();
  createBoard();
  renderBoard();
  updateUI();
  setupEventListeners();
  checkAchievements();
}

// === Сохранение и загрузка ===
function loadProgress() {
  try {
    const saved = localStorage.getItem('match3_save');
    if (saved) {
      const parsed = JSON.parse(saved);
      gameState = { ...gameState, ...parsed };
    }
  } catch (e) {
    console.warn('Не удалось загрузить сохранение:', e);
  }
}

function saveProgress() {
  try {
    localStorage.setItem('match3_save', JSON.stringify(gameState));
  } catch (e) {
    console.warn('Не удалось сохранить:', e);
  }
}

function generateDailyChallenge() {
  const today = new Date().toDateString();
  if (!gameState.dailyChallenge || gameState.dailyChallenge.date !== today) {
    const colors = [1, 2, 3, 4, 5, 6];
    gameState.dailyChallenge = {
      date: today,
      targetColor: colors[Math.floor(Math.random() * colors.length)],
      target: 20 + Math.floor(Math.random() * 20),
      progress: 0
    };
    gameState.dailyProgress = 0;
  }
}

// === Создание доски ===
function createBoard() {
  board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
  fillBoardWithNoMatches();
  combo = 0;
  moves = 0;
}

function fillBoardWithNoMatches() {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let validColor;
      let attempts = 0;
      do {
        validColor = getRandomColor();
        board[row][col] = validColor;
        attempts++;
        if (attempts > 100) break;
      } while (hasMatchAt(row, col));
    }
  }
}

function getRandomColor() {
  // На сложном уровне реже выпадают нужные цвета
  if (gameState.difficulty === 'hard') {
    return Math.floor(Math.random() * COLORS_COUNT) + 1;
  }
  return Math.floor(Math.random() * COLORS_COUNT) + 1;
}

function hasMatchAt(row, col) {
  const color = board[row][col];
  if (color === 0 || color > 100) return false;

  let count = 1;
  let i = col - 1;
  while (i >= 0 && board[row][i] === color) { count++; i--; }
  i = col + 1;
  while (i < BOARD_SIZE && board[row][i] === color) { count++; i++; }
  if (count >= MATCH_LENGTH) return true;

  count = 1;
  i = row - 1;
  while (i >= 0 && board[i][col] === color) { count++; i--; }
  i = row + 1;
  while (i < BOARD_SIZE && board[i][col] === color) { count++; i++; }
  return count >= MATCH_LENGTH;
}

// === Отрисовка ===
function renderBoard() {
  gameBoardEl.innerHTML = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const ball = document.createElement('div');
      ball.className = 'ball';
      const value = board[row][col];
      
      if (value !== 0) {
        if (value > 100) {
          ball.dataset.bonus = value;
        } else {
          ball.dataset.color = value;
        }
        ball.dataset.row = row;
        ball.dataset.col = col;
        ball.addEventListener('click', handleBallClick);
        ball.addEventListener('touchstart', handleTouchStart, { passive: true });
        ball.addEventListener('touchend', handleTouchEnd, { passive: true });
      }
      gameBoardEl.appendChild(ball);
    }
  }
}

function setupEventListeners() {
  if (pauseBtn) {
    pauseBtn.addEventListener('click', togglePause);
  }
  if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'p') togglePause();
    if (e.key === 'r') restartGame();
  });
}

// === Управление ===
function handleBallClick(event) {
  if (isProcessing || isPaused) return;
  const ball = event.currentTarget;
  const row = parseInt(ball.dataset.row);
  const col = parseInt(ball.dataset.col);
  selectBall(row, col);
}

let touchStartPos = null;
let touchTarget = null;

function handleTouchStart(event) {
  if (isProcessing || isPaused) return;
  const touch = event.touches[0];
  touchStartPos = { x: touch.clientX, y: touch.clientY };
  touchTarget = event.currentTarget;
}

function handleTouchEnd(event) {
  if (!touchStartPos || isProcessing || isPaused) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartPos.x;
  const dy = touch.clientY - touchStartPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Если свайп короткий — игнорируем (сработает клик)
  if (distance < 50) {
    touchStartPos = null;
    touchTarget = null;
    return;
  }

  // Это свайп — предотвращаем клик и меняем шары
  event.preventDefault();
  
  if (!touchTarget) return;
  const row = parseInt(touchTarget.dataset.row);
  const col = parseInt(touchTarget.dataset.col);

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  let targetRow = row;
  let targetCol = col;

  if (absDx > absDy) {
    targetCol += dx > 0 ? 1 : -1;
  } else {
    targetRow += dy > 0 ? 1 : -1;
  }

  if (targetRow >= 0 && targetRow < BOARD_SIZE &&
      targetCol >= 0 && targetCol < BOARD_SIZE &&
      board[targetRow][targetCol] !== 0) {
    selectedBall = { row, col };
    attemptSwap(row, col, targetRow, targetCol);
    selectedBall = null;
  }
  touchStartPos = null;
  touchTarget = null;
}

function selectBall(row, col) {
  if (selectedBall === null) {
    selectedBall = { row, col };
    highlightBall(row, col, true);
  } else {
    const { row: r1, col: c1 } = selectedBall;
    if (r1 === row && c1 === col) {
      highlightBall(r1, c1, false);
      selectedBall = null;
    } else if (areAdjacent(r1, c1, row, col)) {
      highlightBall(r1, c1, false);
      attemptSwap(r1, c1, row, col).then(() => { selectedBall = null; });
    } else {
      highlightBall(r1, c1, false);
      selectedBall = { row, col };
      highlightBall(row, col, true);
    }
  }
}

function highlightBall(row, col, highlight) {
  const ball = getBallElement(row, col);
  if (ball) ball.classList.toggle('selected', highlight);
}

function getBallElement(row, col) {
  return document.querySelector(`.ball[data-row="${row}"][data-col="${col}"]`);
}

function areAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

// === Анимация обмена ===
async function animateSwap(r1, c1, r2, c2) {
  const ball1 = getBallElement(r1, c1);
  const ball2 = getBallElement(r2, c2);
  if (!ball1 || !ball2) return;

  const rect1 = ball1.getBoundingClientRect();
  const rect2 = ball2.getBoundingClientRect();
  const deltaX = rect2.left - rect1.left;
  const deltaY = rect2.top - rect1.top;

  ball1.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
  ball2.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
  ball1.style.zIndex = '100';
  ball2.style.zIndex = '100';

  void ball1.offsetHeight;
  void ball2.offsetHeight;

  requestAnimationFrame(() => {
    ball1.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    ball2.style.transform = `translate3d(${-deltaX}px, ${-deltaY}px, 0)`;
  });

  await new Promise(resolve => setTimeout(resolve, 200));

  ball1.style.cssText = '';
  ball2.style.cssText = '';
}

// === Игровая логика ===
async function attemptSwap(r1, c1, r2, c2) {
  if (isProcessing || isPaused) return;
  isProcessing = true;

  await animateSwap(r1, c1, r2, c2);

  [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
  renderBoard();

  const matches = findAllMatches();
  const penalty = getPenalty();

  if (matches.length === 0) {
    if (score >= penalty) {
      score -= penalty;
      updateUI();
      playSound('fail');
    } else {
      [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
      renderBoard();
      isProcessing = false;
      return;
    }
  } else {
    moves++;
    combo = 0;
    await processMatches(matches);
  }

  checkLevelUp();
  saveProgress();
  isProcessing = false;
}

function getPenalty() {
  const penalties = { easy: 5, normal: 10, hard: 15 };
  return penalties[gameState.difficulty] || 10;
}

// === Поиск совпадений ===
function findAllMatches() {
  const matches = new Set();

  for (let row = 0; row < BOARD_SIZE; row++) {
    let count = 1;
    let color = board[row][0];
    for (let col = 1; col <= BOARD_SIZE; col++) {
      if (col < BOARD_SIZE && board[row][col] === color && color !== 0 && color < 100) {
        count++;
      } else {
        if (count >= MATCH_LENGTH) {
          for (let i = col - count; i < col; i++) {
            matches.add(`${row},${i}`);
          }
          // Создаём бонус за 4+ совпадения
          if (count >= 4) {
            createBonus(row, col - Math.floor(count/2), count);
          }
        }
        if (col < BOARD_SIZE) {
          color = board[row][col];
          count = 1;
        }
      }
    }
  }

  for (let col = 0; col < BOARD_SIZE; col++) {
    let count = 1;
    let color = board[0][col];
    for (let row = 1; row <= BOARD_SIZE; row++) {
      if (row < BOARD_SIZE && board[row][col] === color && color !== 0 && color < 100) {
        count++;
      } else {
        if (count >= MATCH_LENGTH) {
          for (let i = row - count; i < row; i++) {
            matches.add(`${i},${col}`);
          }
          if (count >= 4) {
            createBonus(row - Math.floor(count/2), col, count);
          }
        }
        if (row < BOARD_SIZE) {
          color = board[row][col];
          count = 1;
        }
      }
    }
  }

  return Array.from(matches).map(pos => {
    const [r, c] = pos.split(',').map(Number);
    return { row: r, col: c };
  });
}

// === Создание бонуса ===
function createBonus(row, col, count) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
  if (board[row][col] === 0) return;
  
  // 4 шара = бомба, 5+ = радужный
  const bonusType = count >= 5 ? 104 : 101;
  board[row][col] = bonusType;
}

// === Обработка совпадений ===
async function processMatches(matches) {
  combo++;
  gameState.totalMatches += matches.length;
  
  // Множитель за комбо
  const multiplier = 1 + (combo - 1) * 0.5;
  const baseScore = matches.length * 10;
  const earned = Math.floor(baseScore * multiplier);
  
  score += earned;
  updateUI();

  // Визуальные эффекты
  for (const { row, col } of matches) {
    const el = getBallElement(row, col);
    if (el) {
      el.classList.add('burning');
      if (combo > 2) {
        createParticles(el);
      }
    }
  }

  playSound('pop');
  if (combo > 1) showComboText(combo);

  await new Promise(resolve => setTimeout(resolve, 200));

  // Удаляем шарики
  for (const { row, col } of matches) {
    board[row][col] = 0;
  }

  await applyGravity();
  await fillTopRows();

  // Проверяем бонусы
  await checkBonusMatches();

  const newMatches = findAllMatches();
  if (newMatches.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 150));
    await processMatches(newMatches);
  }

  checkAchievements();
}

// === Проверка бонусов ===
async function checkBonusMatches() {
  let activated = false;
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const value = board[row][col];
      if (value === 101) { // Бомба
        activateBomb(row, col);
        activated = true;
      } else if (value === 104) { // Радужный
        activateRainbow(row, col);
        activated = true;
      }
    }
  }
  
  if (activated) {
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

function activateBomb(row, col) {
  board[row][col] = 0;
  // Взрыв 3x3
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        board[r][c] = 0;
      }
    }
  }
  createExplosion(row, col);
}

function activateRainbow(row, col) {
  // Удаляем все шары одного цвета
  const colors = [1, 2, 3, 4, 5, 6];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === randomColor) {
        board[r][c] = 0;
      }
    }
  }
  board[row][col] = 0;
}

// === Гравитация ===
async function applyGravity() {
  const moves = [];

  for (let col = 0; col < BOARD_SIZE; col++) {
    let writeIndex = BOARD_SIZE - 1;
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (board[row][col] !== 0) {
        if (writeIndex !== row) {
          moves.push({ fromRow: row, fromCol: col, toRow: writeIndex, toCol: col });
        }
        board[writeIndex][col] = board[row][col];
        if (writeIndex !== row) board[row][col] = 0;
        writeIndex--;
      }
    }
  }

  if (moves.length === 0) {
    renderBoard();
    return;
  }

  const ballElements = [];
  for (const move of moves) {
    const ball = getBallElement(move.fromRow, move.fromCol);
    if (ball) ballElements.push({ move, ball });
  }

  renderBoard();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const positions = [];
  for (const { move, ball } of ballElements) {
    const targetBall = getBallElement(move.toRow, move.toCol);
    if (targetBall) {
      const startRect = ball.getBoundingClientRect();
      const endRect = targetBall.getBoundingClientRect();
      positions.push({
        ball: targetBall,
        deltaX: endRect.left - startRect.left,
        deltaY: endRect.top - startRect.top
      });
    }
  }

  const animDuration = 350;
  const startTime = performance.now();

  return new Promise(resolve => {
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      for (const pos of positions) {
        pos.ball.style.transform = `translate3d(${pos.deltaX * eased}px, ${pos.deltaY * eased}px, 0)`;
        pos.ball.style.transition = 'none';
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        for (const pos of positions) {
          pos.ball.style.cssText = '';
        }
        resolve();
      }
    }
    requestAnimationFrame(animate);
  });
}

// === Заполнение сверху ===
async function fillTopRows() {
  const newBalls = [];
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (board[row][col] === 0) {
        board[row][col] = getRandomColor();
        newBalls.push({ row, col });
      }
    }
  }

  if (newBalls.length > 0) {
    await animateSpawning(newBalls);
  }
}

async function animateSpawning(newBalls) {
  if (newBalls.length === 0) return;

  renderBoard();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const animDuration = 400;
  const cellHeight = gameBoardEl.offsetHeight / BOARD_SIZE;
  const startTime = performance.now();

  const spawnData = [];
  for (let i = 0; i < newBalls.length; i++) {
    const { row, col } = newBalls[i];
    const ball = getBallElement(row, col);
    if (ball) {
      spawnData.push({
        ball,
        startY: -(row + 1) * cellHeight,
        delay: i * 25
      });
    }
  }

  return new Promise(resolve => {
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      let allDone = true;

      for (const data of spawnData) {
        const ballElapsed = Math.max(0, elapsed - data.delay);
        const progress = Math.min(ballElapsed / animDuration, 1);
        if (progress < 1) allDone = false;

        const eased = 1 - Math.pow(1 - progress, 4);
        data.ball.style.transform = `translateY(${data.startY * (1 - eased)}px)`;
        data.ball.style.opacity = eased;
        data.ball.style.transition = 'none';
      }

      if (!allDone) {
        requestAnimationFrame(animate);
      } else {
        for (const data of spawnData) {
          data.ball.style.cssText = '';
        }
        resolve();
      }
    }
    requestAnimationFrame(animate);
  });
}

// === UI ===
function updateUI() {
  if (scoreEl) scoreEl.textContent = `${score} ₽`;
  if (movesEl) movesEl.textContent = `Ходы: ${moves}`;
  if (comboEl && combo > 1) {
    comboEl.textContent = `Комбо x${combo}!`;
    comboEl.style.opacity = '1';
  } else if (comboEl) {
    comboEl.style.opacity = '0';
  }

  // Обновляем прогресс ежедневного задания
  if (gameState.dailyChallenge) {
    const colorMatches = gameState.dailyChallenge.target;
    const progress = gameState.dailyProgress;
    const dailyEl = document.getElementById('daily-progress');
    if (dailyEl) {
      dailyEl.textContent = `Ежедневно: ${progress}/${colorMatches}`;
    }
  }
}

function showComboText(comboCount) {
  let el = document.getElementById('combo');
  if (!el) {
    el = document.createElement('div');
    el.id = 'combo';
    el.className = 'combo-text';
    document.querySelector('.game-container').appendChild(el);
  }
  el.textContent = `Комбо x${comboCount}!`;
  el.style.animation = 'none';
  void el.offsetHeight;
  el.style.animation = 'comboPop 0.5s ease-out';
}

function createParticles(ballEl) {
  const rect = ballEl.getBoundingClientRect();
  const colors = ['#ff4d4d', '#4da6ff', '#4dff4d', '#ffe066'];
  
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = rect.left + rect.width/2 + 'px';
    particle.style.top = rect.top + rect.height/2 + 'px';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    document.body.appendChild(particle);

    const angle = (Math.PI * 2 * i) / 8;
    const velocity = 50 + Math.random() * 30;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;

    particle.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
    ], {
      duration: 500,
      easing: 'ease-out'
    }).onfinish = () => particle.remove();
  }
}

function createExplosion(row, col) {
  const ball = getBallElement(row, col);
  if (ball) createParticles(ball);
}

function playSound(name) {
  if (sounds[name]) {
    sounds[name].currentTime = 0;
    sounds[name].play().catch(() => {});
  }
}

// === Пауза и рестарт ===
function togglePause() {
  isPaused = !isPaused;
  const overlay = document.getElementById('pause-overlay');
  
  if (isPaused) {
    if (!overlay) {
      const ov = document.createElement('div');
      ov.id = 'pause-overlay';
      ov.className = 'pause-overlay';
      ov.innerHTML = '<div class="pause-menu"><h2>Пауза</h2><button id="resume-btn">Продолжить</button><button id="quit-btn">Выйти</button></div>';
      document.querySelector('.game-container').appendChild(ov);
      
      document.getElementById('resume-btn').addEventListener('click', togglePause);
      document.getElementById('quit-btn').addEventListener('click', () => {
        restartGame();
        togglePause();
      });
    }
    overlay.style.display = 'flex';
  } else if (overlay) {
    overlay.style.display = 'none';
  }
}

function restartGame() {
  gameState.gamesPlayed++;
  if (score > gameState.highScore) {
    gameState.highScore = score;
  }
  if (combo > gameState.bestCombo) {
    gameState.bestCombo = combo;
  }
  saveProgress();
  
  score = 0;
  moves = 0;
  combo = 0;
  isPaused = false;
  isProcessing = false;
  
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.remove();
  
  createBoard();
  renderBoard();
  updateUI();
}

function checkLevelUp() {
  const thresholds = { easy: 500, normal: 1000, hard: 1500 };
  const threshold = thresholds[gameState.difficulty] || 1000;
  
  if (score > 0 && score % threshold === 0) {
    triggerFireworks();
  }
}

// === Достижения ===
function checkAchievements() {
  for (const achievement of ACHIEVEMENTS) {
    if (!gameState.achievements.includes(achievement.id) && 
        achievement.condition(gameState)) {
      gameState.achievements.push(achievement.id);
      showAchievement(achievement);
      saveProgress();
    }
  }
}

function showAchievement(achievement) {
  const el = document.createElement('div');
  el.className = 'achievement-toast';
  el.innerHTML = `<strong>🏆 ${achievement.name}</strong><br>${achievement.desc}`;
  document.body.appendChild(el);
  
  setTimeout(() => {
    el.style.animation = 'achievementSlideOut 0.5s ease forwards';
    setTimeout(() => el.remove(), 500);
  }, 3000);
}

// === Фейерверк ===
function triggerFireworks() {
  const gameContainer = document.querySelector('.game-container');
  const colors = ['#ff4d4d', '#4da6ff', '#4dff4d', '#ffe066', '#d966ff', '#4dffff'];

  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const x = gameContainer.offsetWidth * 0.2 + Math.random() * gameContainer.offsetWidth * 0.6;
      const y = gameContainer.offsetHeight * 0.2 + Math.random() * gameContainer.offsetHeight * 0.4;
      createFireworkBurst(x, y, colors);
    }, i * 400);
  }

  setTimeout(() => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = gameContainer.offsetWidth * 0.2 + Math.random() * gameContainer.offsetWidth * 0.6;
        const y = gameContainer.offsetHeight * 0.2 + Math.random() * gameContainer.offsetHeight * 0.4;
        createFireworkBurst(x, y, colors);
      }, i * 300);
    }
  }, 3000);
}

function createFireworkBurst(x, y, colors) {
  const gameContainer = document.querySelector('.game-container');
  const containerRect = gameContainer.getBoundingClientRect();
  const absoluteX = containerRect.left + x;
  const absoluteY = containerRect.top + y;

  for (let i = 0; i < 60; i++) {
    const particle = document.createElement('div');
    particle.className = 'firework-particle';
    const color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.backgroundColor = color;
    particle.style.boxShadow = `0 0 10px ${color}`;
    particle.style.left = `${absoluteX}px`;
    particle.style.top = `${absoluteY}px`;
    particle.style.width = `${3 + Math.random() * 4}px`;
    particle.style.height = particle.style.width;
    document.body.appendChild(particle);

    const angle = (Math.PI * 2 * i) / 60;
    const velocity = 2 + Math.random() * 3;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;

    requestAnimationFrame(() => {
      particle.style.setProperty('--vx', vx);
      particle.style.setProperty('--vy', vy);
      particle.classList.add('firework-active');
    });

    setTimeout(() => { if (particle.parentNode) particle.remove(); }, 2000);
  }
}

// === Старт ===
document.addEventListener('DOMContentLoaded', initGame);
