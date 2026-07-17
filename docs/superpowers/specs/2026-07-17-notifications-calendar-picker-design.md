# Уведомления, календарь и AI Push — Design Spec

## 1. Telegram Notifications Bug Fix

**Root cause:** `PUT /api/notes/:id` в `apps/server/src/routes/notes.ts` не сбрасывает `telegramNotified` в `false` когда `notifyTelegram = true`. После первой отправки `telegram_notified = 1`, бот больше не выбирает эту заметку.

**Fix:** При `notifyTelegram === true` в update, добавить `telegramNotified: false`.

**Изменяемые файлы:**
- `apps/server/src/routes/notes.ts` — строка 105

## 2. Disable "Notify in Telegram" Switch

**Проблема:** Switch активен всегда, даже если Telegram не привязан.

**Решение:** При открытии `NoteEditDialog` проверять статус Telegram (через `window.api.telegram.status()`). Если `linked === false`, передавать `disabled` в Switch и показывать подпись "Привяжите Telegram в настройках".

**Изменяемые файлы:**
- `apps/client/src/renderer/features/notes/components/NoteEditDialog.tsx`

## 3. Improved Reminder Picker

**Текущее:** `ReminderPicker.tsx` — `<input type="datetime-local">` в Popover.

**Новое:** Popover с двумя секциями:
- **Быстрый выбор (чипы):** "Сегодня 18:00", "Завтра 9:00", "+1 час", "На выходных", "На неделе", "Очистить"
- **Кастомный ввод:** `<input type="date">` + `<input type="time">` рядом, стилизованные под дизайн

Иконка колокольчика меняет цвет когда напоминание установлено.

**Изменяемые файлы:**
- `apps/client/src/renderer/features/notes/components/ReminderPicker.tsx`

## 4. Toast Notification System

**Решение:** Кастомная система тостов без внешних зависимостей.

**Компоненты:**
- `apps/client/src/renderer/components/ui/toast.tsx` — Toast provider, контейнер, отдельный toast
- `apps/client/src/renderer/hooks/useToast.ts` — хук `useToast()` возвращает `{ toast: (p: {title?, description?, variant: 'success'|'error'|'info'}) => void }`
- Тосты через React Portal, framer-motion анимации (уже есть в проекте)
- Авто-закрытие через 4 сек, стек тостов снизу-справа
- Варианты: success (зелёный), error (красный), info (синий/акцентный)

**Интеграция:**
- Заменить все `setError` + `<div className="text-xs text-red-400">` на `toast({ variant: 'error', description: msg })`
- Использовать в NoteEditDialog, Settings, Presets и т.д.

**Изменяемые файлы:**
- Новые: `toast.tsx`, `useToast.ts`
- Изменяемые: `App.tsx` (добавить ToastProvider), `NoteEditDialog.tsx`, `TelegramSection.tsx`, другие страницы

## 5. AI PushWindows Tool (Native Toast)

**Цель:** AI может отправить Windows toast-уведомление пользователю, чтобы не приходилось alt-tab'ить.

**Архитектура:**
- Main process Electron: новый IPC handler `push:show` → `new Notification(title, body)`
- Renderer: exposes `window.api.push.show({ title, body })` через preload
- AI Tool: пишет в JSON-файл `ai-push.json` → main process читает и показывает toast
- JSON-файл: `{ title: string, body: string }`, main process отслеживает через `fs.watchFile`

**Компоненты:**
- `apps/client/src/main/ipc/push.ts` — IPC handler `push:show`
- `apps/client/src/main/push-watcher.ts` — следит за `ai-push.json`, вызывает `push:show` internally
- `apps/client/src/main/preload.ts` — добавить `push.show` в bridge
- `apps/client/src/renderer/types/window.d.ts` — тип для `push.show`

**AI tool:** Shell-команда или write-to-file для отправки:

```bash
echo '{"title":"OpenCode","body":"Готово! Проверьте уведомления"}' > <project>/ai-push.json
```

Хранить `ai-push.json` вне репозитория (добавить в .gitignore).

**Изменяемые файлы:**
- Новые: `push.ts`, `push-watcher.ts`
- Изменяемые: `preload.ts`, `window.d.ts`, `main/index.ts`
