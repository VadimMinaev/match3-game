// === Конфигурация ===
const BOARD_SIZE = 8;
const COLORS_COUNT = 6; // от 1 до 6
const MATCH_LENGTH = 3;

let board = [];
let score = 0;
let selectedBall = null;
let isProcessing = false;
let level = 1; // Текущий уровень

// Определение мобильного устройства
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 (window.innerWidth <= 768 && 'ontouchstart' in window);

// DOM элементы
const gameBoardEl = document.getElementById('game-board');
const scoreEl = document.getElementById('score');

// Инициализация игры
function initGame() {
  createBoard();
  renderBoard();
  updateScore();
}

// Создание пустой доски
function createBoard() {
  board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(0));
  fillBoardWithNoMatches();
}

// Заполнение доски без начальных совпадений
function fillBoardWithNoMatches() {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let validColor;
      let attempts = 0;
      do {
        validColor = getRandomColor();
        board[row][col] = validColor;
        attempts++;
        if (attempts > 100) break; // защита от бесконечного цикла
      } while (hasMatchAt(row, col));
    }
  }
}

// Генерация случайного цвета (1–COLORS_COUNT)
function getRandomColor() {
  return Math.floor(Math.random() * COLORS_COUNT) + 1;
}

// Проверка, есть ли совпадение, включающее ячейку (row, col)
function hasMatchAt(row, col) {
  const color = board[row][col];
  if (color === 0) return false;

  // Горизонтально
  let count = 1;
  let i = col - 1;
  while (i >= 0 && board[row][i] === color) {
    count++;
    i--;
  }
  i = col + 1;
  while (i < BOARD_SIZE && board[row][i] === color) {
    count++;
    i++;
  }
  if (count >= MATCH_LENGTH) return true;

  // Вертикально
  count = 1;
  i = row - 1;
  while (i >= 0 && board[i][col] === color) {
    count++;
    i--;
  }
  i = row + 1;
  while (i < BOARD_SIZE && board[i][col] === color) {
    count++;
    i++;
  }
  return count >= MATCH_LENGTH;
}

// Отрисовка доски
function renderBoard() {
  gameBoardEl.innerHTML = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const ball = document.createElement('div');
      ball.className = 'ball';
      const color = board[row][col];
      if (color !== 0) {
        ball.dataset.color = color;
        ball.dataset.row = row;
        ball.dataset.col = col;
        ball.addEventListener('click', handleBallClick);
        // Мобильные свайпы
        ball.addEventListener('touchstart', handleTouchStart, { passive: true });
        ball.addEventListener('touchend', handleTouchEnd, { passive: true });
      }
      gameBoardEl.appendChild(ball);
    }
  }
}

// Обработка клика по шарику
function handleBallClick(event) {
  if (isProcessing) return;
  const ball = event.currentTarget;
  const row = parseInt(ball.dataset.row);
  const col = parseInt(ball.dataset.col);
  selectBall(row, col);
}

// === Мобильное управление ===
let touchStartPos = null;

function handleTouchStart(event) {
  if (isProcessing) return;
  const touch = event.touches[0];
  touchStartPos = { x: touch.clientX, y: touch.clientY };
}

function handleTouchEnd(event) {
  if (!touchStartPos || isProcessing) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartPos.x;
  const dy = touch.clientY - touchStartPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 30) return; // слишком короткий свайп — считаем как клик

  const ball = event.currentTarget;
  const row = parseInt(ball.dataset.row);
  const col = parseInt(ball.dataset.col);

  // Определяем направление
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  let targetRow = row;
  let targetCol = col;

  if (absDx > absDy) {
    // Горизонтальный свайп
    targetCol += dx > 0 ? 1 : -1;
  } else {
    // Вертикальный свайп
    targetRow += dy > 0 ? 1 : -1;
  }

  // Если целевая ячейка в пределах поля
  if (
    targetRow >= 0 &&
    targetRow < BOARD_SIZE &&
    targetCol >= 0 &&
    targetCol < BOARD_SIZE &&
    board[targetRow][targetCol] !== 0
  ) {
    // Автоматически выбираем текущий шарик и обмениваем
    selectedBall = { row, col };
    attemptSwap(row, col, targetRow, targetCol);
    selectedBall = null;
  }

  touchStartPos = null;
}

