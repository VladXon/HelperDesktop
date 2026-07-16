# Деплой

Полное руководство по развёртыванию HelperDesktop на production-сервере.

## Целевой сервер

- Хост: `178.172.137.167`
- Пользователь: `root` (или другой с sudo)
- ОС: Ubuntu 22.04 LTS (или новее)
- Директория: `/opt/helperdesktop`

## Требования

На сервере должны быть установлены:

- Node.js 20.x
- pnpm 9.x
- sqlite3 (CLI)
- pm2
- nginx (для reverse-proxy)
- certbot (для Let's Encrypt)
- openssh-server

## Первичная настройка сервера

```bash
ssh root@178.172.137.167

apt update && apt upgrade -y
apt install -y sqlite3 nginx certbot python3-certbot-nginx

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# pnpm 9
npm i -g pnpm@9

# pm2
npm i -g pm2

# Пользователь для приложения (опционально)
useradd -m -s /bin/bash helper || true

# Директория
mkdir -p /opt/helperdesktop
cd /opt/helperdesktop

# Клонирование
git clone <repository-url> .

# Установка зависимостей
pnpm install --frozen-lockfile

# Миграции
pnpm --filter @helper/server db:migrate

# Сборка
pnpm --filter @helper/server build
pnpm --filter @helper/bot build

# Переменные окружения
cp apps/server/.env.example apps/server/.env
nano apps/server/.env
# Установите:
#   JWT_SECRET=<минимум 32 случайных символа>
#   BOT_SHARED_SECRET=<общий с ботом>
#   BOT_USERNAME=<username бота без @>
#   CORS_ORIGINS=https://api.yourdomain.com

# Запуск
pm2 start ecosystem.config.js
pm2 save

# Автозапуск после перезагрузки ОС
pm2 startup
# Выполните команду, которую выведет pm2 startup
```

## Переменные окружения

См. `apps/server/.env.example`. Полный список:

| Имя                | Описание                                                                 |
|--------------------|--------------------------------------------------------------------------|
| `NODE_ENV`         | `production` для production-режима                                       |
| `PORT`             | HTTP-порт сервера, по умолчанию `3001`                                   |
| `LOG_LEVEL`        | Уровень логирования: `trace`, `debug`, `info`, `warn`, `error`, `fatal`  |
| `DB_PATH`          | Путь к SQLite-файлу                                                      |
| `BOT_PATH`         | Путь к директории бота (относительно cwd)                                |
| `BOT_USERNAME`     | Username Telegram-бота без `@`                                           |
| `JWT_SECRET`       | Секрет для подписи JWT. Обязателен в production. Минимум 32 символа.     |
| `BOT_SHARED_SECRET`| Секрет для internal API между сервером и ботом. Обязателен в production. |
| `CORS_ORIGINS`     | Список разрешённых origin через запятую                                  |

Бот получает токен из `apps/bot/bot-config.json` или из переменной `BOT_TOKEN`. Сейчас в production рекомендуется передавать через переменную окружения.

## Reverse-proxy (nginx)

Создайте файл `/etc/nginx/sites-available/helper`:

```nginx
server {
  listen 80;
  server_name api.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Активируйте:

```bash
ln -s /etc/nginx/sites-available/helper /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## SSL (Let's Encrypt)

```bash
certbot --nginx -d api.yourdomain.com
certbot renew --dry-run
```

Certbot автоматически обновит конфиг nginx и настроит редирект HTTP→HTTPS.

## Брандмауэр

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Автоматический бэкап

```bash
crontab -e
```

Добавьте строку:

```
0 3 * * * /opt/helperdesktop/scripts/backup.sh >> /var/log/helperdesktop-backup.log 2>&1
```

Бэкапы хранятся в `/opt/helperdesktop/backups/` 30 дней, затем удаляются. Для восстановления см. `RUNBOOK.md`.

## Обновление

Через GitHub Actions (рекомендуется):

1. Сделайте push в `master` — после успешного CI запустится деплой.
2. Проверьте вкладку Actions в GitHub, дождитесь зелёной отметки.

Вручную:

```bash
cd /opt/helperdesktop
pnpm deploy
```

Скрипт выполнит: `git pull`, `pnpm install --frozen-lockfile`, миграции, пересборку, `pm2 reload`.

## Откат

```bash
cd /opt/helperdesktop

# Откат кода
git log --oneline -10
git checkout <commit-hash>
pnpm install --frozen-lockfile
pnpm --filter @helper/server build
pnpm --filter @helper/bot build
pm2 reload ecosystem.config.js

# Откат БД (если миграция несовместима)
pm2 stop helperdesktop-server
cp /opt/helperdesktop/backups/db-<timestamp>.db \
   /opt/helperdesktop/apps/server/helperdesktop.db
pm2 start helperdesktop-server
```

После отката кода с миграцией, которая не была применена, всё будет работать. Если миграция была применена, но новая версия кода её требует, откат БД обязателен.

## Проверка после деплоя

```bash
# Health
curl -sS https://api.yourdomain.com/api/health

# Логин через API
curl -sS -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"..."}'

# PM2 статус
pm2 status
pm2 logs helperdesktop-server --lines 50
```

## Известные ограничения

- Текущая версия не включает бот в `ecosystem.config.js`. Бот запускается отдельно. Для production добавьте app в `ecosystem.config.js`:

  ```js
  {
    name: 'helperdesktop-bot',
    cwd: __dirname,
    script: 'apps/bot/dist/index.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M',
    env: { NODE_ENV: 'production', BOT_TOKEN: '<token>' },
    error_file: 'logs/bot-error.log',
    out_file: 'logs/bot-out.log',
  }
  ```

- TLS-сертификаты должны быть настроены на reverse-proxy (nginx). Сам сервер слушает plain HTTP на 127.0.0.1:3001.
- При первом деплое требуется ручная установка зависимостей и миграций; последующие обновления автоматизированы.
