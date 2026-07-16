# Runbook

Оперативное руководство по управлению сервером HelperDesktop в production.

## Подключение к серверу

```bash
ssh root@178.172.137.167
cd /opt/helperdesktop
```

## Управление процессом

### Запуск

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # настройка автозапуска при перезагрузке ОС
```

### Статус

```bash
pm2 status
pm2 describe helperdesktop-server
```

### Логи

```bash
pm2 logs helperdesktop-server              # live tail
pm2 logs helperdesktop-server --lines 200  # последние 200 строк
pm2 logs helperdesktop-server --nostream   # без подписки
```

Файлы логов: `logs/server-out.log`, `logs/server-error.log` в рабочей директории PM2.

### Перезапуск

```bash
pm2 reload helperdesktop-server     # zero-downtime (graceful)
pm2 restart helperdesktop-server    # жёсткий перезапуск
```

После изменения `ecosystem.config.js`:

```bash
pm2 reload ecosystem.config.js
```

### Остановка

```bash
pm2 stop helperdesktop-server
pm2 delete helperdesktop-server
```

## Проверка работоспособности

### Health-check

```bash
curl -sS http://localhost:3001/api/health
```

Ожидаемый ответ:

```json
{ "status": "ok", "uptime": 12345, "version": "0.1.0" }
```

### WebSocket

```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://localhost:3001/ws
```

Ожидаемый ответ: `HTTP/1.1 101 Switching Protocols`.

## Распространённые проблемы

### "DB locked" / database is locked

WAL/SHM-файлы остались от предыдущего процесса. Остановите сервер, удалите их, запустите снова:

```bash
pm2 stop helperdesktop-server
rm -f /opt/helperdesktop/apps/server/helperdesktop.db-shm
rm -f /opt/helperdesktop/apps/server/helperdesktop.db-wal
pm2 start helperdesktop-server
```

### "JWT_SECRET is required in production"

`JWT_SECRET` не задан в окружении. Сервер в production не стартует с пустым секретом.

```bash
pm2 stop helperdesktop-server
export JWT_SECRET="<минимум-32-случайных-символа>"
export BOT_SHARED_SECRET="<общий-с-ботом>"
pm2 start ecosystem.config.js
pm2 save
```

Либо отредактируйте `ecosystem.config.js` и добавьте переменные в `env_production`.

### "Bot not starting"

Проверьте, что:

1. `BOT_SHARED_SECRET` на сервере и на боте совпадают.
2. `BOT_USERNAME` совпадает с реальным username бота.
3. `apps/bot/bot-config.json` существует (и не в `.gitignore`) и содержит `botToken`. Либо токен передан через `BOT_TOKEN` в окружении.
4. Бот-процесс запускается отдельной командой — он не управляется PM2 в текущем `ecosystem.config.js`. Для production запустите его через PM2 отдельным app или отдельным systemd-сервисом.

```bash
cd /opt/helperdesktop
pnpm --filter @helper/bot dev   # для отладки
pm2 start ecosystem.config.js
```

### "Port 3001 already in use"

```bash
ss -ltnp | grep 3001
# либо
lsof -i :3001
```

Убейте процесс или измените `PORT` в окружении.

### "Out of memory" / OOM-killer

PM2 настроен на перезапуск при превышении 512M. Если перезапуски слишком частые:

```bash
pm2 describe helperdesktop-server
free -h
```

Возможно, утечка. Соберите heap snapshot перед рестартом:

```bash
kill -USR2 $(pm2 pid helperdesktop-server)
```

### "CORS ошибки в браузере"

`CORS_ORIGINS` должен содержать origin клиента (схема + хост + порт) через запятую. Например:

```
CORS_ORIGINS=https://app.example.com,https://localhost:5173
```

После изменения:

```bash
pm2 reload helperdesktop-server
```

## Бэкапы

Создание бэкапа вручную:

```bash
bash /opt/helperdesktop/scripts/backup.sh
```

Из корня репозитория:

```bash
pnpm backup
```

Бэкапы хранятся в `/opt/helperdesktop/backups/db-YYYYMMDDTHHMMSSZ.db`. Хранятся 30 дней, старые удаляются автоматически.

### Восстановление

```bash
pm2 stop helperdesktop-server
cp /opt/helperdesktop/backups/db-20260101T030000Z.db \
   /opt/helperdesktop/apps/server/helperdesktop.db
pm2 start helperdesktop-server
```

Проверьте, что база открывается и сервер отвечает на `/api/health`.

## Мониторинг

### Базовая проверка из cron

```cron
*/5 * * * * curl -fsS http://localhost:3001/api/health >/dev/null || pm2 restart helperdesktop-server
```

### Ротация логов PM2

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
```

## Обновление

```bash
cd /opt/helperdesktop
git pull
pnpm install --frozen-lockfile
pnpm --filter @helper/server db:migrate
pnpm --filter @helper/server build
pnpm --filter @helper/bot build
pm2 reload ecosystem.config.js
```

Либо одной командой:

```bash
pnpm deploy
```

## Доступ к базе данных напрямую

```bash
cd /opt/helperdesktop/apps/server
sqlite3 helperdesktop.db
```

Полезные запросы:

```sql
.tables
.schema users
SELECT id, email, created_at FROM users LIMIT 10;
SELECT email, failed_attempts, locked_until FROM users WHERE failed_attempts > 0;
SELECT COUNT(*) FROM audit_log;
```

Создание пользователя напрямую (вместо `/api/auth/register`): используйте SQL-скрипт, вычисляющий scrypt-хэш в коде, либо временный CLI, если он добавлен в проект. В текущей версии CLI отсутствует.
