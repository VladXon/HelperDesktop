export function onNoteLink(cb: (id: number) => void): () => void {
  return window.api.deepLink.onNote(cb);
}
