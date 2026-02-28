# Как выкатить обновление на сервер

## Быстрый деплой (обновление из GitHub)

### 1. Подключись к серверу
```bash
ssh root@77.239.123.15
```

### 2. Перейди в папку игры
```bash
cd /root/apps/balls
```

### 3. Сделай бэкап текущей версии
```bash
cp -r /root/apps/balls /root/apps/balls.bak.$(date +%Y%m%d-%H%M)
```

### 4. Обнови код из GitHub
```bash
git pull origin main
```

### 5. Проверь конфиг nginx
```bash
nginx -t
```
Должно показать: `syntax is ok` и `test is successful`

**Готово!** Nginx автоматически подхватит обновлённые файлы. Перезагружать nginx не нужно.

---

## Ручной деплой (через rsync/scp)

Если нужно залить файлы локально, а не из GitHub.

### Через rsync (рекомендуется)
```bash
# Из локальной папки проекта
H=root@77.239.123.15
rsync -avz --delete ./ $H:/root/apps/balls/ --exclude=.git --exclude=debug.log --exclude=*.bak*
```

### Через scp (если нет rsync)
```bash
H=root@77.239.123.15
scp index.html style.css game.js pop.mp3 fail.mp3 $H:/root/apps/balls/
```

### ⚠️ Важно перед ручным деплоем
Увеличь версию в `index.html`:
```html
<link rel="stylesheet" href="style.css?v=3" />
<script src="game.js?v=3"></script>
```
Без смены `?v=...` пользователи будут видеть старую версию из кэша.

---

## Откат к предыдущей версии

### 1. Найди последний бэкап
```bash
ls -la /root/apps/balls.bak.*
```

### 2. Восстанови из бэкапа
```bash
# Подставь дату нужного бэкапа
cp -r /root/apps/balls.bak.20260207-1227 /root/apps/balls
```

### 3. Проверь nginx
```bash
nginx -t
```

---

## Структура на сервере

```
/root/apps/balls/          # Папка игры
├── index.html             # Главная страница
├── game.js                # Логика игры
├── style.css              # Стили
├── pop.mp3                # Звук лопания
├── fail.mp3               # Звук ошибки
├── DEPLOY.md              # Эта инструкция
├── balls.vadminaev.ru.conf # Конфиг nginx (не трогать!)
└── .git/                  # Git репозиторий
```

### Конфиг nginx
Файл `/root/apps/balls/balls.vadminaev.ru.conf` должен быть подключен в nginx:
```bash
# Проверь, что конфиг подключён
ls -la /etc/nginx/sites-enabled/ | grep balls

# Если нет — создай ссылку
ln -s /root/apps/balls/balls.vadminaev.ru.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## Проверка после деплоя

1. Открой https://balls.vadminaev.ru
2. Нажми **Ctrl+F5** (сброс кэша)
3. Проверь, что игра работает
4. Проверь консоль браузера на ошибки (F12)

---

## Частые проблемы

### ❌ Пользователи видят старую версию
**Решение:** Увеличь версию в `index.html` (`?v=3` → `?v=4`)

### ❌ Ошибка 404 после деплоя
**Решение:** Проверь, что файлы загрузились:
```bash
ls -la /root/apps/balls/
```

### ❌ Nginx не подхватывает изменения
**Решение:** Перезагрузи nginx:
```bash
systemctl reload nginx
```

### ❌ Сломалась игра после обновления
**Решение:** Откатись к бэкапу (см. выше)

---

## Коммит и пуш изменений в GitHub

Если редактировал файлы локально и хочешь отправить на сервер:

```bash
# В локальной папке проекта
git add .
git commit -m "Описание изменений"
git push origin main
```

Затем на сервере выполни `git pull origin main` (см. "Быстрый деплой").
