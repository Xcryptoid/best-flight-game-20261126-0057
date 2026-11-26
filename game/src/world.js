// Skerry Run — the archipelago and the chase-view projection.
// The world is a strip of sea with seeded islands, one home runway and a line
// of sky rings. Everything ahead of the plane is projected with one pinhole
// formula, so the ground, the islands and the rings all agree on where the
// horizon sits and how fast things grow as you close on them.

import { COLORS, VIEW, WORLD } from './config.js';
import { mulberry32, range } from './random.js';

const FEET_TO_METRES = 0.3048;

// Rotate a world offset into the plane's frame: forward is +z, right is +x.
export function toPlaneFrame(dx, dz, heading) {
  const sin = Math.sin(heading);
  const cos = Math.cos(heading);
  return {
    forward: dx * sin + dz * cos,
    lateral: dx * cos - dz * sin,
  };
}

// Project a world point onto the screen. Returns null when it is behind the
// camera. altFeet is the point's height above the sea in feet.
export function project(plane, wx, wz, altFeet, canvasHeight) {
  const rel = toPlaneFrame(wx - plane.x, wz - plane.z, plane.heading);
  if (rel.forward < 8) return null;
  const scale = VIEW.focal / rel.forward;
  const horizon = canvasHeight * VIEW.horizonRest + plane.pitch * VIEW.focal;
  const camAltM = plane.altitude * FEET_TO_METRES;
  const pointAltM = altFeet * FEET_TO_METRES;
  return {
    x: VIEW.width / 2 + rel.lateral * scale,
    y: horizon + (camAltM - pointAltM) * scale,
    scale,
    forward: rel.forward,
  };
}

export class World {
  constructor(seed = WORLD.seed) {
    const rng = mulberry32(seed);
    this.islands = [];
    // The home island holds the runway; it is wide, flat and always first.
    this.islands.push({
      x: 0, z: 200, radius: 420, peak: 26,
      name: 'Home Strip',
      runway: true,
    });
    // Gull Island holds the supply-drop circle, far out and off to the right.
    this.islands.push({
      x: 780, z: 5200, radius: 300, peak: 42,
      name: 'Gull Island',
      dropZone: true,
    });
    for (let i = 0; i < WORLD.islandCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.islands.push({
        x: side * range(rng, 500, 2400),
        z: range(rng, 900, WORLD.depth),
        radius: range(rng, 120, 380),
        peak: range(rng, 18, 90),
        name: `Skerry ${i + 1}`,
        runway: false,
        dropZone: false,
      });
    }
    // Rings wander gently ahead, rising and falling so no two sit alike.
    this.rings = [];
    let rx = 0;
    let ralt = 480;
    for (let i = 0; i < WORLD.ringCount; i++) {
      rx += range(rng, -260, 260);
      rx = Math.max(-700, Math.min(700, rx));
      ralt += range(rng, -120, 120);
      ralt = Math.max(260, Math.min(760, ralt));
      this.rings.push({
        x: rx,
        z: 1100 + i * 780,
        altitude: ralt,
        radius: WORLD.ringRadius,
        passed: false,
      });
    }
    // Clouds drift far above the sea, placed once and left to wander.
    this.clouds = [];
    for (let i = 0; i < 26; i++) {
      this.clouds.push({
        x: range(rng, -3200, 3200),
        z: range(rng, 400, 9500),
        altitude: range(rng, 1400, 2200),
        size: range(rng, 90, 260),
        drift: range(rng, 2, 7),
      });
    }
  }

  get homeIsland() {
    return this.islands[0];
  }

  get dropIsland() {
    return this.islands[1];
  }