// Выбор шарика
function selectBall(row, col) {
  if (selectedBall === null) {
    selectedBall = { row, col };
    highlightBall(row, col, true);
  } else {
    const { row: r1, col: c1 } = selectedBall;
    if (r1 === row && c1 === col) {
      // Отмена выбора
      highlightBall(r1, c1, false);
      selectedBall = null;
    } else if (areAdjacent(r1, c1, row, col)) {
      // Попытка обмена
      highlightBall(r1, c1, false);
      attemptSwap(r1, c1, row, col).then(() => {
        selectedBall = null; // Сброс выделения после завершения обмена
      });
    } else {
      // Новый выбор
      highlightBall(r1, c1, false);
      selectedBall = { row, col };
      highlightBall(row, col, true);
    }
  }
}

// Подсветка шарика
function highlightBall(row, col, highlight) {
  const ball = getBallElement(row, col);
  if (ball) {
    ball.classList.toggle('selected', highlight);
  }
}

// Получить DOM-элемент шарика
function getBallElement(row, col) {
  return document.querySelector(`.ball[data-row="${row}"][data-col="${col}"]`);
}

// Анимация обмена местами двух шаров
async function animateSwap(r1, c1, r2, c2) {
  const ball1 = getBallElement(r1, c1);
  const ball2 = getBallElement(r2, c2);

  if (!ball1 || !ball2) return;

  // Получаем позиции ДО любых изменений
  const rect1 = ball1.getBoundingClientRect();
  const rect2 = ball2.getBoundingClientRect();
  const deltaX = rect2.left - rect1.left;
  const deltaY = rect2.top - rect1.top;

  // Настраиваем анимацию для обоих шаров
  ball1.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
  ball2.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
  ball1.style.willChange = 'transform';
  ball2.style.willChange = 'transform';
  ball1.style.zIndex = '100';
  ball2.style.zIndex = '100';

  // Принудительный reflow
  void ball1.offsetHeight;
  void ball2.offsetHeight;

  // Запускаем анимацию
  requestAnimationFrame(() => {
    ball1.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    ball2.style.transform = `translate3d(${-deltaX}px, ${-deltaY}px, 0)`;
  });

  // Ждем завершения анимации
  await new Promise(resolve => setTimeout(resolve, 250));

  // Очищаем стили
  ball1.style.transition = '';
  ball1.style.transform = '';
  ball1.style.willChange = '';
  ball1.style.zIndex = '';
  ball2.style.transition = '';
  ball2.style.transform = '';
  ball2.style.willChange = '';
  ball2.style.zIndex = '';
}

// Проверка смежности
function areAdjacent(r1, c1, r2, c2) {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return dr + dc === 1;
}

// Добавление звука лопания шариков
const popSound = new Audio('pop.mp3'); // Убедитесь, что файл pop.mp3 находится в корне проекта
popSound.addEventListener('error', () => {
  console.error('Ошибка загрузки звука pop.mp3. Проверьте наличие файла в корне проекта.');
});

// Добавление звука для неудачного перемещения
const failSound = new Audio('fail.mp3'); // Убедитесь, что файл fail.mp3 находится в корне проекта
failSound.addEventListener('error', () => {
  console.error('Ошибка загрузки звука fail.mp3. Проверьте наличие файла в корне проекта.');
});

// Добавление отладочного сообщения для проверки звука
failSound.addEventListener('canplaythrough', () => {
  console.log('Звук fail.mp3 успешно загружен и готов к воспроизведению.');
});

