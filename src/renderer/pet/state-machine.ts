import type { PetState } from '../../shared/contracts';

export interface StateFrame {
  stateId: string;
  frameIndex: number;
  frame: string;
  stateChanged: boolean;
}

type PlayPhase = 'playing' | 'hold-end';

interface ActiveState {
  state: PetState;
  frameIndex: number;
  startedAt: number;
  phase: PlayPhase;
  frameDurationMs: number;
  holdEndMs: number;
}

export class PetStateMachine {
  private readonly states: Map<string, PetState>;
  private readonly idleState: PetState;
  private active: ActiveState;
  private readonly completedAt = new Map<string, number>();

  constructor(states: PetState[], now = 0, idleStateId = 'idle') {
    this.states = new Map(states.map((state) => [state.id, state]));
    const idle = this.states.get(idleStateId);
    if (!idle) throw new Error(`Missing idle state: ${idleStateId}`);
    this.idleState = idle;
    this.active = this.makeActive(idle, now);
  }

  private getHoldEndMs(state: PetState): number {
    // 互动状态默认定格时间，空闲动作短一点
    const defaults: Record<string, number> = {
      'tap-happy': 800,
      'pet-head': 1000,
      'feed-fish': 1200,
      'play-wand': 1200,
      'notify': 800,
      'edge-peek': 900,
      'yawn': 600,
      'lick-paw': 600,
      'tail-chase': 800,
      'pet-belly': 1200,
      'knead': 1000,
      'climb': 800,
      'dance': 1200,
      'scratch': 600,
    };
    return defaults[state.id] ?? 0;
  }

  private makeActive(state: PetState, now: number): ActiveState {
    return {
      state,
      frameIndex: 0,
      startedAt: now,
      phase: 'playing',
      frameDurationMs: state.frameDurationMs,
      holdEndMs: this.getHoldEndMs(state),
    };
  }

  start(stateId: string, now: number, durationMs?: number): boolean {
    const next = this.states.get(stateId);
    if (!next) return false;
    if (this.active.state.priority > next.priority) return false;
    if (this.active.state.id === next.id && next.interrupt === 'resume') return false;
    const lastCompleted = this.completedAt.get(next.id);
    if (lastCompleted !== undefined && now - lastCompleted < next.cooldownMs) return false;
    this.active = this.makeActive(next, now);
    return true;
  }

  tick(now: number): StateFrame {
    let stateChanged = false;
    let elapsed = Math.max(0, now - this.active.startedAt);
    const { state } = this.active;
    const frameCount = Math.max(1, state.frames.length);
    const frameTotalMs = frameCount * this.active.frameDurationMs;

    // 检查是否需要切回 idle
    const totalDurationMs = state.loop ? 0 : frameTotalMs + this.active.holdEndMs;
    if (totalDurationMs > 0 && elapsed >= totalDurationMs) {
      this.completedAt.set(state.id, now);
      this.active = this.makeActive(this.idleState, now);
      elapsed = 0;
      stateChanged = true;
    }

    const currentState = this.active.state;
    const currentFrameCount = Math.max(1, currentState.frames.length);
    const currentFrameTotalMs = currentFrameCount * this.active.frameDurationMs;

    let frameIndex: number;
    if (this.active.phase === 'hold-end') {
      // 定格阶段：保持最后一帧
      frameIndex = currentFrameCount - 1;
    } else {
      // 播放阶段
      const rawIndex = Math.floor(elapsed / Math.max(1, this.active.frameDurationMs));
      frameIndex = currentState.loop
        ? rawIndex % currentFrameCount
        : Math.min(currentFrameCount - 1, rawIndex);

      // 检查是否进入定格阶段
      if (!currentState.loop && this.active.holdEndMs > 0 && elapsed >= currentFrameTotalMs) {
        this.active.phase = 'hold-end';
        frameIndex = currentFrameCount - 1;
      }
    }

    const frameChanged = frameIndex !== this.active.frameIndex;
    this.active.frameIndex = frameIndex;

    return {
      stateId: currentState.id,
      frameIndex,
      frame: currentState.frames[frameIndex] ?? currentState.frames[0] ?? '',
      stateChanged: stateChanged || frameChanged,
    };
  }

  currentStateId(): string {
    return this.active.state.id;
  }
}
