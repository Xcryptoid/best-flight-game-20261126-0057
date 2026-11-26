// Skerry Run — the three sorties.
// Each mission reads the same plane and world and answers one question:
// what counts as done, and what counts as done well. The title screen picks
// one; the flight model reports the flying, this file reports the meaning.

import { MISSIONS, WORLD } from './config.js';

const FEET_TO_METRES = 0.3048;

export class MissionRunner {
  constructor(missionId) {
    this.mission = MISSIONS.find((m) => m.id === missionId) ?? MISSIONS[0];
    this.score = 0;
    this.ringsPassed = 0;
    this.crateDropped = false;
    this.crateLanded = false;
    this.crate = null; // {x, z} once released, falling in the world
    this.complete = false;
    this.completeText = '';
    this.events = [];
  }

  nextRing(world) {
    return world.rings.find((ring) => !ring.passed) ?? null;
  }

  // Called every frame while flying. Returns fresh event strings.
  update(plane, world, input, dt) {
    const fresh = [];
    if (this.complete || plane.landed || plane.crashed) return fresh;

    if (this.mission.id === 'rings') {
      const ring = this.nextRing(world);
      if (ring) {
        const dx = plane.x - ring.x;
        const dz = plane.z - ring.z;
        const dy = plane.altitude * FEET_TO_METRES - ring.altitude * FEET_TO_METRES;
        const dist = Math.sqrt(dx * dx + dz * dz + dy * dy);
        if (dist < WORLD.ringRadius) {
          ring.passed = true;
          this.ringsPassed += 1;
          this.score += 100;
          fresh.push('ring');
          if (this.ringsPassed >= WORLD.ringCount) {
            this.complete = true;
            this.score += Math.round(plane.fuel) * 2;
            this.completeText = `All ${WORLD.ringCount} rings threaded — sortie complete!`;
            fresh.push('mission-complete');
          }
        }
      }
    }

    if (this.mission.id === 'landing') {
      if (plane.landed) {
        this.complete = true;
        const soft = Math.max(0, 100 + Math.round(plane.verticalSpeed) * 4);
        this.score += 200 + soft;
        this.completeText = `Down safe on the strip — ${Math.round(plane.speed)} kt at touchdown.`;
        fresh.push('mission-complete');
      }
    }

    if (this.mission.id === 'drop') {
      if (!this.crateDropped && input.wasPressed('Space')) {
        this.crateDropped = true;
        this.crate = { x: plane.x, z: plane.z, altitude: plane.altitude };
        fresh.push('crate-release');
      }
      if (this.crate && !this.crateLanded) {
        // The crate falls straight down where it was let go.
        this.crate.altitude -= 55 * dt;
        if (this.crate.altitude <= 0) {
          this.crateLanded = true;
          const island = world.dropIsland;
          const dx = this.crate.x - island.x;
          const dz = this.crate.z - island.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist <= WORLD.dropZoneRadius) {
            this.complete = true;
            this.score += 300;
            this.completeText = 'Crate down inside the circle — Gull Island eats tonight!';
            fresh.push('mission-complete');
          } else {
            this.score += 0;
            fresh.push('crate-missed');
          }
        }
      }
    }

    return fresh;
  }

  // One line for the HUD banner: what the pilot still owes the mission.
  get objectiveLine() {
    if (this.mission.id === 'rings') {
      return `Rings: ${this.ringsPassed}/${WORLD.ringCount} — follow the amber ring`;
    }
    if (this.mission.id === 'landing') {
      return 'Land on the runway: under 70 kt, gentle descent';
    }
    if (this.crateDropped) {
      return this.crateLanded
        ? 'Crate is down — check the result'
        : 'Crate away — watch where it lands';
    }
    return 'Reach Gull Island, then press SPACE over the amber circle';
  }
}
