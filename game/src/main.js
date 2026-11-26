// Skerry Run — boot, game loop and the four phases.
// Title, flying, paused, crashed and done are the whole game: the loop steps
// the plane and the mission, the renderer paints what happened, and the
// screenshot scenes park the plane in a photogenic spot for the camera.

import { MISSIONS, VIEW } from './config.js';
import { Input } from './input.js';
import { World } from './world.js';
import { PlaneState } from './physics.js';
import { MissionRunner } from './missions.js';
import { SoundBank } from './audio.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot') ?? '';

export const game = {
  phase: 'title', // title | flying | paused | crashed | done
  plane: new PlaneState(),
  world: new World(),
  mission: new MissionRunner('rings'),
  missionCards: MISSIONS,
  input: new Input(canvas),
  sound: new SoundBank(),
  renderer: new Renderer(),
  crashReason: '',
  time: 0,
};

function startMission(id) {
  game.mission = new MissionRunner(id);
  game.plane.reset();
  game.world = new World();
  game.phase = 'flying';
  game.crashReason = '';
  game.sound.ensure();
  setStatus(`Flying ${game.mission.mission.name}. ${game.mission.mission.goal}`);
}

function setStatus(text) {
  if (statusLine) statusLine.textContent = text;
}

function pickMissionFromPointer() {
  const { mouse } = game.input;
  const cw = 300;
  const gap = 24;
  const total = 3 * cw + 2 * gap;
  let x = (VIEW.width - total) / 2;
  const y = 250;
  for (let i = 0; i < 3; i++) {
    if (mouse.x >= x && mouse.x <= x + cw && mouse.y >= y && mouse.y <= y + 190) {
      return MISSIONS[i].id;
    }
    x += cw + gap;
  }
  return null;
}

// Screenshot scenes: park the plane where the shot wants it, then hold still.
// These are real states of the same game, reached by a query string the same
// way a pilot reaches them by flying there.
function applyShotScene() {
  if (!shot) return;
  const plane = game.plane;
  if (shot === 'start') {
    game.phase = 'title';
    return;
  }
  game.mission = new MissionRunner('rings');
  if (shot === 'cruise') {
    plane.x = 120;
    plane.z = 2400;
    plane.altitude = 520;
    plane.heading = 0.06;
    plane.speed = 110;
    plane.throttle = 0.7;
    game.phase = 'flying';
  } else if (shot === 'rings') {
    const ring = game.world.rings[2];
    plane.x = ring.x - 40;
    plane.z = ring.z - 420;
    plane.altitude = ring.altitude + 30;
    plane.heading = 0.05;
    plane.speed = 105;
    plane.throttle = 0.68;
    game.mission.ringsPassed = 2;
    game.world.rings[0].passed = true;
    game.world.rings[1].passed = true;
    game.mission.score = 200;
    game.phase = 'flying';
  } else if (shot === 'landing') {
    game.mission = new MissionRunner('landing');
    plane.x = 6;
    plane.z = -520;
    plane.altitude = 150;
    plane.heading = 0.01;
    plane.speed = 66;
    plane.throttle = 0.35;
    plane.pitch = -0.06;
    game.phase = 'flying';
  }
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time = now;
  const { input, plane } = game;

  if (input.wasPressed('KeyM')) {
    const muted = game.sound.toggleMute();
    setStatus(muted ? 'Sound muted' : 'Sound on');
  }

  if (game.phase === 'title') {
    // A slow cinematic drift over the islands behind the menu.
    plane.heading = Math.sin(now * 0.00008) * 0.35;
    plane.altitude = 520 + Math.sin(now * 0.0002) * 40;
    plane.speed = 95;
    if (input.mouse.clicked) {
      const picked = pickMissionFromPointer();
      if (picked) startMission(picked);
    }
    for (const card of MISSIONS) {
      if (input.wasPressed(`Digit${card.key}`)) startMission(card.id);
    }
  } else if (game.phase === 'flying') {
    if (input.wasPressed('KeyP')) {
      game.phase = 'paused';
    } else {
      game.sound.ensure();
      const events = plane.update(input, game.world, dt);
      const missionEvents = game.mission.update(plane, game.world, input, dt);
      game.sound.setEngine(plane.throttle, true);
      for (const event of [...events, ...missionEvents]) {
        if (event === 'ring') game.sound.ringChime();
        if (event === 'landed') game.sound.thud();
        if (event === 'stall') game.sound.alarm();
        if (event === 'mission-complete') {
          game.phase = 'done';
          setStatus(game.mission.completeText);
        }
      }
      if (plane.crashed) {
        game.phase = 'crashed';
        game.crashReason = events.includes('crashed-water') ? 'crashed-water' : 'crashed-ground';
        game.sound.setEngine(0, false);
        setStatus('Crashed. Press R to fly again.');
      }
      if (plane.landed && game.mission.mission.id === 'landing') {
        game.phase = 'done';
        setStatus(game.mission.completeText);
      }
    }
  } else if (game.phase === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) game.phase = 'flying';
  } else if (game.phase === 'crashed' || game.phase === 'done') {
    game.sound.setEngine(0, false);
    if (input.wasPressed('KeyR')) startMission(game.mission.mission.id);
    for (const card of MISSIONS) {
      if (input.wasPressed(`Digit${card.key}`)) startMission(card.id);
    }
  }

  game.renderer.draw(ctx, game, now);
  input.endFrame();
  requestAnimationFrame(frame);
}

applyShotScene();
// One frame up front so a headless screenshot always catches a painted game.
game.renderer.draw(ctx, game, 0);
requestAnimationFrame(frame);

// A small handle for the screenshot scenes and for anyone play-testing.
window.__skerry = game;
