import fs from 'node:fs/promises';
import path from 'node:path';

// A bounded, unauthenticated snapshot of public search suggestions. This is
// discovery evidence, not Wordstat frequency or proof of organic traffic.
const seeds = [
  'как повесить телевизор',
  'как повесить телевизор на',
  'как повесить телевизор на кронштейн',
  'как выбрать кронштейн для телевизора',
  'кронштейн для телевизора',
  'телевизор на стене',
  'как снять телевизор с кронштейна',
  'на какой высоте вешать телевизор',
  'телевизор на гипсокартон',
  'телевизор на стену из',
  'крепление телевизора к стене',
  'винты для кронштейна телевизора',
  'телевизор на кухне',
  'телевизор в спальне',
  'настройка телевизора',
  'телевизор не',
  'как подключить телевизор',
  'как отключить на телевизоре',
  'звук телевизора',
  'субтитры на телевизоре',
  'телевизор не видит',
  'пульт от телевизора',
  'вай фай на телевизоре',
  'яркость телевизора',
  'телевизор мигает',
  'телевизор пишет',
  'экран телевизора',
  'как проверить телевизор',
  'телевизор через hdmi',
  'как обновить телевизор',
  'телевизор не включается',
  'телевизор показывает',
];

const root = new URL('../../', import.meta.url);
const output = path.resolve(new URL('product-docs/research/raw/yandex-suggest-20260923/', root).pathname);
await fs.mkdir(output, { recursive: true });
const raw = [];
for (const [index, seed] of seeds.entries()) {
  const url = new URL('https://suggest.yandex.ru/suggest-ya.cgi');
  url.searchParams.set('part', seed);
  url.searchParams.set('lr', '225');
  url.searchParams.set('uil', 'ru');
  url.searchParams.set('v', '4');
  const response = await fetch(url, { headers: { 'User-Agent': 'KrepitvResearch/1.0' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Yandex suggest HTTP ${response.status} for seed ${index + 1}`);
  const body = await response.json();
  if (!Array.isArray(body) || !Array.isArray(body[1])) throw new Error(`Unexpected Yandex response for seed ${index + 1}`);
  // Keep only the echoed seed and suggestion strings; the endpoint may add
  // diagnostic or tracking metadata that is irrelevant to the research.
  raw.push({ seed, collected_at: new Date().toISOString(), source_url: url.toString(), response: [body[0], body[1]] });
  if (index < seeds.length - 1) await new Promise((resolve) => setTimeout(resolve, 900));
}
await fs.writeFile(path.join(output, 'raw.json'), JSON.stringify({ contract: { region: 'Россия', region_code: 225, language: 'ru', personalization: 'no cookies sent', source: 'public Yandex search suggestions; undocumented endpoint', limitation: 'Presence in suggestions does not measure frequency, competitiveness, impressions or traffic.' }, batches: raw }, null, 2) + '\n');
const rows = new Map();
for (const batch of raw) for (const candidate of batch.response[1]) {
  const phrase = String(candidate).normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!phrase || !/телевизор|тв|кронштейн|hdmi|пульт|субтитр|вай фай/i.test(phrase)) continue;
  const key = phrase.toLocaleLowerCase('ru-RU');
  const row = rows.get(key) ?? { phrase, seeds: [] };
  if (!row.seeds.includes(batch.seed)) row.seeds.push(batch.seed);
  rows.set(key, row);
}
const normalized = [...rows.values()].sort((a, b) => a.phrase.localeCompare(b.phrase, 'ru'));
await fs.writeFile(path.join(output, 'normalized.json'), JSON.stringify({ collected_at: new Date().toISOString(), unique_suggestions: normalized.length, rows: normalized }, null, 2) + '\n');
console.log(JSON.stringify({ seeds: seeds.length, unique_suggestions: normalized.length, output }));