// Попытка обмена
async function attemptSwap(r1, c1, r2, c2) {
  if (isProcessing) return;
  isProcessing = true;

  // Анимируем обмен местами
  await animateSwap(r1, c1, r2, c2);

  // Обмен в данных
  [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
  
  // Обновляем DOM после анимации
  renderBoard();

  // Проверка на совпадения
  const matches = findAllMatches();
  const penalty = 10 * level; // Стоимость неудачного хода увеличивается с уровнем

  if (matches.length === 0) {
    // Если нет совпадений, проверяем очки
    if (score >= penalty) {
      score -= penalty; // Вычитаем очки за неудачный ход
      updateScore();
      try {
        failSound.currentTime = 0; // Сброс звука для повторного воспроизведения
        await failSound.play(); // Воспроизведение звука неудачного перемещения
      } catch (error) {
        console.error('Ошибка воспроизведения звука:', error);
      }
    } else {
      // Откат, если очков недостаточно
      [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
      renderBoard();
      isProcessing = false;
      return;
    }
  } else {
    // Удаление совпавших шариков
    await processMatches(matches);
  }

  // Проверка на переход на следующий уровень
  const nextLevelScore = 1000 * Math.pow(2, level - 1); // Уровни растут экспоненциально
  if (score >= nextLevelScore) {
    nextLevel();
    isProcessing = false;
    return;
  }

  isProcessing = false;
}

function showModal(message) {
  // Создаем затемнение фона
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  // Создаем модальное окно
  const modal = document.createElement('div');
  modal.className = 'modal';

  // Добавляем текст сообщения
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  modal.appendChild(messageEl);

  // Добавляем кнопку закрытия
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.className = 'modal-close';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  modal.appendChild(closeButton);

  // Добавляем модальное окно на затемнение
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// Обновление функции nextLevel для использования модального окна
function nextLevel() {
  level++;
  showModal(`Поздравляем! Вы достигли уровня ${level}! Теперь стоимость неудачного хода увеличена до ${10 * level} очков.`);
}

// Поиск всех совпадений
function findAllMatches() {
  const matches = new Set();

  // Горизонтальные совпадения
  for (let row = 0; row < BOARD_SIZE; row++) {
    let count = 1;
    let color = board[row][0];
    for (let col = 1; col <= BOARD_SIZE; col++) {
      if (col < BOARD_SIZE && board[row][col] === color && color !== 0) {
        count++;
      } else {
        if (count >= MATCH_LENGTH) {
          for (let i = col - count; i < col; i++) {
            matches.add(`${row},${i}`);
            addDiagonalMatches(row, i, color, matches); // Проверяем угловые совпадения
          }
        }
        if (col < BOARD_SIZE) {
          color = board[row][col];
          count = 1;
        }
      }
    }
  }

  // Вертикальные совпадения
  for (let col = 0; col < BOARD_SIZE; col++) {
    let count = 1;
    let color = board[0][col];
    for (let row = 1; row <= BOARD_SIZE; row++) {
      if (row < BOARD_SIZE && board[row][col] === color && color !== 0) {
        count++;
      } else {
        if (count >= MATCH_LENGTH) {
          for (let i = row - count; i < row; i++) {
            matches.add(`${i},${col}`);
            addDiagonalMatches(i, col, color, matches); // Проверяем угловые совпадения
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

// Добавление угловых совпадений
function addDiagonalMatches(row, col, color, matches) {
  const directions = [
    [-1, -1], [-1, 1], [1, -1], [1, 1] // Диагональные направления
  ];

  for (const [dr, dc] of directions) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === color) {
      const pos = `${r},${c}`;
      if (!matches.has(pos)) {
        matches.add(pos);
        addDiagonalMatches(r, c, color, matches); // Рекурсивно проверяем угловые совпадения
      }
    }
  }
}

// Обработка совпадений (удаление, падение, новые шары, рекурсия)
async function processMatches(matches) {
  console.log('Processing matches:', matches); // Отладочное сообщение

  // Добавляем очки
  score += matches.length * 10;
  updateScore();

  // Сначала вибрируем шарики перед удалением
  for (const { row, col } of matches) {
    const el = getBallElement(row, col);
    if (el) {
      el.classList.add('vibrating');
    }
  }
  
  // Ждём вибрацию
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Затем сжигаем шарики огнем
  for (const { row, col } of matches) {
    board[row][col] = 0;
    const el = getBallElement(row, col);
    if (el) {
      el.classList.remove('vibrating');
      el.classList.add('burning');
      console.log(`Removing ball at (${row}, ${col})`); // Отладочное сообщение
      try {
        popSound.currentTime = 0; // Сброс звука для повторного воспроизведения
        await popSound.play(); // Воспроизведение звука лопания
      } catch (error) {
        console.error('Ошибка воспроизведения звука:', error);
      }
    }
  }

  // Ждём анимацию сгорания
  await new Promise(resolve => setTimeout(resolve, 200));

  // Гравитация: шарики падают вниз
  console.log('Applying gravity'); // Отладочное сообщение
  await applyGravity();

  // Заполняем пустоты сверху новыми шарами
  console.log('Filling top rows'); // Отладочное сообщение
  await fillTopRows();

  // Проверяем новые совпадения
  const newMatches = findAllMatches();
  console.log('New matches found:', newMatches); // Отладочное сообщение
  if (newMatches.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 200)); // пауза перед каскадом
    await processMatches(newMatches);
  }
}

// Применение гравитации (падение шариков вниз) с анимацией
async function applyGravity() {
  const moves = []; // Массив перемещений для анимации

  for (let col = 0; col < BOARD_SIZE; col++) {
    let writeIndex = BOARD_SIZE - 1;
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (board[row][col] !== 0) {
        if (writeIndex !== row) {
          moves.push({
            fromRow: row,
            fromCol: col,
            toRow: writeIndex,
            toCol: col,
            color: board[row][col]
          });
        }
        board[writeIndex][col] = board[row][col];
        if (writeIndex !== row) {
          board[row][col] = 0;
        }
        writeIndex--;
      }
    }
  }

  if (moves.length === 0) {
    renderBoard();
    return;
  }

  // Сохраняем ссылки на элементы ДО рендера
  const ballElements = [];
  for (const move of moves) {
    const ball = getBallElement(move.fromRow, move.fromCol);
    if (ball) {
      ballElements.push({ move, ball });
    }
  }

  // Обновляем DOM
  renderBoard();

  // Ждем отрисовки
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // Анимация падения
  const animDuration = 400; // 400ms для плавного падения
  const startTime = performance.now();

  // Получаем конечные позиции
  const positions = [];
  for (const { move, ball } of ballElements) {
    const targetBall = getBallElement(move.toRow, move.toCol);
    if (targetBall) {
      const startRect = ball.getBoundingClientRect();
      const endRect = targetBall.getBoundingClientRect();
      positions.push({
        ball: targetBall,
        startX: startRect.left,
        startY: startRect.top,
        endX: endRect.left,
        endY: endRect.top,
        deltaX: endRect.left - startRect.left,
        deltaY: endRect.top - startRect.top
      });
    }
  }

  // Анимация через requestAnimationFrame для плавности
  return new Promise(resolve => {
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animDuration, 1);
      // Easing function (easeOutCubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      for (const pos of positions) {
        const x = pos.deltaX * eased;
        const y = pos.deltaY * eased;
        pos.ball.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        pos.ball.style.transition = 'none';
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Завершение анимации
        for (const pos of positions) {
          pos.ball.style.transform = '';
          pos.ball.style.transition = '';
        }
        resolve();
      }
    }
    requestAnimationFrame(animate);
  });
}

// Заполнение верхних строк новыми шарами
async function fillTopRows() {
  const newBalls = []; // Массив новых шаров для анимации
  
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (board[row][col] === 0) {
        board[row][col] = getRandomColor();
        newBalls.push({ row, col });
      }
    }
  }
  
  // Анимируем появление новых шаров
  if (newBalls.length > 0) {
    await animateSpawning(newBalls);
  }
}

