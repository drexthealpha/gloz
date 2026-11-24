// Every digit set a phone keyboard may type becomes 0-9 (Arabic, Persian, Devanagari, Bengali, Thai, full width).
export function westernDigits(v: string) {
  return v.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0))
    .replace(/[०-९]/g, d => String(d.charCodeAt(0) - 0x966)).replace(/[০-৯]/g, d => String(d.charCodeAt(0) - 0x9e6))
    .replace(/[๐-๙]/g, d => String(d.charCodeAt(0) - 0xe50)).replace(/[０-９]/g, d => String(d.charCodeAt(0) - 0xff10)).replace(/\D/g, '')
}
