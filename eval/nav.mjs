// Navigation: is the re-route decision (more than 40 m off the route) right?
// Synthetic routes and positions; the true distance is measured along the earth's surface
// (haversine, route sampled every 0.5 m) and compared with the app's quick flat-earth check.
//   node eval/nav.mjs
// This does not measure ETA accuracy: that needs real trips, which cannot be run here.
import { offBy, OFF_ROUTE_M } from '../app/src/modes/nav.ts'

let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const R = 6371008.8, rad = Math.PI / 180
function hav(a, b) {
  const dl = (b[0] - a[0]) * rad, dn = (b[1] - a[1]) * rad
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dn / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
// The point d metres from p on bearing b (degrees).
function go(p, d, b) {
  const la = p[0] * rad, lo = p[1] * rad, t = b * rad, a = d / R
  const la2 = Math.asin(Math.sin(la) * Math.cos(a) + Math.cos(la) * Math.sin(a) * Math.cos(t))
  const lo2 = lo + Math.atan2(Math.sin(t) * Math.sin(a) * Math.cos(la), Math.cos(a) - Math.sin(la) * Math.sin(la2))
  return [la2 / rad, lo2 / rad]
}
function truth(p, line) {
  let best = Infinity
  for (let i = 1; i < line.length; i++) {
    const n = Math.ceil(hav(line[i - 1], line[i]) / 0.5)
    for (let k = 0; k <= n; k++) {
      const q = [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * k / n, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * k / n]
      best = Math.min(best, hav(p, q))
    }
  }
  return best
}

let right = 0, all = 0, maxErr = 0
for (let r = 0; r < 60; r++) {
  let p = [(rnd() * 120 - 60), rnd() * 360 - 180], h = rnd() * 360
  const line = [p]
  for (let s = 0; s < 6; s++) { h += (rnd() - 0.5) * 180; p = go(p, 50 + rnd() * 400, h); line.push(p) }
  for (let k = 0; k < 40; k++) {
    const i = 1 + Math.floor(rnd() * (line.length - 1)), f = rnd()
    const on = [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * f, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * f]
    const pos = go(on, rnd() * 100, rnd() * 360)
    const t = truth(pos, line), g = offBy(pos, line)
    maxErr = Math.max(maxErr, Math.abs(t - g))
    all++
    if ((t > OFF_ROUTE_M) === (g > OFF_ROUTE_M)) right++
  }
}
console.log({ positions: all, rerouteDecisionsRight: `${(100 * right / all).toFixed(2)}%`, maxDistanceErrorM: Number(maxErr.toFixed(2)), latitudes: '-60 to 60', etaAccuracy: 'not measured (needs real trips)' })
