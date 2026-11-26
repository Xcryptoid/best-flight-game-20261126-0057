// Skerry Run — tuning constants.
// One place for every number the flight model, the world and the HUD agree on,
// so a tweak here moves the whole game together and nothing is magic elsewhere.

export const VIEW = {
  width: 1280,
  height: 720,
  horizonRest: 0.42, // fraction of the height where the horizon sits in level flight
  focal: 620, // perspective focal length for projecting the world ahead
};

export const PLANE = {
  minSpeed: 38, // knots: below this the wing stops flying and the nose drops
  cruiseSpeed: 95,
  maxSpeed: 165,
  climbRate: 9.5, // feet per second of climb at full pull and cruise speed
  sinkRate: 7.0, // feet per second of sink at idle throttle, level attitude
  turnRate: 0.55, // radians per second of heading change at full bank
  maxBank: 0.9, // radians of roll the pilot can hold
  maxPitch: 0.32, // radians of nose up or down
  fuelBurn: 0.55, // fuel units per second at full throttle
  fuelCapacity: 100,
  damageLimit: 100, // the airframe gives up at this much damage
  startAltitude: 420, // feet above the sea when a sortie begins
  startSpeed: 90,
};

export const WORLD = {
  seed: 20261126,
  seaLevel: 0,
  islandCount: 14,
  spread: 5200, // metres of sea the archipelago spans, side to side
  depth: 9000, // metres of sea ahead of the home runway
  ringCount: 8,
  ringRadius: 26, // metres across the middle of a ring
  dropZoneRadius: 60, // metres across the supply-drop target
};

export const MISSIONS = [
  {
    id: 'rings',
    key: '1',
    name: 'Ring Run',
    brief: 'Thread all 8 sky rings before the tanks run dry.',
    goal: 'Fly through every ring. 8 rings, one tank of fuel.',
  },
  {
    id: 'landing',
    key: '2',
    name: 'Runway Landing',
    brief: 'Bring her home: touch down on the strip, gentle and slow.',
    goal: 'Land on the runway under 70 kt with a soft descent.',
  },
  {
    id: 'drop',
    key: '3',
    name: 'Supply Drop',
    brief: 'Gull Island is out of coffee. Drop the crate inside the circle.',
    goal: 'Fly low over the marked circle and release the crate.',
  },
];

export const COLORS = {
  skyTop: '#1d4e89',
  skyMid: '#7db3dd',
  skyHorizon: '#d9e9f2',
  seaDeep: '#0d4d6e',
  seaShallow: '#2e8fae',
  sand: '#e8d9a8',
  grass: '#4d8a4a',
  rock: '#6f7d84',
  runway: '#3c4148',
  ring: '#ffb02e',
  ringNext: '#ffe08a',
  hudAmber: '#ffb02e',
  hudCyan: '#8fe3ff',
  hudRed: '#ff5d4d',
};
