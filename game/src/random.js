// Skerry Run — a small seeded random source.
// The archipelago, the rings and the clouds all grow from one seed, so the same
// seed always builds the same islands: screenshots stay reproducible and a
// pilot who learns the islands keeps that knowledge from sortie to sortie.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A value in [min, max) from a seeded source.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Pick one entry from a list with a seeded source.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
