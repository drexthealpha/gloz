// The glasses menu items, in the wearer's language. Each name stays under the
// menu's 32-byte limit (Even Hub docs, Contextual Menu).
const M: Record<string, string[]> = {
  en: ['Bigger text', 'Smaller text', 'Move text up/down', 'Translate on/off', 'Mute this chat', 'Check messages now', 'Listen to the room', 'Unmute all chats', 'Apps'],
  ar: ['نص أكبر', 'نص أصغر', 'السطر أعلى/أسفل', 'الترجمة', 'كتم المحادثة', 'تحقق الآن', 'استمع للحديث'],
  fa: ['متن بزرگ‌تر', 'متن کوچک‌تر', 'خط بالا/پایین', 'ترجمه', 'بی‌صدا', 'بررسی', 'گوش به گفتگو'],
  he: ['טקסט גדול', 'טקסט קטן', 'שורה למעלה/מטה', 'תרגום', 'השתק שיחה', 'בדוק עכשיו', 'הקשב לשיחה'],
  hi: ['बड़ा अक्षर', 'छोटा अक्षर', 'लाइन हिलाएँ', 'अनुवाद', 'चैट म्यूट', 'अभी देखें', 'बातें सुनें'],
  th: ['ตัวใหญ่', 'ตัวเล็กลง', 'ย้ายบรรทัด', 'แปลภาษา', 'ปิดแชทนี้', 'ตรวจเลย', 'ฟังบทสนทนา'],
  ja: ['文字を大きく', '文字を小さく', '行を上下', '翻訳 オン/オフ', 'このチャットを消音', '今すぐ確認', '会話を聞く'],
  ko: ['글자 크게', '글자 작게', '줄 위/아래', '번역 켜기/끄기', '이 채팅 무음', '지금 확인', '대화 듣기'],
  zh: ['字体放大', '字体缩小', '行上移/下移', '翻译 开/关', '静音此聊天', '立即检查', '收听对话'],
  ru: ['Крупнее', 'Мельче', 'Строка выше/ниже', 'Перевод', 'Без звука', 'Проверить', 'Слушать'],
}

export function menuItems(lang: string, listening = false, stopWord = 'Stop listening', inApp = false, translating?: boolean) {
  const names = [...(M[lang] ?? M.en)]
  // In English the item says what a press will do.
  if ((M[lang] ?? M.en) === M.en && translating !== undefined) names[3] = translating ? 'Translate: turn off' : 'Translate: turn on'
  // Inside an app the way back comes first, then the text controls.
  if (inApp) return [{ itemName: 'Back to messages', itemID: 10 }, ...[0, 1, 2].map(i => ({ itemName: names[i], itemID: i + 1 }))]
  // While listening, the way to stop comes first.
  if (listening) return [{ itemName: stopWord, itemID: 7 }, ...names.slice(0, 6).map((itemName, i) => ({ itemName, itemID: i + 1 })), { itemName: M.en[7], itemID: 8 }]
  const all = names.map((itemName, i) => ({ itemName, itemID: i + 1 }))
  // Languages without a word for the newest item use the English one.
  for (let i = all.length; i < M.en.length; i++) all.push({ itemName: M.en[i], itemID: i + 1 })
  return all
}
