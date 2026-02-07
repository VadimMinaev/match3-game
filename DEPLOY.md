# Как выкатывать обновление на сервер

## Перед каждым деплоем

1. **Поднять версию в `index.html`**  
   Замените `?v=1` на `?v=2`, `?v=3` и т.д. в ссылках на `style.css` и `game.js`.  
   Так браузеры подтянут новые файлы, а не старые из кэша (у вас в nginx стоит кэш на год для .js/.css).

2. **Проверить локально**  
   Запустите игру у себя (например, через Live Server или `python -m http.server`), убедитесь, что всё работает.

## Выкат на сервер

3. **Сделать бэкап текущей версии на сервере** (на всякий случай):
   ```bash
   ssh user@server "cp -r /var/www/balls.vadminaev.ru /var/www/balls.vadminaev.ru.bak.$(date +%Y%m%d-%H%M)"
   ```

4. **Залить файлы** (из папки проекта):
   ```bash
   rsync -avz --delete ./ user@server:/var/www/balls.vadminaev.ru/ --exclude=.git --exclude=debug.log --exclude=*.bak*
   ```
   Или через scp:
   ```bash
   scp index.html style.css game.js pop.mp3 fail.mp3 user@server:/var/www/balls.vadminaev.ru/
   ```

5. **Не трогать nginx**  
   Конфиг менять не нужно. Перезагрузка nginx не требуется для обновления статики.

## Если что-то пошло не так

6. **Откат** — вернуть бэкап:
   ```bash
   ssh user@server "cp -r /var/www/balls.vadminaev.ru.bak.YYYYMMDD-HHMM /var/www/balls.vadminaev.ru"
   ```
   Либо вручную залить предыдущую версию из git: `git checkout HEAD~1 -- index.html game.js style.css` и снова задеплоить.

## Кратко

| Шаг | Действие |
|-----|----------|
| 1 | В `index.html` увеличить `?v=1` → `?v=2` |
| 2 | Проверить локально |
| 3 | Бэкап на сервере |
| 4 | Залить файлы (rsync/scp) |
| 5 | При проблемах — откат из бэкапа |
