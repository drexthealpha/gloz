// One written way to silence a single finding of a checker: put its marker on that line,
// "check-text" or "secrets" followed by ": ignore-line". Each use is a visible line in the diff,
// and each checker prints how many lines it let through. Built here so this file holds neither marker whole.
export const mark = kind => `${kind === 'text' ? 'check-text' : 'secrets'}: ${'ignore'}-line`
export const ignored = (line, kind) => line.includes(mark(kind))
