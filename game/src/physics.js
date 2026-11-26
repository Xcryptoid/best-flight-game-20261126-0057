// Skerry Run — the flight model.
// A light bush plane: throttle sets the speed the wing wants, pitch trades
// speed for height, bank turns the nose, and the wing quits below minimum
// speed. Fuel burns with throttle, and the ground is always waiting.

import { PLANE } from './config.js';

const KNOTS_TO_MS = 0.514444;

export class PlaneState {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0; // metres east of the runway centreline
    this.z = -60; // metres behind the threshold at the start of a sortie
    this.altitude = PLANE.startAltitude; // feet above the sea
    this.heading = 0; // radians, 0 is straight down the runway
    this.speed = PLANE.startSpeed; // knots
    this.throttle = 0.62;
    this.pitch = 0; // radians, nose up positive
    this.bank = 0; // radians, right wing down positive
    this.fuel = PLANE.fuelCapacity;
    this.damage = 0;
    this.verticalSpeed = 0; // feet per second, for the landing call
    this.stalled = false;
    this.landed = false;
    this.crashed = false;
  }

  // Step the plane one frame. Returns a list of events for the mission code:
  // 'stall', 'stall-clear', 'fuel-empty', 'landed', 'crashed-water',
  // 'crashed-ground', 'ring' is reported by the mission code, not here.
  update(input, world, dt) {
    const events = [];
    if (this.landed || this.crashed) return events;

    // Throttle follows the keys, then the wing chases the speed it allows.
    if (input.throttleUp) this.throttle = Math.min(1, this.throttle + 0.45 * dt);
    if (input.throttleDown) this.throttle = Math.max(0, this.throttle - 0.45 * dt);
    if (this.fuel <= 0) this.throttle = 0;
    const targetSpeed =
      PLANE.minSpeed + this.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    this.speed += (targetSpeed - this.speed) * Math.min(1, 0.55 * dt);

    // Bank and pitch ease toward the pilot's hands, never snap.
    const bankTarget =
      (input.bankRight ? 1 : 0 - (input.bankLeft ? 1 : 0)) * PLANE.maxBank;
    const pitchTarget =
      (input.pitchUp ? 1 : 0 - (input.pitchDown ? 1 : 0)) * PLANE.maxPitch;
    this.bank += (bankTarget - this.bank) * Math.min(1, 3.2 * dt);
    this.pitch += (pitchTarget - this.pitch) * Math.min(1, 2.6 * dt);

    // The turn follows the bank, and only bites while the wing is flying.
    const speedFactor = Math.max(0.35, Math.min(1.4, this.speed / PLANE.cruiseSpeed));
    this.heading += PLANE.turnRate * (this.bank / PLANE.maxBank) * speedFactor * dt;

    // Lift: pitch climbs when fast, sinks when slow; below minimum speed the
    // nose drops on its own and the altimeter unwinds.
    this.stalled = this.speed < PLANE.minSpeed + 4;
    if (this.stalled && !this._wasStalled) events.push('stall');
    if (!this.stalled && this._wasStalled) events.push('stall-clear');
    this._wasStalled = this.stalled;
    const climb = this.pitch * PLANE.climbRate * speedFactor;
    const sink = this.stalled
      ? PLANE.sinkRate * 2.4
      : PLANE.sinkRate * (1 - this.throttle) * 0.4;
    this.verticalSpeed = climb - sink;
    this.altitude += this.verticalSpeed * dt;

    // Move over the sea.
    const speedMs = this.speed * KNOTS_TO_MS;
    this.x += Math.sin(this.heading) * speedMs * dt;
    this.z += Math.cos(this.heading) * speedMs * dt;

    // Fuel burns with throttle; an empty tank means a glide and a prayer.
    const before = this.fuel;
    this.fuel = Math.max(
      0,
      this.fuel - PLANE.fuelBurn * (0.25 + this.throttle) * dt,
    );
    if (before > 0 && this.fuel === 0) events.push('fuel-empty');

    // The ground arrives: a runway touchdown is a landing, anything else is
    // a crash, and the sea is always a crash.
    const ground = world.groundHeightAt(this.x, this.z);
    if (this.altitude <= ground) {
      this.altitude = ground;
      const onStrip = world.onRunway(this.x, this.z);
      const gentle = this.verticalSpeed > -9 && this.speed < 72;
      if (onStrip && gentle) {
        this.landed = true;
        events.push('landed');
      } else if (ground <= 0.5) {
        this.crashed = true;
        events.push('crashed-water');
      } else {
        this.crashed = true;
        events.push('crashed-ground');
      }
    }
    return events;
  }

  // Heading as a compass bearing in degrees, 0 is north up the runway.
  get headingDegrees() {
    const deg = ((-this.heading * 180) / Math.PI) % 360;
    return (deg + 360) % 360;
  }

  // Damage from a hard knock; the airframe gives up at the limit.
  addDamage(amount) {
    this.damage = Math.min(PLANE.damageLimit, this.damage + amount);
    if (this.damage >= PLANE.damageLimit) this.crashed = true;
  }
}