// Анимация появления новых шаров сверху
async function animateSpawning(newBalls) {
  if (newBalls.length === 0) return;

  // Обновляем DOM
  renderBoard();

  // Ждем отрисовки
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const animDuration = 500; // 500ms для плавного падения
  const cellHeight = gameBoardEl.offsetHeight / BOARD_SIZE;
  const startTime = performance.now();

  // Подготавливаем данные для анимации
  const spawnData = [];
  for (let i = 0; i < newBalls.length; i++) {
    const { row, col } = newBalls[i];
    const ball = getBallElement(row, col);
    if (ball) {
      // Вычисляем расстояние падения (сверху до позиции)
      const spawnDistance = (row + 1) * cellHeight;
      spawnData.push({
        ball,
        startY: -spawnDistance,
        delay: i * 30 // Каскадная задержка 30ms между шарами
      });
    }
  }

  // Анимация через requestAnimationFrame
  return new Promise(resolve => {
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      let allDone = true;

      for (const data of spawnData) {
        const ballElapsed = Math.max(0, elapsed - data.delay);
        const progress = Math.min(ballElapsed / animDuration, 1);

        if (progress < 1) {
          allDone = false;
        }

        // Easing function (easeOutQuart)
        const eased = 1 - Math.pow(1 - progress, 4);

        const currentY = data.startY * (1 - eased);
        const opacity = eased;

        data.ball.style.transform = `translateY(${currentY}px)`;
        data.ball.style.opacity = opacity;
        data.ball.style.transition = 'none';
      }

      if (!allDone) {
        requestAnimationFrame(animate);
      } else {
        // Завершение анимации
        for (const data of spawnData) {
          data.ball.style.transform = '';
          data.ball.style.opacity = '';
          data.ball.style.transition = '';
        }
        resolve();
      }
    }
    requestAnimationFrame(animate);
  });
}

