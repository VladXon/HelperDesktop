import { InlineKeyboard } from 'grammy';

export function dynamicMainMenu(isLinked: boolean): InlineKeyboard {
  if (isLinked) {
    return new InlineKeyboard()
      .text('Профиль', 'cmd:me')
      .text('Статус сервера', 'cmd:status')
      .row()
      .text('Мой ID', 'cmd:id')
      .text('Помощь', 'cmd:help')
      .row()
      .text('Отвязать аккаунт', 'cmd:logout');
  }
  return new InlineKeyboard()
    .text('Привязать аккаунт', 'cmd:link')
    .text('Войти через QR', 'cmd:qr')
    .row()
    .text('Профиль', 'cmd:me')
    .text('Статус сервера', 'cmd:status')
    .row()
    .text('Мой ID', 'cmd:id')
    .text('Помощь', 'cmd:help');
}

export function unlinkConfirm(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Отвязано', 'cmd:logout')
    .row()
    .text('Отмена', 'cmd:start');
}

export function openNoteButton(noteId: number, deepLinkScheme: string): InlineKeyboard {
  const url = `${deepLinkScheme.replace(/\/+$/, '')}/${noteId}`;
  return new InlineKeyboard().url('Открыть', url);
}

export function notificationActions(noteId: number, deepLinkScheme: string): InlineKeyboard {
  const url = `${deepLinkScheme.replace(/\/+$/, '')}/${noteId}`;
  return new InlineKeyboard()
    .url('Открыть', url)
    .row()
    .text('Отметить прочитанным', `note:read:${noteId}`);
}

export { dynamicMainMenu as mainMenu };
