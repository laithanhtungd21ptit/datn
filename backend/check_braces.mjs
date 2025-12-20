import { readFileSync } from 'fs';
const text = readFileSync('src/routes/api/student.js', 'utf8');
const stack = [];
for (let i = 0; i < text.length; i++) {
  const ch = text[i];
  if (ch === '"' || ch === "'" || ch === '') {
    const quote = ch;
    i++;
    for (; i < text.length; i++) {
      const ch2 = text[i];
      if (ch2 === '\\') {
        i++;
        continue;
      }
      if (ch2 === quote) break;
    }
    continue;
  }
  if (ch === '{' || ch === '(' || ch === '[') {
    stack.push({ ch, i });
  } else if (ch === '}' || ch === ')' || ch === ']') {
    if (!stack.length) {
      console.log('Extra closing at', i);
      process.exit(0);
    }
    stack.pop();
  }
}
if (stack.length) {
  console.log('Unclosed', stack.pop());
} else {
  console.log('All balanced');
}
