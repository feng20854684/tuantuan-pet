import spec from '../../../pet-spec.json';
import type { PetSpec, PetStats, Settings, InteractionSpec } from '../../shared/contracts';
import './index.css';

// 用于 asset link 检查的占位符
const assetContext = require.context('../../assets/pet', true, /\.png$/i);
const assetMap = new Map<string, string>();
for (const key of assetContext.keys()) {
  assetMap.set(key.replace(/^\.\//, ''), assetContext(key));
}

const petSpec = spec as PetSpec;
document.title = `${petSpec.character.displayName}的小屋`;

// 设置主题色
const theme = petSpec.experience.theme;
document.documentElement.style.setProperty('--primary', theme.primary);
document.documentElement.style.setProperty('--accent', theme.accent);
document.documentElement.style.setProperty('--background', theme.background);
document.documentElement.style.setProperty('--surface', theme.surface);
document.documentElement.style.setProperty('--text', theme.text);
document.documentElement.style.setProperty('--muted', theme.muted);
document.documentElement.style.setProperty('--radius', `${theme.cornerRadius}px`);

// 设置宠物信息
document.getElementById('pet-name')!.textContent = petSpec.character.displayName;
document.getElementById('pet-personality')!.textContent = petSpec.character.personality.join('、');

const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
const affectionEl = document.getElementById('affection') as HTMLDivElement;
const moodEl = document.getElementById('mood') as HTMLDivElement;
const todayInteractionsEl = document.getElementById('today-interactions') as HTMLDivElement;
const companionMinutesEl = document.getElementById('companion-minutes') as HTMLDivElement;
const interactionsList = document.getElementById('interactions-list') as HTMLDivElement;
const toggleAlwaysOnTop = document.getElementById('toggle-always-on-top') as HTMLDivElement;
const toggleClickThrough = document.getElementById('toggle-click-through') as HTMLDivElement;
const toggleAutoStart = document.getElementById('toggle-auto-start') as HTMLDivElement;
const toggleSound = document.getElementById('toggle-sound') as HTMLDivElement;
const toggleConfirmExit = document.getElementById('toggle-confirm-exit') as HTMLDivElement;
const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
const sizeSelector = document.getElementById('size-selector') as HTMLDivElement;

let currentSettings: Settings | null = null;

// 加载互动列表
async function loadInteractions(): Promise<void> {
  try {
    const interactions = await window.petAPI?.interactions.list();
    if (!interactions) return;

    interactionsList.replaceChildren();
    for (const interaction of interactions) {
      const btn = document.createElement('button');
      btn.className = 'interaction-btn';
      const emoji = document.createElement('span');
      emoji.textContent = interaction.emoji;
      const label = document.createElement('span');
      label.textContent = interaction.label;
      btn.append(emoji, label);
      btn.addEventListener('click', async () => {
        try {
          await window.petAPI?.interactions.trigger(interaction.id);
        } catch (error) {
          console.error('Failed to trigger interaction:', error);
        }
      });
      interactionsList.appendChild(btn);
    }
  } catch (error) {
    console.error('Failed to load interactions:', error);
  }
}

// 加载设置
async function loadSettings(): Promise<void> {
  try {
    const settings = await window.petAPI?.settings.get();
    if (!settings) return;
    currentSettings = settings;

    // 更新开关状态
    if (settings.alwaysOnTop) {
      toggleAlwaysOnTop.classList.add('active');
    } else {
      toggleAlwaysOnTop.classList.remove('active');
    }

    if (settings.clickThrough) {
      toggleClickThrough.classList.add('active');
    } else {
      toggleClickThrough.classList.remove('active');
    }

    toggleAutoStart.classList.toggle('active', !!settings.autoStart);
    toggleSound.classList.toggle('active', settings.soundEnabled);
    toggleConfirmExit.classList.toggle('active', settings.confirmExit);
    opacitySlider.value = String(Math.round(settings.opacity * 100));

    // 更新大小选择
    const sizeBtns = sizeSelector.querySelectorAll('.size-btn');
    sizeBtns.forEach((btn) => {
      const scale = parseFloat((btn as HTMLElement).dataset.scale || '1');
      if (Math.abs(scale - settings.petScale) < 0.01) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// 加载统计数据
async function loadStats(): Promise<void> {
  try {
    const stats = await window.petAPI?.interactions.stats();
    if (!stats) return;
    updateStats(stats);
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

function updateStats(stats: PetStats): void {
  affectionEl.textContent = String(stats.affection);
  moodEl.textContent = String(stats.mood);
  todayInteractionsEl.textContent = String(stats.todayInteractions);
  const unit = document.createElement('small');
  unit.textContent = '分钟';
  companionMinutesEl.replaceChildren(String(stats.companionMinutes), unit);
}

// 关闭按钮
closeBtn.addEventListener('click', async () => {
  await window.petAPI?.window.hideDashboard();
});

// 置顶开关
toggleAlwaysOnTop.addEventListener('click', async () => {
  if (!currentSettings) return;
  const newVal = !currentSettings.alwaysOnTop;
  try {
    await window.petAPI?.settings.update({ alwaysOnTop: newVal });
    currentSettings.alwaysOnTop = newVal;
    if (newVal) {
      toggleAlwaysOnTop.classList.add('active');
    } else {
      toggleAlwaysOnTop.classList.remove('active');
    }
  } catch (error) {
    console.error('Failed to update setting:', error);
  }
});

// 鼠标穿透开关
toggleClickThrough.addEventListener('click', async () => {
  if (!currentSettings) return;
  const newVal = !currentSettings.clickThrough;
  try {
    await window.petAPI?.settings.update({ clickThrough: newVal });
    currentSettings.clickThrough = newVal;
    toggleClickThrough.classList.toggle('active', newVal);
  } catch (error) {
    console.error('Failed to update setting:', error);
  }
});

// 开机自启开关
toggleAutoStart.addEventListener('click', async () => {
  if (!currentSettings) return;
  const newVal = !currentSettings.autoStart;
  try {
    await window.petAPI?.settings.update({ autoStart: newVal });
    currentSettings.autoStart = newVal;
    toggleAutoStart.classList.toggle('active', newVal);
  } catch (error) {
    console.error('Failed to update setting:', error);
  }
});

// 音效开关
toggleSound.addEventListener('click', async () => {
  if (!currentSettings) return;
  const newVal = !currentSettings.soundEnabled;
  try {
    await window.petAPI?.settings.update({ soundEnabled: newVal });
    currentSettings.soundEnabled = newVal;
    toggleSound.classList.toggle('active', newVal);
  } catch (error) {
    console.error('Failed to update setting:', error);
  }
});

// 退出确认开关
toggleConfirmExit.addEventListener('click', async () => {
  if (!currentSettings) return;
  const newVal = !currentSettings.confirmExit;
  try {
    await window.petAPI?.settings.update({ confirmExit: newVal });
    currentSettings.confirmExit = newVal;
    toggleConfirmExit.classList.toggle('active', newVal);
  } catch (error) {
    console.error('Failed to update setting:', error);
  }
});

// 透明度滑块
opacitySlider.addEventListener('change', async () => {
  if (!currentSettings) return;
  const val = Number(opacitySlider.value) / 100;
  try {
    await window.petAPI?.settings.update({ opacity: val });
    currentSettings.opacity = val;
  } catch (error) {
    console.error('Failed to update opacity:', error);
  }
});

// 大小选择
sizeSelector.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  if (!target.classList.contains('size-btn')) return;
  if (!currentSettings) return;

  const scale = parseFloat(target.dataset.scale || '1');
  try {
    await window.petAPI?.settings.update({ petScale: scale });
    currentSettings.petScale = scale;

    const sizeBtns = sizeSelector.querySelectorAll('.size-btn');
    sizeBtns.forEach((btn) => btn.classList.remove('active'));
    target.classList.add('active');
  } catch (error) {
    console.error('Failed to update pet scale:', error);
  }
});

// 数据导出/导入
const btnExport = document.getElementById('btn-export') as HTMLButtonElement;
const btnImport = document.getElementById('btn-import') as HTMLButtonElement;
btnExport.addEventListener('click', async () => {
  try {
    const result = await window.petAPI?.data.export();
    if (result) console.log(result);
  } catch (error) {
    console.error('Export failed:', error);
  }
});
btnImport.addEventListener('click', async () => {
  try {
    const result = await window.petAPI?.data.import();
    if (result) {
      console.log(result);
      await loadStats();
    }
  } catch (error) {
    console.error('Import failed:', error);
  }
});

// 监听统计数据更新
window.petAPI?.events.onStats((stats: PetStats) => {
  updateStats(stats);
});

// ===== 动画预览模式 =====
const previewImg = document.getElementById('preview-img') as HTMLImageElement;
const previewLabel = document.getElementById('preview-label') as HTMLDivElement;
const stateGrid = document.getElementById('state-grid') as HTMLDivElement;
const btnCycle = document.getElementById('btn-cycle') as HTMLButtonElement;
const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;

let previewTimer: ReturnType<typeof setTimeout> | null = null;
let cycleTimer: ReturnType<typeof setTimeout> | null = null;
let cycleIndex = 0;

const stateOrder = petSpec.states.map((s) => s.id);

function stopPreview(): void {
  if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
  if (cycleTimer) { clearTimeout(cycleTimer); cycleTimer = null; }
  btnCycle.classList.remove('active');
}

function playStateLocally(stateId: string): void {
  stopPreview();
  const state = petSpec.states.find((s) => s.id === stateId);
  if (!state) return;

  previewLabel.textContent = stateId;
  document.querySelectorAll('.state-btn').forEach((b) => b.classList.toggle('active', (b as HTMLElement).dataset.stateId === stateId));

  let frameIdx = 0;
  const totalFrames = state.frames.length;
  const frameDur = state.frameDurationMs;
  const frames = state.frames;

  function showFrame(): void {
    const frameName = frames[frameIdx];
    if (frameName) {
      const url = assetMap.get(frameName);
      if (url) previewImg.src = url;
    }
    frameIdx++;
    if (frameIdx < totalFrames) {
      previewTimer = setTimeout(showFrame, frameDur);
    }
  }
  showFrame();
}

function playStateOnPet(stateId: string): void {
  const state = petSpec.states.find((s) => s.id === stateId);
  const dur = state ? Math.max(800, state.frames.length * state.frameDurationMs) : undefined;
  window.petAPI?.debug.playState(stateId, dur).catch((err) => console.error('debug playState failed:', err));
}

function cycleNext(): void {
  if (cycleIndex >= stateOrder.length) cycleIndex = 0;
  const stateId = stateOrder[cycleIndex] ?? 'idle';
  playStateLocally(stateId);
  playStateOnPet(stateId);
  cycleIndex++;

  const state = petSpec.states.find((s) => s.id === stateId);
  const totalDur = state ? state.frames.length * state.frameDurationMs + 500 : 2000;
  cycleTimer = setTimeout(cycleNext, totalDur);
}

function startCycle(): void {
  stopPreview();
  cycleIndex = 0;
  btnCycle.classList.add('active');
  cycleNext();
}

// 创建状态按钮
for (const state of petSpec.states) {
  const btn = document.createElement('button');
  btn.className = 'state-btn';
  btn.dataset.stateId = state.id;
  btn.textContent = state.id;
  btn.addEventListener('click', () => {
    playStateLocally(state.id);
    playStateOnPet(state.id);
  });
  stateGrid.appendChild(btn);
}

btnCycle.addEventListener('click', () => {
  if (cycleTimer) { stopPreview(); } else { startCycle(); }
});
btnStop.addEventListener('click', () => {
  stopPreview();
  playStateLocally('idle');
  playStateOnPet('idle');
});

// 初始化显示 idle 第一帧
const idleFrame = petSpec.states.find((s) => s.id === 'idle')?.frames[0];
if (idleFrame && assetMap.get(idleFrame)) previewImg.src = assetMap.get(idleFrame)!;
previewLabel.textContent = 'idle';
stateGrid.querySelector('[data-state-id="idle"]')?.classList.add('active');

// 初始化
async function init(): Promise<void> {
  await loadInteractions();
  await loadSettings();
  await loadStats();
}

init();
