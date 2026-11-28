/** Shared browser Web Worker RPC, Canvas pixel renderer, pointer mapper, and Web Audio synthesizer for Play and Learn. */

export interface PlayFrameLike {
  width: number;
  height: number;
  title?: string;
  playing?: boolean;
  rgba?: Uint8Array | null;
  pixels?: readonly number[] | null;
  ops?: readonly number[] | null;
  hasUpdate?: boolean;
  status?: number;
}

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface VfsFileRecord {
  path: string;
  size: number;
  isText: boolean;
  textPreview?: string;
  bytesBase64?: string;
}

export interface DiagnosticRecord {
  file: string;
  line: number;
  column: number;
  category: string;
  message: string;
  raw: string;
}

export interface WorkerReply {
  id?: number;
  ok: boolean;
  action?: string;
  stream?: boolean;
  event?: 'stdout' | 'stderr' | 'stdin-wait';
  text?: string;
  ts?: string;
  c?: string;
  cError?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  needsStdin?: boolean;
  timings?: { compileMs?: number; runMs?: number };
  files?: VfsFileRecord[];
  diagnostics?: DiagnosticRecord[];
  tones?: number[];
  canvas?: PlayFrameLike | null;
  play?: PlayFrameLike | null;
  frame?: PlayFrameLike | null;
  status?: number;
  allPassed?: boolean;
  results?: unknown[];
}

export interface WorkerClient {
  call: (
    action: string,
    payload?: Record<string, unknown>,
    onEvent?: (msg: WorkerReply) => void,
  ) => Promise<WorkerReply>;
  post: (payload: Record<string, unknown>) => void;
  terminate: () => void;
}

interface WorkerInstanceLike {
  postMessage: (msg: unknown) => void;
  addEventListener: (type: string, handler: (event: unknown) => void) => void;
  terminate?: () => void;
}

type WorkerConstructorLike = new (url: string, options: { type: string }) => WorkerInstanceLike;

function setStagePixel(
  data: Uint8ClampedArray,
  idx: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const off = idx * 4;
  if (a >= 255) {
    data[off] = r;
    data[off + 1] = g;
    data[off + 2] = b;
    data[off + 3] = 255;
    return;
  }
  if (a <= 0) return;
  const inv = 255 - a;
  const dstA = data[off + 3] ?? 0;
  if (dstA === 0) {
    data[off] = r;
    data[off + 1] = g;
    data[off + 2] = b;
    data[off + 3] = a;
  } else {
    data[off] = Math.round((r * a + (data[off] ?? 0) * inv) / 255);
    data[off + 1] = Math.round((g * a + (data[off + 1] ?? 0) * inv) / 255);
    data[off + 2] = Math.round((b * a + (data[off + 2] ?? 0) * inv) / 255);
    data[off + 3] = Math.min(255, dstA + Math.round((a * inv) / 255));
  }
}

