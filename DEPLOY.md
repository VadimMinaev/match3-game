# Как выкатывать обновление на сервер

Перед деплоем: в `index.html` увеличь `?v=1` → `?v=2`, проверь игру локально. Выполняй из корня проекта (match3-game).

## Деплой

```bash
# Куда подключаемся (подставь свой хост, если не этот)
H=root@77.239.123.15

# 1. Бэкап (при первом деплое можно пропустить)
ssh $H "[ -d /root/apps/balls ] && cp -r /root/apps/balls /root/apps/balls.bak.$(date +%Y%m%d-%H%M)"

# 2. Папка на сервере (если ещё нет)
ssh $H "mkdir -p /root/apps/balls"

# 3. Залить файлы
rsync -avz --delete ./ $H:/root/apps/balls/ --exclude=.git --exclude=debug.log --exclude=*.bak*
```

Через scp (если нет rsync):

```bash
H=root@77.239.123.15
scp index.html style.css game.js pop.mp3 fail.mp3 $H:/root/apps/balls/
```

## Откат

```bash
H=root@77.239.123.15
# Подставь дату бэкапа, например 20250207-1217
ssh $H "cp -r /root/apps/balls.bak.YYYYMMDD-HHMM /root/apps/balls"
```

---

## Подробнее

- **Версия в index.html** — без смены `?v=...` пользователи будут кэшировать старые JS/CSS (у nginx кэш на год).
- **Бэкап** — одна папка с копией сайта на сервере, откат = перезаписать папку из бэкапа.
- Nginx перезапускать не нужно, статика подхватится сама.
