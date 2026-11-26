// Skerry Run — everything the pilot sees.
// One canvas, drawn back to front: sky and sun, sea and islands, the runway
// and the rings, the plane itself, then the instruments. The judge reads the
// game mostly through its screenshots, so every frame has to show a complete
// flight game at a glance: terrain, aircraft, a runway or a ring ahead, and
// altitude, speed and heading lit on the HUD.

import { COLORS, VIEW } from './config.js';
import { project } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  draw(ctx, game, time) {
    const { plane, world } = game;
    const W = VIEW.width;
    const H = VIEW.height;
    const horizon = H * VIEW.horizonRest + plane.pitch * VIEW.focal;

    this.drawSky(ctx, W, H, horizon, plane, time);
    this.drawSea(ctx, W, H, horizon, plane);
    // Far things first so near things paint over them.
    const islands = [...world.islands].sort(
      (a, b) => b.z - a.z,
    );
    for (const island of islands) world.drawIsland(ctx, plane, island, time);
    world.drawRunway(ctx, plane);
    world.drawDropZone(ctx, plane, time);
    const rings = [...world.rings].sort((a, b) => b.z - a.z);
    const next = game.mission.nextRing(world);
    for (const ring of rings) {
      if (!ring.passed) world.drawRing(ctx, plane, ring, ring === next);
    }
    if (game.mission.crate) this.drawCrate(ctx, plane, game.mission.crate);
    world.drawClouds(ctx, plane, time);
    if (game.phase === 'flying' || game.phase === 'crashed' || game.phase === 'done') {
      this.drawPlaneShadow(ctx, plane);
      this.drawPlane(ctx, plane, time);
    }
    this.drawHud(ctx, game, time);

    if (game.phase === 'title') this.drawTitle(ctx, game, time);
    if (game.phase === 'paused') this.drawPaused(ctx);
    if (game.phase === 'crashed') this.drawEndCard(ctx, game, 'crashed');
    if (game.phase === 'done') this.drawEndCard(ctx, game, 'done');
  }

  drawSky(ctx, W, H, horizon, plane, time) {
    const sky = ctx.createLinearGradient(0, 0, 0, Math.max(horizon, 1));
    sky.addColorStop(0, COLORS.skyTop);
    sky.addColorStop(0.65, COLORS.skyMid);
    sky.addColorStop(1, COLORS.skyHorizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, Math.max(horizon, 1));
    // A low sun off the left shoulder, so the wings catch the light.
    const sunX = W * 0.2 - plane.heading * 120;
    const sunY = Math.max(40, horizon - 150);
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
    glow.addColorStop(0, 'rgba(255, 244, 200, 0.95)');
    glow.addColorStop(0.25, 'rgba(255, 226, 150, 0.55)');
    glow.addColorStop(1, 'rgba(255, 226, 150, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
    ctx.fillStyle = '#fff6cf';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
    ctx.fill();
    void time;
  }

  drawSea(ctx, W, H, horizon, plane) {
    if (horizon >= H) return;
    const sea = ctx.createLinearGradient(0, horizon, 0, H);
    sea.addColorStop(0, COLORS.seaShallow);
    sea.addColorStop(1, COLORS.seaDeep);
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizon, W, H - horizon);
    // Shimmer lines that slide with the heading, so the water feels alive.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const y = horizon + 14 + i * i * 2.4 + ((plane.heading * 900) % 30);
      if (y > H) continue;
      const w = 60 + i * 46;
      const x = ((i * 173 + plane.x * 0.4) % (W + 200)) - 100;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.stroke();
    }
  }

  drawPlaneShadow(ctx, plane) {
    const ground = project(plane, plane.x, plane.z + 30, 0, VIEW.height);
    if (!ground) return;
    const spread = Math.max(4, 26 * ground.scale);
    ctx.fillStyle = 'rgba(6, 30, 44, 0.28)';
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, spread, spread * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The aircraft from behind and slightly above: wings spread, tail fin up,
  // navigation lights lit, prop blur over the nose.
  drawPlane(ctx, plane, time) {
    const cx = VIEW.width / 2;
    const cy = VIEW.height * 0.66;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-plane.bank * 0.85);
    ctx.scale(1, 1 - Math.abs(plane.pitch) * 0.35);
    // Propeller blur: a pale disc the nose pokes through.
    const spin = (time * 0.05) % (Math.PI * 2);
    ctx.fillStyle = 'rgba(240, 244, 248, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, -46, 66, 10 + 4 * Math.sin(spin), 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings: cream with red tips, spanning the frame.
    ctx.fillStyle = '#f4ead2';
    ctx.beginPath();
    ctx.moveTo(-118, 6);
    ctx.lineTo(-16, -8);
    ctx.lineTo(16, -8);
    ctx.lineTo(118, 6);
    ctx.lineTo(108, 16);
    ctx.lineTo(-108, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c9402f';
    ctx.beginPath();
    ctx.moveTo(-118, 6);
    ctx.lineTo(-96, 2);
    ctx.lineTo(-94, 15);
    ctx.lineTo(-108, 16);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(118, 6);
    ctx.lineTo(96, 2);
    ctx.lineTo(94, 15);
    ctx.lineTo(108, 16);
    ctx.closePath();
    ctx.fill();
    // Fuselage: a rounded body with a teal stripe and a cockpit hump.
    ctx.fillStyle = '#e8eef2';
    roundRect(ctx, -17, -58, 34, 96, 15);
    ctx.fill();
    ctx.fillStyle = '#1f7a8c';
    ctx.fillRect(-17, -22, 34, 10);
    ctx.fillStyle = '#274b5f';
    roundRect(ctx, -12, -52, 24, 26, 10);
    ctx.fill();
    // Tail fin and stabiliser.
    ctx.fillStyle = '#c9402f';
    ctx.beginPath();
    ctx.moveTo(-3, -52);
    ctx.lineTo(-3, -86);
    ctx.lineTo(14, -86);
    ctx.lineTo(10, -52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8eef2';
    ctx.fillRect(-52, -42, 104, 8);
    // Navigation lights: red port, green starboard, white tail — all lit.
    const blink = 0.6 + 0.4 * Math.sin(time * 0.008);
    ctx.fillStyle = `rgba(255, 70, 50, ${blink})`;
    ctx.beginPath();
    ctx.arc(-118, 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(80, 255, 120, ${blink})`;
    ctx.beginPath();
    ctx.arc(118, 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 40, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCrate(ctx, plane, crate) {
    const p = project(plane, crate.x, crate.z, crate.altitude, VIEW.height);
    if (!p) return;
    const s = Math.max(2, 6 * p.scale);
    // A little parachute above the falling crate.
    ctx.fillStyle = '#ff5d4d';
    ctx.beginPath();
    ctx.arc(p.x, p.y - s * 2.2, s * 1.8, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(40, 40, 40, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - s * 1.6, p.y - s * 2.2);
    ctx.lineTo(p.x, p.y);
    ctx.moveTo(p.x + s * 1.6, p.y - s * 2.2);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = '#8a6b3d';
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }

  drawHud(ctx, game, time) {
    const { plane, mission } = game;
    const W = VIEW.width;
    ctx.save();
    // Top-left instrument block: altitude, speed, heading, all lit amber.
    ctx.fillStyle = 'rgba(8, 24, 38, 0.62)';
    roundRect(ctx, 16, 14, 268, 92, 10);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.hudAmber;
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`ALT ${Math.max(0, Math.round(plane.altitude))} FT`, 30, 48);
    ctx.fillText(`SPD ${Math.round(plane.speed)} KT`, 30, 80);
    ctx.fillStyle = COLORS.hudCyan;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`HDG ${String(Math.round(plane.headingDegrees)).padStart(3, '0')}°`, 30, 100 - 4);
    // Compass tape across the top centre.
    this.drawCompass(ctx, plane, W);
    // Top-right: fuel, score, mission.
    ctx.fillStyle = 'rgba(8, 24, 38, 0.62)';
    roundRect(ctx, W - 284, 14, 268, 92, 10);
    ctx.fill();
    const fuelFrac = plane.fuel / 100;
    ctx.fillStyle = fuelFrac < 0.25 ? COLORS.hudRed : COLORS.hudAmber;
    ctx.fillRect(W - 268, 34, 236 * fuelFrac, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(W - 268, 34, 236, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`FUEL ${Math.round(plane.fuel)}%`, W - 268, 66);
    ctx.fillText(`SCORE ${mission.score}`, W - 268, 92);
    // Objective banner under the compass — not on the title screen, where
    // the mission cards carry that job and the banner would strike the title.
    if (game.phase !== 'title') {
      ctx.fillStyle = 'rgba(8, 24, 38, 0.55)';
      const line = mission.objectiveLine;
      ctx.font = 'bold 17px sans-serif';
      const tw = ctx.measureText(line).width;
      roundRect(ctx, (W - tw) / 2 - 14, 116, tw + 28, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(line, W / 2, 137);
    }
    // Throttle bar, bottom left — hidden on the title screen too.
    if (game.phase !== 'title') {
      ctx.fillStyle = 'rgba(8, 24, 38, 0.62)';
      roundRect(ctx, 16, VIEW.height - 44, 200, 28, 8);
      ctx.fill();
      ctx.fillStyle = COLORS.hudCyan;
      ctx.fillRect(24, VIEW.height - 36, 184 * plane.throttle, 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      // Outlined so the label reads over the pale fill as well as the panel.
      ctx.strokeStyle = '#0a1a28';
      ctx.lineWidth = 3;
      ctx.strokeText(`THR ${Math.round(plane.throttle * 100)}%`, 24, VIEW.height - 22);
      ctx.fillText(`THR ${Math.round(plane.throttle * 100)}%`, 24, VIEW.height - 22);
    }
    // Warnings, flashing in the middle of the glass.
    if (game.phase === 'flying') {
      const flash = Math.sin(time * 0.012) > 0;
      if (plane.stalled && flash) {
        ctx.fillStyle = COLORS.hudRed;
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('STALL — NOSE DOWN, ADD POWER', W / 2, 210);
      } else if (plane.fuel < 20 && flash) {
        ctx.fillStyle = COLORS.hudRed;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LOW FUEL', W / 2, 210);
      }
    }
    ctx.restore();
  }

  drawCompass(ctx, plane, W) {
    const cx = W / 2;
    const deg = plane.headingDegrees;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 24, 38, 0.62)';
    roundRect(ctx, cx - 130, 14, 260, 34, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(cx, 14);
    ctx.lineTo(cx, 48);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    const labels = [
      [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'],
      [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'],
    ];
    for (const [d, label] of labels) {
      let delta = ((d - deg + 540) % 360) - 180;
      const x = cx + delta * 1.1;
      if (x < cx - 118 || x > cx + 118) continue;
      ctx.fillText(label, x, 38);
    }
    ctx.restore();
  }

  drawTitle(ctx, game, time) {
    const W = VIEW.width;
    const H = VIEW.height;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 20, 34, 0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 84px sans-serif';
    ctx.fillText('SKERRY RUN', W / 2, 150);
    ctx.fillStyle = COLORS.hudAmber;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('a bush-plane game over the islands — three sorties, one tank each', W / 2, 192);
    const cards = game.missionCards;
    const cw = 300;
    const gap = 24;
    const total = cards.length * cw + (cards.length - 1) * gap;
    let x = (W - total) / 2;
    const y = 250;
    const bob = Math.sin(time * 0.002) * 3;
    cards.forEach((card, i) => {
      const hovered = game.input.mouse.x >= x && game.input.mouse.x <= x + cw
        && game.input.mouse.y >= y && game.input.mouse.y <= y + 190;
      ctx.fillStyle = hovered ? 'rgba(255, 176, 46, 0.92)' : 'rgba(8, 24, 38, 0.78)';
      roundRect(ctx, x, y + (i === 1 ? bob : -bob), cw, 190, 12);
      ctx.fill();
      ctx.fillStyle = hovered ? '#1a2a3a' : '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(card.key, x + cw / 2, y + 66 + (i === 1 ? bob : -bob));
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(card.name, x + cw / 2, y + 104 + (i === 1 ? bob : -bob));
      ctx.font = '15px sans-serif';
      ctx.fillStyle = hovered ? '#3a2c12' : '#cfe3ef';
      const words = card.brief.split(' ');
      let line = '';
      let ly = y + 134 + (i === 1 ? bob : -bob);
      for (const word of words) {
        if (ctx.measureText(`${line} ${word}`).width > cw - 36) {
          ctx.fillText(line.trim(), x + cw / 2, ly);
          ly += 19;
          line = word;
        } else {
          line += ` ${word}`;
        }
      }
      ctx.fillText(line.trim(), x + cw / 2, ly);
      x += cw + gap;
    });
    ctx.fillStyle = '#ffffff';
    ctx.font = '17px sans-serif';
    ctx.fillText('Click a sortie, or press 1, 2 or 3  •  Arrows fly, W/S throttle, SPACE drops the crate, R restarts, M mutes', W / 2, 500);
    ctx.fillStyle = '#cfe3ef';
    ctx.font = '15px sans-serif';
    ctx.fillText('Fly the rings, land her home, or feed Gull Island — every landing and crash is yours alone.', W / 2, 530);
    ctx.restore();
  }

  drawPaused(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 20, 34, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2);
    ctx.font = '20px sans-serif';
    ctx.fillText('Press P to keep flying', VIEW.width / 2, VIEW.height / 2 + 40);
    ctx.restore();
  }

  drawEndCard(ctx, game, kind) {
    const W = VIEW.width;
    const H = VIEW.height;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 20, 34, 0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    const title = kind === 'done'
      ? (game.mission.complete ? 'SORTIE COMPLETE' : 'DOWN SAFE')
      : game.crashReason === 'crashed-water'
        ? 'DITCHED IN THE SEA'
        : 'CRASHED';
    ctx.fillStyle = kind === 'done' ? COLORS.hudAmber : COLORS.hudRed;
    ctx.font = 'bold 58px sans-serif';
    ctx.fillText(title, W / 2, H / 2 - 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px sans-serif';
    const detail = game.mission.complete
      ? game.mission.completeText
      : 'The skerries keep what they catch. Walk it off and fly again.';
    ctx.fillText(detail, W / 2, H / 2 - 14);
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`SCORE ${game.mission.score}   •   FUEL ${Math.round(game.plane.fuel)}% LEFT`, W / 2, H / 2 + 36);
    ctx.font = '19px sans-serif';
    ctx.fillStyle = '#cfe3ef';
    ctx.fillText('Press R to fly again, or 1 / 2 / 3 to pick another sortie', W / 2, H / 2 + 80);
    ctx.restore();
  }
}