/** Renders Play `rgba`, `pixels`, and `ops` (op=1 clear, op=2 fillRect with ARGB->RGBA conversion) into an ImageData byte buffer. */
export function renderFrameToImageData(
  frame: PlayFrameLike,
  data: Uint8ClampedArray,
  stageWidth: number,
  stageHeight: number,
): void {
  if (frame.rgba && ArrayBuffer.isView(frame.rgba)) {
    const bytes = new Uint8Array(frame.rgba.buffer, frame.rgba.byteOffset, frame.rgba.byteLength);
    data.set(bytes.subarray(0, data.length));
  } else if (Array.isArray(frame.pixels)) {
    if (frame.pixels.length === 0) {
      data.fill(0);
    } else {
      const count = Math.min(frame.pixels.length, stageWidth * stageHeight);
      for (let i = 0; i < count; i += 1) {
        const c = Number(frame.pixels[i]) >>> 0;
        const off = i * 4;
        data[off] = (c >>> 16) & 255;
        data[off + 1] = (c >>> 8) & 255;
        data[off + 2] = c & 255;
        data[off + 3] = (c >>> 24) & 255;
      }
    }
  }

  const ops = frame.ops;
  if (!Array.isArray(ops) || ops.length === 0) return;

  let idx = 0;
  while (idx < ops.length) {
    const op = Number(ops[idx++]);
    if (op === 1 && idx < ops.length) {
      const c = Number(ops[idx++]) >>> 0;
      const a = (c >>> 24) & 255;
      const r = (c >>> 16) & 255;
      const g = (c >>> 8) & 255;
      const b = c & 255;
      for (let off = 0; off < data.length; off += 4) {
        data[off] = r;
        data[off + 1] = g;
        data[off + 2] = b;
        data[off + 3] = a;
      }
    } else if (op === 2 && idx + 4 < ops.length) {
      const rx = Number(ops[idx++]);
      const ry = Number(ops[idx++]);
      const rw = Number(ops[idx++]);
      const rh = Number(ops[idx++]);
      const c = Number(ops[idx++]) >>> 0;
      const a = (c >>> 24) & 255;
      const r = (c >>> 16) & 255;
      const g = (c >>> 8) & 255;
      const b = c & 255;
      const x0 = Math.max(0, Math.trunc(rx));
      const y0 = Math.max(0, Math.trunc(ry));
      const x1 = Math.min(stageWidth, Math.trunc(rx + rw));
      const y1 = Math.min(stageHeight, Math.trunc(ry + rh));
      for (let py = y0; py < y1; py += 1) {
        const rowOff = py * stageWidth;
        for (let px = x0; px < x1; px += 1) {
          setStagePixel(data, rowOff + px, r, g, b, a);
        }
      }
    } else {
      break;
    }
  }
}

/** Maps a pointer event inside an `object-fit: contain` canvas box to exact Play cell coordinates. */
export function mapPointerToCell(
  clientX: number,
  clientY: number,
  rect: RectLike,
  stageWidth: number,
  stageHeight: number,
): Readonly<{ x: number; y: number }> {
  if (!rect.width || !rect.height || !stageWidth || !stageHeight) {
    return { x: 0, y: 0 };
  }
  const scale = Math.min(rect.width / stageWidth, rect.height / stageHeight);
  const drawW = stageWidth * scale;
  const drawH = stageHeight * scale;
  const left = rect.left + (rect.width - drawW) / 2;
  const top = rect.top + (rect.height - drawH) / 2;
  const x = Math.max(0, Math.min(stageWidth - 1, Math.floor((clientX - left) / scale)));
  const y = Math.max(0, Math.min(stageHeight - 1, Math.floor((clientY - top) / scale)));
  return { x, y };
}