// Обновление счётчика
let lastFireworksScore = 0; // Последнее значение очков, когда был салют

function updateScore() {
  scoreEl.textContent = `${score} ₽`;

  // Проверяем достижение кратных 5000 баллов для салюта
  const nextFireworksThreshold = Math.floor(score / 5000) * 5000;
  if (score > 0 && nextFireworksThreshold > lastFireworksScore) {
    lastFireworksScore = nextFireworksThreshold;
    triggerFireworks();
  }
}

// Функция для создания фейерверка
function triggerFireworks() {
  const gameContainer = document.querySelector('.game-container');
  const colors = ['#ff4d4d', '#4da6ff', '#4dff4d', '#ffe066', '#d966ff', '#4dffff'];

  // Создаем несколько залпов фейерверка
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const x = gameContainer.offsetWidth * 0.2 + Math.random() * gameContainer.offsetWidth * 0.6;
      const y = gameContainer.offsetHeight * 0.2 + Math.random() * gameContainer.offsetHeight * 0.4;
      createFireworkBurst(x, y, colors);
    }, i * 400);
  }

  // Продолжаем фейерверк еще немного
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

// Создание одного залпа фейерверка
function createFireworkBurst(x, y, colors) {
  const gameContainer = document.querySelector('.game-container');
  const containerRect = gameContainer.getBoundingClientRect();
  const particleCount = 60;
  
  // Абсолютные координаты относительно viewport
  const absoluteX = containerRect.left + x;
  const absoluteY = containerRect.top + y;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'firework-particle';
    
    // Случайный цвет из палитры
    const color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.backgroundColor = color;
    particle.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}`;
    
    // Случайный угол и скорость (равномерное распределение по кругу)
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
    const velocity = 1.5 + Math.random() * 2.5;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    
    // Начальная позиция (fixed для правильного позиционирования)
    particle.style.left = `${absoluteX}px`;
    particle.style.top = `${absoluteY}px`;
    
    // Размер частицы
    const size = 3 + Math.random() * 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    document.body.appendChild(particle);
    
    // Анимация частицы
    requestAnimationFrame(() => {
      particle.style.setProperty('--vx', vx);
      particle.style.setProperty('--vy', vy);
      particle.classList.add('firework-active');
    });
    
    // Удаление частицы после анимации
    setTimeout(() => {
      if (particle.parentNode) {
        particle.remove();
      }
    }, 2000);
  }
}

// Запуск игры
document.addEventListener('DOMContentLoaded', initGame);