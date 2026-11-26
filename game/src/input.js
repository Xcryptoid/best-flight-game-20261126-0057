// Skerry Run — keyboard and mouse input.
// One object owns every key the game listens for, so the flight model and the
// menus both ask the same place and no key is tracked twice.

const WATCHED = [
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyR', 'KeyM', 'KeyP',
  'Digit1', 'Digit2', 'Digit3', 'Enter', 'Escape',
];

export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, clicked: false };
    this.canvas = canvas;

    window.addEventListener('keydown', (event) => {
      if (WATCHED.includes(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.down.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
    });
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) this.mouse.clicked = true;
    });
  }

  held(code) {
    return this.down.has(code);
  }

  // True once, on the frame the key went down; consumed by endFrame().
  wasPressed(code) {
    return this.pressed.has(code);
  }

  get throttleUp() {
    return this.held('KeyW');
  }

  get throttleDown() {
    return this.held('KeyS');
  }

  get pitchUp() {
    return this.held('ArrowUp');
  }

  get pitchDown() {
    return this.held('ArrowDown');
  }

  get bankLeft() {
    return this.held('ArrowLeft') || this.held('KeyA');
  }

  get bankRight() {
    return this.held('ArrowRight') || this.held('KeyD');
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
