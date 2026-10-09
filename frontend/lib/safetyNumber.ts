/**
 * Mock "safety number" — a stand-in for Signal's real per-conversation
 * fingerprint, which is derived from both parties' real public keys so it
 * changes if either key ever changes (e.g. a reinstall). This does the same
 * shape of thing with the mock public_key from core/security.py: a SHA-256
 * digest of both keys (order-independent), expanded into 60 digits. Not
 * cryptographically meaningful — see the backend's mock_encrypt/
 * generate_mock_public_key docstrings for the same caveat.
 */

export async function computeSafetyNumber(keyA: string, keyB: string): Promise<string> {
  const [a, b] = [keyA, keyB].sort();
  const data = new TextEncoder().encode(`${a}:${b}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);

  let digits = "";
  let i = 0;
  while (digits.length < 60) {
    digits += String(bytes[i % bytes.length] % 10);
    i++;
  }
  return digits;
}

export function groupDigits(digits: string, groupSize = 5): string[] {
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += groupSize) {
    groups.push(digits.slice(i, i + groupSize));
  }
  return groups;
}
