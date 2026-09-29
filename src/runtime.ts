// Everything whose lifetime is the game's starts here and is torn down by the disposer boot() returns: the two
// canvases, the clock, input, the store subscriptions that draw the screens, and resize handling.
import '@fontsource/orbitron';
import { UPDATE_PRIORITY } from 'pixi.js';
import * as Actions from './actions';
import { unlockAudio } from './audio';
import { onTick, startClock } from './clock';
import { readInput, startInput } from './input';
import { fit, initPixi, pixi } from './stage';
import { game, ui } from './store';
import { createArena, type Arena } from './view/arena';
import { tickScreens } from './screens/shared';
// Screens stack in import order (each screenUi attaches to layers.ui as its module loads): later draws on top.
import { drawHud } from './screens/hud';
import { drawUpgrade } from './screens/upgrade';
import { drawGameover } from './screens/gameover';
import { drawPause } from './screens/pause';
import { drawTitle } from './screens/title';
import { drawCodex } from './screens/codex';
import { drawRotate } from './screens/rotate';

export let arena: Arena | null = null;

/** Draw every screen from the stores (each skips the render when its tree is unchanged). */
export function drawScreens() {
  drawHud(); drawUpgrade(); drawGameover(); drawPause(); drawTitle(); drawCodex(); drawRotate();
}

/** One synchronous frame of both canvases: what a settled story shows and hit-tests against. */
export function renderNow() {
  arena?.render();
  pixi.renderer.render(pixi.stage);
}

export async function boot(el: HTMLElement): Promise<() => void> {
  const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
  arena = createArena(el, w, h);
  await initPixi(el, w, h);
  await document.fonts.load('20px Orbitron').catch(() => undefined);

  const a = arena;
  const stopInput = startInput(pixi.canvas, {
    enabled: () => { const u = ui.getState(), s = game.getState().run; return u.screen === 'play' && !u.paused && !u.portrait && (s.phase === 'fight' || s.phase === 'cleared'); },
    blocked: (x, y) => {
      const b = pixi.renderer.events.rootBoundary;
      b.rootTarget = pixi.stage; // Pixi only sets it while dispatching its own events; this runs outside them
      return b.hitTest(x, y)?.eventMode === 'static';
    },
    ship: () => { const p = game.getState().run.player; return a.toScreen(p.x, p.y); },
  });
  // A phone call or app switch pauses the fight.
  const hidden = () => { if (document.hidden) Actions.pause(); };
  document.addEventListener('visibilitychange', hidden);
  // First touch: sound on, and on phones go fullscreen in landscape (both may be refused; the game works either way).
  let askedFullscreen = false;
  const unlock = (e: Event) => {
    unlockAudio();
    if ((e as PointerEvent).pointerType === 'touch' && !askedFullscreen && !document.fullscreenElement) {
      askedFullscreen = true;
      document.documentElement.requestFullscreen?.().then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape')).catch(() => undefined);
    }
  };
  el.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  const offTick = onTick((dt) => {
    Actions.frame(dt, readInput());
    a.sync(game.getState().run, dt);
    return tickScreens(dt);
  });
  const stopClock = startClock(pixi.ticker, renderNow);
  const render3d = () => a.render();
  pixi.ticker.add(render3d, undefined, UPDATE_PRIORITY.LOW);
  const unsubs = [game.subscribe(drawScreens), ui.subscribe(drawScreens)];

  const resize = () => {
    const cw = el.clientWidth || innerWidth, ch = el.clientHeight || innerHeight;
    fit(cw, ch);
    a.resize(cw, ch);
    Actions.setPortrait(ch > cw);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();
  a.snap(game.getState().run);
  drawScreens();

  return () => {
    ro.disconnect();
    unsubs.forEach((u) => u());
    pixi.ticker.remove(render3d);
    stopClock(); offTick(); stopInput();
    document.removeEventListener('visibilitychange', hidden);
    el.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
}


