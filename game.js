// === Конфигурация ===
const BOARD_SIZE = 8;
const COLORS_COUNT = 6; // от 1 до 6
const MATCH_LENGTH = 3;

let board = [];
let score = 0;
let selectedBall = null;
let isProcessing = false;
let level = 1; // Текущий уровень

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

// Проверка смежности
function areAdjacent(r1, c1, r2, c2) {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return dr + dc === 1;
}

// Попытка обмена
async function attemptSwap(r1, c1, r2, c2) {
  if (isProcessing) return;
  isProcessing = true;

  // Обмен
  [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
  renderBoard();

  // Небольшая задержка для отображения обмена
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Проверка на совпадения
  const matches = findAllMatches();
  const penalty = 10 * level; // Стоимость неудачного хода увеличивается с уровнем

  if (matches.length === 0) {
    // Если нет совпадений, проверяем очки
    if (score >= penalty) {
      score -= penalty; // Вычитаем очки за неудачный ход
      updateScore();
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
  const nextLevelScore = 500 * Math.pow(2, level - 1); // Уровни растут экспоненциально
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

  // Удаляем шарики
  for (const { row, col } of matches) {
    board[row][col] = 0;
    const el = getBallElement(row, col);
    if (el) {
      el.classList.add('removing');
      console.log(`Removing ball at (${row}, ${col})`); // Отладочное сообщение
    }
  }

  // Ждём анимацию исчезновения
  await new Promise(resolve => setTimeout(resolve, 300));

  // Гравитация: шарики падают вниз
  console.log('Applying gravity'); // Отладочное сообщение
  applyGravity();

  // Заполняем пустоты сверху новыми шарами
  console.log('Filling top rows'); // Отладочное сообщение
  fillTopRows();

  // Перерисовка
  renderBoard();

  // Проверяем новые совпадения
  const newMatches = findAllMatches();
  console.log('New matches found:', newMatches); // Отладочное сообщение
  if (newMatches.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 200)); // пауза перед каскадом
    await processMatches(newMatches);
  }
}

// Применение гравитации (падение шариков вниз)
function applyGravity() {
  for (let col = 0; col < BOARD_SIZE; col++) {
    let writeIndex = BOARD_SIZE - 1;
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (board[row][col] !== 0) {
        board[writeIndex][col] = board[row][col];
        if (writeIndex !== row) {
          board[row][col] = 0;
        }
        writeIndex--;
      }
    }
  }
}

// Заполнение верхних строк новыми шарами
function fillTopRows() {
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (board[row][col] === 0) {
        board[row][col] = getRandomColor();
      }
    }
  }
}

// Обновление счётчика
function updateScore() {
  scoreEl.textContent = score;
}

// Запуск игры
document.addEventListener('DOMContentLoaded', initGame);