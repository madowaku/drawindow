/** Storage/header safety only. This does not decide whether Google accepts a key. */
export function inspectGeminiCredential(value) {
  const present = typeof value === 'string' && value.length > 0;
  const safeToStoreAndSend = present && !/[^\x21-\x7e]|["\\]/.test(value);
  return { keyPresent: present, keySafeToStoreAndSend: safeToStoreAndSend, authenticationVerified: false };
}
