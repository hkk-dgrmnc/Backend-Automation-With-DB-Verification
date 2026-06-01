import { randomInt } from 'crypto';

const lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz';

function generateRandomWord(length: number) {
  return Array.from({ length }, () => lowercaseLetters[randomInt(lowercaseLetters.length)]).join('');
}

export function generateTestString(startingText: string, totalWordCount: number, wordLength: number) {
  const startingWords = startingText.trim().split(/\s+/).filter(Boolean);

  if (startingWords.length === 0) {
    throw new Error('startingText bos olamaz.');
  }

  if (!Number.isInteger(totalWordCount) || totalWordCount < startingWords.length) {
    throw new Error(`totalWordCount en az ${startingWords.length} olmali.`);
  }

  if (!Number.isInteger(wordLength) || wordLength < 1) {
    throw new Error('wordLength pozitif bir tam sayi olmali.');
  }

  const words = [...startingWords];

  while (words.length < totalWordCount) {
    words.push(generateRandomWord(wordLength));
  }

  return words.join(' ');
}
