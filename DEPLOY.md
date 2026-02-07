# Как выкатывать обновление на сервер

## Команды (подставь свой USER и SERVER)

Перед этим: в `index.html` увеличь `?v=1` → `?v=2` и проверь игру локально.

```bash
# 1. Бэкап на сервере
ssh USER@SERVER "cp -r /var/www/balls.vadminaev.ru /var/www/balls.vadminaev.ru.bak.$(date +%Y%m%d-%H%M)"

# 2. Залить файлы (из корня проекта match3-game)
rsync -avz --delete ./ USER@SERVER:/var/www/balls.vadminaev.ru/ --exclude=.git --exclude=debug.log --exclude=*.bak*
```

Вариант через scp (если нет rsync):

```bash
scp index.html style.css game.js pop.mp3 fail.mp3 USER@SERVER:/var/www/balls.vadminaev.ru/
```

Откат (подставь дату бэкапа вместо YYYYMMDD-HHMM):

```bash
ssh USER@SERVER "cp -r /var/www/balls.vadminaev.ru.bak.YYYYMMDD-HHMM /var/www/balls.vadminaev.ru"
```

---

## Подробнее

- **Версия в index.html** — без смены `?v=...` пользователи будут кэшировать старые JS/CSS (у nginx кэш на год).
- **Бэкап** — одна папка с копией сайта на сервере, откат = перезаписать папку из бэкапа.
- Nginx перезапускать не нужно, статика подхватится сама.