/** Creates a lazy, auto-recovering Web Worker RPC client for Lite compile/run/grade requests. */
export function createWorkerClient(workerUrl: string, customCtor?: WorkerConstructorLike): WorkerClient {
  let worker: WorkerInstanceLike | null = null;
  let nextReqId = 1;
  const pending = new Map<
    number,
    Readonly<{
      resolve: (msg: WorkerReply) => void;
      reject: (err: Error) => void;
      onEvent?: (msg: WorkerReply) => void;
    }>
  >();

  const ensureWorker = (): WorkerInstanceLike => {
    if (worker) return worker;
    const ctor = customCtor ?? (globalThis as unknown as { Worker?: WorkerConstructorLike }).Worker;
    if (!ctor) throw new Error('Web Workers are unavailable in this environment');
    const instance = new ctor(workerUrl, { type: 'module' });
    instance.addEventListener('message', (raw) => {
      const msg = ((raw as { data?: WorkerReply }).data ?? { ok: false }) as WorkerReply;
      if (msg.id === undefined) return;
      const entry = pending.get(msg.id);
      if (!entry) return;
      if (msg.stream) {
        entry.onEvent?.(msg);
        return;
      }
      pending.delete(msg.id);
      entry.resolve(msg);
    });
    instance.addEventListener('error', (raw) => {
      const errMsg = (raw as { message?: string }).message || 'Worker error';
      for (const entry of pending.values()) {
        entry.reject(new Error(errMsg));
      }
      pending.clear();
      worker = null;
    });
    worker = instance;
    return instance;
  };

  return {
    call(
      action: string,
      payload: Record<string, unknown> = {},
      onEvent?: (msg: WorkerReply) => void,
    ): Promise<WorkerReply> {
      return new Promise((resolve, reject) => {
        const id = nextReqId++;
        pending.set(id, onEvent !== undefined ? { resolve, reject, onEvent } : { resolve, reject });
        try {
          ensureWorker().postMessage({ id, action, ...payload });
        } catch (err) {
          pending.delete(id);
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    },
    post(payload: Record<string, unknown>): void {
      if (!worker) return;
      worker.postMessage(payload);
    },
    terminate(): void {
      if (worker?.terminate) worker.terminate();
      worker = null;
      for (const entry of pending.values()) {
        entry.reject(new Error('Worker terminated'));
      }
      pending.clear();
    },
  };
}

interface AudioCtxLike {
  state: string;
  currentTime: number;
  destination: unknown;
  resume?: () => Promise<void> | undefined;
  createOscillator: () => {
    type: string;
    frequency: { setValueAtTime: (freq: number, at: number) => void };
    connect: (dest: unknown) => void;
    start: (at: number) => void;
    stop: (at: number) => void;
  };
  createGain: () => {
    gain: {
      setValueAtTime: (val: number, at: number) => void;
      linearRampToValueAtTime: (val: number, at: number) => void;
    };
    connect: (dest: unknown) => void;
  };
}

export interface AudioPlayer {
  unlock: () => void;
  playTones: (values: readonly number[]) => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
}

/** Creates a safe Web Audio tone synthesizer for `media/audio` events. */
export function createAudioPlayer(): AudioPlayer {
  let muted = false;
  let audioCtx: AudioCtxLike | null = null;

  const unlock = (): void => {
    if (muted) return;
    const g = globalThis as unknown as {
      AudioContext?: new () => AudioCtxLike;
      webkitAudioContext?: new () => AudioCtxLike;
    };
    const Ctor = g.AudioContext ?? g.webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === 'suspended' && audioCtx.resume) {
      const resumed = audioCtx.resume();
      if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
    }
  };

  const playTones = (values: readonly number[]): void => {
    if (muted || !Array.isArray(values) || values.length < 3) return;
    unlock();
    if (!audioCtx || audioCtx.state !== 'running') return;
    let index = 0;
    while (index + 2 < values.length) {
      const frequency = Number(values[index]);
      const durationMs = Number(values[index + 1]);
      const volumePercent = Number(values[index + 2]);
      index += 3;
      if (
        !Number.isFinite(frequency) || frequency < 20 || frequency > 20000 ||
        !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 3000 ||
        !Number.isFinite(volumePercent) || volumePercent <= 0 || volumePercent > 100
      ) {
        continue;
      }
      const duration = durationMs / 1000;
      const volume = (volumePercent / 100) * 0.45;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const startAt = audioCtx.currentTime;
      const ramp = Math.min(duration / 4, 0.01);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(volume, startAt + ramp);
      gain.gain.setValueAtTime(volume, Math.max(startAt + ramp, startAt + duration - ramp));
      gain.gain.linearRampToValueAtTime(0, startAt + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration);
    }
  };

  return {
    unlock,
    playTones,
    setMuted(nextMuted: boolean): void {
      muted = Boolean(nextMuted);
      if (!muted) unlock();
    },
    isMuted(): boolean {
      return muted;
    },
  };
}

interface StageCanvasLike {
  width: number;
  height: number;
  title: string;
  getContext: (kind: string) => {
    createImageData: (w: number, h: number) => { data: Uint8ClampedArray };
    putImageData: (img: { data: Uint8ClampedArray }, x: number, y: number) => void;
  } | null;
  getBoundingClientRect: () => RectLike;
  addEventListener: (type: string, handler: (event: unknown) => void) => void;
  removeEventListener?: (type: string, handler: (event: unknown) => void) => void;
  focus?: (opts?: { preventScroll?: boolean }) => void;
}

interface StageButtonLike {
  hidden: boolean;
  title: string;
  setAttribute: (name: string, value: string) => void;
  addEventListener: (type: string, handler: () => void) => void;
}

export interface CreatePlayStageOptions {
  canvas: StageCanvasLike;
  workerClient: WorkerClient;
  audio?: AudioPlayer;
  sizeEl?: { textContent: string | null } | null;
  titleEl?: { textContent: string | null } | null;
  fpsEl?: { textContent: string | null } | null;
  pauseBtn?: StageButtonLike | null;
  pauseLabelEl?: { textContent: string | null } | null;
  muteBtn?: StageButtonLike | null;
  isCanvasVisible?: () => boolean;
  onStatus?: (status: string) => void;
  onError?: (stderr: string) => void;
}

export interface PlayStageController {
  applyFrame: (frame: PlayFrameLike) => void;
  startSession: (frame: PlayFrameLike, interactive: boolean) => void;
  pauseLoop: () => void;
  resumeLoop: () => void;
  stop: () => void;
  playTones: (tones?: readonly number[]) => void;
  unlockAudio: () => void;
  syncPauseUi: (tabVisible: boolean, updateStatus?: boolean) => void;
  isActive: () => boolean;
  isPlayable: () => boolean;
  isPaused: () => boolean;
}

/** Creates a complete interactive Play Canvas + Audio stage controller shared by Play and Learn. */
export function createPlayStage(options: CreatePlayStageOptions): PlayStageController {
  const { canvas, workerClient, sizeEl, titleEl, fpsEl, pauseBtn, pauseLabelEl, muteBtn, isCanvasVisible, onStatus, onError } = options;
  const audio = options.audio ?? createAudioPlayer();
  const ctx = canvas.getContext('2d');
  const raf = (globalThis as unknown as { requestAnimationFrame?: (cb: (t: number) => void) => number }).requestAnimationFrame;
  const caf = (globalThis as unknown as { cancelAnimationFrame?: (id: number) => void }).cancelAnimationFrame;

  let stageWidth = 0;
  let stageHeight = 0;
  let stageImage: { data: Uint8ClampedArray } | null = null;
  let animFrame = 0;
  let lastFrameAt = 0;
  let playInFlight = false;
  let activePlay = false;
  let activeCanvas = false;
  let playableCanvas = false;
  let canvasPaused = false;
  let hasPlayLoop = false;
  let playExitStatus = 0;
  let lastPointerMoveAt = 0;

  const applyFrame = (frame: PlayFrameLike): void => {
    if (!ctx || !frame || frame.width < 1 || frame.height < 1) return;
    if (stageWidth !== frame.width || stageHeight !== frame.height || !stageImage) {
      stageWidth = frame.width;
      stageHeight = frame.height;
      canvas.width = stageWidth;
      canvas.height = stageHeight;
      stageImage = ctx.createImageData(stageWidth, stageHeight);
    }
    if (sizeEl) sizeEl.textContent = `(${String(stageWidth)}x${String(stageHeight)})`;
    if (typeof frame.title === 'string') {
      const label = frame.title || 'Canvas Stage';
      if (titleEl) titleEl.textContent = label;
      canvas.title = label;
    }
    renderFrameToImageData(frame, stageImage.data, stageWidth, stageHeight);
    ctx.putImageData(stageImage, 0, 0);
  };

  const playReadyStatus = (): string => {
    if (activePlay) return 'Playing';
    if (hasPlayLoop && playExitStatus !== 0) return `Stopped (${String(playExitStatus)})`;
    return 'Interactive';
  };

  const syncPauseUi = (tabVisible: boolean, updateStatus = false): void => {
    const showPause = tabVisible && playableCanvas;
    if (pauseBtn) {
      pauseBtn.hidden = !showPause;
      pauseBtn.setAttribute('aria-pressed', canvasPaused ? 'true' : 'false');
      const stateText = canvasPaused ? 'Paused' : playReadyStatus();
      if (pauseLabelEl) pauseLabelEl.textContent = stateText;
      const tip = canvasPaused ? 'Paused — click to resume canvas events' : `${stateText} — click to pause canvas events`;
      pauseBtn.title = tip;
      pauseBtn.setAttribute('aria-label', tip);
    }
    if (updateStatus && playableCanvas && onStatus) {
      const stateText = canvasPaused ? 'Paused' : playReadyStatus();
      onStatus(canvasPaused ? 'Paused' : (stateText === 'Interactive' ? 'Interactive ready' : stateText));
    }
  };

  const syncMuteUi = (): void => {
    if (!muteBtn) return;
    const muted = audio.isMuted();
    muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    const label = muted ? 'Sound off — click to turn sound on' : 'Sound on — click to mute';
    muteBtn.title = label;
    muteBtn.setAttribute('aria-label', label);
  };
  syncMuteUi();

  const pauseLoop = (): void => {
    if (animFrame && caf) {
      caf(animFrame);
      animFrame = 0;
    }
    playInFlight = false;
    lastFrameAt = 0;
  };

  const stepCanvasFrame = async (now: number): Promise<void> => {
    animFrame = 0;
    if (!activePlay || canvasPaused) return;
    if (isCanvasVisible && !isCanvasVisible()) return;
    if (playInFlight) {
      if (raf) animFrame = raf((t) => { void stepCanvasFrame(t); });
      return;
    }
    const dtMs = lastFrameAt === 0 ? 16.667 : Math.max(now - lastFrameAt, 1);
    const dtSec = Math.min(dtMs / 1000, 0.1);
    if (lastFrameAt !== 0 && fpsEl) {
      fpsEl.textContent = `${(1000 / dtMs).toFixed(1)} fps · ${dtMs.toFixed(1)} ms`;
    }
    lastFrameAt = now;
    playInFlight = true;
    try {
      const res = await workerClient.call('step', { dt: dtSec });
      playInFlight = false;
      if (!activePlay || canvasPaused) return;
      if (Array.isArray(res.tones) && res.tones.length > 0) audio.playTones(res.tones);
      if (res.frame) applyFrame(res.frame);
      if (!res.ok) {
        activePlay = false;
        if (onError) onError(res.stderr || 'Canvas update failed.');
        return;
      }
      if ((res.status ?? 0) === 0) {
        if ((!isCanvasVisible || isCanvasVisible()) && raf) {
          animFrame = raf((t) => { void stepCanvasFrame(t); });
        }
      } else {
        activePlay = false;
        playExitStatus = res.status ?? 1;
        syncPauseUi(!isCanvasVisible || isCanvasVisible(), true);
      }
    } catch {
      playInFlight = false;
      activePlay = false;
    }
  };

  const resumeLoop = (): void => {
    if (activePlay && hasPlayLoop && !canvasPaused && !animFrame && raf) {
      lastFrameAt = 0;
      animFrame = raf((t) => { void stepCanvasFrame(t); });
    }
  };

  const stop = (): void => {
    pauseLoop();
    activePlay = false;
    activeCanvas = false;
    hasPlayLoop = false;
    playableCanvas = false;
    canvasPaused = false;
    playExitStatus = 0;
    if (fpsEl) fpsEl.textContent = '0.0 fps · 0.0 ms';
    syncPauseUi(false, false);
    workerClient.post({ action: 'stop' });
  };

  const startSession = (frame: PlayFrameLike, interactive: boolean): void => {
    applyFrame(frame);
    activeCanvas = true;
    canvasPaused = false;
    if (interactive) {
      hasPlayLoop = Boolean(frame.hasUpdate);
      playExitStatus = Number(frame.status ?? 0);
      activePlay = hasPlayLoop && playExitStatus === 0;
      playableCanvas = true;
      syncPauseUi(true, true);
      resumeLoop();
      canvas.focus?.({ preventScroll: true });
    } else {
      hasPlayLoop = false;
      playExitStatus = 0;
      activePlay = false;
      playableCanvas = false;
      syncPauseUi(false, false);
    }
  };

  const sendInteraction = async (action: string, payload: Record<string, unknown>): Promise<void> => {
    if (!activeCanvas || canvasPaused) return;
    try {
      const res = await workerClient.call(action, payload);
      if (!activeCanvas || canvasPaused) return;
      if (Array.isArray(res.tones) && res.tones.length > 0) audio.playTones(res.tones);
      if (res.frame) applyFrame(res.frame);
    } catch {
      // Ignore superseded interaction replies
    }
  };

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (!activeCanvas || !playableCanvas) return;
      canvasPaused = !canvasPaused;
      if (canvasPaused) {
        pauseLoop();
        if (fpsEl) fpsEl.textContent = '0.0 fps · 0.0 ms';
      } else if (!isCanvasVisible || isCanvasVisible()) {
        audio.unlock();
        resumeLoop();
        canvas.focus?.({ preventScroll: true });
      }
      syncPauseUi(true, true);
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      audio.setMuted(!audio.isMuted());
      syncMuteUi();
    });
  }

  canvas.addEventListener('keydown', (raw) => {
    if (!activeCanvas || canvasPaused) return;
    const ev = raw as { key: string; preventDefault: () => void };
    audio.unlock();
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(ev.key)) {
      ev.preventDefault();
    }
    void sendInteraction('keydown', { key: ev.key });
  });

  canvas.addEventListener('keyup', (raw) => {
    if (!activeCanvas || canvasPaused) return;
    const ev = raw as { key: string };
    void sendInteraction('keyup', { key: ev.key });
  });

  canvas.addEventListener('pointermove', (raw) => {
    if (!activeCanvas || canvasPaused) return;
    const now = performance.now();
    if (now - lastPointerMoveAt < 16) return;
    lastPointerMoveAt = now;
    const ev = raw as { clientX: number; clientY: number };
    const cell = mapPointerToCell(ev.clientX, ev.clientY, canvas.getBoundingClientRect(), stageWidth || canvas.width, stageHeight || canvas.height);
    void sendInteraction('pointermove', cell);
  });

  canvas.addEventListener('pointerdown', (raw) => {
    if (!activeCanvas || canvasPaused) return;
    audio.unlock();
    canvas.focus?.({ preventScroll: true });
    const ev = raw as { clientX: number; clientY: number; button?: number };
    const cell = mapPointerToCell(ev.clientX, ev.clientY, canvas.getBoundingClientRect(), stageWidth || canvas.width, stageHeight || canvas.height);
    void sendInteraction('pointerdown', { ...cell, button: ev.button ?? 0 });
  });

  canvas.addEventListener('pointerup', (raw) => {
    if (!activeCanvas || canvasPaused) return;
    const ev = raw as { clientX: number; clientY: number; button?: number };
    const cell = mapPointerToCell(ev.clientX, ev.clientY, canvas.getBoundingClientRect(), stageWidth || canvas.width, stageHeight || canvas.height);
    void sendInteraction('pointerup', { ...cell, button: ev.button ?? 0 });
  });

  canvas.addEventListener('wheel', (raw) => {
    if (!activeCanvas || canvasPaused) return;
    const ev = raw as { deltaY?: number; preventDefault?: () => void };
    if (typeof ev.deltaY === 'number' && Number.isFinite(ev.deltaY)) {
      ev.preventDefault?.();
      void sendInteraction('wheel', { deltaY: ev.deltaY });
    }
  });

  return {
    applyFrame,
    startSession,
    pauseLoop,
    resumeLoop,
    stop,
    playTones(tones?: readonly number[]): void {
      if (Array.isArray(tones) && tones.length > 0) audio.playTones(tones);
    },
    unlockAudio: audio.unlock,
    syncPauseUi,
    isActive: () => activePlay,
    isPlayable: () => playableCanvas,
    isPaused: () => canvasPaused,
  };
}

