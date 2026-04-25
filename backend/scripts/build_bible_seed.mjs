import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const biblePath = path.join(root, 'bible.json');
const planPath = path.join(root, 'bible_300_reading_plan.csv');
const outputPath = path.join(root, 'backend', 'seed', 'bible.csv');
const skippedPath = path.join(root, 'backend', 'seed', 'bible_skipped.json');

const aliases = new Map([
  ['신', '신명기'],
  ['대상', '역대상'],
  ['시', '시편'],
  ['렘', '예레미야'],
  ['겔', '에스겔'],
  ['요', '요한복음'],
  ['행', '사도행전'],
  ['삿', '사사기'],
  ['욜', '요엘'],
  ['롬', '로마서'],
]);

const referenceCorrections = new Map([
  ['요18:이', '요18:38'],
]);

const bible = JSON.parse(fs.readFileSync(biblePath, 'utf8'));
const plan = parsePlan(fs.readFileSync(planPath, 'utf8'));
const bookOrder = getBookOrder(Object.keys(bible));
const bookIndex = new Map(bookOrder.map((book, index) => [book, index]));
const rowMap = new Map();
const skipped = [];

for (const [key, text] of Object.entries(bible)) {
  const references = parseReferences(key);
  if (references.length === 0) {
    skipped.push({ key, reason: 'Invalid reference format', text });
    continue;
  }

  for (const reference of references) {
    const step = findStep(reference);
    if (!step) {
      skipped.push({ key, reference, reason: 'No matching reading step', text });
      continue;
    }
    upsertRow(reference, text.trim(), step);
  }
}

const rows = [
  ['book', 'chapter', 'verse', 'text', 'step'],
  ...Array.from(rowMap.values()).sort(compareRows),
];

fs.writeFileSync(outputPath, rows.map(toCsvLine).join('\n'), 'utf8');
fs.writeFileSync(skippedPath, JSON.stringify(skipped, null, 2), 'utf8');

console.log(`Wrote ${rows.length - 1} bible rows to ${outputPath}`);
console.log(`Skipped ${skipped.length} rows. See ${skippedPath}`);

function parsePlan(csv) {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [step, startBook, startChapter, endBook, endChapter] = line.split(',');
      return {
        step: Number(step),
        startBook: normalizeBook(startBook),
        startChapter: Number(startChapter),
        endBook: normalizeBook(endBook),
        endChapter: Number(endChapter),
      };
    });
}

function parseReferences(key) {
  const correctedKey = referenceCorrections.get(key) ?? key;
  const singleMatch = correctedKey.match(/^(.+?)(\d+):(\d+)$/);
  if (singleMatch) {
    return [toReference(singleMatch[1], singleMatch[2], singleMatch[3])];
  }

  const rangeMatch = correctedKey.match(/^(.+?)(\d+):(\d+)-(\d+)$/);
  if (!rangeMatch) return [];

  const [, book, chapter, startVerse, endVerse] = rangeMatch;
  const start = Number(startVerse);
  const end = Number(endVerse);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];

  return Array.from({ length: end - start + 1 }, (_, index) =>
    toReference(book, chapter, start + index),
  );
}

function parseReference(key) {
  return parseReferences(key)[0] ?? null;
}

function toReference(book, chapter, verse) {
  return {
    book: normalizeBook(book),
    chapter: Number(chapter),
    verse: Number(verse),
  };
}

function getBookOrder(keys) {
  const books = [];
  const seen = new Set();

  for (const key of keys) {
    const reference = parseReference(key);
    if (!reference || seen.has(reference.book)) continue;
    seen.add(reference.book);
    books.push(reference.book);
  }

  return books;
}

function normalizeBook(book) {
  return aliases.get(book) ?? book;
}

function findStep(reference) {
  const currentBookIndex = bookIndex.get(reference.book);
  if (currentBookIndex === undefined) return null;

  const item = plan.find((candidate) => {
    const startBookIndex = bookIndex.get(candidate.startBook);
    const endBookIndex = bookIndex.get(candidate.endBook);
    if (startBookIndex === undefined || endBookIndex === undefined) return false;
    if (currentBookIndex < startBookIndex || currentBookIndex > endBookIndex) return false;
    if (currentBookIndex === startBookIndex && reference.chapter < candidate.startChapter) return false;
    if (currentBookIndex === endBookIndex && reference.chapter > candidate.endChapter) return false;
    return true;
  });

  return item?.step ?? null;
}

function upsertRow(reference, text, step) {
  const key = `${reference.book}:${reference.chapter}:${reference.verse}`;
  const existing = rowMap.get(key);
  if (!existing) {
    rowMap.set(key, [
      reference.book,
      String(reference.chapter),
      String(reference.verse),
      text,
      String(step),
    ]);
    return;
  }

  if (text && !existing[3].includes(text)) {
    existing[3] = `${existing[3]} ${text}`.trim();
  }
}

function compareRows(a, b) {
  const bookCompare = (bookIndex.get(a[0]) ?? 999) - (bookIndex.get(b[0]) ?? 999);
  if (bookCompare !== 0) return bookCompare;
  const chapterCompare = Number(a[1]) - Number(b[1]);
  if (chapterCompare !== 0) return chapterCompare;
  return Number(a[2]) - Number(b[2]);
}

function toCsvLine(values) {
  return values
    .map((value) => {
      const stringValue = String(value);
      if (!/[",\n\r]/.test(stringValue)) return stringValue;
      return `"${stringValue.replaceAll('"', '""')}"`;
    })
    .join(',');
}
