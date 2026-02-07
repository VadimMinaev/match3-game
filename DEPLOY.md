# Как выкатывать обновление на сервер

## Команды (подставь свой USER и SERVER)

Перед этим: в `index.html` увеличь `?v=1` → `?v=2` и проверь игру локально.

```bash
# 1. Бэкап на сервере (только если папка уже есть; при первом деплое пропусти)
ssh USER@SERVER "[ -d /root/apps/balls ] && cp -r /root/apps/balls /root/apps/balls.bak.$(date +%Y%m%d-%H%M)"

# 2. Создать папку на сервере, если её ещё нет (при первом деплое)
ssh USER@SERVER "mkdir -p /root/apps/balls"

# 3. Залить файлы (из корня проекта match3-game)
rsync -avz --delete ./ USER@SERVER:/root/apps/balls/ --exclude=.git --exclude=debug.log --exclude=*.bak*
```

Вариант через scp (если нет rsync; папка должна существовать — создай её шагом 2):

```bash
scp index.html style.css game.js pop.mp3 fail.mp3 USER@SERVER:/root/apps/balls/
```

Откат (подставь дату бэкапа вместо YYYYMMDD-HHMM):

```bash
ssh USER@SERVER "cp -r /root/apps/balls.bak.YYYYMMDD-HHMM /root/apps/balls"
```

---

---

## Подробнее

- **Версия в index.html** — без смены `?v=...` пользователи будут кэшировать старые JS/CSS (у nginx кэш на год).
- **Бэкап** — одна папка с копией сайта на сервере, откат = перезаписать папку из бэкапа.
- Nginx перезапускать не нужно, статика подхватится сама.