export interface SurfaceStateLike {
  w: number;
  h: number;
  title: string;
  pixels: Uint8Array;
  open: boolean;
  pointerX: number;
  pointerY: number;
  pointerDown: boolean;
  key: string;
  keysDown?: Set<string>;
  pendingWheelDelta?: number;
  pendingDeltaMs: number;
  targetFps: number;
}

export interface SurfaceHostApiLike {
  poll: () => unknown;
  present: () => void;
  close: () => void;
}

export interface CanvasSurfaceHost {
  host: {
    open: (_id: number, title: string, width: number, height: number, state: SurfaceStateLike) => void;
    poll: (_id: number, state: SurfaceStateLike) => void;
    present: (_id: number, state: SurfaceStateLike) => void;
    close: (_id: number, state: SurfaceStateLike) => void;
    playTone: (_id: number, frequency: number, durationMs: number, volume: number) => void;
    resize: (_id: number, width: number, height: number, state: SurfaceStateLike) => void;
    run: (
      _surface: unknown,
      state: SurfaceStateLike,
      onFrame: (inp: unknown) => boolean,
      api: SurfaceHostApiLike,
    ) => boolean;
  };
  stop: () => void;
}

export interface CreateCanvasSurfaceHostOptions {
  audio?: AudioPlayer;
  onStop?: () => void;
  requestAnimationFrame?: (cb: (t: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
}

/** Creates an embeddable `gfx/surface` host bound directly to any HTML `<canvas>` element. */
export function createCanvasSurfaceHost(
  canvas: StageCanvasLike,
  options: CreateCanvasSurfaceHostOptions = {},
): CanvasSurfaceHost {
  const audio = options.audio ?? createAudioPlayer();
  const ctx = canvas.getContext('2d');
  const g = globalThis as unknown as {
    requestAnimationFrame?: (cb: (t: number) => void) => number;
    cancelAnimationFrame?: (id: number) => void;
  };
  const raf = options.requestAnimationFrame ?? g.requestAnimationFrame;
  const caf = options.cancelAnimationFrame ?? g.cancelAnimationFrame;

  let imgWidth = 0;
  let imgHeight = 0;
  let imgData: { data: Uint8ClampedArray } | null = null;
  let animId = 0;
  let stopped = false;
  let activeState: SurfaceStateLike | null = null;
  let activeApi: SurfaceHostApiLike | null = null;
  let pointerX = 0;
  let pointerY = 0;
  let pointerDown = false;
  let pendingKey = '';
  const heldKeys = new Set<string>();
  let pendingWheel = 0;
  let lastFrameAt = 0;

  const ensureImage = (width: number, height: number): void => {
    if (!ctx || width < 1 || height < 1) return;
    if (imgWidth !== width || imgHeight !== height || !imgData) {
      imgWidth = width;
      imgHeight = height;
      canvas.width = width;
      canvas.height = height;
      imgData = ctx.createImageData(width, height);
    }
  };

  const blitState = (state: SurfaceStateLike): void => {
    if (!ctx) return;
    ensureImage(state.w, state.h);
    if (!imgData) return;
    imgData.data.set(state.pixels.subarray(0, imgData.data.length));
    ctx.putImageData(imgData, 0, 0);
  };

  const onKeyDown = (raw: unknown): void => {
    const ev = raw as { key?: string; preventDefault?: () => void };
    audio.unlock();
    const k = String(ev.key ?? '');
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) {
      ev.preventDefault?.();
    }
    heldKeys.add(k);
    pendingKey = k;
  };
  const onKeyUp = (raw: unknown): void => {
    const ev = raw as { key?: string };
    heldKeys.delete(String(ev.key ?? ''));
  };
  const onWheel = (raw: unknown): void => {
    const ev = raw as { deltaY?: number; preventDefault?: () => void };
    if (typeof ev.deltaY === 'number' && Number.isFinite(ev.deltaY)) {
      ev.preventDefault?.();
      pendingWheel += ev.deltaY;
    }
  };
  const onPointerMove = (raw: unknown): void => {
    const ev = raw as { clientX: number; clientY: number };
    const cell = mapPointerToCell(ev.clientX, ev.clientY, canvas.getBoundingClientRect(), imgWidth || canvas.width, imgHeight || canvas.height);
    pointerX = cell.x;
    pointerY = cell.y;
  };
  const onPointerDown = (raw: unknown): void => {
    audio.unlock();
    canvas.focus?.({ preventScroll: true });
    const ev = raw as { clientX: number; clientY: number };
    const cell = mapPointerToCell(ev.clientX, ev.clientY, canvas.getBoundingClientRect(), imgWidth || canvas.width, imgHeight || canvas.height);
    pointerX = cell.x;
    pointerY = cell.y;
    pointerDown = true;
  };
  const onPointerUp = (raw: unknown): void => {
    const ev = raw as { clientX: number; clientY: number };
    const cell = mapPointerToCell(ev.clientX, ev.clientY, canvas.getBoundingClientRect(), imgWidth || canvas.width, imgHeight || canvas.height);
    pointerX = cell.x;
    pointerY = cell.y;
    pointerDown = false;
  };

  let listenersAttached = false;
  const attachListeners = (): void => {
    if (listenersAttached) return;
    listenersAttached = true;
    canvas.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel);
  };
  const detachListeners = (): void => {
    if (!listenersAttached) return;
    listenersAttached = false;
    canvas.removeEventListener?.('keydown', onKeyDown);
    canvas.removeEventListener?.('keyup', onKeyUp);
    canvas.removeEventListener?.('pointermove', onPointerMove);
    canvas.removeEventListener?.('pointerdown', onPointerDown);
    canvas.removeEventListener?.('pointerup', onPointerUp);
    canvas.removeEventListener?.('wheel', onWheel);
  };

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (animId && caf) {
      caf(animId);
      animId = 0;
    }
    if (activeState) activeState.open = false;
    detachListeners();
    const api = activeApi;
    activeApi = null;
    activeState = null;
    api?.close();
    options.onStop?.();
  };

  return {
    stop,
    host: {
      open(_id: number, title: string, width: number, height: number, state: SurfaceStateLike): void {
        stopped = false;
        activeState = state;
        canvas.title = title;
        ensureImage(width, height);
        attachListeners();
      },
      poll(_id: number, state: SurfaceStateLike): void {
        state.pointerX = pointerX;
        state.pointerY = pointerY;
        state.pointerDown = pointerDown;
        if (state.keysDown) {
          state.keysDown.clear();
          for (const k of heldKeys) state.keysDown.add(k);
        }
        if (pendingWheel !== 0) {
          state.pendingWheelDelta = (state.pendingWheelDelta ?? 0) + pendingWheel;
          pendingWheel = 0;
        }
        if (pendingKey) {
          state.key = pendingKey;
          pendingKey = '';
        }
      },
      present(_id: number, state: SurfaceStateLike): void {
        blitState(state);
      },
      close(_id: number, _state: SurfaceStateLike): void {
        detachListeners();
        if (animId && caf) {
          caf(animId);
          animId = 0;
        }
        activeApi = null;
        activeState = null;
      },
      playTone(_id: number, frequency: number, durationMs: number, volume: number): void {
        audio.playTones([frequency, durationMs, volume]);
      },
      resize(_id: number, width: number, height: number, state: SurfaceStateLike): void {
        ensureImage(width, height);
        blitState(state);
      },
      run(
        _surface: unknown,
        state: SurfaceStateLike,
        onFrame: (inp: unknown) => boolean,
        api: SurfaceHostApiLike,
      ): boolean {
        activeState = state;
        activeApi = api;
        lastFrameAt = 0;
        const step = (now: number): void => {
          animId = 0;
          if (stopped || !state.open) {
            stop();
            return;
          }
          if (lastFrameAt > 0) {
            state.pendingDeltaMs = Math.max(0, Math.round(now - lastFrameAt));
          } else {
            state.pendingDeltaMs = 16;
          }
          lastFrameAt = now;
          const inp = api.poll();
          if (!state.open || !onFrame(inp)) {
            stop();
            return;
          }
          api.present();
          if (raf && !stopped && state.open) {
            animId = raf(step);
          }
        };
        state.pendingDeltaMs = 16;
        const firstInp = api.poll();
        if (!state.open || !onFrame(firstInp)) {
          stop();
          return true;
        }
        api.present();
        if (raf && !stopped && state.open) {
          animId = raf(step);
        }
        return true;
      },
    },
  };
}
