// Test mode (from the Tutor login): play the student side with a separate save on this device.
// Nothing is sent to the sheet, so Victoria's progress and the tutor page are never touched.
// It lasts until Sign out or until the tab is closed.
const FLAG = 'math-quest-test';
export const TEST = (() => { try { return sessionStorage.getItem(FLAG) === '1'; } catch { return false; } })();
export const sk = k => (TEST ? `${k}-test` : k);
export function enterTest() { try { sessionStorage.setItem(FLAG, '1'); } catch { /* ignore */ } location.reload(); }
export function leaveTest() { try { sessionStorage.removeItem(FLAG); } catch { /* ignore */ } location.reload(); }