  // Height of the ground under a world point, in feet; the sea is zero.
  groundHeightAt(x, z) {
    let height = 0;
    for (const island of this.islands) {
      const dx = x - island.x;
      const dz = z - island.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < island.radius) {
        const falloff = 1 - (d / island.radius) * (d / island.radius);
        height = Math.max(height, island.peak * falloff);
      }
    }
    return height;
  }

  // True when a world point is over the runway strip.
  onRunway(x, z) {
    return Math.abs(x) <= 16 && z >= -40 && z <= 420;
  }

  // Draw one island as a mound with a sand rim and a grassy top.
  drawIsland(ctx, plane, island, time) {
    const base = project(plane, island.x, island.z, 0, VIEW.height);
    if (!base) return;
    // Hills are drawn three times their true height: real skerries are low,
    // and a flat sea would read as empty water from the cockpit.
    const top = project(plane, island.x, island.z, island.peak * 3, VIEW.height);
    if (!top) return;
    const rx = island.radius * base.scale;
    if (rx < 2) return;
    const ry = Math.max(3, (base.y - top.y) * 0.9);
    // Sand rim.
    ctx.fillStyle = COLORS.sand;
    ctx.beginPath();
    ctx.ellipse(base.x, base.y, rx, ry * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Grassy top, slightly smaller and higher.
    ctx.fillStyle = COLORS.grass;
    ctx.beginPath();
    ctx.ellipse(base.x, base.y - ry * 0.28, rx * 0.82, ry * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // A rocky peak on the taller islands.
    if (island.peak > 55) {
      ctx.fillStyle = COLORS.rock;
      ctx.beginPath();
      ctx.ellipse(base.x, base.y - ry * 0.62, rx * 0.3, ry * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw the home runway as a strip with dashes and threshold bars.
  drawRunway(ctx, plane) {
    const near = project(plane, 0, -40, 2, VIEW.height);
    const far = project(plane, 0, 420, 2, VIEW.height);
    if (!near || !far) return;
    const halfNear = 16 * near.scale;
    const halfFar = 16 * far.scale;
    ctx.fillStyle = COLORS.runway;
    ctx.beginPath();
    ctx.moveTo(near.x - halfNear, near.y);
    ctx.lineTo(near.x + halfNear, near.y);
    ctx.lineTo(far.x + halfFar, far.y);
    ctx.lineTo(far.x - halfFar, far.y);
    ctx.closePath();
    ctx.fill();
    // Centre dashes, marching away from the pilot.
    ctx.fillStyle = '#f2f5f7';
    for (let z = 0; z <= 380; z += 60) {
      const p = project(plane, 0, z, 3, VIEW.height);
      if (!p) continue;
      const w = Math.max(1, 1.6 * p.scale);
      const h = Math.max(1, 14 * p.scale);
      ctx.fillRect(p.x - w / 2, p.y - h, w, h);
    }
  }

  // Draw the drop-zone circle painted on Gull Island.
  drawDropZone(ctx, plane, time) {
    const island = this.dropIsland;
    const c = project(plane, island.x, island.z, 4, VIEW.height);
    if (!c) return;
    const r = WORLD.dropZoneRadius * c.scale;
    if (r < 2) return;
    const pulse = 0.55 + 0.35 * Math.sin(time * 0.004);
    ctx.strokeStyle = `rgba(255, 176, 46, ${pulse})`;
    ctx.lineWidth = Math.max(2, 3 * c.scale);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 176, 46, 0.16)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw one sky ring; the next ring burns brighter than the rest.
  drawRing(ctx, plane, ring, isNext) {
    const c = project(plane, ring.x, ring.z, ring.altitude, VIEW.height);
    if (!c) return;
    const r = ring.radius * c.scale;
    if (r < 2) return;
    ctx.save();
    ctx.globalAlpha = ring.passed ? 0.35 : 1;
    ctx.strokeStyle = isNext ? COLORS.ringNext : COLORS.ring;
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.shadowColor = COLORS.ring;
    ctx.shadowBlur = isNext ? 18 : 6;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (isNext && r > 14) {
      ctx.fillStyle = COLORS.ringNext;
      ctx.font = `bold ${Math.max(12, Math.min(22, r * 0.4))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('NEXT', c.x, c.y - r - 10);
    }
  }

  // Draw the drifting clouds, far to near.
  drawClouds(ctx, plane, time) {
    const sorted = [...this.clouds].sort((a, b) => b.z - a.z);
    for (const cloud of sorted) {
      const driftedX = cloud.x + time * 0.001 * cloud.drift;
      const p = project(plane, driftedX, cloud.z, cloud.altitude, VIEW.height);
      if (!p) continue;
      const r = cloud.size * p.scale;
      if (r < 3 || r > 900) continue;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.36, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x - r * 0.55, p.y + r * 0.08, r * 0.6, r * 0.28, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + r * 0.55, p.y + r * 0.08, r * 0.6, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
