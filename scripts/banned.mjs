// The words public text never uses; scripts/check-text.mjs checks every page against them.
// Names that must never appear (other products, names from outside this entry) are kept only as
// SHA-256 hashes of the lowercase name, so this list never names them itself.
export const NAME_HASHES = new Set([
  '29a1ebe03a7ff5fdc64676fc37321a2ec8e9dc06916b38b2dbf5a165d18ad5c8',
  '0f0dbf99c46034d012db1a484ed3fc180b045b694e80e06eb068ba7ac950f0ff',
  '1c1f4c48d20e7f3303eced60b53a5e26d11ea8d6becfa831daa099f5544edb4c',
  '4fe71b2b41ec432c9fb8bc50cddbd1b64b5ed32e8fb77c12b6ed43e711066da4',
  '879916ab94cd39e6ef72a5a508a65e272eda1a4d05081e067cc7969e7dba6369',
  '803d037082ab9f6b2d199c0bc912a8db7a84c1d87c772fb3ac427301fe341764',
  '82c0ccd9be64111c2a2273022d7e0d64787e39fd5cf231cd33a21aef39a989f6',
  '62bf966d3319b00cb0d4b30a2a7ba3ef84e3571408a2ebb8ef24812088c50cfb',
  'd8164c279f5e6c85a72b39aabfb02a291748e5b07e34555cbfa3b2272f960ac2',
  '3cddae0e18513ff895e5a0373da0abccd529c933689cfe5fc9b800026ea65a30',
  '101c7f603d7fc5d672b7642dd22eee8d2790af7a149f38301442b66f8008ab81',
  '10ae60f623ec63e5748e1d78150526db0d217ef19d052fd8183ad0e377c55649',
  'f2a53bc62ae47633f188e1738a88c6464544f9379426a1870522fbd108a2cc3e',
])
// The longest name above has this many words; the check hashes every run of 1 to this many words.
export const NAME_WORDS = 2

// Empty sales words and figures of speech.
export const SALES = [
  'game-changer', 'game changer', 'seamless', 'revolutionary', 'cutting-edge', 'cutting edge', 'next-generation', 'world-class', 'supercharge', 'unleash', 'effortless', 'magic', 'magical', 'delightful', 'best-in-class', 'paradigm', 'synergy', 'leverage',
]
