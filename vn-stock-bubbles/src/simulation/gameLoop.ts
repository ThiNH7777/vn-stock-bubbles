/**
 * Fixed-timestep game loop using the Gaffer on Games accumulator pattern.
 *
 * Decouples physics updates (fixed dt) from rendering (variable frame rate).
 * - Physics runs at FIXED_DT intervals regardless of display refresh rate (PHYS-04)
 * - Rendering runs once per requestAnimationFrame
 * - Spiral of death prevention: MAX_FRAME_TIME caps elapsed time, MAX_STEPS_PER_FRAME limits iterations
 *
 * No React dependencies -- pure JS module.
 */

const FIXED_DT = 1000 / 60;         // 16.667ms physics step
const MAX_FRAME_TIME = 100;          // Cap at 100ms (prevents spiral of death after tab backgrounding)
const MAX_STEPS_PER_FRAME = 5;       // Safety cap -- prevents freeze after long tab background

/**
 * Factory function that creates a game loop with start/stop controls.
 *
 * @param update - Called with (dt, time) for each fixed-timestep physics tick
 * @param render - Called once per frame after all physics ticks
 * @returns Object with start() and stop() methods
 */
export function createGameLoop(
  update: (dt: number, time: number) => void,
  render: () => void,
): { start: () => void; stop: () => void } {
  let rafId = 0;
  let running = false;
  let lastTime = 0;
  let accumulator = 0;
  let simulationTime = 0;

  function frame(timestamp: number): void {
    if (!running) return;

    // First frame: reset lastTime so delta is 0 (prevents huge initial jump)
    if (lastTime === 0) {
      lastTime = timestamp;
    }

    let elapsed = timestamp - lastTime;
    lastTime = timestamp;

    // After long gap (tab backgrounded), just advance one step instead of
    // catching up with 5+ steps that cause collision cascades and jerking.
    if (elapsed > MAX_FRAME_TIME) {
      elapsed = FIXED_DT;
      accumulator = 0;
    }

    accumulator += elapsed;

    // Run physics steps while accumulator has enough time
    let steps = 0;
    while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      update(FIXED_DT, simulationTime);
      simulationTime += FIXED_DT;
      accumulator -= FIXED_DT;
      steps++;
    }

    // Render once per frame
    render();

    rafId = requestAnimationFrame(frame);
  }

  function start(): void {
    if (running) return; // No-op if already running
    running = true;
    lastTime = 0; // Reset so first frame has zero delta
    accumulator = 0;
    rafId = requestAnimationFrame(frame);
  }

  function stop(): void {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  return { start, stop };
}
