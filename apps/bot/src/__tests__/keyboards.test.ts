import { describe, expect, it } from 'vitest';
import {
  dynamicMainMenu,
  notificationActions,
  openNoteButton,
  unlinkConfirm,
} from '../keyboards.js';

describe('dynamicMainMenu keyboard', () => {
  it('shows link/qr buttons when not linked', () => {
    const kb = dynamicMainMenu(false);
    const rows = kb.inline_keyboard;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual([
      expect.objectContaining({ text: 'Привязать аккаунт', callback_data: 'cmd:link' }),
      expect.objectContaining({ text: 'Войти через QR', callback_data: 'cmd:qr' }),
    ]);
    expect(rows[1]).toEqual([
      expect.objectContaining({ text: 'Профиль', callback_data: 'cmd:me' }),
      expect.objectContaining({ text: 'Статус сервера', callback_data: 'cmd:status' }),
    ]);
    expect(rows[2]).toEqual([
      expect.objectContaining({ text: 'Мой ID', callback_data: 'cmd:id' }),
      expect.objectContaining({ text: 'Помощь', callback_data: 'cmd:help' }),
    ]);
  });

  it('shows logout button instead of link/qr when linked', () => {
    const kb = dynamicMainMenu(true);
    const rows = kb.inline_keyboard;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual([
      expect.objectContaining({ text: 'Профиль', callback_data: 'cmd:me' }),
      expect.objectContaining({ text: 'Статус сервера', callback_data: 'cmd:status' }),
    ]);
    expect(rows[1]).toEqual([
      expect.objectContaining({ text: 'Мой ID', callback_data: 'cmd:id' }),
      expect.objectContaining({ text: 'Помощь', callback_data: 'cmd:help' }),
    ]);
    expect(rows[2]).toEqual([
      expect.objectContaining({ text: 'Отвязать аккаунт', callback_data: 'cmd:logout' }),
    ]);
  });
});

describe('unlinkConfirm keyboard', () => {
  it('has Отвязано and Отмена buttons', () => {
    const kb = unlinkConfirm();
    const rows = kb.inline_keyboard;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.[0]).toMatchObject({ text: 'Отвязано', callback_data: 'cmd:logout' });
    expect(rows[1]?.[0]).toMatchObject({ text: 'Отмена', callback_data: 'cmd:start' });
  });
});

describe('openNoteButton', () => {
  it('builds a single-row URL button with the note deep link', () => {
    const kb = openNoteButton(42, 'helperdesktop://note/');
    const rows = kb.inline_keyboard;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.[0]).toMatchObject({ text: 'Открыть', url: 'helperdesktop://note/42' });
  });

  it('trims trailing slash from scheme', () => {
    const kb = openNoteButton(7, 'helperdesktop://note///');
    expect(kb.inline_keyboard[0]?.[0]).toMatchObject({ url: 'helperdesktop://note/7' });
  });
});

describe('notificationActions', () => {
  it('has Открыть url and Отметить прочитанным callback', () => {
    const kb = notificationActions(99, 'helperdesktop://note/');
    const rows = kb.inline_keyboard;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.[0]).toMatchObject({ text: 'Открыть', url: 'helperdesktop://note/99' });
    expect(rows[1]?.[0]).toMatchObject({ text: 'Отметить прочитанным', callback_data: 'note:read:99' });
  });
});
