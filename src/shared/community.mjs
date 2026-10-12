// Question identity ignores titles, IDs, presentation order and explanations.
const text=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export function communityKey(bank){return JSON.stringify(bank.questions.map(q=>JSON.stringify([text(q.stem),q.options.map(text).sort(),text(q.options[q.answer])])).sort());}
export async function communityFingerprint(bank){const bytes=new TextEncoder().encode(communityKey(bank));const digest=await crypto.subtle.digest('SHA-256',bytes);return 'community-'+Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');}
export const duplicateMessage='These questions are already in Community question banks. You can practise or download the existing bank there.';
