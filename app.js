/**
 * ========================================================
 * 커플 다이어트 & 운동 메이트 (Couple Fit) - Full Application Logic
 * ========================================================
 */

// --- 1. Audio Synthesizer (Web Audio API for Timer & Cheer Chimes) ---
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.voiceEnabled = true;
    this.vibrateEnabled = true;
  }
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  playTone(freq = 520, duration = 0.2, type = 'sine', gainVal = 0.25) {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.log('Audio error:', e);
    }
  }
  // 맑고 청량한 2음 '띵~동!🔔' (G5 784Hz -> E5 659Hz + 벨 배음 하모닉스)
  playDingDong() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // 1음 '띵~' (G5 783.99Hz + G6 1567.98Hz harmonic)
      const osc1 = this.ctx.createOscillator();
      const osc1h = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now);
      osc1h.type = 'triangle';
      osc1h.frequency.setValueAtTime(1567.98, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc1.connect(gain1);
      osc1h.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1h.start(now);
      osc1.stop(now + 0.65);
      osc1h.stop(now + 0.65);

      // 2음 '동~' (E5 659.25Hz + E6 1318.5Hz harmonic)
      const t2 = now + 0.28;
      const osc2 = this.ctx.createOscillator();
      const osc2h = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, t2);
      osc2h.type = 'triangle';
      osc2h.frequency.setValueAtTime(1318.51, t2);
      gain2.gain.setValueAtTime(0.38, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.85);
      osc2.connect(gain2);
      osc2h.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t2);
      osc2h.start(t2);
      osc2.stop(t2 + 0.85);
      osc2h.stop(t2 + 0.85);
    } catch (e) {
      console.log('DingDong error:', e);
    }
  }
  // 활기찬 출발 / 다음 세트 시작 벨 (도-미-솔 벨)
  playStartChime() {
    if (!this.soundEnabled) return;
    this.playTone(523.25, 0.12, 'sine', 0.25); // C5
    setTimeout(() => this.playTone(659.25, 0.12, 'sine', 0.25), 110); // E5
    setTimeout(() => this.playTone(783.99, 0.35, 'sine', 0.32), 220); // G5
  }
  playCountdownTick(num = 3) {
    if (!this.soundEnabled) return;
    const freq = num === 1 ? 987.77 : (num === 2 ? 880 : 784);
    this.playTone(freq, 0.1, 'sine', 0.22);
  }
  playSuccess() {
    this.playStartChime();
    setTimeout(() => this.playTone(1046.5, 0.5, 'sine', 0.35), 350); // C6 Fanfare
  }
  playBeep(freq = 520, duration = 0.15, type = 'sine') {
    this.playTone(freq, duration, type, 0.2);
  }
  playRest() {
    this.playDingDong();
  }
  speak(text) {
    if (!this.voiceEnabled) return;
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ko-KR';
        utter.rate = 1.08;
        utter.pitch = 1.1;
        window.speechSynthesis.speak(utter);
      } catch (e) {
        console.log('TTS error:', e);
      }
    }
  }
  vibrate(pattern = [150, 100, 200]) {
    if (!this.vibrateEnabled) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }
}
const sfx = new SoundEffects();

// --- 1-1. HTML escape & ⋯ 더보기 메뉴 헬퍼 ---
function escapeHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// items: [{ label, action, danger }]  → 수정/삭제 같은 보조 동작을 ⋯ 버튼 하나로 묶음
function moreMenuHtml(items) {
  const buttons = items.map(it =>
    `<button class="more-item${it.danger ? ' danger' : ''}" onclick="closeMoreMenus(); ${it.action}">${it.label}</button>`
  ).join('');
  return `<div class="more-wrap"><button class="more-btn" aria-label="더보기" onclick="toggleMoreMenu(this, event)">⋯</button><div class="more-menu">${buttons}</div></div>`;
}
function toggleMoreMenu(btn, e) {
  if (e) e.stopPropagation();
  const menu = btn.nextElementSibling;
  const wasOpen = menu.classList.contains('open');
  closeMoreMenus();
  if (!wasOpen) menu.classList.add('open');
}
function closeMoreMenus() {
  document.querySelectorAll('.more-menu.open').forEach(m => m.classList.remove('open'));
}
document.addEventListener('click', (e) => {
  if (!e.target.closest || !e.target.closest('.more-wrap')) closeMoreMenus();
});

// --- 1-2. 이름 헬퍼 (설정에서 바꾼 이름을 화면 전체에 반영) ---
const ROLE_EMOJI = { boyfriend: '🏃‍♂️', girlfriend: '🐰' };
// 이모지를 뺀 짧은 이름 (예: '오동원')
function nm(role) {
  const full = role === 'girlfriend' ? store.data.couple.gfName : store.data.couple.bfName;
  return String(full || '').replace(/\s*(🏃‍♂️|🐰)\s*$/u, '').trim() || (role === 'girlfriend' ? '여자친구' : '남자친구');
}
// 이모지를 붙인 이름 (예: '오동원 🏃‍♂️')
function nmFull(role) {
  return `${nm(role)} ${ROLE_EMOJI[role] || ''}`.trim();
}
// HTML에 고정으로 적힌 이름 자리(data-name="bf|gf")를 현재 이름으로 채움
function applyNamesToDom() {
  document.querySelectorAll('[data-name]').forEach(el => {
    const role = el.getAttribute('data-name') === 'gf' ? 'girlfriend' : 'boyfriend';
    const text = nm(role) + (el.getAttribute('data-name-suffix') || '');
    if (el.innerText !== text) el.innerText = text;
  });
}

// --- 2. UUID Generator Helper ---
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- 3. Initial State & Local Storage Data Store ---
const DEFAULT_STATE = {
  currentRole: 'boyfriend', // 'boyfriend' | 'girlfriend'
  couple: {
    code: 'LOVE-2026',
    ddayDate: '2026-06-13',
    bfName: '오동원 🏃‍♂️',
    gfName: '김해솔 🐰',
    stepGoal: 8000
  },
  supabase: {
    url: 'https://phrquhzdmssheveiyvei.supabase.co',
    anonKey: 'sb_publishable_T-fLfm7ATY-3Vec4ZjS24Q_DtACNgqK',
    connected: false
  },
  pins: {
    boyfriend: '1349',
    girlfriend: '1234'
  },
  attendance: {},
  stepLogs: {},
  weightLogs: {
    boyfriend: [],
    girlfriend: []
  },
  dietLogs: [],
  missions: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      title: '이번 주 5일 걷기/러닝 달성하기 👟',
      target: 5,
      unit: '일',
      bfProgress: 0,
      gfProgress: 0,
      penalty: '진 사람이 주말에 달콤한 디저트 사주기 🍰'
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      title: '스쿼트 총 200개 채우기 🏋️',
      target: 200,
      unit: '개',
      bfProgress: 0,
      gfProgress: 0,
      penalty: '진 사람이 10분 어깨 마사지해주기 💆'
    }
  ],
  cheers: [],
  penalties: [],
  coupons: [
    { id: '33333333-3333-4333-8333-333333333331', title: '☕ 스타벅스 커피 & 조각케이크 쿠폰', requiredHearts: 5, unlocked: false, used: false },
    { id: '33333333-3333-4333-8333-333333333332', title: '🥩 치팅데이 삼겹살/오마카세 데이트권', requiredHearts: 12, unlocked: false, used: false },
    { id: '33333333-3333-4333-8333-333333333333', title: '💆 주말 전신 힐링 마사지 30분권', requiredHearts: 20, unlocked: false, used: false },
    { id: '33333333-3333-4333-8333-333333333334', title: '🎬 영화관 VIP 팝콘 세트 데이트권', requiredHearts: 30, unlocked: false, used: false }
  ],
  foodWishlist: []
};

// State Manager
class AppStore {
  constructor() {
    this.data = this.load();
    this.cleanSampleData();
  }
  load() {
    try {
      const saved = localStorage.getItem('couple_fit_data');
      let data = saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : { ...DEFAULT_STATE };
      // 이름/사귄 날짜/걸음 목표는 설정에서 바꿀 수 있음 (없으면 기본값)
      data.couple = { ...DEFAULT_STATE.couple, ...(data.couple || {}) };
      if (!Array.isArray(data.penalties)) data.penalties = [];
      if (!Array.isArray(data.coupons)) data.coupons = [];
      if (!Array.isArray(data.foodWishlist)) data.foodWishlist = [];

      // 더미/샘플 위시리스트 및 벌칙 즉시 영구 제거
      data.foodWishlist = data.foodWishlist.filter(w =>
        w && w.id && !w.id.startsWith('w1') && !w.id.startsWith('w2') && !w.id.startsWith('w_')
      );
      data.penalties = data.penalties.filter(p =>
        p && p.id && !p.id.startsWith('p1') && !p.id.startsWith('p_')
      );

      if (!data.pins) {
        data.pins = { boyfriend: '1234', girlfriend: '1234' };
      }
      if (!data.supabase || !data.supabase.url) {
        data.supabase = {
          url: 'https://phrquhzdmssheveiyvei.supabase.co',
          anonKey: 'sb_publishable_T-fLfm7ATY-3Vec4ZjS24Q_DtACNgqK',
          connected: false
        };
      }
      return data;
    } catch (e) {
      return { ...DEFAULT_STATE };
    }
  }
  save() {
    try {
      // 날짜 필터로 서버에서 임시로 불러온 과거 식단(_older)은 용량 절약을 위해 로컬에 저장하지 않음
      const persistData = Array.isArray(this.data.dietLogs) && this.data.dietLogs.some(d => d && d._older)
        ? { ...this.data, dietLogs: this.data.dietLogs.filter(d => !(d && d._older)) }
        : this.data;
      localStorage.setItem('couple_fit_data', JSON.stringify(persistData));
    } catch (e) {
      console.warn('LocalStorage quota warning, saving lean version:', e);
      try {
        const leanData = { ...this.data };
        if (Array.isArray(leanData.dietLogs)) {
          leanData.dietLogs = leanData.dietLogs.filter(d => !(d && d._older));
        }
        if (Array.isArray(leanData.dietLogs) && leanData.dietLogs.length > 5) {
          leanData.dietLogs = leanData.dietLogs.slice(-5);
        }
        localStorage.setItem('couple_fit_data', JSON.stringify(leanData));
      } catch (e2) {
        console.error('Final LocalStorage save error:', e2);
      }
    }
  }
  cleanSampleData() {
    // 기존에 생성되었던 더미/샘플 위시리스트 및 벌칙 정리
    if (this.data.foodWishlist && Array.isArray(this.data.foodWishlist)) {
      this.data.foodWishlist = this.data.foodWishlist.filter(w =>
        w && w.id && !w.id.startsWith('w1') && !w.id.startsWith('w2') && !w.id.startsWith('w_')
      );
    }
    if (this.data.penalties && Array.isArray(this.data.penalties)) {
      this.data.penalties = this.data.penalties.filter(p =>
        p && p.id && !p.id.startsWith('p1') && !p.id.startsWith('p_')
      );
    }
    // 기존에 생성되었던 더미/샘플 데이터 제거 (초기화)
    if (!this.data.isCleaned) {
      this.data.attendance = {};
      this.data.stepLogs = {};
      this.data.weightLogs = { boyfriend: [], girlfriend: [] };
      this.data.dietLogs = [];
      this.data.cheers = [];
      this.data.missions.forEach(m => { m.bfProgress = 0; m.gfProgress = 0; });
      this.data.coupons.forEach(c => { c.unlocked = false; c.used = false; });
      this.data.isCleaned = true;
    }
    this.save();
  }
  resetAll() {
    const supabaseConfig = { ...this.data.supabase };
    this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.data.supabase = supabaseConfig;
    this.data.isCleaned = true;
    this.save();
  }
}
const store = new AppStore();

// --- 3. Date & Utility Helpers ---
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getDateOffsetStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// 이번 주 시작 시각 (월요일 00:00, 기기 로컬 시간 기준)
function getWeekStartDate(baseDate = new Date()) {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const day = d.getDay(); // 0=일 ... 6=토
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}
// 해당 시각이 정확히 '월요일 00:00:00.000' 인지 (주간 미션 기간 표식 여부 판별용)
function isWeekStartMoment(dateObj) {
  return dateObj.getDay() === 1 && dateObj.getHours() === 0 && dateObj.getMinutes() === 0 &&
    dateObj.getSeconds() === 0 && dateObj.getMilliseconds() === 0;
}
function formatKoreanDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m)}월 ${parseInt(d)}일`;
}
function formatCheerTimestamp(createdIsoOrDate) {
  if (!createdIsoOrDate) return '';
  const d = new Date(createdIsoOrDate);
  if (isNaN(d.getTime())) return createdIsoOrDate;

  const today = new Date();
  const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate();

  const hour = d.getHours();
  const ampm = hour >= 12 ? '오후' : '오전';
  const hour12 = hour % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  const timePart = `${ampm} ${hour12}:${min}`;

  if (isToday) {
    return `오늘 ${timePart}`;
  } else if (isYesterday) {
    return `어제 ${timePart}`;
  } else {
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${timePart}`;
  }
}
function calculateDday(targetDateStr) {
  const target = new Date(targetDateStr);
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = today - targetDay;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '오늘부터 1일! 💖';
  } else if (diffDays > 0) {
    return `함께한 지 D+${diffDays + 1}`;
  } else {
    return `우리의 시작까지 D${diffDays}`; // e.g. D-120
  }
}

// --- 4. Floating Hearts Animation Generator ---
function createFloatingHearts(x, y, count = 12) {
  const emojis = ['💖', '💕', '✨', '🥰', '🔥', '🌸'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'floating-heart';
    el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = `${x + (Math.random() * 80 - 40)}px`;
    el.style.top = `${y + (Math.random() * 40 - 20)}px`;
    el.style.fontSize = `${18 + Math.random() * 16}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}

// --- 5. UI Rendering & Tab Switching ---
let currentTab = 'home';
let currentCalendarMonth = new Date();

function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

  const targetPage = document.getElementById(`tab-${tabId}`);
  const targetBtn = document.getElementById(`nav-${tabId}`);
  if (targetPage) targetPage.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');

  // 탭별 새로고침
  if (tabId === 'home') renderHomeScreen();
  if (tabId === 'stats') renderStatsScreen();
  if (tabId === 'diet') renderDietScreen();
  if (tabId === 'missions') renderMissionsScreen();
  if (tabId === 'timer') renderTimerScreen();
}

// --- 6. Feature 1: Home Dashboard & Calendar Logic ---
function renderHomeScreen() {
  const role = store.data.currentRole;
  const today = getTodayStr();
  const attData = store.data.attendance[today] || { boyfriend: false, girlfriend: false };

  // D-Day 업데이트 (2026년 6월 13일 기준)
  const ddayEl = document.getElementById('couple-dday');
  if (ddayEl) {
    const fullDday = calculateDday(store.data.couple.ddayDate);
    const m = fullDday.match(/D[+-]?\d+/);
    ddayEl.innerText = m ? `💕 ${m[0]}` : '💕 1일';
    ddayEl.title = fullDday;
  }
  renderCheerFeed();

  applyNamesToDom();
  updateProfileSwitchUI();

  // 사용자 전환 버튼 상태
  const bfBtn = document.getElementById('switch-bf');
  const gfBtn = document.getElementById('switch-gf');
  if (role === 'boyfriend') {
    bfBtn.className = 'switch-pill active-bf';
    gfBtn.className = 'switch-pill';
  } else {
    bfBtn.className = 'switch-pill';
    gfBtn.className = 'switch-pill active-gf';
  }

  // 출석 히어로 버튼
  const isDoneToday = role === 'boyfriend' ? attData.boyfriend : attData.girlfriend;
  const heroBtn = document.getElementById('hero-attendance-btn');
  const heroTitle = document.getElementById('hero-attendance-title');
  const heroDesc = document.getElementById('hero-attendance-desc');
  const heroIcon = document.getElementById('hero-attendance-icon');

  if (isDoneToday) {
    heroBtn.className = 'attendance-hero-btn done';
    heroIcon.innerText = '🎉';
    heroTitle.innerText = '오늘 운동 완료! 멋져요 👏';
    heroDesc.innerText = '탭하여 출석 취소 또는 수정할 수 있어요';
  } else {
    heroBtn.className = 'attendance-hero-btn ready';
    heroIcon.innerText = role === 'boyfriend' ? '🏃‍♂️' : '🐰';
    heroTitle.innerText = '오늘 운동 완료 도장 찍기! 👟';
    heroDesc.innerText = '원탭으로 출석하고 파트너와 하트를 완성하세요';
  }

  // 스트릭 & 주간 달성률 계산
  updateStreakAndRate();

  // 달력 렌더링
  renderCalendar();
}

function updateStreakAndRate() {
  const history = store.data.attendance;
  let streak = 0;
  let checkDate = new Date();

  // 스트릭 계산 (연속 출석일수) - 상한 없이 끊길 때까지 계산 (안전장치: 최대 10년)
  for (let i = 0; i < 3660; i++) {
    const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    const rec = history[dStr];
    const isCompleted = rec && (store.data.currentRole === 'boyfriend' ? rec.boyfriend : rec.girlfriend);

    if (isCompleted) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // 오늘은 아직 안 눌렀을 수 있으므로 어제부터 체크
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 이번 주 달성률 계산 (최근 7일 중)
  let weekSuccessCount = 0;
  for (let i = 0; i < 7; i++) {
    const dStr = getDateOffsetStr(-i);
    const rec = history[dStr];
    if (rec && (store.data.currentRole === 'boyfriend' ? rec.boyfriend : rec.girlfriend)) {
      weekSuccessCount++;
    }
  }
  const weeklyRate = Math.round((weekSuccessCount / 7) * 100);

  const streakEl = document.getElementById('streak-count');
  const weeklyRateEl = document.getElementById('weekly-rate');
  if (streakEl) streakEl.innerText = `${streak}일 연속`;
  if (weeklyRateEl) weeklyRateEl.innerText = `${weeklyRate}%`;
  const weeklyLblEl = document.getElementById('weekly-rate-lbl');
  if (weeklyLblEl) weeklyLblEl.innerText = `7일 중 ${weekSuccessCount}일 운동`;
}

function jumpToCurrentMonth() {
  currentCalendarMonth = new Date();
  renderCalendar();
}

function renderCalendar() {
  const container = document.getElementById('calendar-days-container');
  if (!container) return;
  container.innerHTML = '';

  const y = currentCalendarMonth.getFullYear();
  const m = currentCalendarMonth.getMonth();

  const monthLabel = document.getElementById('calendar-month-label');
  if (monthLabel) monthLabel.innerText = `${y}년 ${m + 1}월`;

  const firstDay = new Date(y, m, 1).getDay(); // 0(일) ~ 6(토)
  const lastDate = new Date(y, m + 1, 0).getDate();
  const todayStr = getTodayStr();

  let monthHeartsCount = 0;

  // 빈 칸 추가
  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'calendar-cell';
    blank.style.background = 'transparent';
    blank.style.borderColor = 'transparent';
    blank.style.cursor = 'default';
    container.appendChild(blank);
  }

  // 날짜 타일 렌더링
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    if (dateStr === todayStr) {
      cell.classList.add('today');
    }

    const dateNum = document.createElement('span');
    dateNum.className = 'calendar-date-num';
    dateNum.innerText = d;
    cell.appendChild(dateNum);

    const iconBox = document.createElement('div');
    iconBox.className = 'calendar-cell-icon';

    const att = store.data.attendance[dateStr];
    if (att) {
      if (att.boyfriend && att.girlfriend) {
        // 둘 다 완료 -> 💖
        monthHeartsCount++;
        cell.classList.add('stamp-both');
        iconBox.innerHTML = '<span class="stamp-heart-pulse">💖</span>';
      } else if (att.boyfriend) {
        cell.classList.add('stamp-dongwon');
        iconBox.innerHTML = '🏃‍♂️';
      } else if (att.girlfriend) {
        cell.classList.add('stamp-haesol');
        iconBox.innerHTML = '🐰';
      }
    }

    cell.appendChild(iconBox);

    // 날짜 타일 클릭 시 출석 토글 (과거 날짜도 도장 찍기/취소 지원)
    cell.addEventListener('click', (e) => {
      toggleDateAttendance(dateStr, e);
    });

    container.appendChild(cell);
  }

  // 이번 달 통계 캡슐 업데이트
  const monthHeartsEl = document.getElementById('calendar-month-hearts');
  if (monthHeartsEl) {
    monthHeartsEl.innerHTML = `💖 ${monthHeartsCount}일 달성!`;
  }
}

async function toggleDateAttendance(dateStr, e) {
  const role = store.data.currentRole;
  if (!store.data.attendance[dateStr]) {
    store.data.attendance[dateStr] = { boyfriend: false, girlfriend: false, workoutType: '일반 운동' };
  }

  const currentVal = store.data.attendance[dateStr][role];
  const newVal = !currentVal;
  store.data.attendance[dateStr][role] = newVal;
  store.save();

  if (newVal) {
    sfx.playSuccess();
    if (e) createFloatingHearts(e.clientX || window.innerWidth / 2, e.clientY || 200, 16);
    checkRewardBoxUnlocks();
  }

  renderHomeScreen();
  await syncAttendanceToSupabase(dateStr, role, newVal);
}

async function toggleTodayAttendance(e) {
  const role = store.data.currentRole;
  const today = getTodayStr();
  if (!store.data.attendance[today]) {
    store.data.attendance[today] = { boyfriend: false, girlfriend: false, workoutType: '일반 운동' };
  }

  const currentVal = store.data.attendance[today][role];
  const newVal = !currentVal;
  store.data.attendance[today][role] = newVal;
  store.save();

  if (newVal) {
    sfx.playSuccess();
    if (e) createFloatingHearts(e.clientX || window.innerWidth / 2, e.clientY || 200, 16);
    checkRewardBoxUnlocks();
  }

  renderHomeScreen();
  await syncAttendanceToSupabase(today, role, newVal);
}

// --- 7. Custom In-App Date Picker & State ---
let selectedStepDate = getTodayStr();
let selectedWeightDate = getTodayStr();
let selectedDietDate = getTodayStr();
let selectedDietFilterDate = '';

let activePickerTarget = 'diet'; // 'step' | 'weight' | 'diet' | 'filter'
let pickerMonth = new Date();

function formatDatePretty(dateStr) {
  if (!dateStr) return '모든 날짜';
  const today = getTodayStr();
  const yesterday = getDateOffsetStr(-1);
  if (dateStr === today) return `오늘 (${formatKoreanDate(dateStr)})`;
  if (dateStr === yesterday) return `어제 (${formatKoreanDate(dateStr)})`;
  return formatKoreanDate(dateStr);
}

function openCustomDatePicker(target) {
  activePickerTarget = target;
  let currentDate = getTodayStr();
  if (target === 'step') currentDate = selectedStepDate;
  if (target === 'weight') currentDate = selectedWeightDate;
  if (target === 'diet') currentDate = selectedDietDate;
  if (target === 'filter') currentDate = selectedDietFilterDate || getTodayStr();

  const [y, m] = currentDate.split('-');
  pickerMonth = new Date(parseInt(y), parseInt(m) - 1, 1);

  const titleMap = {
    step: '👟 걸음 기록 날짜 선택',
    weight: '⚖️ 체중 측정 날짜 선택',
    diet: '🥗 식사한 날짜 선택',
    filter: '🔍 식단 모아볼 날짜 선택'
  };
  const titleEl = document.getElementById('modal-datepicker-title');
  if (titleEl) titleEl.innerText = titleMap[target] || '🗓️ 날짜 선택';

  renderPickerCalendar();
  openModal('modal-custom-datepicker');
}

function renderPickerCalendar() {
  const container = document.getElementById('picker-days-grid');
  if (!container) return;
  container.innerHTML = '';

  const y = pickerMonth.getFullYear();
  const m = pickerMonth.getMonth();

  const monthLabel = document.getElementById('picker-month-label');
  if (monthLabel) monthLabel.innerText = `${y}년 ${m + 1}월`;

  const firstDay = new Date(y, m, 1).getDay();
  const lastDate = new Date(y, m + 1, 0).getDate();
  const todayStr = getTodayStr();

  let targetDate = '';
  if (activePickerTarget === 'step') targetDate = selectedStepDate;
  if (activePickerTarget === 'weight') targetDate = selectedWeightDate;
  if (activePickerTarget === 'diet') targetDate = selectedDietDate;
  if (activePickerTarget === 'filter') targetDate = selectedDietFilterDate;

  // 빈 칸
  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'calendar-cell';
    blank.style.background = 'transparent';
    blank.style.borderColor = 'transparent';
    container.appendChild(blank);
  }

  // 날짜 타일
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    if (dateStr === targetDate) {
      cell.classList.add('stamp-both'); // 선택된 날짜는 핑크 하이라이트
    } else if (dateStr === todayStr) {
      cell.classList.add('today');
    }

    const dateNum = document.createElement('span');
    dateNum.className = 'calendar-date-num';
    dateNum.innerText = d;
    cell.appendChild(dateNum);

    const iconBox = document.createElement('div');
    iconBox.className = 'calendar-cell-icon';
    if (dateStr === targetDate) {
      iconBox.innerHTML = '✨';
    }
    cell.appendChild(iconBox);

    cell.addEventListener('click', () => {
      selectDateFromPicker(dateStr);
    });

    container.appendChild(cell);
  }
}

function movePickerMonth(delta) {
  pickerMonth.setMonth(pickerMonth.getMonth() + delta);
  renderPickerCalendar();
}

function jumpPickerToToday() {
  pickerMonth = new Date();
  selectDateFromPicker(getTodayStr());
}

function selectDateFromPicker(dateStr) {
  sfx.playSuccess();
  if (activePickerTarget === 'step') {
    selectedStepDate = dateStr;
    updateStepUI();
  } else if (activePickerTarget === 'weight') {
    selectedWeightDate = dateStr;
    updateWeightUI();
  } else if (activePickerTarget === 'diet') {
    selectedDietDate = dateStr;
    updateDietInputUI();
  } else if (activePickerTarget === 'filter') {
    selectedDietFilterDate = dateStr;
    renderDietScreen();
    loadDietLogsForFilterDate(dateStr);
  }

  closeModal('modal-custom-datepicker');
}

// ‹ › 버튼으로 하루씩 이동 (미래 날짜로는 이동 불가)
function shiftPickerDate(target, delta) {
  const today = getTodayStr();
  const current = {
    step: selectedStepDate,
    weight: selectedWeightDate,
    diet: selectedDietDate,
    filter: selectedDietFilterDate
  }[target] || today;
  const [y, m, d] = current.split('-').map(Number);
  const next = new Date(y, m - 1, d + delta);
  const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  if (nextStr > today) return;
  sfx.playSuccess();
  if (target === 'step') { selectedStepDate = nextStr; updateStepUI(); }
  else if (target === 'weight') { selectedWeightDate = nextStr; updateWeightUI(); }
  else if (target === 'diet') { selectedDietDate = nextStr; updateDietInputUI(); }
  else if (target === 'filter') {
    selectedDietFilterDate = nextStr;
    renderDietScreen();
    loadDietLogsForFilterDate(nextStr);
  }
}

// 오늘이 선택된 경우 › 버튼 비활성화
function refreshDateNextButton(target, dateStr) {
  const btn = document.getElementById(`${target}-date-next`);
  if (btn) btn.disabled = !!dateStr && dateStr >= getTodayStr();
}

// 퀵 날짜 셋팅 헬퍼
function setQuickStepDate(offset) {
  selectedStepDate = getDateOffsetStr(offset);
  sfx.playSuccess();
  updateStepUI();
}
function setQuickWeightDate(offset) {
  selectedWeightDate = getDateOffsetStr(offset);
  sfx.playSuccess();
  updateWeightUI();
}
function setQuickDietDate(offset) {
  selectedDietDate = getDateOffsetStr(offset);
  sfx.playSuccess();
  updateDietInputUI();
}
function setQuickDietFilter(offset) {
  selectedDietFilterDate = getDateOffsetStr(offset);
  sfx.playSuccess();
  renderDietScreen();
  loadDietLogsForFilterDate(selectedDietFilterDate);
}

function updateStepUI() {
  const lbl = document.getElementById('step-date-label');
  if (lbl) lbl.innerText = formatDatePretty(selectedStepDate);
  refreshDateNextButton('step', selectedStepDate);

  const role = store.data.currentRole;
  const data = store.data.stepLogs[selectedStepDate] || { boyfriend: 0, girlfriend: 0 };
  const stepInput = document.getElementById('step-input');
  if (stepInput) stepInput.value = data[role] > 0 ? data[role] : '';
}

function updateWeightUI() {
  const lbl = document.getElementById('weight-date-label');
  if (lbl) lbl.innerText = formatDatePretty(selectedWeightDate);
  refreshDateNextButton('weight', selectedWeightDate);

  const role = store.data.currentRole;
  const list = store.data.weightLogs[role] || [];
  const existing = list.find(item => item.date === selectedWeightDate);
  const weightInput = document.getElementById('weight-input');
  if (weightInput) weightInput.value = existing ? existing.weight : '';
}

function updateDietInputUI() {
  const lbl = document.getElementById('diet-date-label');
  if (lbl) lbl.innerText = formatDatePretty(selectedDietDate);
  refreshDateNextButton('diet', selectedDietDate);
}

// --- 8. Stats Screen Rendering (비밀번호 보안 잠금) ---
let isWeightUnlocked = false;

// --- 내 체중 그래프 & 목표 체중 (잠금 해제 상태에서만 표시, 목표는 이 기기에만 저장) ---
function getGoalWeight(role) {
  try {
    const v = parseFloat(localStorage.getItem('couple_goal_weight_' + role));
    return isNaN(v) ? null : v;
  } catch (e) { return null; }
}

function saveGoalWeight() {
  const role = store.data.currentRole;
  const input = document.getElementById('goal-weight-input');
  if (!input) return;
  const raw = input.value.trim();
  let goalValue = null;
  try {
    if (raw === '') {
      localStorage.removeItem('couple_goal_weight_' + role);
    } else {
      const v = parseFloat(raw);
      if (isNaN(v) || v <= 20 || v >= 250) return showToast('올바른 목표 체중(kg)을 입력해주세요!');
      localStorage.setItem('couple_goal_weight_' + role, String(v));
      goalValue = v;
    }
  } catch (e) {}
  goalWeightPushedOnce = true;
  syncGoalWeightToSupabase(role, goalValue);
  input.blur();
  sfx.playSuccess();
  renderStatsScreen();
}

function renderMyWeightTrend(role, logs) {
  const goal = getGoalWeight(role);
  const goalInput = document.getElementById('goal-weight-input');
  if (goalInput && document.activeElement !== goalInput) goalInput.value = goal != null ? goal : '';

  const progressEl = document.getElementById('goal-progress');
  const latest = logs[logs.length - 1];
  if (progressEl) {
    if (goal == null) {
      progressEl.innerText = '목표 체중을 정하면 남은 kg을 알려드려요.';
    } else if (!latest) {
      progressEl.innerText = `목표 ${goal}kg · 체중을 기록하면 남은 kg이 보여요.`;
    } else {
      const remain = (latest.weight - goal);
      const start = latest.baseline || logs[0].weight;
      const total = start - goal;
      const pct = total > 0 ? Math.max(0, Math.min(100, Math.round(((start - latest.weight) / total) * 100))) : null;
      progressEl.innerHTML = remain <= 0
        ? `🎉 <b>목표 ${goal}kg 달성!</b> 정말 대단해요.`
        : `목표 ${goal}kg까지 <b>${remain.toFixed(1)}kg</b> 남았어요${pct != null ? ` · ${pct}% 진행` : ''}`;
    }
  }

  const canvas = document.getElementById('my-weight-chart');
  const emptyEl = document.getElementById('my-weight-chart-empty');
  if (!canvas) return;
  const points = logs.slice(-60);
  if (points.length < 2) {
    canvas.style.display = 'none';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  canvas.style.display = 'block';
  if (emptyEl) emptyEl.hidden = true;

  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 300;
  const cssH = canvas.clientHeight || 150;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const toDay = (str) => { const [y, m, d] = str.split('-').map(Number); return Math.round(new Date(y, m - 1, d).getTime() / 86400000); };
  const xs = points.map(p => toDay(p.date));
  const ws = points.map(p => p.weight);
  let minW = Math.min(...ws), maxW = Math.max(...ws);
  const showGoal = goal != null && goal > minW - 8 && goal < maxW + 8;
  if (showGoal) { minW = Math.min(minW, goal); maxW = Math.max(maxW, goal); }
  const padW = Math.max(0.5, (maxW - minW) * 0.15);
  minW -= padW; maxW += padW;

  const left = 38, right = 12, top = 12, bottom = 22;
  const plotW = cssW - left - right, plotH = cssH - top - bottom;
  const xSpan = Math.max(1, xs[xs.length - 1] - xs[0]);
  const px = (x) => left + ((x - xs[0]) / xSpan) * plotW;
  const py = (w) => top + (1 - (w - minW) / (maxW - minW)) * plotH;
  const font = (wgt) => `${wgt} 12px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;

  // 가로 눈금 (최소/중간/최대)
  ctx.font = font(600); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [minW + padW, (minW + maxW) / 2, maxW - padW].forEach(v => {
    const y = Math.round(py(v)) + 0.5;
    ctx.strokeStyle = '#F6DCE2'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(cssW - right, y); ctx.stroke();
    ctx.fillStyle = '#8A5A68';
    ctx.fillText(v.toFixed(1), left - 6, y);
  });

  // 목표선 (점선)
  if (showGoal) {
    const gy = Math.round(py(goal)) + 0.5;
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(left, gy); ctx.lineTo(cssW - right, gy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#2E7D32'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.font = font(800);
    ctx.fillText(`목표 ${goal}`, cssW - right, gy - 3);
  }

  // 추이선 + 점
  ctx.strokeStyle = '#D6336C'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  points.forEach((p, i) => { const x = px(xs[i]), y = py(p.weight); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.stroke();
  points.forEach((p, i) => {
    const isLast = i === points.length - 1;
    ctx.beginPath(); ctx.arc(px(xs[i]), py(p.weight), isLast ? 4.5 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = isLast ? '#D6336C' : '#FFFFFF'; ctx.fill();
    ctx.strokeStyle = '#D6336C'; ctx.lineWidth = 1.5; ctx.stroke();
  });

  // 날짜 라벨 (처음 / 마지막)
  const lbl = (str) => { const [, m, d] = str.split('-'); return `${parseInt(m, 10)}/${parseInt(d, 10)}`; };
  ctx.fillStyle = '#8A5A68'; ctx.font = font(600); ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left'; ctx.fillText(lbl(points[0].date), left, cssH - 5);
  ctx.textAlign = 'right'; ctx.fillText(lbl(points[points.length - 1].date), cssW - right, cssH - 5);
}

// --- 주간 리포트 (월~일) ---
let reportWeekOffset = 0; // 0 = 이번 주, -1 = 지난주 ...
const weekDietCountCache = {}; // { 'YYYY-MM-DD': { t, boyfriend, girlfriend } }

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftReportWeek(delta) {
  const next = reportWeekOffset + delta;
  if (next > 0) return;
  reportWeekOffset = next;
  sfx.playSuccess();
  renderWeeklyReport();
}

function getReportWeekDays() {
  const start = getWeekStartDate();
  start.setDate(start.getDate() + reportWeekOffset * 7);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push(dateToStr(d));
  }
  return days;
}

// 그 주의 식단 기록 수 (사진 없이 가볍게 조회, 1분 캐시)
async function refreshWeekDietCounts(startStr, endStr) {
  if (!supabaseClient) return;
  const cached = weekDietCountCache[startStr];
  if (cached && Date.now() - cached.t < 60000) return;
  weekDietCountCache[startStr] = { ...(cached || {}), t: Date.now() };
  try {
    const { data, error } = await supabaseClient.from('diet_logs')
      .select('id,user_role,date').gte('date', startStr).lte('date', endStr);
    if (error || !Array.isArray(data)) return;
    weekDietCountCache[startStr] = {
      t: Date.now(),
      boyfriend: data.filter(d => d.user_role === 'boyfriend').length,
      girlfriend: data.filter(d => d.user_role === 'girlfriend').length
    };
    if (currentTab === 'stats' && getReportWeekDays()[0] === startStr) renderWeeklyReport();
  } catch (e) {
    console.warn('weekly diet count warning:', e);
  }
}

function renderWeeklyReport() {
  const body = document.getElementById('weekly-report-body');
  if (!body) return;
  const days = getReportWeekDays();
  const startStr = days[0], endStr = days[6];
  const today = getTodayStr();

  const labelEl = document.getElementById('report-week-label');
  if (labelEl) {
    const name = reportWeekOffset === 0 ? '이번 주' : reportWeekOffset === -1 ? '지난주' : `${-reportWeekOffset}주 전`;
    const md = (str) => { const [, m, d] = str.split('-'); return `${parseInt(m, 10)}/${parseInt(d, 10)}`; };
    labelEl.innerText = `${name} (${md(startStr)}~${md(endStr)})`;
  }
  const nextBtn = document.getElementById('report-week-next');
  if (nextBtn) nextBtn.disabled = reportWeekOffset >= 0;

  const roles = ['boyfriend', 'girlfriend'];
  const stat = {};
  roles.forEach(r => {
    const workout = days.filter(d => store.data.attendance[d] && store.data.attendance[d][r]).length;
    const stepVals = days.map(d => (store.data.stepLogs[d] || {})[r] || 0).filter(v => v > 0);
    const stepAvg = stepVals.length ? Math.round(stepVals.reduce((a, b) => a + b, 0) / stepVals.length) : 0;

    const logs = store.data.weightLogs[r] || [];
    const inWeek = logs.filter(l => l.date >= startStr && l.date <= endStr);
    const before = logs.filter(l => l.date < startStr);
    let weightDelta = null;
    if (inWeek.length) {
      const ref = before.length ? before[before.length - 1] : inWeek[0];
      weightDelta = inWeek[inWeek.length - 1].weight - ref.weight;
    }

    const cached = weekDietCountCache[startStr];
    const diet = cached && typeof cached[r] === 'number'
      ? cached[r]
      : store.data.dietLogs.filter(d => d.role === r && d.date >= startStr && d.date <= endStr).length;

    const goal = Number(store.data.couple.stepGoal) || 0;
    const goalDays = goal > 0 ? days.filter(d => ((store.data.stepLogs[d] || {})[r] || 0) >= goal).length : 0;

    stat[r] = { workout, stepAvg, weightDelta, diet, goalDays };
  });
  const together = days.filter(d => store.data.attendance[d] && store.data.attendance[d].boyfriend && store.data.attendance[d].girlfriend).length;
  const elapsed = days.filter(d => d <= today).length;

  let comment;
  const bf = stat.boyfriend, gf = stat.girlfriend;
  if (bf.workout === 0 && gf.workout === 0) comment = reportWeekOffset === 0 ? '아직 기록이 없어요. 오늘 첫 도장을 찍어볼까요? 👟' : '이 주에는 운동 기록이 없어요.';
  else if (together >= 5) comment = '환상의 팀워크! 거의 매일 함께 운동했어요 💖';
  else if (bf.workout === gf.workout) comment = `둘 다 ${bf.workout}일씩 운동했어요. 막상막하! 🤝`;
  else {
    const lead = bf.workout > gf.workout ? nm('boyfriend') : nm('girlfriend');
    comment = `${lead}님이 운동 ${Math.abs(bf.workout - gf.workout)}일 앞서고 있어요 🔥`;
  }

  const fmt = n => Number(n || 0).toLocaleString('ko-KR');
  const wtxt = v => v == null ? '-' : `${v > 0 ? '+' : ''}${v.toFixed(1)}kg`;
  const win = (a, b) => (a > b ? ' win' : '');
  const row = (label, a, b, aw, bw) => `
    <div class="report-row">
      <span class="report-metric">${label}</span>
      <span class="report-val bf${aw}">${a}</span>
      <span class="report-val gf${bw}">${b}</span>
    </div>`;

  body.innerHTML = `
    <div class="report-hero">
      <div class="report-hero-num">💖 함께 운동한 날 <b>${together}일</b><span> / ${elapsed}일</span></div>
      <div class="report-hero-msg">${comment}</div>
    </div>
    <div class="report-table">
      <div class="report-row head">
        <span></span><span class="report-val bf">🏃‍♂️ ${escapeHtml(nm('boyfriend'))}</span><span class="report-val gf">🐰 ${escapeHtml(nm('girlfriend'))}</span>
      </div>
      ${row('운동한 날', `${bf.workout}일`, `${gf.workout}일`, win(bf.workout, gf.workout), win(gf.workout, bf.workout))}
      ${row('평균 걸음', bf.stepAvg ? `${fmt(bf.stepAvg)}보` : '-', gf.stepAvg ? `${fmt(gf.stepAvg)}보` : '-', win(bf.stepAvg, gf.stepAvg), win(gf.stepAvg, bf.stepAvg))}
      ${row('걸음 목표 달성', `${bf.goalDays}일`, `${gf.goalDays}일`, win(bf.goalDays, gf.goalDays), win(gf.goalDays, bf.goalDays))}
      ${row('식단 기록', `${bf.diet}끼`, `${gf.diet}끼`, win(bf.diet, gf.diet), win(gf.diet, bf.diet))}
      ${row('체중 변화', wtxt(bf.weightDelta), wtxt(gf.weightDelta), '', '')}
    </div>`;

  refreshWeekDietCounts(startStr, endStr);
}

function renderStatsScreen() {
  const role = store.data.currentRole;
  const partnerRole = role === 'boyfriend' ? 'girlfriend' : 'boyfriend';

  updateStepUI();
  updateWeightUI();
  drawWeeklyStepChart();
  renderWeeklyReport();

  // 체중 기록 섹션 (프라이버시 & PIN 잠금)
  const myLogs = store.data.weightLogs[role] || [];
  const partnerLogs = store.data.weightLogs[partnerRole] || [];

  const myLatest = myLogs[myLogs.length - 1];
  const partnerLatest = partnerLogs[partnerLogs.length - 1];

  const lockedView = document.getElementById('my-weight-locked-view');
  const unlockedView = document.getElementById('my-weight-unlocked-view');
  const myWeightDisplay = document.getElementById('my-weight-display');
  const myDeltaDisplay = document.getElementById('my-delta-display');
  const partnerDeltaDisplay = document.getElementById('partner-delta-display');
  const partnerNameLabel = document.getElementById('partner-weight-label');

  if (partnerNameLabel) {
    partnerNameLabel.innerText = `${nmFull(partnerRole)}의 체중 변화 추이`;
  }

  // 본인 체중: 잠금 상태 제어
  if (isWeightUnlocked) {
    if (lockedView) lockedView.style.display = 'none';
    if (unlockedView) unlockedView.style.display = 'block';

    if (myLatest) {
      if (myWeightDisplay) myWeightDisplay.innerText = `${myLatest.weight} kg`;
      const diff = (myLatest.weight - myLatest.baseline).toFixed(1);
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      if (myDeltaDisplay) myDeltaDisplay.innerText = `시작 대비 ${sign} kg (${diff <= 0 ? '감량 성공 중! 👏' : '유지 중'})`;
    } else {
      if (myWeightDisplay) myWeightDisplay.innerText = `- kg`;
      if (myDeltaDisplay) myDeltaDisplay.innerText = `체중을 기록해보세요`;
    }
    renderMyWeightTrend(role, myLogs);
  } else {
    if (lockedView) lockedView.style.display = 'flex';
    if (unlockedView) unlockedView.style.display = 'none';
  }

  // 상대방 체중: 절대 숫자는 영구 비공개, 변화량만 표시
  if (partnerLatest) {
    const pDiff = (partnerLatest.weight - partnerLatest.baseline).toFixed(1);
    const pSign = pDiff > 0 ? `+${pDiff}` : `${pDiff}`;
    if (partnerDeltaDisplay) {
      partnerDeltaDisplay.innerHTML = `
        <div style="font-size:var(--fs-lg); font-weight:800; color:#2E7D32; margin-top:4px;">
          시작 대비 <span style="font-size:var(--fs-xl);">${pSign} kg</span> 변화 중! ✨
        </div>
        <div style="font-size:var(--fs-xs); color:#66BB6A; margin-top:4px;">
          🔒 프라이버시 보호: 실제 체중 숫자는 어떤 경우에도 상대방에게 노출되지 않습니다.
        </div>
      `;
    }
  } else {
    if (partnerDeltaDisplay) partnerDeltaDisplay.innerText = `파트너의 기록을 기다리는 중이에요`;
  }
}

async function saveStepLog() {
  const val = parseInt(document.getElementById('step-input').value, 10);
  if (isNaN(val) || val < 0) return showToast('올바른 걸음 수를 입력해주세요!');

  const targetDate = selectedStepDate || getTodayStr();
  const role = store.data.currentRole;

  if (!store.data.stepLogs[targetDate]) store.data.stepLogs[targetDate] = { boyfriend: 0, girlfriend: 0 };
  store.data.stepLogs[targetDate][role] = val;
  store.save();

  sfx.playSuccess();
  showToast(`${formatDatePretty(targetDate)} 걸음 수가 저장되었습니다! 👟`);
  renderStatsScreen();
  await syncStepToSupabase(targetDate, role, val);
}

async function saveWeightLog() {
  const val = parseFloat(document.getElementById('weight-input').value);
  if (isNaN(val) || val <= 20 || val >= 250) return showToast('올바른 체중(kg)을 입력해주세요!');

  const role = store.data.currentRole;
  const targetDate = selectedWeightDate || getTodayStr();
  const list = store.data.weightLogs[role];

  let baseline = val;
  if (list.length > 0) baseline = list[0].baseline || list[0].weight;

  // 기존 날짜 있으면 업데이트, 없으면 추가
  const existIdx = list.findIndex(item => item.date === targetDate);
  if (existIdx >= 0) {
    list[existIdx].weight = val;
  } else {
    list.push({ date: targetDate, weight: val, baseline });
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  store.save();
  sfx.playSuccess();
  document.getElementById('weight-input').value = '';
  showToast(`${formatDatePretty(targetDate)} 비공개 체중이 기록되었습니다! 상대방에게는 변화량만 공유됩니다. 🔒`);
  renderStatsScreen();
  await syncWeightToSupabase(targetDate, role, val, baseline);
}

function drawWeeklyStepChart() {
  const canvas = document.getElementById('weekly-step-chart');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 320;
  const cssH = canvas.clientHeight || 170;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const days = [];
  for (let i = 6; i >= 0; i--) days.push(getDateOffsetStr(-i));
  const rows = days.map(d => store.data.stepLogs[d] || { boyfriend: 0, girlfriend: 0 });

  const maxVal = Math.max(0, ...rows.map(r => Math.max(r.boyfriend || 0, r.girlfriend || 0)));
  const stepGoal = Number(store.data.couple.stepGoal) || 0;
  const maxStep = Math.max(10000, Math.ceil(Math.max(maxVal, stepGoal) / 5000) * 5000);

  const left = 34, right = 6, top = 10, bottom = 24;
  const plotW = cssW - left - right;
  const plotH = cssH - top - bottom;
  const baseY = top + plotH;

  // 가로 눈금선 + 왼쪽 축 (0, 중간, 최대)
  ctx.font = '600 12px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  [0, maxStep / 2, maxStep].forEach(v => {
    const y = baseY - (v / maxStep) * plotH;
    ctx.strokeStyle = v === 0 ? '#E6DED8' : '#F3EEEA';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, Math.round(y) + 0.5);
    ctx.lineTo(cssW - right, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.fillStyle = '#807B8A';
    ctx.fillText(v === 0 ? '0' : `${v / 1000}k`, left - 6, y);
  });

  const slot = plotW / 7;
  const barW = Math.min(14, slot / 2 - 4);
  const today = getTodayStr();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';

  rows.forEach((data, idx) => {
    const xCenter = left + slot * idx + slot / 2;
    const bfH = Math.min(((data.boyfriend || 0) / maxStep) * plotH, plotH);
    const gfH = Math.min(((data.girlfriend || 0) / maxStep) * plotH, plotH);

    ctx.fillStyle = '#64B5F6';
    ctx.beginPath();
    ctx.roundRect(xCenter - barW - 1.5, baseY - bfH, barW, bfH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#FF85A1';
    ctx.beginPath();
    ctx.roundRect(xCenter + 1.5, baseY - gfH, barW, gfH, [4, 4, 0, 0]);
    ctx.fill();

    const [, mm, dd] = days[idx].split('-');
    const isToday = days[idx] === today;
    ctx.fillStyle = isToday ? '#3D3A45' : '#807B8A';
    ctx.font = `${isToday ? '800' : '600'} 12px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    ctx.fillText(isToday ? '오늘' : `${parseInt(mm, 10)}/${parseInt(dd, 10)}`, xCenter, cssH - 6);
  });

  // 하루 목표선 (점선)
  if (stepGoal > 0) {
    const gy = Math.round(baseY - (stepGoal / maxStep) * plotH) + 0.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(left, gy); ctx.lineTo(cssW - right, gy); ctx.stroke();
    ctx.setLineDash([]);
    const goalLabel = `목표 ${stepGoal.toLocaleString('ko-KR')}`;
    ctx.font = '800 11px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
    const lw = ctx.measureText(goalLabel).width;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(left + 2, gy - 16, lw + 8, 14);
    ctx.fillStyle = '#2E7D32';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(goalLabel, left + 6, gy - 2);
  }

  // 아래 요약: 오늘 걸음 수 + 7일 평균
  const summaryEl = document.getElementById('step-chart-summary');
  if (summaryEl) {
    const fmt = n => Number(n || 0).toLocaleString('ko-KR');
    const avg = key => {
      const logged = rows.filter(r => (r[key] || 0) > 0);
      return logged.length ? Math.round(logged.reduce((a, r) => a + r[key], 0) / logged.length) : 0;
    };
    const todayRow = rows[rows.length - 1];
    const goalMark = (v) => (stepGoal > 0 && (v || 0) >= stepGoal ? ' <span class="goal-hit">🎯 달성</span>' : '');
    summaryEl.innerHTML = `
      <div class="step-sum-item">
        <div class="step-sum-lbl">🏃‍♂️ ${escapeHtml(nm('boyfriend'))} · 오늘${goalMark(todayRow.boyfriend)}</div>
        <div class="step-sum-val bf">${fmt(todayRow.boyfriend)}보</div>
        <div class="step-sum-sub">7일 평균 ${fmt(avg('boyfriend'))}보</div>
      </div>
      <div class="step-sum-item">
        <div class="step-sum-lbl">🐰 ${escapeHtml(nm('girlfriend'))} · 오늘${goalMark(todayRow.girlfriend)}</div>
        <div class="step-sum-val gf">${fmt(todayRow.girlfriend)}보</div>
        <div class="step-sum-sub">7일 평균 ${fmt(avg('girlfriend'))}보</div>
      </div>`;
  }
}

// --- 8. Feature 4: Diet Photo Diary (No Calorie Stress) ---
let selectedMealType = '점심';
let currentPhotoDataUrl = null;

let currentLightboxItem = null;
let currentDietEditPhoto = null;
let editSelectedMealType = '점심';

function renderDietScreen() {
  const container = document.getElementById('diet-timeline');
  if (!container) return;
  container.innerHTML = '';

  updateDietInputUI();

  const filterLabel = document.getElementById('diet-filter-label');
  if (filterLabel) {
    filterLabel.innerText = selectedDietFilterDate ? formatDatePretty(selectedDietFilterDate) : '모든 날짜';
  }
  const filterTrigger = document.getElementById('diet-filter-trigger');
  if (filterTrigger) filterTrigger.classList.toggle('neutral', !selectedDietFilterDate);
  refreshDateNextButton('filter', selectedDietFilterDate);

  let logs = [...store.data.dietLogs].reverse();

  if (selectedDietFilterDate) {
    logs = logs.filter(item => item.date === selectedDietFilterDate);
  }

  if (logs.length === 0 && selectedDietFilterDate && dietFilterLoadingDate === selectedDietFilterDate) {
    container.innerHTML = `
      <div style="text-align:center; padding: 24px 10px; color: var(--text-muted); font-size: var(--fs-sm);">
        ☁️ <b>${formatDatePretty(selectedDietFilterDate)}</b> 식단 기록을 불러오는 중...
      </div>
    `;
    return;
  }

  if (logs.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 24px 10px; color: var(--text-muted); font-size: var(--fs-sm);">
        ${selectedDietFilterDate ? `🗓️ <b>${formatDatePretty(selectedDietFilterDate)}</b>에 등록된 식단 일기가 없어요.` : `🥗 아직 등록된 식단 일기가 없어요.<br>먹은 맛있는 식사를 사진과 함께 남겨보세요!`}
      </div>
    `;
    return;
  }

  logs.forEach(item => {
    const card = document.createElement('div');
    card.className = 'diet-timeline-item';
    const authorName = item.role === 'boyfriend' ? store.data.couple.bfName : store.data.couple.gfName;
    const badgeColor = item.role === 'boyfriend' ? '#BBDEFB' : '#FFCCD5';

    card.innerHTML = `
      ${item.photoUrl ? `
        <img src="${item.photoUrl}" class="diet-thumb" onclick="openPhotoLightbox('${item.id}')" title="사진 크게 보기" alt="식단 사진" />
      ` : `
        <div class="diet-thumb placeholder">${item.photoUrl === undefined && supabaseClient ? '⏳' : '🍽️'}</div>
      `}
      <div class="diet-item-body">
        <div class="diet-item-top">
          <span class="diet-badge ${item.role === 'boyfriend' ? 'bf' : 'gf'}">${escapeHtml(authorName)} · ${escapeHtml(item.mealType)}</span>
          <span class="diet-date">${formatKoreanDate(item.date)}</span>
          ${moreMenuHtml([
            { label: '✏️ 수정', action: `openEditDietModal('${item.id}')` },
            { label: '🗑️ 삭제', action: `deleteDietLog('${item.id}')`, danger: true }
          ])}
        </div>
        <p class="diet-memo">${escapeHtml(item.memo || '맛있게 건강하게 식사 완료! 😋')}</p>
        ${dietReactionsHtml(item)}
      </div>
    `;
    container.appendChild(card);
  });

  // 전체 보기일 때만 '이전 기록 더 보기' 버튼 표시
  if (!selectedDietFilterDate && supabaseClient && !dietNoMoreOlder) {
    const more = document.createElement('button');
    more.className = 'text-btn diet-more-btn';
    more.disabled = dietOlderLoading;
    more.innerText = dietOlderLoading ? '불러오는 중...' : '이전 기록 더 보기';
    more.onclick = loadMoreDietLogs;
    container.appendChild(more);
  }
}

// --- 사진 확대 라이트박스 & 다운로드 ---
function openPhotoLightbox(dietId) {
  const item = store.data.dietLogs.find(d => d.id === dietId);
  if (!item || !item.photoUrl) return;

  currentLightboxItem = item;
  const imgEl = document.getElementById('lightbox-img');
  const captionEl = document.getElementById('lightbox-caption');

  if (imgEl) imgEl.src = item.photoUrl;
  if (captionEl) {
    const authorName = item.role === 'boyfriend' ? store.data.couple.bfName : store.data.couple.gfName;
    captionEl.innerHTML = `
      <div style="font-weight:800; font-size:var(--fs-md); margin-bottom:2px;">${authorName} · ${item.mealType} (${formatKoreanDate(item.date)})</div>
      <div style="font-size:var(--fs-sm); opacity:0.9;">${item.memo || ''}</div>
    `;
  }

  openModal('modal-photo-lightbox');
}

function closePhotoLightbox() {
  closeModal('modal-photo-lightbox');
  currentLightboxItem = null;
}

function downloadCurrentPhoto() {
  if (!currentLightboxItem || !currentLightboxItem.photoUrl) return;

  const link = document.createElement('a');
  link.href = currentLightboxItem.photoUrl;
  link.download = `식단_${currentLightboxItem.date}_${currentLightboxItem.mealType}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  sfx.playSuccess();
}

// --- 식단 일기 수정 및 삭제 ---
function openEditDietModal(dietId) {
  const item = store.data.dietLogs.find(d => d.id === dietId);
  if (!item) return;

  document.getElementById('diet-edit-id').value = item.id;
  document.getElementById('diet-edit-memo').value = item.memo || '';
  currentDietEditPhoto = item.photoUrl || null;
  editSelectedMealType = item.mealType || '점심';

  // 칩 활성화 상태 동기화
  const chips = document.querySelectorAll('.edit-meal-chip');
  chips.forEach(c => {
    if (c.dataset.type === editSelectedMealType) {
      c.classList.add('active');
    } else {
      c.classList.remove('active');
    }
  });

  const preview = document.getElementById('diet-edit-preview');
  const uploadText = document.getElementById('diet-edit-upload-text');
  if (currentDietEditPhoto) {
    if (preview) {
      preview.src = currentDietEditPhoto;
      preview.style.display = 'block';
    }
    if (uploadText) uploadText.innerText = '📷 터치하여 다른 사진으로 교체';
  } else {
    if (preview) preview.style.display = 'none';
    if (uploadText) uploadText.innerText = '📷 터치하여 사진 추가';
  }

  openModal('modal-diet-edit');
}

function setEditMealType(type) {
  editSelectedMealType = type;
  const chips = document.querySelectorAll('.edit-meal-chip');
  chips.forEach(c => {
    if (c.dataset.type === type) {
      c.classList.add('active');
    } else {
      c.classList.remove('active');
    }
  });
}

function handleDietEditPhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 550;
      let w = img.width;
      let h = img.height;
      if (w > maxW) {
        h = (maxW / w) * h;
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      currentDietEditPhoto = canvas.toDataURL('image/jpeg', 0.65);

      const preview = document.getElementById('diet-edit-preview');
      const uploadText = document.getElementById('diet-edit-upload-text');
      if (preview) {
        preview.src = currentDietEditPhoto;
        preview.style.display = 'block';
      }
      if (uploadText) uploadText.innerText = '📷 터치하여 다른 사진으로 교체';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveEditedDietLog() {
  const editId = document.getElementById('diet-edit-id').value;
  const item = store.data.dietLogs.find(d => d.id === editId);
  if (!item) return;

  const memo = document.getElementById('diet-edit-memo').value.trim();
  item.memo = memo || `${editSelectedMealType} 식사 기록`;
  item.mealType = editSelectedMealType;
  if (currentDietEditPhoto) item.photoUrl = currentDietEditPhoto;
  const cachedOlder = olderDietCache.find(d => d.id === editId);
  if (cachedOlder) Object.assign(cachedOlder, { memo: item.memo, mealType: item.mealType, photoUrl: item.photoUrl });

  store.save();
  sfx.playSuccess();
  closeModal('modal-diet-edit');
  renderDietScreen();
  await updateDietInSupabase(item);
  showToast('식단 일기가 성공적으로 수정되었습니다! 🥗');
}

async function deleteDietLog(dietId) {
  if (confirm('이 식단 일기를 삭제하시겠습니까?')) {
    store.data.dietLogs = store.data.dietLogs.filter(d => d.id !== dietId);
    olderDietCache = olderDietCache.filter(d => d.id !== dietId);
    store.data.cheers = (store.data.cheers || []).filter(c => { const r = parseDietReaction(c); return !(r && r.dietId === dietId); });
    store.save();
    sfx.playSuccess();
    renderDietScreen();
    await deleteDietFromSupabase(dietId);
    await deleteDietReactionsFromSupabase(dietId);
  }
}

function handleDietPhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      // 사진 스마트 압축 (Canvas 이용 - 고화질 유지 및 초고속 전송)
      const canvas = document.createElement('canvas');
      const maxW = 550;
      let w = img.width;
      let h = img.height;
      if (w > maxW) {
        h = (maxW / w) * h;
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      currentPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.65);

      const preview = document.getElementById('diet-preview-img');
      const uploadText = document.getElementById('diet-upload-text');
      if (preview) {
        preview.src = currentPhotoDataUrl;
        preview.style.display = 'block';
      }
      if (uploadText) uploadText.style.display = 'none';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function clearDietDateFilter() {
  selectedDietFilterDate = '';
  sfx.playSuccess();
  renderDietScreen();
}

async function saveDietLog() {
  const memo = document.getElementById('diet-memo-input').value.trim();
  if (!currentPhotoDataUrl && !memo) {
    return showToast('식단 사진을 등록하거나 한 줄 소감을 입력해주세요!');
  }

  const targetDate = selectedDietDate || getTodayStr();

  const newLog = {
    id: generateUUID(),
    role: store.data.currentRole,
    date: targetDate,
    mealType: selectedMealType,
    photoUrl: currentPhotoDataUrl,
    memo: memo || `${selectedMealType} 식사 기록`,
    createdAt: new Date().toISOString()
  };

  store.data.dietLogs.push(newLog);
  store.save();

  sfx.playSuccess();
  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 16);

  // 초기화
  currentPhotoDataUrl = null;
  document.getElementById('diet-memo-input').value = '';
  document.getElementById('diet-preview-img').style.display = 'none';
  document.getElementById('diet-upload-text').style.display = 'block';

  showToast(`${formatDatePretty(targetDate)} 식단 일기가 등록되었습니다! 🥗`);
  renderDietScreen();
  await syncDietToSupabase(newLog);
}

// --- 9. Feature 5, 6, 7: Missions, Penalties, Cheers, Reward Box ---
let currentMissionSubTab = 'missions'; // 'missions' | 'penalties'
let currentPenaltyFilter = 'pending'; // 'pending' | 'completed'
let currentCouponSubTab = 'available'; // 'available' | 'history'

function switchMissionSubTab(subTab) {
  currentMissionSubTab = subTab;
  switchRewardSection(subTab === 'penalties' ? 'penalties' : 'missions');
}

// 미션 / 벌칙 / 쿠폰 / 위시리스트 상단 탭 전환 (마지막 탭은 이 기기에 기억)
let currentRewardSection = (() => {
  try { return localStorage.getItem('couple_reward_section') || 'missions'; } catch (e) { return 'missions'; }
})();
function switchRewardSection(sec) {
  const sections = ['missions', 'penalties', 'coupons', 'wishlist'];
  if (!sections.includes(sec)) sec = 'missions';
  currentRewardSection = sec;
  try { localStorage.setItem('couple_reward_section', sec); } catch (e) {}
  sections.forEach(k => {
    const tab = document.getElementById('rtab-' + k);
    const box = document.getElementById('rsec-' + k);
    if (tab) {
      tab.classList.toggle('active', k === sec);
      tab.setAttribute('aria-selected', k === sec ? 'true' : 'false');
    }
    if (box) box.hidden = k !== sec;
  });
}

function setPenaltyFilter(filter) {
  currentPenaltyFilter = filter;
  const pendBtn = document.getElementById('pfilter-pending');
  const compBtn = document.getElementById('pfilter-completed');
  if (pendBtn && compBtn) {
    if (filter === 'pending') {
      pendBtn.classList.add('active');
      compBtn.classList.remove('active');
    } else {
      pendBtn.classList.remove('active');
      compBtn.classList.add('active');
    }
  }
  renderPenaltiesList();
}

function switchCouponSubTab(subTab) {
  currentCouponSubTab = subTab;
  const availBtn = document.getElementById('coupon-tab-available');
  const histBtn = document.getElementById('coupon-tab-history');

  if (subTab === 'available') {
    if (availBtn) availBtn.classList.add('active');
    if (histBtn) histBtn.classList.remove('active');
  } else {
    if (availBtn) availBtn.classList.remove('active');
    if (histBtn) histBtn.classList.add('active');
  }
  renderCouponList();
}

function renderMissionsScreen() {
  applyWeeklyMissionResetLocal();
  switchRewardSection(currentRewardSection);

  const recEl = document.getElementById('mission-record');
  if (recEl) {
    const rec = getMissionRecord();
    recEl.hidden = rec.boyfriend + rec.girlfriend === 0;
    recEl.innerHTML = `누적 전적 <b class="bf">🏃‍♂️ ${escapeHtml(nm('boyfriend'))} ${rec.boyfriend}승</b> : <b class="gf">${rec.girlfriend}승 ${escapeHtml(nm('girlfriend'))} 🐰</b>`;
  }
  const activeMissionsCount = store.data.missions.length;
  const pendingPenalties = store.data.penalties.filter(p => !p.completed);
  const completedPenalties = store.data.penalties.filter(p => p.completed);
  const availableCoupons = store.data.coupons.filter(c => !c.used);
  const historyCoupons = store.data.coupons.filter(c => c.used);

  // 상단 뱃지 카운트 갱신
  const mActiveCnt = document.getElementById('mission-active-cnt');
  if (mActiveCnt) mActiveCnt.innerText = activeMissionsCount;

  const pActiveCnt = document.getElementById('penalty-active-cnt');
  if (pActiveCnt) pActiveCnt.innerText = pendingPenalties.length;

  const pPendingCnt = document.getElementById('penalty-pending-count');
  if (pPendingCnt) pPendingCnt.innerText = pendingPenalties.length;

  const pCompletedCnt = document.getElementById('penalty-completed-count');
  if (pCompletedCnt) pCompletedCnt.innerText = completedPenalties.length;

  const cAvailCnt = document.getElementById('coupon-available-cnt');
  if (cAvailCnt) cAvailCnt.innerText = availableCoupons.length;

  const cHistCnt = document.getElementById('coupon-history-cnt');
  if (cHistCnt) cHistCnt.innerText = historyCoupons.length;

  const rCouponCnt = document.getElementById('rtab-coupon-cnt');
  if (rCouponCnt) rCouponCnt.innerText = availableCoupons.length;
  const rWishCnt = document.getElementById('rtab-wish-cnt');
  if (rWishCnt) rWishCnt.innerText = (store.data.foodWishlist || []).filter(w => !w.isEaten).length;

  // 1. 진행 중인 미션 리스트 렌더링
  const missionContainer = document.getElementById('missions-list');
  if (missionContainer) {
    missionContainer.innerHTML = '';
    if (store.data.missions.length === 0) {
      missionContainer.innerHTML = `
        <div style="text-align:center; padding:24px 10px; color:var(--text-muted); font-size:var(--fs-sm);">
          ⚔️ 아직 등록된 주간 미션이 없어요.<br>우측 상단 <b>'+ 미션 만들기'</b>로 둘만의 대결을 시작해보세요!
        </div>
      `;
    } else {
      store.data.missions.forEach((m) => {
        const card = document.createElement('div');
        card.className = 'mission-card';

        const bfPct = Math.min((m.bfProgress / m.target) * 100, 100);
        const gfPct = Math.min((m.gfProgress / m.target) * 100, 100);
        const isGoalReached = (m.bfProgress >= m.target) || (m.gfProgress >= m.target);

        const isBig = m.target >= 20;
        card.innerHTML = `
          <div class="mission-head">
            <div>
              <div class="mission-title">${escapeHtml(m.title)}${isGoalReached ? '<span class="goal-badge">🎉 목표 도달</span>' : ''}</div>
              <div class="mission-meta">목표 ${m.target}${escapeHtml(m.unit)}</div>
            </div>
            ${moreMenuHtml([
              { label: '✏️ 수정', action: `openEditMissionModal('${m.id}')` },
              { label: '🗑️ 삭제', action: `deleteMission('${m.id}')`, danger: true }
            ])}
          </div>

          <div class="mission-scores">
            <span class="bf">🏃‍♂️ ${escapeHtml(nm('boyfriend'))} ${m.bfProgress}/${m.target}</span>
            <span class="gf">🐰 ${escapeHtml(nm('girlfriend'))} ${m.gfProgress}/${m.target}</span>
          </div>
          <div class="mission-progress-bar-bg">
            <div class="mission-bar-bf" style="width: ${bfPct / 2}%;"></div>
            <div class="mission-bar-gf" style="width: ${gfPct / 2}%;"></div>
          </div>
          <span class="penalty-tag">벌칙: ${escapeHtml(m.penalty)}</span>

          <div class="mission-actions">
            <div class="step-btns">
              ${isBig ? `
                <button class="step-btn minus" onclick="incrementMission('${m.id}', -10)">-10</button>
                <button class="step-btn" onclick="incrementMission('${m.id}', 10)">+10</button>
                <button class="step-btn" onclick="incrementMission('${m.id}', 50)">+50</button>
              ` : `
                <button class="step-btn minus" onclick="incrementMission('${m.id}', -1)">-1</button>
                <button class="step-btn" onclick="incrementMission('${m.id}', 1)">+1 ${escapeHtml(m.unit)}</button>
              `}
              <button class="step-btn edit" onclick="promptCustomMissionAmount('${m.id}')" aria-label="직접 입력">✏️</button>
            </div>
            <button class="settle-btn" onclick="openSettleMissionModal('${m.id}')">🏆 정산</button>
          </div>
        `;
        missionContainer.appendChild(card);
      });
    }
  }

  // 2. 벌칙 수행 / 내역 렌더링
  renderPenaltiesList();

  // 3. 먹방 위시리스트 렌더링
  renderWishlist();

  // 4. 보상 상자 (하트 누적 쿠폰)
  renderCouponList();
}

// --- 식단 반응 (하트 / 한 줄 댓글) ---
// 별도 테이블 없이 cheers 테이블에 '::diet:<식단ID>::<내용>' 형식으로 저장하고, 응원 피드에서는 숨김
const DIET_REACTION_RE = /^::diet:([^:]+)::([\s\S]*)$/;
const DIET_HEART = '❤️';
let openDietCommentId = null;

function parseDietReaction(c) {
  const m = DIET_REACTION_RE.exec((c && c.message) || '');
  return m ? { dietId: m[1], text: m[2] } : null;
}
function isDietReaction(c) {
  return DIET_REACTION_RE.test((c && c.message) || '');
}
function getDietReactions(dietId) {
  const hearts = [], comments = [];
  (store.data.cheers || []).forEach(c => {
    const r = parseDietReaction(c);
    if (!r || r.dietId !== dietId) return;
    if (r.text === DIET_HEART) hearts.push(c);
    else comments.push({ ...c, text: r.text });
  });
  return { hearts, comments };
}

async function addDietReaction(dietId, text) {
  const role = store.data.currentRole;
  const now = new Date();
  const newCheer = {
    id: generateUUID(),
    sender: role,
    senderName: role === 'boyfriend' ? store.data.couple.bfName : store.data.couple.gfName,
    message: `::diet:${dietId}::${text}`,
    createdAt: now.toISOString(),
    time: formatCheerTimestamp(now)
  };
  store.data.cheers.push(newCheer);
  store.save();
  sfx.playSuccess();
  renderDietScreen();
  await syncCheerToSupabase(newCheer);
}

async function removeCheerById(cheerId) {
  store.data.cheers = store.data.cheers.filter(c => c.id !== cheerId);
  store.save();
  renderDietScreen();
  await deleteCheerFromSupabase(cheerId);
}

function toggleDietHeart(dietId, e) {
  const role = store.data.currentRole;
  const mine = getDietReactions(dietId).hearts.find(c => c.sender === role);
  if (mine) {
    removeCheerById(mine.id);
  } else {
    if (e && e.clientX) createFloatingHearts(e.clientX, e.clientY, 6);
    addDietReaction(dietId, DIET_HEART);
  }
}

function toggleDietCommentBox(dietId) {
  openDietCommentId = openDietCommentId === dietId ? null : dietId;
  renderDietScreen();
  if (openDietCommentId) {
    const input = document.getElementById('diet-comment-input');
    if (input) input.focus();
  }
}

function submitDietComment(dietId) {
  const input = document.getElementById('diet-comment-input');
  if (!input) return;
  const text = input.value.trim().slice(0, 120);
  if (!text) return;
  input.value = '';
  input.blur();
  addDietReaction(dietId, text);
}

function deleteDietComment(cheerId) {
  if (confirm('이 댓글을 삭제할까요?')) removeCheerById(cheerId);
}

function dietReactionsHtml(item) {
  const role = store.data.currentRole;
  const { hearts, comments } = getDietReactions(item.id);
  const iHearted = hearts.some(c => c.sender === role);
  const isOpen = openDietCommentId === item.id;
  const commentsHtml = comments.map(c => `
    <div class="diet-comment">
      <span class="diet-comment-text"><b class="${c.sender === 'boyfriend' ? 'bf' : 'gf'}">${escapeHtml(nm(c.sender))}</b> ${escapeHtml(c.text)}</span>
      ${c.sender === role ? `<button class="comment-del" aria-label="댓글 삭제" onclick="deleteDietComment('${c.id}')">×</button>` : ''}
    </div>`).join('');
  return `
    <div class="diet-react-row">
      <button class="react-btn${iHearted ? ' on' : ''}" aria-label="하트" onclick="toggleDietHeart('${item.id}', event)">${iHearted ? '❤️' : '🤍'}${hearts.length ? ` ${hearts.length}` : ''}</button>
      <button class="react-btn${isOpen ? ' on' : ''}" onclick="toggleDietCommentBox('${item.id}')">💬 ${comments.length ? comments.length : '댓글'}</button>
    </div>
    ${commentsHtml ? `<div class="diet-comments">${commentsHtml}</div>` : ''}
    ${isOpen ? `
      <div class="inline-send-bar compact">
        <input type="text" id="diet-comment-input" maxlength="120" placeholder="한 줄 댓글 달기" onkeydown="if(event.key==='Enter'){submitDietComment('${item.id}');}" />
        <button class="btn-primary" onclick="submitDietComment('${item.id}')">등록</button>
      </div>` : ''}`;
}

// --- 응원 피드 (홈 탭: 최근 5개, '더 보기'로 20개) ---
let cheerFeedExpanded = false;
function toggleCheerFeedExpanded() {
  cheerFeedExpanded = !cheerFeedExpanded;
  renderCheerFeed();
}
function renderCheerFeed() {
  const box = document.getElementById('cheer-messages-list');
  if (!box) return;
  const moreBtn = document.getElementById('cheer-more-btn');
  const all = (store.data.cheers || []).filter(c => !isDietReaction(c));
  if (all.length === 0) {
    box.innerHTML = `<div class="empty-state">💌 아직 주고받은 응원이 없어요.<br>첫 응원을 보내보세요!</div>`;
    if (moreBtn) moreBtn.hidden = true;
    return;
  }
  const limit = cheerFeedExpanded ? 20 : 5;
  box.innerHTML = all.slice(-limit).reverse().map(c => {
    const displayTime = c.createdAt ? formatCheerTimestamp(c.createdAt) : (c.time || '');
    return `
      <div class="cheer-msg-card">
        <div class="cheer-msg-body">
          <span class="cheer-msg-sender ${c.sender === 'boyfriend' ? 'bf' : 'gf'}">${escapeHtml(nmFull(c.sender))}</span>
          <span>${escapeHtml(c.message)}</span>
        </div>
        <span class="cheer-msg-time">${escapeHtml(displayTime)}</span>
      </div>`;
  }).join('');
  if (moreBtn) {
    moreBtn.hidden = all.length <= 5;
    moreBtn.innerText = cheerFeedExpanded ? '접기' : `더 보기 (${Math.min(all.length, 20)}개)`;
  }
}

// --- 벌칙 리스트 렌더링 (수행할 벌칙 vs 완료 내역) ---
function renderPenaltiesList() {
  const container = document.getElementById('penalties-list');
  if (!container) return;
  container.innerHTML = '';

  const list = store.data.penalties.filter(p => currentPenaltyFilter === 'completed' ? p.completed : !p.completed);

  if (list.length === 0) {
    if (currentPenaltyFilter === 'pending') {
      container.innerHTML = `
        <div style="text-align:center; padding:24px 10px; color:var(--text-muted); font-size:var(--fs-sm);">
          🎉 현재 수행 대기 중인 벌칙이 없어요!<br>미션 승부를 정산하거나 <b>'+ 벌칙 추가'</b>로 재미있는 벌칙을 걸어보세요.
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:24px 10px; color:var(--text-muted); font-size:var(--fs-sm);">
          ✨ 아직 수행 완료한 벌칙 내역이 없어요.
        </div>
      `;
    }
    return;
  }

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = `penalty-card ${p.completed ? 'completed-penalty' : 'active-penalty'}`;

    const isBfLoser = p.loser === 'boyfriend';
    const loserBadge = isBfLoser
      ? `<span class="penalty-user-badge bf">🏃‍♂️ ${escapeHtml(nm('boyfriend'))}</span>`
      : `<span class="penalty-user-badge gf">🐰 ${escapeHtml(nm('girlfriend'))}</span>`;
    const targetBadge = isBfLoser
      ? `<span class="penalty-user-badge gf">🐰 ${escapeHtml(nm('girlfriend'))}에게</span>`
      : `<span class="penalty-user-badge bf">🏃‍♂️ ${escapeHtml(nm('boyfriend'))}에게</span>`;

    card.innerHTML = `
      <div class="penalty-head">
        <div class="penalty-badges">
          ${loserBadge}<span class="penalty-arrow">➔</span>${targetBadge}
        </div>
        ${moreMenuHtml([
          { label: '✏️ 수정', action: `openEditPenaltyModal('${p.id}')` },
          { label: '🗑️ 삭제', action: `deletePenalty('${p.id}')`, danger: true }
        ])}
      </div>
      <div class="penalty-title">${escapeHtml(p.title)}</div>
      <div class="penalty-meta">
        ${p.fromMission ? `${escapeHtml(p.fromMission)} · ` : ''}${escapeHtml(p.createdAt || '최근')} 등록
        ${p.completed ? ` · <span class="penalty-done">✅ ${escapeHtml(p.completedAt || '수행 완료')}</span>` : ''}
      </div>
      <div class="card-foot">
        ${!p.completed
          ? `<button class="btn-sm btn-success" onclick="togglePenaltyComplete('${p.id}', true)">수행 완료! 🎉</button>`
          : `<button class="btn-sm btn-ghost" onclick="togglePenaltyComplete('${p.id}', false)">되돌리기 ↩️</button>`}
      </div>
    `;
    container.appendChild(card);
  });
}

// --- 미션 승부 정산 모달 로직 ---
function openSettleMissionModal(missionId) {
  const m = store.data.missions.find(item => item.id === missionId);
  if (!m) return;

  document.getElementById('settle-mission-id').value = m.id;
  const infoEl = document.getElementById('settle-mission-info');
  if (infoEl) {
    infoEl.innerHTML = `
      <div style="font-weight:800; font-size:var(--fs-md); color:var(--text-main); margin-bottom:4px;">${escapeHtml(m.title)}</div>
      <div style="color:var(--text-muted); font-size:var(--fs-xs);">
        🏃‍♂️ ${escapeHtml(nm('boyfriend'))}: <b>${m.bfProgress}${escapeHtml(m.unit)}</b> vs 🐰 ${escapeHtml(nm('girlfriend'))}: <b>${m.gfProgress}${escapeHtml(m.unit)}</b> (목표: ${m.target}${m.unit})
      </div>
      <div style="color:#E65100; font-size:var(--fs-xs); font-weight:700; margin-top:4px;">
        패자 벌칙: ${escapeHtml(m.penalty)}
      </div>
    `;
  }
  openModal('modal-mission-settle');
}

async function confirmSettleWinner(winnerRole) {
  const missionId = document.getElementById('settle-mission-id').value;
  const m = store.data.missions.find(item => item.id === missionId);
  if (!m) return;

  const loserRole = winnerRole === 'boyfriend' ? 'girlfriend' : 'boyfriend';
  const loserName = loserRole === 'boyfriend' ? store.data.couple.bfName : store.data.couple.gfName;
  const winnerName = winnerRole === 'boyfriend' ? store.data.couple.bfName : store.data.couple.gfName;

  // 벌칙 등록
  const newPenalty = {
    id: generateUUID(),
    title: m.penalty,
    loser: loserRole,
    loserName,
    targetName: winnerName,
    fromMission: m.title,
    completed: false,
    completedAt: null,
    createdAt: getTodayStr()
  };

  store.data.penalties.unshift(newPenalty);

  recordMissionResult({
    mission_id: m.id,
    title: String(m.title || '').slice(0, 100),
    week_start: dateToStr(getWeekStartDate()),
    bf_progress: m.bfProgress || 0,
    gf_progress: m.gfProgress || 0,
    winner_role: winnerRole,
    penalty: String(m.penalty || '').slice(0, 150)
  });

  // 미션 진행률 리셋 (다음 라운드 시작)
  m.bfProgress = 0;
  m.gfProgress = 0;
  store.save();

  closeModal('modal-mission-settle');
  sfx.playSuccess();
  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 25);
  showToast(`🎉 ${winnerName} 승리!\n'${loserName}'에게 [${m.penalty}] 벌칙이 부여되었습니다! 🏆`);

  // 벌칙 탭으로 자동 이동
  switchMissionSubTab('penalties');
  setPenaltyFilter('pending');

  await Promise.all([
    syncPenaltyToSupabase(newPenalty),
    resetMissionProgressInSupabase(m)
  ]);
}

// --- 벌칙 생성/수정/완료/삭제 로직 ---
function openCreatePenaltyModal() {
  document.getElementById('modal-penalty-title-text').innerText = '🏆 커플 벌칙 직접 추가';
  document.getElementById('penalty-edit-id').value = '';
  document.getElementById('penalty-title-input').value = '';
  document.getElementById('penalty-from-input').value = '';
  openModal('modal-penalty-edit');
}

function openEditPenaltyModal(penaltyId) {
  const p = store.data.penalties.find(item => item.id === penaltyId);
  if (!p) return;

  document.getElementById('modal-penalty-title-text').innerText = '🏆 커플 벌칙 수정';
  document.getElementById('penalty-edit-id').value = p.id;
  document.getElementById('penalty-title-input').value = p.title;
  document.getElementById('penalty-from-input').value = p.fromMission || '';

  const radios = document.getElementsByName('penalty-loser');
  for (let r of radios) {
    if (r.value === p.loser) r.checked = true;
  }

  openModal('modal-penalty-edit');
}

async function savePenaltyData() {
  const editId = document.getElementById('penalty-edit-id').value;
  const title = document.getElementById('penalty-title-input').value.trim();
  const fromMission = document.getElementById('penalty-from-input').value.trim();

  let loser = 'boyfriend';
  const radios = document.getElementsByName('penalty-loser');
  for (let r of radios) {
    if (r.checked) loser = r.value;
  }

  if (!title) return showToast('벌칙 내용을 입력해주세요!');

  const loserName = loser === 'boyfriend' ? store.data.couple.bfName : store.data.couple.gfName;
  const targetName = loser === 'boyfriend' ? store.data.couple.gfName : store.data.couple.bfName;

  if (editId) {
    const p = store.data.penalties.find(item => item.id === editId);
    if (p) {
      p.title = title;
      p.loser = loser;
      p.loserName = loserName;
      p.targetName = targetName;
      p.fromMission = fromMission;
    }
  } else {
    const newPenalty = {
      id: generateUUID(),
      title,
      loser,
      loserName,
      targetName,
      fromMission: fromMission || '직접 등록한 벌칙',
      completed: false,
      completedAt: null,
      createdAt: getTodayStr()
    };
    store.data.penalties.unshift(newPenalty);
  }

  store.save();
  const targetP = editId ? store.data.penalties.find(item => item.id === editId) : store.data.penalties[0];

  sfx.playSuccess();
  closeModal('modal-penalty-edit');
  renderMissionsScreen();
  if (targetP) await syncPenaltyToSupabase(targetP);
}

async function deletePenalty(penaltyId) {
  if (confirm('이 벌칙을 삭제하시겠습니까?')) {
    store.data.penalties = store.data.penalties.filter(item => item.id !== penaltyId);
    store.save();
    renderMissionsScreen();
    await deletePenaltyFromSupabase(penaltyId);
  }
}

async function togglePenaltyComplete(penaltyId, markAsCompleted) {
  const p = store.data.penalties.find(item => item.id === penaltyId);
  if (!p) return;

  p.completed = markAsCompleted;
  p.completedAt = markAsCompleted ? getTodayStr() : null;
  store.save();

  if (markAsCompleted) {
    sfx.playSuccess();
    createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 20);
    showToast(`👏 벌칙 [${p.title}] 수행이 완료되었습니다!`);
  }
  renderMissionsScreen();
  await syncPenaltyToSupabase(p);
}

// --- 주간 미션 생성/수정/삭제 로직 ---
function openCreateMissionModal() {
  document.getElementById('modal-mission-title-text').innerText = '⚔️ 새 주간 미션 만들기';
  document.getElementById('mission-edit-id').value = '';
  document.getElementById('mission-title-input').value = '';
  document.getElementById('mission-target-input').value = '5';
  document.getElementById('mission-unit-input').value = '일';
  document.getElementById('mission-penalty-input').value = '진 사람이 주말에 디저트 사기 🍰';
  openModal('modal-mission-edit');
}

function openEditMissionModal(missionId) {
  const m = store.data.missions.find(item => item.id === missionId);
  if (!m) return;

  document.getElementById('modal-mission-title-text').innerText = '⚔️ 주간 미션 수정';
  document.getElementById('mission-edit-id').value = m.id;
  document.getElementById('mission-title-input').value = m.title;
  document.getElementById('mission-target-input').value = m.target;
  document.getElementById('mission-unit-input').value = m.unit;
  document.getElementById('mission-penalty-input').value = m.penalty;
  openModal('modal-mission-edit');
}

async function saveMissionData() {
  const editId = document.getElementById('mission-edit-id').value;
  const title = document.getElementById('mission-title-input').value.trim();
  const target = parseInt(document.getElementById('mission-target-input').value, 10);
  const unit = document.getElementById('mission-unit-input').value.trim() || '회';
  const penalty = document.getElementById('mission-penalty-input').value.trim() || '진 사람이 맛있는 거 사주기 😋';

  if (!title) return showToast('미션 제목을 입력해주세요!');
  if (isNaN(target) || target <= 0) return showToast('올바른 목표 수치를 입력해주세요!');

  if (editId) {
    // 수정
    const m = store.data.missions.find(item => item.id === editId);
    if (m) {
      m.title = title;
      m.target = target;
      m.unit = unit;
      m.penalty = penalty;
    }
  } else {
    // 신규 생성
    const newMission = {
      id: generateUUID(),
      title,
      target,
      unit,
      bfProgress: 0,
      gfProgress: 0,
      penalty,
      periodStart: getWeekStartDate().toISOString()
    };
    store.data.missions.push(newMission);
  }

  store.save();
  const targetM = editId ? store.data.missions.find(item => item.id === editId) : store.data.missions[store.data.missions.length - 1];
  if (targetM) await syncMissionToSupabase(targetM);

  sfx.playSuccess();
  closeModal('modal-mission-edit');
  renderMissionsScreen();
}

function deleteMission(missionId) {
  if (confirm('이 주간 미션을 삭제하시겠습니까?')) {
    store.data.missions = store.data.missions.filter(item => item.id !== missionId);
    store.save();
    deleteMissionFromSupabase(missionId);
    renderMissionsScreen();
  }
}

function incrementMission(missionId, amount = 1) {
  const m = store.data.missions.find(item => item.id === missionId);
  if (!m) return;

  const role = store.data.currentRole;
  if (role === 'boyfriend') {
    m.bfProgress = Math.max(0, (Number(m.bfProgress) || 0) + amount);
  } else {
    m.gfProgress = Math.max(0, (Number(m.gfProgress) || 0) + amount);
  }

  store.save();
  syncMyMissionProgressToSupabase(m, role);

  sfx.playSuccess();
  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 10);
  renderMissionsScreen();
}

// 미션 진행 수량 직접 입력 (전용 창)
let missionAmountTargetId = null;
function promptCustomMissionAmount(missionId) {
  const m = store.data.missions.find(item => item.id === missionId);
  if (!m) return;
  missionAmountTargetId = missionId;
  const role = store.data.currentRole;
  const currentVal = role === 'boyfriend' ? (m.bfProgress || 0) : (m.gfProgress || 0);
  const titleEl = document.getElementById('mission-amount-title');
  if (titleEl) titleEl.innerText = m.title;
  const curEl = document.getElementById('mission-amount-current');
  if (curEl) curEl.innerText = `${nm(role)} 현재 ${currentVal} / ${m.target}${m.unit}`;
  const unitEl = document.getElementById('mission-amount-unit');
  if (unitEl) unitEl.innerText = m.unit || '';
  const input = document.getElementById('mission-amount-input');
  if (input) input.value = '';
  openModal('modal-mission-amount');
  if (input) setTimeout(() => input.focus(), 50);
}

// mode: 'add' 더하기 / 'sub' 빼기 / 'set' 이 값으로 맞추기
function applyMissionAmount(mode) {
  const m = store.data.missions.find(item => item.id === missionAmountTargetId);
  const input = document.getElementById('mission-amount-input');
  if (!m || !input) return;
  const val = parseInt(input.value, 10);
  if (isNaN(val) || val < 0) return showToast('숫자를 입력해주세요.', 'warn');
  if (val > 100000) return showToast('숫자가 너무 커요.', 'warn');
  input.blur();
  closeModal('modal-mission-amount');

  if (mode === 'add') return incrementMission(m.id, val);
  if (mode === 'sub') return incrementMission(m.id, -val);

  const role = store.data.currentRole;
  if (role === 'boyfriend') m.bfProgress = val; else m.gfProgress = val;
  store.save();
  syncMyMissionProgressToSupabase(m, role);
  sfx.playSuccess();
  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 10);
  renderMissionsScreen();
}

// --- 먹방 위시리스트 관리 로직 ---
let currentWishlistSubTab = 'pending'; // 'pending' | 'completed'
let selectedWishlistCategory = '고기/구이 🥩';

function switchWishlistSubTab(tab) {
  currentWishlistSubTab = tab;
  const pBtn = document.getElementById('wishlist-tab-pending');
  const cBtn = document.getElementById('wishlist-tab-completed');
  if (pBtn) pBtn.classList.toggle('active', tab === 'pending');
  if (cBtn) cBtn.classList.toggle('active', tab === 'completed');
  renderWishlist();
}

function selectWishlistCategory(cat) {
  selectedWishlistCategory = cat;
  document.querySelectorAll('.wishlist-cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });
}

function openCreateWishlistModal() {
  document.getElementById('modal-wishlist-title-text').innerText = '🍕 먹방 위시리스트 등록';
  document.getElementById('wishlist-edit-id').value = '';
  document.getElementById('wishlist-title-input').value = '';
  document.getElementById('wishlist-memo-input').value = '';
  selectWishlistCategory('고기/구이 🥩');
  openModal('modal-wishlist-edit');
}

function openEditWishlistModal(id) {
  if (!store.data.foodWishlist) store.data.foodWishlist = [];
  const item = store.data.foodWishlist.find(w => w.id === id);
  if (!item) return;

  document.getElementById('modal-wishlist-title-text').innerText = '🍕 먹방 위시리스트 수정';
  document.getElementById('wishlist-edit-id').value = item.id;
  document.getElementById('wishlist-title-input').value = item.title;
  document.getElementById('wishlist-memo-input').value = item.memo || '';
  selectWishlistCategory(item.category || '기타 😋');
  openModal('modal-wishlist-edit');
}

async function saveWishlistData() {
  const editId = document.getElementById('wishlist-edit-id').value;
  const title = document.getElementById('wishlist-title-input').value.trim();
  const memo = document.getElementById('wishlist-memo-input').value.trim();
  const category = selectedWishlistCategory || '기타 😋';

  if (!title) return showToast('음식 또는 맛집 이름을 입력해주세요!');

  if (!store.data.foodWishlist) store.data.foodWishlist = [];

  const role = store.data.currentRole;
  const roleName = nmFull(role);

  if (editId) {
    const item = store.data.foodWishlist.find(w => w.id === editId);
    if (item) {
      item.title = title;
      item.category = category;
      item.memo = memo;
    }
  } else {
    const newItem = {
      id: generateUUID(),
      title,
      category,
      authorRole: role,
      authorName: roleName,
      memo,
      isEaten: false,
      eatenDate: null,
      createdAt: new Date().toISOString()
    };
    store.data.foodWishlist.push(newItem);
  }

  store.save();
  const targetItem = editId ? store.data.foodWishlist.find(w => w.id === editId) : store.data.foodWishlist[store.data.foodWishlist.length - 1];
  if (targetItem) await syncWishlistToSupabase(targetItem);

  sfx.playSuccess();
  closeModal('modal-wishlist-edit');
  renderWishlist();
}

async function toggleWishlistEaten(id) {
  if (!store.data.foodWishlist) store.data.foodWishlist = [];
  const item = store.data.foodWishlist.find(w => w.id === id);
  if (!item) return;

  item.isEaten = !item.isEaten;
  item.eatenDate = item.isEaten ? getTodayStr() : null;

  store.save();

  if (item.isEaten) {
    sfx.playSuccess();
    createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 25);
    showToast(`🎉 '${item.title}' 정복 완료!\n다이어트 목표 달성을 축하합니다! 🍽️✨`);
  } else {
    sfx.playBeep();
  }

  renderWishlist();
  await syncWishlistToSupabase(item);
}

async function deleteWishlist(id) {
  if (confirm('이 위시리스트 항목을 삭제하시겠습니까?')) {
    if (!store.data.foodWishlist) store.data.foodWishlist = [];
    store.data.foodWishlist = store.data.foodWishlist.filter(w => w.id !== id);
    store.save();
    renderWishlist();
    await deleteWishlistFromSupabase(id);
  }
}

function renderWishlist() {
  if (!store.data.foodWishlist) {
    store.data.foodWishlist = [];
  }

  const list = store.data.foodWishlist;
  const pendingItems = list.filter(w => !w.isEaten);
  const completedItems = list.filter(w => w.isEaten);

  const pendingCntEl = document.getElementById('wishlist-pending-cnt');
  const completedCntEl = document.getElementById('wishlist-completed-cnt');
  if (pendingCntEl) pendingCntEl.innerText = pendingItems.length;
  if (completedCntEl) completedCntEl.innerText = completedItems.length;

  const container = document.getElementById('wishlist-list-container');
  if (!container) return;

  const targetList = currentWishlistSubTab === 'pending' ? pendingItems : completedItems;

  if (targetList.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:24px 10px; color:var(--text-muted); font-size:var(--fs-sm);">
        ${currentWishlistSubTab === 'pending' ? '😋 아직 등록된 먹방 위시리스트가 없어요.<br>우측 상단 <b>+ 맛집/메뉴 추가</b>로 가고 싶은 맛집을 등록해보세요!' : '🎉 아직 정복 완료한 맛집이 없어요.<br>다이어트가 끝나면 가고 싶은 곳을 하나씩 정복해보세요! 🍽️'}
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  targetList.forEach(item => {
    const card = document.createElement('div');
    card.className = `wishlist-card ${item.isEaten ? 'completed' : ''}`;

    const isGf = item.authorRole === 'girlfriend';
    const author = nmFull(isGf ? 'girlfriend' : 'boyfriend');

    card.innerHTML = `
      <div class="wish-head">
        <div class="wish-tags">
          <span class="wishlist-tag">${escapeHtml(item.category || '기타 😋')}</span>
          <span class="wish-author ${isGf ? 'gf' : 'bf'}">${escapeHtml(author)} 픽</span>
        </div>
        ${moreMenuHtml([
          { label: '✏️ 수정', action: `openEditWishlistModal('${item.id}')` },
          { label: '🗑️ 삭제', action: `deleteWishlist('${item.id}')`, danger: true }
        ])}
      </div>
      <div class="wish-title">${escapeHtml(item.title)}</div>
      ${item.memo ? `<div class="wish-memo">📝 ${escapeHtml(item.memo)}</div>` : ''}
      <div class="wish-foot">
        <span class="wish-status">${item.isEaten ? `🎉 ${escapeHtml(item.eatenDate || '')} 정복 완료` : '😋 다이어트 끝나면!'}</span>
        ${item.isEaten
          ? `<button class="btn-sm btn-ghost" onclick="toggleWishlistEaten('${item.id}')">↩️ 되돌리기</button>`
          : `<button class="btn-sm btn-orange" onclick="toggleWishlistEaten('${item.id}')">🍽️ 정복 완료</button>`}
      </div>
    `;
    container.appendChild(card);
  });
}

// --- 응원 메시지 직접 입력 및 프리셋 전송 ---
function sendCustomCheerMessage(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return showToast('응원할 메시지를 입력해주세요! 🥰');

  sendCheerMessage(text);
  input.value = '';
}

async function sendCheerMessage(msgText) {
  const role = store.data.currentRole;
  const senderName = role === 'boyfriend' ? store.data.couple.bfName : store.data.couple.gfName;

  const now = new Date();
  const timeStr = formatCheerTimestamp(now);

  const newCheer = {
    id: generateUUID(),
    sender: role,
    senderName,
    message: msgText,
    createdAt: now.toISOString(),
    time: timeStr
  };
  store.data.cheers.push(newCheer);
  store.save();

  sfx.playSuccess();
  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 20);
  renderCheerFeed();
  await syncCheerToSupabase(newCheer);
}

function countTotalHearts() {
  let hearts = 0;
  Object.values(store.data.attendance).forEach(att => {
    if (att.boyfriend && att.girlfriend) hearts++;
  });
  return hearts;
}

function checkRewardBoxUnlocks() {
  const totalHearts = countTotalHearts();
  store.data.coupons.forEach(cp => {
    if (totalHearts >= cp.requiredHearts && !cp.unlocked) {
      cp.unlocked = true;
    }
  });
  store.save();
}

// --- 커플 보상 쿠폰 생성/수정/삭제/카테고리 렌더링 ---
function renderCouponList() {
  const container = document.getElementById('coupons-list');
  if (!container) return;
  container.innerHTML = '';

  const totalHearts = countTotalHearts();
  const heartCountEl = document.getElementById('total-heart-count');
  if (heartCountEl) heartCountEl.innerText = `모은 하트 💖 ${totalHearts}개`;

  const filteredCoupons = store.data.coupons.filter(cp => currentCouponSubTab === 'history' ? cp.used : !cp.used);

  if (filteredCoupons.length === 0) {
    if (currentCouponSubTab === 'available') {
      container.innerHTML = `
        <div style="text-align:center; padding:20px 10px; color:var(--text-muted); font-size:var(--fs-sm);">
          🎁 보유 중인 데이트 쿠폰이 없어요.<br>우측 상단 <b>'+ 쿠폰 만들기'</b>로 새로운 목표를 세워보세요!
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:20px 10px; color:var(--text-muted); font-size:var(--fs-sm);">
          ✨ 아직 사용 완료한 쿠폰 내역이 없어요.<br>열심히 운동하고 모은 하트로 데이트 쿠폰을 사용해보세요! 🥰
        </div>
      `;
    }
    return;
  }

  filteredCoupons.forEach(cp => {
    const isReady = totalHearts >= cp.requiredHearts;
    const card = document.createElement('div');
    card.className = `coupon-card ${cp.used ? 'used' : (!isReady ? 'locked' : '')}`;

    card.innerHTML = `
      <div class="coupon-head">
        <div class="coupon-title">${escapeHtml(cp.title)}</div>
        ${moreMenuHtml([
          { label: '✏️ 수정', action: `openEditCouponModal('${cp.id}')` },
          { label: '🗑️ 삭제', action: `deleteCoupon('${cp.id}')`, danger: true }
        ])}
      </div>
      <div class="coupon-foot">
        <div class="coupon-meta">
          ${cp.used
            ? `<span class="ok">🎉 ${escapeHtml(cp.usedAt || '최근')} 사용 완료</span>`
            : `💖 ${cp.requiredHearts}개 필요 · ${isReady ? '<span class="ok">사용 가능!</span>' : `${cp.requiredHearts - totalHearts}개 남음`}`}
        </div>
        ${cp.used
          ? `<button class="coupon-btn restore" onclick="restoreCoupon('${cp.id}')">되돌리기 ↩️</button>`
          : isReady
            ? `<button class="coupon-btn" onclick="useCoupon('${cp.id}')">사용하기 🎁</button>`
            : `<button class="coupon-btn locked" disabled>🔒 잠김</button>`}
      </div>
    `;
    container.appendChild(card);
  });
}

function openCreateCouponModal() {
  document.getElementById('modal-coupon-title-text').innerText = '🎁 새 보상 쿠폰 만들기';
  document.getElementById('coupon-edit-id').value = '';
  document.getElementById('coupon-title-input').value = '';
  document.getElementById('coupon-hearts-input').value = '10';
  openModal('modal-coupon-edit');
}

function openEditCouponModal(couponId) {
  const cp = store.data.coupons.find(item => item.id === couponId);
  if (!cp) return;

  document.getElementById('modal-coupon-title-text').innerText = '🎁 보상 쿠폰 수정';
  document.getElementById('coupon-edit-id').value = cp.id;
  document.getElementById('coupon-title-input').value = cp.title;
  document.getElementById('coupon-hearts-input').value = cp.requiredHearts;
  openModal('modal-coupon-edit');
}

async function saveCouponData() {
  const editId = document.getElementById('coupon-edit-id').value;
  const title = document.getElementById('coupon-title-input').value.trim();
  const requiredHearts = parseInt(document.getElementById('coupon-hearts-input').value, 10);

  if (!title) return showToast('쿠폰 이름을 입력해주세요!');
  if (isNaN(requiredHearts) || requiredHearts <= 0) return showToast('올바른 필요 하트 개수를 입력해주세요!');

  if (editId) {
    const cp = store.data.coupons.find(item => item.id === editId);
    if (cp) {
      cp.title = title;
      cp.requiredHearts = requiredHearts;
    }
  } else {
    const newCoupon = {
      id: generateUUID(),
      title,
      requiredHearts,
      unlocked: false,
      used: false
    };
    store.data.coupons.push(newCoupon);
  }

  store.save();
  const targetCp = editId ? store.data.coupons.find(item => item.id === editId) : store.data.coupons[store.data.coupons.length - 1];
  if (targetCp) await syncCouponToSupabase(targetCp);

  sfx.playSuccess();
  closeModal('modal-coupon-edit');
  renderMissionsScreen();
}

async function deleteCoupon(couponId) {
  if (confirm('이 보상 쿠폰을 삭제하시겠습니까?')) {
    store.data.coupons = store.data.coupons.filter(item => item.id !== couponId);
    store.save();
    renderMissionsScreen();
    await deleteCouponFromSupabase(couponId);
  }
}

async function useCoupon(couponId) {
  const cp = store.data.coupons.find(c => c.id === couponId);
  if (!cp) return;

  if (confirm(`'${cp.title}' 데이트 쿠폰을 사용하시겠습니까? 🥰`)) {
    cp.used = true;
    cp.usedAt = getTodayStr();
    store.save();
    sfx.playSuccess();
    createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 25);
    renderMissionsScreen();
    await syncCouponUsageToSupabase(cp);
  }
}

async function restoreCoupon(couponId) {
  const cp = store.data.coupons.find(c => c.id === couponId);
  if (!cp) return;

  if (confirm(`'${cp.title}' 쿠폰을 다시 보유 중인 쿠폰으로 되돌리시겠습니까?`)) {
    cp.used = false;
    delete cp.usedAt;
    store.save();
    renderMissionsScreen();
    await syncCouponUsageToSupabase(cp);
  }
}

// --- 10. Feature 8: Workout Routine & Interval Timer ---
let timerInterval = null;
let timerRunning = false;
let currentPhase = 'ready'; // 'work' | 'rest' | 'ready'
let currentSet = 1;
let totalSets = 5;
let workSec = 120; // 기본 2분
let restSec = 120; // 기본 2분
let remainingSec = 120;
let wakeLockSentinel = null;

async function enableScreenWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
    } catch (e) {
      console.log('WakeLock request error:', e);
    }
  }
}

function disableScreenWakeLock() {
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch (e) {}
    wakeLockSentinel = null;
  }
}

function formatTimeMMSS(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderTimerScreen() {
  renderSavedTimerRoutines();
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const secEl = document.getElementById('timer-sec');
  const phaseEl = document.getElementById('timer-phase');
  const setEl = document.getElementById('timer-set-lbl');
  const summaryEl = document.getElementById('timer-config-summary');
  const circle = document.getElementById('timer-circle-progress');

  if (secEl) secEl.innerText = formatTimeMMSS(remainingSec);
  if (setEl) setEl.innerText = `세트 ${currentSet} / ${totalSets}`;
  if (summaryEl) {
    const wMin = Math.floor(workSec / 60);
    const wSec = workSec % 60;
    const rMin = Math.floor(restSec / 60);
    const rSec = restSec % 60;
    const wText = wMin > 0 ? (wSec > 0 ? `${wMin}분 ${wSec}초` : `${wMin}분`) : `${wSec}초`;
    const rText = rMin > 0 ? (rSec > 0 ? `${rMin}분 ${rSec}초` : `${rMin}분`) : `${rSec}초`;
    summaryEl.innerText = `운동 ${wText} · 숨고르기 ${rText}`;
  }

  const circumference = 2 * Math.PI * 92;
  const maxSec = currentPhase === 'rest' ? restSec : workSec;
  const offset = circumference - (remainingSec / maxSec) * circumference;

  if (circle) {
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = isNaN(offset) ? 0 : offset;
    circle.style.stroke = currentPhase === 'rest' ? '#4CAF50' : '#FF5E7E';
  }

  if (phaseEl) {
    phaseEl.className = 'timer-phase-lbl';
    phaseEl.style.color = '';
    phaseEl.style.background = '';
    if (currentPhase === 'ready') {
      phaseEl.innerText = '준비 완료';
      phaseEl.classList.add('ready');
    } else if (currentPhase === 'work') {
      phaseEl.innerText = '🔥 운동 중!';
      phaseEl.classList.add('work');
    } else if (currentPhase === 'rest') {
      phaseEl.innerText = '🍃 숨고르기';
      phaseEl.classList.add('rest');
    }
  }

  const playBtn = document.getElementById('timer-play-btn');
  if (playBtn) {
    playBtn.innerHTML = timerRunning ? '⏸️ 일시정지' : '▶️ 시작하기';
    playBtn.className = timerRunning ? 'timer-ctrl-btn pause' : 'timer-ctrl-btn play';
  }
}

function toggleTimer() {
  if (timerRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  sfx.init();
  enableScreenWakeLock();

  if (currentPhase === 'ready') {
    currentPhase = 'work';
    remainingSec = workSec;
    sfx.playStartChime();
    sfx.vibrate([150, 100, 150]);
    sfx.speak(`1세트 달리기 시작! 힘내세요!`);
  }

  timerRunning = true;
  updateTimerDisplay();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remainingSec--;

    if (remainingSec <= 3 && remainingSec > 0) {
      sfx.playCountdownTick(remainingSec);
    }

    if (remainingSec <= 0) {
      if (currentPhase === 'work') {
        // 운동 끝 -> 숨고르기(휴식) 전환! 맑은 띵~동!🔔
        sfx.playDingDong();
        sfx.vibrate([200, 100, 200]);

        if (currentSet < totalSets) {
          currentPhase = 'rest';
          remainingSec = restSec;
          sfx.speak('숨고르기 시작! 가볍게 걸으며 호흡하세요.');
        } else {
          // 전체 세트 완료!
          finishWorkoutSession();
          return;
        }
      } else if (currentPhase === 'rest') {
        // 숨고르기 끝 -> 다음 세트 달리기/운동 시작!
        currentSet++;
        currentPhase = 'work';
        remainingSec = workSec;
        sfx.playStartChime();
        sfx.vibrate([150, 80, 150]);
        sfx.speak(`${currentSet}세트 달리기 시작!`);
      }
    }
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  disableScreenWakeLock();
  updateTimerDisplay();
}

function resetTimer() {
  pauseTimer();
  currentPhase = 'ready';
  currentSet = 1;
  remainingSec = workSec;
  updateTimerDisplay();
}

function finishWorkoutSession() {
  pauseTimer();
  sfx.playSuccess();
  sfx.speak('수고하셨습니다! 모든 세트 운동을 완료했습니다. 출석 도장이 찍혔습니다!');
  currentPhase = 'ready';
  currentSet = 1;
  remainingSec = workSec;
  updateTimerDisplay();

  // 자동으로 오늘 운동 출석 체크 반영
  const role = store.data.currentRole;
  const today = getTodayStr();
  if (!store.data.attendance[today]) {
    store.data.attendance[today] = { boyfriend: false, girlfriend: false };
  }
  store.data.attendance[today][role] = true;
  store.save();
  syncAttendanceToSupabase(today, role, true);

  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 30);
  showToast('🎉 홈트 & 러닝 완료! 오늘 운동 출석 도장이 자동으로 찍혔습니다! 💖');
  switchTab('home');
}

function applyTimerPreset(presetType) {
  if (presetType === 'haesol_2m') {
    workSec = 120; // 2분
    restSec = 120; // 2분
    totalSets = 5; // 5세트 (총 20분)
  } else if (presetType === 'interval_1m') {
    workSec = 60; // 1분
    restSec = 60; // 1분
    totalSets = 4;
  } else if (presetType === 'tabata') {
    workSec = 20; // 20초
    restSec = 10; // 10초
    totalSets = 8;
  } else if (presetType === 'runday_3m') {
    workSec = 180; // 3분
    restSec = 120; // 2분
    totalSets = 4;
  }
  resetTimer();
  sfx.playSuccess();
}

// --- 내 타이머 루틴 저장 (이 폰에 저장, 최대 8개) ---
const TIMER_ROUTINES_KEY = 'couple_timer_routines';
function getTimerRoutines() {
  try {
    const list = JSON.parse(localStorage.getItem(TIMER_ROUTINES_KEY) || '[]');
    return Array.isArray(list) ? list.filter(r => r && r.id && r.work > 0) : [];
  } catch (e) { return []; }
}
function setTimerRoutines(list) {
  try { localStorage.setItem(TIMER_ROUTINES_KEY, JSON.stringify(list)); } catch (e) {}
  renderSavedTimerRoutines();
}
function formatRoutineTime(sec) {
  const m = Math.floor(sec / 60), s2 = sec % 60;
  return m && s2 ? `${m}분 ${s2}초` : m ? `${m}분` : `${s2}초`;
}
function saveCurrentTimerRoutine() {
  const nameEl = document.getElementById('timer-routine-name');
  const name = (nameEl ? nameEl.value : '').trim().slice(0, 12);
  if (!name) return showToast('루틴 이름을 입력해주세요.', 'warn');
  const wMin = parseInt(document.getElementById('custom-work-min').value, 10) || 0;
  const wSec = parseInt(document.getElementById('custom-work-sec-part').value, 10) || 0;
  const rMin = parseInt(document.getElementById('custom-rest-min').value, 10) || 0;
  const rSec = parseInt(document.getElementById('custom-rest-sec-part').value, 10) || 0;
  const sets = Math.max(1, parseInt(document.getElementById('custom-sets-count').value, 10) || 1);
  const work = wMin * 60 + wSec, rest = rMin * 60 + rSec;
  if (work <= 0) return showToast('운동 시간은 최소 1초 이상이어야 합니다!', 'warn');
  const list = getTimerRoutines();
  if (list.length >= 8) return showToast('루틴은 8개까지 저장할 수 있어요. 안 쓰는 루틴을 지워주세요.', 'warn');
  list.push({ id: generateUUID(), name, work, rest, sets });
  setTimerRoutines(list);
  if (nameEl) nameEl.value = '';
  sfx.playSuccess();
  showToast(`'${name}' 루틴을 저장했어요.`, 'success');
}
function applySavedTimerRoutine(id) {
  const r = getTimerRoutines().find(x => x.id === id);
  if (!r) return;
  workSec = r.work; restSec = r.rest; totalSets = r.sets;
  resetTimer();
  sfx.playSuccess();
  closeModal('modal-timer-settings');
}
function deleteSavedTimerRoutine(id) {
  const r = getTimerRoutines().find(x => x.id === id);
  if (r && confirm(`'${r.name}' 루틴을 삭제할까요?`)) setTimerRoutines(getTimerRoutines().filter(x => x.id !== id));
}
function renderSavedTimerRoutines() {
  const list = getTimerRoutines();
  const chips = document.getElementById('timer-custom-presets');
  if (chips) {
    chips.innerHTML = list.map(r =>
      `<button class="quick-chip preset-mine" onclick="applySavedTimerRoutine('${r.id}')">⭐ ${escapeHtml(r.name)}</button>`
    ).join('');
  }
  const box = document.getElementById('timer-saved-list');
  if (box) {
    box.innerHTML = list.length === 0
      ? `<div class="hint-center">저장한 루틴이 없어요.</div>`
      : list.map(r => `
        <div class="saved-routine">
          <button class="saved-routine-main" onclick="applySavedTimerRoutine('${r.id}')">
            <b>⭐ ${escapeHtml(r.name)}</b>
            <span>운동 ${formatRoutineTime(r.work)} · 휴식 ${formatRoutineTime(r.rest)} · ${r.sets}세트</span>
          </button>
          <button class="comment-del" aria-label="루틴 삭제" onclick="deleteSavedTimerRoutine('${r.id}')">×</button>
        </div>`).join('');
  }
}

function openTimerSettingsModal() {
  const wMin = Math.floor(workSec / 60);
  const wSec = workSec % 60;
  const rMin = Math.floor(restSec / 60);
  const rSec = restSec % 60;

  const wMinIn = document.getElementById('custom-work-min');
  const wSecIn = document.getElementById('custom-work-sec-part');
  const rMinIn = document.getElementById('custom-rest-min');
  const rSecIn = document.getElementById('custom-rest-sec-part');
  const setIn = document.getElementById('custom-sets-count');

  if (wMinIn) wMinIn.value = wMin;
  if (wSecIn) wSecIn.value = wSec;
  if (rMinIn) rMinIn.value = rMin;
  if (rSecIn) rSecIn.value = rSec;
  if (setIn) setIn.value = totalSets;

  openModal('modal-timer-settings');
}

function applyTimerSettings() {
  const wMin = parseInt(document.getElementById('custom-work-min').value, 10) || 0;
  const wSec = parseInt(document.getElementById('custom-work-sec-part').value, 10) || 0;
  const rMin = parseInt(document.getElementById('custom-rest-min').value, 10) || 0;
  const rSec = parseInt(document.getElementById('custom-rest-sec-part').value, 10) || 0;
  const sets = parseInt(document.getElementById('custom-sets-count').value, 10) || 1;

  const totalWork = wMin * 60 + wSec;
  const totalRest = rMin * 60 + rSec;

  if (totalWork <= 0) return showToast('운동 시간은 최소 1초 이상이어야 합니다!');
  if (totalRest < 0) return showToast('숨고르기 시간을 확인해주세요!');

  workSec = totalWork;
  restSec = totalRest;
  totalSets = Math.max(1, sets);

  resetTimer();
  sfx.playSuccess();
  closeModal('modal-timer-settings');
}

function toggleSoundEnabled(enabled) {
  sfx.soundEnabled = enabled;
  if (enabled) sfx.playDingDong();
}

function toggleVoiceEnabled(enabled) {
  sfx.voiceEnabled = enabled;
  if (enabled) sfx.speak('음성 안내가 켜졌습니다');
}

// --- 11. Modal Window Helpers ---
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    if (id === 'modal-settings') {
      updateSettingsModalUI();
      fillCoupleSettingsForm();
      updateProfileSwitchUI();
    }
    if (id === 'modal-timer-settings') renderSavedTimerRoutines();
  }
}
function fillCoupleSettingsForm() {
  const c = store.data.couple;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('cfg-bf-name', nm('boyfriend'));
  set('cfg-gf-name', nm('girlfriend'));
  set('cfg-dday', c.ddayDate || '');
  set('cfg-step-goal', c.stepGoal || 8000);
  const dd = document.getElementById('cfg-dday');
  if (dd) dd.max = getTodayStr();
}

// --- 프로필 전환: 기본 사용자가 정해진 폰에서는 상단 전환 바를 숨기고 설정에서 전환 ---
function getDeviceOwner() {
  try {
    const o = localStorage.getItem('couple_device_owner');
    return o === 'boyfriend' || o === 'girlfriend' ? o : null;
  } catch (e) { return null; }
}
function updateProfileSwitchUI() {
  const owner = getDeviceOwner();
  const role = store.data.currentRole;
  document.body.classList.toggle('owner-set', !!owner);
  const banner = document.getElementById('viewing-banner');
  if (banner) {
    const viewingOther = !!owner && role !== owner;
    banner.hidden = !viewingOther;
    if (viewingOther) {
      const txt = document.getElementById('viewing-banner-text');
      if (txt) txt.innerText = `${ROLE_EMOJI[role]} ${nm(role)} 프로필로 보는 중`;
    }
  }
  ['boyfriend', 'girlfriend'].forEach(r => {
    const btn = document.getElementById(r === 'boyfriend' ? 'settings-switch-bf' : 'settings-switch-gf');
    if (btn) btn.classList.toggle('active', r === role);
  });
}
function switchProfileFromSettings(role) {
  if (store.data.currentRole === role) return showToast(`이미 ${nm(role)} 프로필이에요.`);
  closeModal('modal-settings');
  handleProfileSwitchClick(role);
}
function returnToOwnerProfile() {
  const owner = getDeviceOwner();
  if (owner) handleProfileSwitchClick(owner);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function updateSettingsModalUI() {
  const role = store.data.currentRole;
  const roleName = nmFull(role);
  const pinHeader = document.getElementById('my-pin-setting-header');
  if (pinHeader) {
    pinHeader.innerText = `🔒 ${String(roleName).split(' ')[0]}님의 PIN 변경`;
  }
}

// --- 12. Supabase Cloud Backend & Realtime Synchronization ---
let supabaseClient = null;
let realtimeChannel = null;
let autoSyncInterval = null;
let realtimeConnected = false;
let lastLoadAt = 0;

function initSupabase() {
  const url = store.data.supabase.url;
  const key = store.data.supabase.anonKey;

  if (url && key && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      console.log('✅ Supabase Cloud Connected!');
      updateCloudSyncStatusBadge(true);
      setupSupabaseRealtime();
      probeDbFeatures().then(() => loadFromSupabase());
      startAutoSyncPolling();
    } catch (e) {
      console.error('Supabase init error:', e);
      updateCloudSyncStatusBadge(false);
    }
  } else {
    updateCloudSyncStatusBadge(false);
  }
}

// --- DB 구조 자동 인식 ---
// db_upgrade_5to9.sql 을 실행했는지 앱이 직접 확인해서, 실행 전에는 예전 방식 / 실행 후에는 새 구조를 씀
const dbFeatures = {
  reactions: false,     // diet_reactions 테이블
  settings: false,      // couple_settings 테이블
  userSettings: false,  // user_settings 테이블 (목표 체중)
  weekStart: false,     // missions.week_start 칸
  results: false,       // mission_results 테이블
  dietUpdatedAt: false  // diet_logs.updated_at 칸
};
let dbFeaturesCheckedAt = 0;

async function probeDbFeatures() {
  if (!supabaseClient) return;
  dbFeaturesCheckedAt = Date.now();
  const probes = {
    reactions: ['diet_reactions', 'id'],
    settings: ['couple_settings', 'id'],
    userSettings: ['user_settings', 'user_role'],
    weekStart: ['missions', 'week_start'],
    results: ['mission_results', 'id'],
    dietUpdatedAt: ['diet_logs', 'updated_at']
  };
  const before = JSON.stringify(dbFeatures);
  await Promise.all(Object.entries(probes).map(async ([key, [table, col]]) => {
    if (dbFeatures[key]) return;
    try {
      const { error } = await supabaseClient.from(table).select(col).limit(1);
      if (!error) dbFeatures[key] = true;
    } catch (e) { /* 연결 문제면 다음 기회에 다시 확인 */ }
  }));
  // 새 구조가 방금 인식됐으면 실시간 구독도 새 테이블을 포함해 다시 연결
  if (JSON.stringify(dbFeatures) !== before && realtimeChannel) setupSupabaseRealtime();
}

function allDbFeaturesReady() {
  return Object.values(dbFeatures).every(Boolean);
}

function startAutoSyncPolling() {
  if (autoSyncInterval) clearInterval(autoSyncInterval);
  // 실시간 연결이 살아 있으면 15초, 끊겨 있으면 5초마다 가벼운 확인 (사진은 새로 생긴 것만 받음)
  autoSyncInterval = setInterval(() => {
    if (document.hidden || !supabaseClient) return;
    const gap = realtimeConnected ? 15000 : 5000;
    if (Date.now() - lastLoadAt >= gap) loadFromSupabase(true);
    // 아직 새 DB 구조가 없으면 1분마다 다시 확인 (SQL 실행 후 앱을 다시 켜지 않아도 전환됨)
    if (!allDbFeaturesReady() && Date.now() - dbFeaturesCheckedAt > 60000) {
      probeDbFeatures().then(() => loadFromSupabase(true));
    }
  }, 2500);
}

function updateCloudSyncStatusBadge(isConnected) {
  const badge = document.getElementById('cloud-sync-status');
  if (badge) {
    if (isConnected) {
      badge.innerHTML = '☁️ 실시간 동기화 ON';
      badge.style.color = '#2E7D32';
      badge.style.background = '#E8F5E9';
    } else {
      badge.innerHTML = '💾 로컬 모드 (Supabase 미연동)';
      badge.style.color = '#E65100';
      badge.style.background = '#FFF3E0';
    }
  }
}

// --- 식단 기록 헬퍼 (최신 30개 + 필터 날짜 추가 조회) ---
let dietFilterLoadingDate = '';
const DIET_PAGE_SIZE = 30;      // 자동 동기화로 받는 최신 기록 수
const DIET_OLDER_PAGE_SIZE = 20; // '더 보기' 한 번에 받는 수
let olderDietCache = [];         // '더 보기'로 불러온 이전 기록 (이 세션 동안만 유지)
let dietNoMoreOlder = false;
let dietOlderLoading = false;

// 식단 피드 '이전 기록 더 보기'
async function loadMoreDietLogs() {
  if (!supabaseClient || dietOlderLoading || dietNoMoreOlder) return;
  const paged = store.data.dietLogs.filter(d => d.createdAt && (!d._older || d._paged));
  if (!paged.length) return;
  const oldest = paged.reduce((a, b) => (String(a.createdAt) < String(b.createdAt) ? a : b)).createdAt;

  dietOlderLoading = true;
  renderDietScreen();
  try {
    const { data, error } = await supabaseClient
      .from('diet_logs')
      .select('*')
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(DIET_OLDER_PAGE_SIZE);
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(mapDietRow) : [];
    if (rows.length < DIET_OLDER_PAGE_SIZE) dietNoMoreOlder = true;
    const known = new Set(olderDietCache.map(d => d.id));
    rows.forEach(r => { if (!known.has(r.id)) olderDietCache.push({ ...r, _paged: true }); });
    const base = store.data.dietLogs.filter(d => !d._paged);
    store.data.dietLogs = mergeDietLogs(base, olderDietCache);
  } catch (e) {
    console.warn('diet_logs older fetch error:', e);
    showToast('이전 기록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
  }
  dietOlderLoading = false;
  renderDietScreen();
}

// 식단 사진은 용량이 커서, 자동 동기화 때는 글자 정보만 받고 사진은 처음 한 번만 받아 기억해둠
const DIET_META_COLUMNS = 'id,user_role,date,meal_type,memo,created_at';
const dietPhotoCache = new Map(); // id → 사진 데이터(없으면 null)
const dietPhotoStamp = new Map(); // id → 그 사진을 받았을 때의 수정 시각(updated_at)
let dietPhotoFetching = false;

function seedDietPhotoCacheFromStore() {
  (store.data.dietLogs || []).forEach(d => {
    if (d && d.id && d.photoUrl !== undefined) dietPhotoCache.set(d.id, d.photoUrl || null);
  });
}

function mapDietRow(d) {
  if (d.photo_url !== undefined) {
    dietPhotoCache.set(d.id, d.photo_url || null);
    if (d.updated_at !== undefined) dietPhotoStamp.set(d.id, d.updated_at);
  } else if (d.updated_at !== undefined) {
    // 글자 정보만 받은 경우: 수정 시각이 달라졌으면 사진이 바뀌었을 수 있으니 다시 받게 함
    if (dietPhotoStamp.has(d.id) && dietPhotoStamp.get(d.id) !== d.updated_at) dietPhotoCache.delete(d.id);
    if (!dietPhotoCache.has(d.id) || !dietPhotoStamp.has(d.id)) dietPhotoStamp.set(d.id, d.updated_at);
  }
  return {
    id: d.id,
    role: d.user_role,
    date: d.date,
    mealType: d.meal_type,
    photoUrl: dietPhotoCache.has(d.id) ? dietPhotoCache.get(d.id) : undefined, // undefined = 아직 안 받음
    memo: d.memo,
    createdAt: d.created_at
  };
}

async function fetchMissingDietPhotos() {
  if (!supabaseClient || dietPhotoFetching) return;
  const missing = store.data.dietLogs.filter(d => d.photoUrl === undefined).map(d => d.id);
  if (missing.length === 0) return;
  dietPhotoFetching = true;
  try {
    // 최신 것부터 6장씩 나눠 받음
    const ids = missing.reverse();
    for (let i = 0; i < ids.length; i += 6) {
      const chunk = ids.slice(i, i + 6);
      const { data, error } = await supabaseClient.from('diet_logs').select(dbFeatures.dietUpdatedAt ? 'id,photo_url,updated_at' : 'id,photo_url').in('id', chunk);
      if (error || !Array.isArray(data)) break;
      data.forEach(r => {
        dietPhotoCache.set(r.id, r.photo_url || null);
        if (r.updated_at !== undefined) dietPhotoStamp.set(r.id, r.updated_at);
      });
      chunk.forEach(id => { if (!dietPhotoCache.has(id)) dietPhotoCache.set(id, null); });
      store.data.dietLogs.forEach(d => { if (dietPhotoCache.has(d.id)) d.photoUrl = dietPhotoCache.get(d.id); });
      store.save();
      const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
      if (currentTab === 'diet' && !isTyping && !document.querySelector('.more-menu.open')) renderDietScreen();
    }
  } catch (e) {
    console.warn('diet photo fetch warning:', e);
  }
  dietPhotoFetching = false;
}

// 특정 날짜의 식단 기록을 서버에서 조회 (실패 시 null)
async function fetchDietRowsForDate(dateStr) {
  if (!supabaseClient || !dateStr) return null;
  try {
    const { data, error } = await supabaseClient
      .from('diet_logs')
      .select('*')
      .eq('date', dateStr)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('diet_logs date fetch error:', error);
      return null;
    }
    return Array.isArray(data) ? data.map(mapDietRow) : null;
  } catch (e) {
    console.warn('diet_logs date fetch error:', e);
    return null;
  }
}

// 기본 목록에 없는 기록만 _older 표시를 붙여 합치고 작성순으로 정렬
function mergeDietLogs(baseLogs, extraLogs) {
  const ids = new Set(baseLogs.map(d => d.id));
  const extras = extraLogs.filter(d => !ids.has(d.id)).map(d => ({ ...d, _older: true }));
  if (extras.length === 0) return baseLogs;
  return [...baseLogs, ...extras].sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  );
}

// 날짜 필터 선택 시 해당 날짜 기록을 서버에서 바로 불러와 표시
async function loadDietLogsForFilterDate(dateStr) {
  if (!supabaseClient || !dateStr) return;
  dietFilterLoadingDate = dateStr;
  if (currentTab === 'diet') renderDietScreen();

  const dayLogs = await fetchDietRowsForDate(dateStr);
  if (dietFilterLoadingDate === dateStr) dietFilterLoadingDate = '';
  if (dayLogs && selectedDietFilterDate === dateStr) {
    // 이 날짜로 이전에 불러온 과거 기록은 서버 기준으로 교체 (삭제 반영)
    const base = store.data.dietLogs.filter(d => !(d._older && d.date === dateStr));
    store.data.dietLogs = mergeDietLogs(base, dayLogs);
  }
  if (currentTab === 'diet') renderDietScreen();
}

// 화면에 영향을 주는 데이터의 지문 (바뀐 게 없으면 다시 그리지 않기 위함)
function stateSignature() {
  const d = store.data;
  return JSON.stringify([
    d.attendance, d.stepLogs, d.weightLogs,
    (d.dietLogs || []).map(x => [x.id, x.date, x.mealType, x.memo, x.photoUrl === undefined ? -1 : (x.photoUrl ? x.photoUrl.length : 0)]),
    d.cheers, (d.missions || []).map(m => [m.id, m.title, m.target, m.unit, m.bfProgress, m.gfProgress, m.penalty]),
    d.coupons, d.penalties, d.foodWishlist, d.couple, d.pins, d.missionResults || null, getGoalWeight(d.currentRole)
  ]);
}

async function loadFromSupabase(silent = false) {
  if (!supabaseClient) return;
  // 보내는 중이거나 밀린 기록이 있으면, 서버의 옛 데이터로 덮어쓰지 않도록 먼저 보내고 나서 불러옴
  if (syncInFlight > 0) return;
  if (outbox.length > 0) {
    await flushOutbox();
    if (outbox.length > 0) return;
  }
  lastLoadAt = Date.now();
  if (dbFeaturesCheckedAt === 0) await probeDbFeatures();
  const signatureBefore = stateSignature();
  try {
    // 1. 출석 불러오기 (취소/해제 동기화를 위해 서버 기준으로 재구성)
    const { data: attList, error: attErr } = await supabaseClient.from('attendance').select('*');
    if (attErr && isNetworkError(attErr)) {
      lastLoadOffline = true;
      updateSyncStatus();
      return;
    }
    lastLoadOffline = false;
    if (!attErr && Array.isArray(attList)) {
      const newAttendance = {};
      attList.forEach(item => {
        if (!newAttendance[item.date]) {
          newAttendance[item.date] = { boyfriend: false, girlfriend: false };
        }
        if (item.user_role === 'boyfriend') newAttendance[item.date].boyfriend = true;
        if (item.user_role === 'girlfriend') newAttendance[item.date].girlfriend = true;
      });
      store.data.attendance = newAttendance;
    }

    // 2. 걸음 수 불러오기
    const { data: stepList, error: stepErr } = await supabaseClient.from('step_logs').select('*');
    if (!stepErr && Array.isArray(stepList)) {
      const newStepLogs = {};
      stepList.forEach(s => {
        if (!newStepLogs[s.date]) newStepLogs[s.date] = { boyfriend: 0, girlfriend: 0 };
        newStepLogs[s.date][s.user_role] = s.step_count;
      });
      store.data.stepLogs = newStepLogs;
    }

    // 3. 체중 기록 불러오기
    const { data: weightList, error: weightErr } = await supabaseClient.from('weight_logs').select('*').order('date', { ascending: true });
    if (!weightErr && Array.isArray(weightList)) {
      store.data.weightLogs.boyfriend = weightList
        .filter(w => w.user_role === 'boyfriend')
        .map(w => ({ date: w.date, weight: Number(w.weight_kg), baseline: Number(w.baseline_weight) }));
      store.data.weightLogs.girlfriend = weightList
        .filter(w => w.user_role === 'girlfriend')
        .map(w => ({ date: w.date, weight: Number(w.weight_kg), baseline: Number(w.baseline_weight) }));
    }

    // 4. 식단 불러오기 (최신순 30개 페이징으로 속도 10배 향상 및 데이터 절약)
    const { data: dietList, error: dietErr } = await supabaseClient
      .from('diet_logs')
      .select(dbFeatures.dietUpdatedAt ? DIET_META_COLUMNS + ',updated_at' : DIET_META_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(DIET_PAGE_SIZE);
    if (!dietErr && Array.isArray(dietList)) {
      let dietLogs = dietList.map(mapDietRow).reverse();
      // 날짜 필터 사용 중이면 최신 30개에 없는 그 날짜의 과거 기록도 함께 유지
      if (dietList.length < DIET_PAGE_SIZE) dietNoMoreOlder = true;
      // '더 보기'로 불러온 이전 기록은 다시 받지 않고 메모리에 둔 것을 합침
      if (olderDietCache.length) dietLogs = mergeDietLogs(dietLogs, olderDietCache);
      if (selectedDietFilterDate) {
        const dayLogs = await fetchDietRowsForDate(selectedDietFilterDate);
        if (dayLogs) dietLogs = mergeDietLogs(dietLogs, dayLogs);
      }
      store.data.dietLogs = dietLogs;
      fetchMissingDietPhotos();
    }

    // 5. 칭찬 불러오기 (날짜 및 시간 포함)
    const { data: cheerList, error: cheerErr } = await supabaseClient.from('cheers').select('*').order('created_at', { ascending: true });
    if (!cheerErr && Array.isArray(cheerList)) {
      let cheers = cheerList.map(c => ({
        id: c.id,
        sender: c.sender_role,
        senderName: c.sender_name,
        message: c.message,
        createdAt: c.created_at,
        time: formatCheerTimestamp(c.created_at)
      }));

      // 식단 반응: 새 구조에서는 diet_reactions 테이블에서 읽어 같은 모양으로 합침
      if (dbFeatures.reactions) {
        const { data: rxList, error: rxErr } = await supabaseClient.from('diet_reactions').select('*').order('created_at', { ascending: true });
        if (!rxErr && Array.isArray(rxList)) {
          migrateLegacyDietReactions(cheers.filter(isDietReaction)); // 예전 방식으로 남아 있는 반응은 새 테이블로 옮김
          const known = new Set(rxList.map(r => r.id));
          cheers = cheers.filter(c => !(isDietReaction(c) && known.has(c.id)));
          rxList.forEach(r => cheers.push({
            id: r.id,
            sender: r.user_role,
            senderName: nmFull(r.user_role),
            message: `::diet:${r.diet_id}::${r.kind === 'heart' ? DIET_HEART : (r.body || '')}`,
            createdAt: r.created_at,
            time: formatCheerTimestamp(r.created_at)
          }));
        }
      }
      store.data.cheers = cheers;
    }

    // 6. 미션 불러오기
    let { data: missionList, error: missErr } = await supabaseClient.from('missions').select('*');
    if (!missErr && Array.isArray(missionList) && missionList.length > 0) {
      // 주가 바뀌었으면 진행도 초기화 (여러 기기가 동시에 해도 한 번만 적용됨)
      const resetApplied = await applyWeeklyMissionResetRemote(missionList);
      if (resetApplied) {
        const refetch = await supabaseClient.from('missions').select('*');
        if (!refetch.error && Array.isArray(refetch.data)) missionList = refetch.data;
      }

      const prevMissions = new Map(store.data.missions.map(x => [x.id, x]));
      const myKey = store.data.currentRole === 'boyfriend' ? 'bfProgress' : 'gfProgress';
      store.data.missions = missionList.map(m => {
        const mapped = {
          id: m.id,
          title: m.title,
          target: m.target_count,
          unit: m.unit || '회',
          bfProgress: m.user1_progress || 0,
          gfProgress: m.user2_progress || 0,
          penalty: m.penalty_reward,
          periodStart: m.created_at,
          weekStart: missionWeekStartOf(m)
        };
        // 방금 내가 누른 진행도가 아직 서버에 반영 전이면 내 값은 로컬 값을 유지 (연타 시 숫자 튐 방지)
        const prev = prevMissions.get(m.id);
        if (prev && prev._pendingUntil && prev._pendingUntil > Date.now()) {
          mapped[myKey] = prev[myKey];
          mapped._pendingUntil = prev._pendingUntil;
        }
        return mapped;
      });
    }

    // 7. 보상 쿠폰 불러오기
    const { data: couponList, error: coupErr } = await supabaseClient.from('reward_box').select('*').order('required_hearts', { ascending: true });
    if (!coupErr && Array.isArray(couponList) && couponList.length > 0) {
      store.data.coupons = couponList.map(c => ({
        id: c.id,
        title: c.title,
        requiredHearts: c.required_hearts,
        unlocked: c.is_unlocked,
        used: c.is_used,
        usedAt: c.used_at
      }));
    }

    // 8. 벌칙 목록 불러오기
    const { data: penaltyList, error: penErr } = await supabaseClient.from('penalties').select('*').order('created_at', { ascending: false });
    if (!penErr && Array.isArray(penaltyList)) {
      store.data.penalties = penaltyList.map(p => ({
        id: p.id,
        title: p.title,
        loser: p.loser_role,
        loserName: p.loser_name,
        targetName: p.target_name,
        fromMission: p.from_mission,
        completed: p.is_completed,
        completedAt: p.completed_at,
        createdAt: p.created_at ? p.created_at.slice(0, 10) : getTodayStr()
      }));
    }

    // 8-1. 미션 주차별 결과 (새 구조에서 전적 계산용)
    if (dbFeatures.results) {
      try {
        const { data: resList, error: resErr } = await supabaseClient.from('mission_results').select('id,winner_role');
        if (!resErr && Array.isArray(resList)) store.data.missionResults = resList.map(r => ({ winner: r.winner_role }));
      } catch (e) {
        console.warn('mission_results fetch warning:', e);
      }
    }

    // 9. 커플 PIN 비밀번호 불러오기
    try {
      const { data: pinList } = await supabaseClient.from('couple_pins').select('*');
      if (pinList && pinList.length > 0) {
        if (!store.data.pins) store.data.pins = { boyfriend: '1234', girlfriend: '1234' };
        const legacyCfg = [];
        pinList.forEach(p => {
          if (!p.user_role || !p.pin) return;
          if (String(p.user_role).startsWith('cfg_')) {
            applyCoupleConfigRow(p.user_role, p.pin);
            legacyCfg.push(p);
          } else {
            store.data.pins[p.user_role] = String(p.pin);
          }
        });
        // 새 구조: 예전 방식(cfg_ 줄)으로 남은 설정을 couple_settings 로 옮기고 정리
        if (dbFeatures.settings && legacyCfg.length) migrateLegacyCoupleConfig(legacyCfg);
      }
    } catch (e) {
      console.warn('couple_pins fetch warning:', e);
    }

    // 9-1. 커플 설정 / 내 목표 체중 (새 구조)
    try {
      if (dbFeatures.settings && migratingCoupleConfig === 0) {
        const { data: cs, error: csErr } = await supabaseClient.from('couple_settings').select('*').limit(1);
        if (!csErr && Array.isArray(cs) && cs[0]) {
          applyCoupleConfigRow('cfg_bf_name', cs[0].bf_name);
          applyCoupleConfigRow('cfg_gf_name', cs[0].gf_name);
          applyCoupleConfigRow('cfg_dday', cs[0].dday_date);
          applyCoupleConfigRow('cfg_step_goal', cs[0].step_goal);
        }
      }
      if (dbFeatures.userSettings) await syncGoalWeightFromServer();
    } catch (e) {
      console.warn('settings fetch warning:', e);
    }

    // 10. 먹방 위시리스트 불러오기
    try {
      const { data: wishList, error: wishErr } = await supabaseClient.from('food_wishlist').select('*').order('created_at', { ascending: false });
      if (!wishErr && Array.isArray(wishList)) {
        store.data.foodWishlist = wishList.map(w => ({
          id: w.id,
          title: w.title,
          category: w.category || '기타 😋',
          authorRole: w.author_role || 'boyfriend',
          authorName: w.author_name || nmFull(w.author_role === 'girlfriend' ? 'girlfriend' : 'boyfriend'),
          memo: w.memo || '',
          isEaten: !!w.is_eaten,
          eatenDate: w.eaten_date || null,
          createdAt: w.created_at
        }));
      }
    } catch (e) {
      console.warn('food_wishlist fetch warning:', e);
    }

    const wasFirstSync = !initialSyncDone;
    initialSyncDone = true;
    updateSyncStatus();

    // 바뀐 게 없으면 저장/다시 그리기를 건너뜀 (깜빡임과 배터리 절약)
    if (!wasFirstSync && stateSignature() === signatureBefore) return;
    store.save();

    // 사용자가 입력 중이 아닐 때 부드럽게 화면 갱신
    const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
    const isMenuOpen = !!document.querySelector('.more-menu.open');
    if (!isTyping && !isMenuOpen) {
      renderHomeScreen();
      if (currentTab === 'stats') renderStatsScreen();
      if (currentTab === 'diet') renderDietScreen();
      if (currentTab === 'missions') renderMissionsScreen();
    }
  } catch (err) {
    console.error('Supabase load error:', err);
    if (isNetworkError(err)) { lastLoadOffline = true; updateSyncStatus(); }
  }
}

// --- 13. System Push Notifications (Web Notification API) ---
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return showToast('이 브라우저는 알림 기능을 지원하지 않습니다.');
  }

  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      sfx.playSuccess();
      showSystemNotification('🔔 Couple Fit 알림 활성화!', '상대방이 운동을 완료하거나 응원을 보낼 때 알림을 받습니다.');
      const btn = document.getElementById('btn-enable-notify');
      if (btn) btn.style.color = '#FF5E7E';
    } else {
      showToast('알림 권한이 거부되었습니다. 기기 설정에서 알림을 허용해주세요.');
    }
  });
}

function showSystemNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: 'icon-192.png',
        badge: 'icon-192.png'
      });
    } catch (e) {
      console.log('Notification display error:', e);
    }
  }
}

function setupSupabaseRealtime() {
  if (!supabaseClient) return;

  if (realtimeChannel) {
    try {
      supabaseClient.removeChannel(realtimeChannel);
    } catch (e) {}
  }

  // 모든 핵심 테이블 실시간 WebSocket 구독
  let channel = supabaseClient
    .channel('couple_realtime_all_' + Date.now())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
      loadFromSupabase();
      sfx.playSuccess();
      const currentRole = store.data.currentRole;
      if (payload.new && payload.new.user_role !== currentRole) {
        const partnerName = currentRole === 'boyfriend' ? store.data.couple.gfName : store.data.couple.bfName;
        showSystemNotification('🎉 파트너 운동 완료!', `${partnerName}님이 오늘 운동 출석 도장을 찍었어요! 💖`);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'step_logs' }, () => {
      loadFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'weight_logs' }, () => {
      loadFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'diet_logs' }, (payload) => {
      // 상대가 사진을 바꿨을 수 있으니 그 식단의 사진은 다시 받음
      const changedId = (payload.new && payload.new.id) || (payload.old && payload.old.id);
      if (changedId && payload.eventType !== 'INSERT') dietPhotoCache.delete(changedId);
      loadFromSupabase();
      const currentRole = store.data.currentRole;
      if (payload.eventType === 'INSERT' && payload.new && payload.new.user_role && payload.new.user_role !== currentRole) {
        const partnerName = currentRole === 'boyfriend' ? store.data.couple.gfName : store.data.couple.bfName;
        showSystemNotification('🥗 새 식단 일기 등록!', `${partnerName}님이 맛있는 식단 사진을 올렸어요.`);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cheers' }, (payload) => {
      loadFromSupabase();
      if (payload.eventType !== 'INSERT' || !payload.new || !payload.new.sender_role) return;
      const currentRole = store.data.currentRole;
      const reaction = parseDietReaction(payload.new);
      if (!reaction) createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 20);
      if (payload.new.sender_role !== currentRole) {
        if (reaction) {
          showSystemNotification(`🥗 ${payload.new.sender_name}님이 식단에 반응했어요`, reaction.text);
        } else {
          showSystemNotification(`💌 ${payload.new.sender_name}의 응원 도착!`, payload.new.message);
        }
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => {
      loadFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_box' }, () => {
      loadFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'penalties' }, () => {
      loadFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_pins' }, (payload) => {
      if (payload.new && payload.new.user_role && payload.new.pin) {
        if (String(payload.new.user_role).startsWith('cfg_')) {
          loadFromSupabase();
          return;
        }
        if (!store.data.pins) store.data.pins = { boyfriend: '1234', girlfriend: '1234' };
        store.data.pins[payload.new.user_role] = String(payload.new.pin);
        store.save();
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'food_wishlist' }, () => {
      loadFromSupabase();
    });

  // 새 DB 구조의 테이블 (있을 때만 구독)
  if (dbFeatures.reactions) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'diet_reactions' }, (payload) => {
      loadFromSupabase();
      const r = payload.new;
      if (payload.eventType === 'INSERT' && r && r.user_role && r.user_role !== store.data.currentRole) {
        showSystemNotification(`🥗 ${nmFull(r.user_role)}님이 식단에 반응했어요`, r.kind === 'heart' ? DIET_HEART : (r.body || ''));
      }
    });
  }
  if (dbFeatures.settings) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'couple_settings' }, () => loadFromSupabase());
  }
  if (dbFeatures.results) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'mission_results' }, () => loadFromSupabase());
  }

  realtimeChannel = channel
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        realtimeConnected = true;
        updateCloudSyncStatusBadge(true);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        realtimeConnected = false;
        updateCloudSyncStatusBadge(false);
      }
    });
}

// 화면 복귀 (앱 전환/잠금 해제/네트워크 복구) 시 즉각 자동 동기화 및 WakeLock 재요청
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    if (isTimerRunning) {
      enableScreenWakeLock();
    }
    if (supabaseClient) {
      loadFromSupabase();
      setupSupabaseRealtime();
    }
  }
});
let stepChartResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(stepChartResizeTimer);
  stepChartResizeTimer = setTimeout(() => { if (currentTab === 'stats') drawWeeklyStepChart(); }, 150);
});
window.addEventListener('focus', () => {
  if (supabaseClient) loadFromSupabase();
});
window.addEventListener('pageshow', () => {
  if (supabaseClient) loadFromSupabase();
});
window.addEventListener('online', () => {
  if (supabaseClient) {
    flushOutbox();
    loadFromSupabase();
    setupSupabaseRealtime();
  }
});

// --- 토스트 알림 (확인 버튼 없는 가벼운 알림) ---
function showToast(message, type = 'info') {
  let box = document.getElementById('toast-container');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-container';
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const text = String(message == null ? '' : message);
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.dataset.at = String(Date.now());
  el.innerText = text;
  el.onclick = () => el.remove();
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  const life = Math.min(6000, 2200 + text.length * 45);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 300);
  }, life);
}

// --- 저장 보관함: 전송 실패한 기록을 모아뒀다가 연결되면 순서대로 다시 보냄 ---
const SYNC_FN_NAMES = ['syncAttendanceToSupabase', 'syncStepToSupabase', 'syncWeightToSupabase', 'syncDietToSupabase', 'updateDietInSupabase', 'deleteDietFromSupabase', 'syncCheerToSupabase', 'deleteCheerFromSupabase', 'deleteDietReactionsFromSupabase', 'syncMissionToSupabase', 'syncMyMissionProgressToSupabase', 'resetMissionProgressInSupabase', 'deleteMissionFromSupabase', 'syncWishlistToSupabase', 'deleteWishlistFromSupabase', 'syncCouponToSupabase', 'syncCouponUsageToSupabase', 'deleteCouponFromSupabase', 'syncPenaltyToSupabase', 'deletePenaltyFromSupabase', 'syncPinToSupabase', 'syncConfigToSupabase', 'syncGoalWeightToSupabase', 'syncMissionResultToSupabase'];
const SYNC_FN_LABELS = {
  syncAttendanceToSupabase: '출석', syncStepToSupabase: '걸음 수', syncWeightToSupabase: '체중',
  syncDietToSupabase: '식단', updateDietInSupabase: '식단 수정', deleteDietFromSupabase: '식단 삭제',
  syncCheerToSupabase: '응원/반응', deleteCheerFromSupabase: '반응 삭제', deleteDietReactionsFromSupabase: '반응 삭제',
  syncMissionToSupabase: '미션', syncMyMissionProgressToSupabase: '미션 진행도', resetMissionProgressInSupabase: '미션 정산',
  deleteMissionFromSupabase: '미션 삭제', syncWishlistToSupabase: '위시리스트', deleteWishlistFromSupabase: '위시리스트 삭제',
  syncCouponToSupabase: '쿠폰', syncCouponUsageToSupabase: '쿠폰', deleteCouponFromSupabase: '쿠폰 삭제',
  syncPenaltyToSupabase: '벌칙', deletePenaltyFromSupabase: '벌칙 삭제', syncPinToSupabase: '설정', syncConfigToSupabase: '설정', syncGoalWeightToSupabase: '목표 체중', syncMissionResultToSupabase: '미션 결과'
};
const SYNC_ORIGINALS = {};
const OUTBOX_KEY = 'couple_fit_outbox';
let outbox = [];
let outboxFlushing = false;
let syncInFlight = 0;
let initialSyncDone = false;
let lastLoadOffline = false;
let offlineToastAt = 0;

try {
  const savedOutbox = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  if (Array.isArray(savedOutbox)) outbox = savedOutbox.filter(it => it && SYNC_FN_NAMES.includes(it.name) && Array.isArray(it.args));
} catch (e) { outbox = []; }

function persistOutbox() {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch (e) {
    // 사진처럼 큰 기록은 저장소에 못 담을 수 있음 → 앱이 켜져 있는 동안만 메모리에 보관
    try { localStorage.removeItem(OUTBOX_KEY); } catch (e2) {}
  }
  updateSyncStatus();
}

async function mustOk(query) {
  const res = await query;
  if (res && res.error) throw res.error;
  return res;
}

// 네트워크 문제(다시 보내면 될 것)인지, 서버가 거절한 것(다시 보내도 안 될 것)인지 구분
function isNetworkError(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!err) return false;
  if (err.code || err.status) return false;
  return /fetch|network|load failed|timeout|abort/i.test(String(err.message || err));
}

// 방금 띄운 '저장됐어요' 류 안내는 실제로는 실패했으니 지움 (서로 다른 말을 하는 알림이 겹치지 않게)
function dismissRecentOkToasts() {
  document.querySelectorAll('.toast.info, .toast.success').forEach(t => {
    if (Date.now() - Number(t.dataset.at || 0) < 15000) t.remove();
  });
}

function handleSyncFailure(name, args, err) {
  console.error(`sync failed: ${name}`, err);
  dismissRecentOkToasts();
  const label = SYNC_FN_LABELS[name] || '기록';
  if (isNetworkError(err)) {
    outbox.push({ name, args, at: Date.now() });
    persistOutbox();
    if (Date.now() - offlineToastAt > 8000) {
      offlineToastAt = Date.now();
      showToast('📡 연결이 불안정해서 아직 저장되지 않았어요.\n연결되면 자동으로 다시 보낼게요.', 'warn');
    }
  } else {
    showToast(`⚠️ ${label} 저장에 실패했어요. 잠시 후 다시 시도해주세요.`, 'error');
  }
}

async function runSync(name, args) {
  if (!supabaseClient) return;
  // 이미 밀린 기록이 있으면 순서를 지키기 위해 뒤에 줄 세움
  if (outbox.length > 0) {
    outbox.push({ name, args, at: Date.now() });
    persistOutbox();
    flushOutbox();
    return;
  }
  syncInFlight++;
  try {
    await SYNC_ORIGINALS[name](...args);
  } catch (err) {
    handleSyncFailure(name, args, err);
  } finally {
    syncInFlight--;
  }
}

async function flushOutbox(manual = false) {
  if (!supabaseClient || outboxFlushing || outbox.length === 0) return;
  outboxFlushing = true;
  let sent = 0;
  try {
    while (outbox.length > 0) {
      const item = outbox[0];
      try {
        await SYNC_ORIGINALS[item.name](...item.args);
        sent++;
      } catch (err) {
        if (isNetworkError(err)) break; // 아직 연결 안 됨 → 다음 기회에
        console.error(`outbox item rejected: ${item.name}`, err);
        showToast(`⚠️ ${SYNC_FN_LABELS[item.name] || '기록'} 1건은 서버에서 거절되어 저장하지 못했어요.`, 'error');
      }
      if (outbox[0] === item) outbox.shift();
      else break;
      persistOutbox();
    }
  } finally {
    outboxFlushing = false;
    updateSyncStatus();
  }
  if (outbox.length === 0 && sent > 0) {
    showToast(`✅ 밀린 기록 ${sent}건을 저장했어요.`, 'success');
    loadFromSupabase(true);
  } else if (manual && outbox.length > 0) {
    showToast('아직 연결되지 않았어요. 잠시 후 다시 시도할게요.', 'warn');
  }
}

// 헤더 아래 상태 표시: 첫 동기화 중 / 오프라인 / 저장 대기
function updateSyncStatus() {
  const el = document.getElementById('sync-status');
  if (!el) return;
  let text = '', cls = '';
  if (outbox.length > 0) {
    text = `📡 저장 대기 ${outbox.length}건 · 눌러서 다시 보내기`; cls = 'pending';
  } else if (supabaseClient && lastLoadOffline) {
    text = '📴 오프라인 · 저장해둔 기록을 보여주고 있어요'; cls = 'offline';
  } else if (supabaseClient && !initialSyncDone) {
    text = '☁️ 최신 기록 불러오는 중…'; cls = 'syncing';
  }
  el.hidden = !text;
  el.className = `sync-status ${cls}`;
  el.innerText = text;
}

// --- Supabase 개별 동기화 헬퍼 함수들 ---
async function syncAttendanceToSupabase(date, role, isCompleted) {
  if (!supabaseClient) return;
  try {
    if (isCompleted) {
      await mustOk(supabaseClient.from('attendance').upsert({
        user_role: role,
        date: date,
        workout_type: '일반 운동'
      }, { onConflict: 'user_role,date' }));
    } else {
      await mustOk(supabaseClient.from('attendance').delete().match({ date: date, user_role: role }));
    }
  } catch (e) {
    console.error('Supabase attendance sync error:', e);
    throw e;
  }
}

async function syncStepToSupabase(date, role, stepCount) {
  if (!supabaseClient) return;
  try {
    await mustOk(supabaseClient.from('step_logs').upsert({
      user_role: role,
      date: date,
      step_count: stepCount
    }, { onConflict: 'user_role,date' }));
  } catch (e) {
    console.error('Supabase step sync error:', e);
    throw e;
  }
}

async function syncWeightToSupabase(date, role, weightKg, baselineWeight) {
  if (!supabaseClient) return;
  try {
    await mustOk(supabaseClient.from('weight_logs').upsert({
      user_role: role,
      date: date,
      weight_kg: weightKg,
      baseline_weight: baselineWeight
    }, { onConflict: 'user_role,date' }));
  } catch (e) {
    console.error('Supabase weight sync error:', e);
    throw e;
  }
}

async function syncDietToSupabase(newDiet) {
  if (!supabaseClient) return;
  dietPhotoCache.set(newDiet.id, newDiet.photoUrl || null);
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newDiet.id);
    const row = {
      user_role: newDiet.role,
      date: newDiet.date,
      meal_type: newDiet.mealType,
      photo_url: newDiet.photoUrl,
      memo: newDiet.memo
    };
    if (isNumericId) row.id = newDiet.id;
    await mustOk(supabaseClient.from('diet_logs').upsert(row));
  } catch (e) {
    console.error('Supabase diet sync error:', e);
    throw e;
  }
}

async function updateDietInSupabase(dietItem) {
  if (!supabaseClient) return;
  dietPhotoCache.set(dietItem.id, dietItem.photoUrl || null);
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dietItem.id);
    if (isNumericId) {
      await mustOk(supabaseClient.from('diet_logs').update({
        meal_type: dietItem.mealType,
        photo_url: dietItem.photoUrl,
        memo: dietItem.memo
      }).eq('id', dietItem.id));
    }
  } catch (e) {
    console.error('Supabase diet update error:', e);
    throw e;
  }
}

async function deleteDietFromSupabase(dietId) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dietId);
    if (isNumericId) {
      await mustOk(supabaseClient.from('diet_logs').delete().eq('id', dietId));
    }
  } catch (e) {
    console.error('Supabase diet delete error:', e);
    throw e;
  }
}

async function syncCheerToSupabase(newCheer) {
  if (!supabaseClient) return;
  try {
    const hasUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newCheer.id || '');
    const reaction = parseDietReaction(newCheer);

    // 식단 하트/댓글: 새 구조에서는 전용 테이블에 저장
    if (reaction && dbFeatures.reactions) {
      const row = {
        diet_id: reaction.dietId,
        user_role: newCheer.sender,
        kind: reaction.text === DIET_HEART ? 'heart' : 'comment',
        body: reaction.text === DIET_HEART ? null : reaction.text.slice(0, 200)
      };
      if (hasUuid) row.id = newCheer.id;
      const { error } = await supabaseClient.from('diet_reactions').insert(row);
      // 23505 = 이미 있는 하트(중복) → 저장된 것으로 봄 / 23503 = 그 사이 식단이 지워짐 → 보낼 필요 없음
      if (error && error.code !== '23505' && error.code !== '23503') throw error;
      return;
    }

    const row = {
      sender_role: newCheer.sender,
      sender_name: newCheer.senderName,
      message: newCheer.message
    };
    // 로컬에서 만든 ID를 그대로 써야 나중에 하트 취소/댓글 삭제가 가능
    if (hasUuid) row.id = newCheer.id;
    const { error } = await supabaseClient.from('cheers').insert(row);
    if (error) throw error;
  } catch (e) {
    console.error('Supabase cheer sync error:', e);
    throw e;
  }
}

async function deleteCheerFromSupabase(cheerId) {
  if (!supabaseClient || !cheerId) return;
  try {
    if (dbFeatures.reactions) {
      const { error: rxErr } = await supabaseClient.from('diet_reactions').delete().eq('id', cheerId);
      if (rxErr) throw rxErr;
    }
    const { error } = await supabaseClient.from('cheers').delete().eq('id', cheerId);
    if (error) throw error;
  } catch (e) {
    console.error('Supabase cheer delete error:', e);
    throw e;
  }
}

// 예전 방식(cheers 에 '::diet:' 로 저장)으로 남아 있는 반응을 새 테이블로 옮기고 원본을 정리
const migratingReactionIds = new Set();
async function migrateLegacyDietReactions(legacyCheers) {
  if (!supabaseClient || !dbFeatures.reactions) return;
  for (const c of legacyCheers) {
    if (!c.id || migratingReactionIds.has(c.id)) continue;
    migratingReactionIds.add(c.id);
    const r = parseDietReaction(c);
    try {
      let done = false;
      if (r && r.text && (c.sender === 'boyfriend' || c.sender === 'girlfriend')) {
        const { error } = await supabaseClient.from('diet_reactions').insert({
          id: c.id,
          diet_id: r.dietId,
          user_role: c.sender,
          kind: r.text === DIET_HEART ? 'heart' : 'comment',
          body: r.text === DIET_HEART ? null : r.text.slice(0, 200),
          created_at: c.createdAt
        });
        // 이미 옮겨졌거나(23505), 식단이 없어졌거나(23503), ID 형식이 잘못된(22P02) 경우는 원본만 정리
        done = !error || ['23505', '23503', '22P02'].includes(error.code);
      } else {
        done = true;
      }
      if (done) await supabaseClient.from('cheers').delete().eq('id', c.id);
      else migratingReactionIds.delete(c.id);
    } catch (e) {
      migratingReactionIds.delete(c.id);
    }
  }
}

// 식단을 지우면 그 식단에 달린 하트/댓글도 함께 정리
async function deleteDietReactionsFromSupabase(dietId) {
  if (!supabaseClient || !dietId) return;
  try {
    const { error } = await supabaseClient.from('cheers').delete().like('message', `::diet:${dietId}::%`);
    if (error) throw error;
  } catch (e) {
    console.error('Supabase diet reaction delete error:', e);
    throw e;
  }
}

// 미션 제목/목표/단위/벌칙 저장 (진행도는 건드리지 않음 → 상대방 진행도 덮어쓰기 방지)
async function syncMissionToSupabase(m) {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from('missions').update({
      title: m.title,
      target_count: m.target,
      unit: m.unit,
      penalty_reward: m.penalty
    }).eq('id', m.id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      // 서버에 아직 없는 미션 → 새로 생성
      await insertMissionToSupabase(m);
    }
  } catch (e) {
    console.error('Supabase mission sync error:', e);
    throw e;
  }
}

// 서버에 미션 새로 만들기 (created_at = 이번 주 월요일 0시 → 주간 기간 표식으로 사용)
async function insertMissionToSupabase(m) {
  const row = {
    id: m.id,
    title: m.title,
    target_count: m.target,
    unit: m.unit,
    user1_progress: m.bfProgress || 0,
    user2_progress: m.gfProgress || 0,
    penalty_reward: m.penalty
  };
  // 주 시작 표식: 새 구조는 week_start 칸, 예전 구조는 created_at 을 '월요일 0시'로 맞춰 사용
  if (dbFeatures.weekStart) row.week_start = dateToStr(getWeekStartDate());
  else row.created_at = getWeekStartDate().toISOString();
  const { error } = await supabaseClient.from('missions').upsert(row);
  if (error) throw error;
}

// 내 진행도 칸만 업데이트 (오동원=user1_progress, 김해솔=user2_progress)
async function syncMyMissionProgressToSupabase(m, role) {
  m._pendingUntil = Date.now() + 6000;
  if (!supabaseClient) return;
  const column = role === 'boyfriend' ? 'user1_progress' : 'user2_progress';
  const value = role === 'boyfriend' ? m.bfProgress : m.gfProgress;
  try {
    const { data, error } = await supabaseClient.from('missions')
      .update({ [column]: value })
      .eq('id', m.id)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      await insertMissionToSupabase(m);
    }
  } catch (e) {
    console.error('Supabase mission progress sync error:', e);
    throw e;
  }
}

// 승부 정산 후 두 사람 진행도 0으로 초기화
async function resetMissionProgressInSupabase(m) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('missions')
      .update({ user1_progress: 0, user2_progress: 0 })
      .eq('id', m.id);
    if (error) throw error;
  } catch (e) {
    console.error('Supabase mission reset error:', e);
    throw e;
  }
}

// 주간 리셋 (서버 모드): missions.created_at 을 '이번 주 기간 시작(월요일 0시)' 표식으로 사용
// - 표식이 지난주 이전이면 → 진행도 0 + 표식을 이번 주로 (조건부 업데이트라 여러 기기가 동시에 실행해도 1번만 적용)
// - 이전 버전에서 만든 미션(표식 없음)이면 → 진행도는 유지하고 이번 주 표식만 붙임
async function applyWeeklyMissionResetRemote(missionRows) {
  if (!supabaseClient || !Array.isArray(missionRows)) return false;
  if (dbFeatures.weekStart) return applyWeeklyMissionResetByWeekStart(missionRows);

  // --- 예전 구조: created_at 을 '월요일 0시' 표식으로 사용 ---
  const weekStart = getWeekStartDate();
  const weekStartIso = weekStart.toISOString();
  let changed = false;

  for (const row of missionRows) {
    const ts = row.created_at ? new Date(row.created_at) : null;
    if (ts && !isNaN(ts.getTime()) && ts.getTime() >= weekStart.getTime()) continue;

    try {
      if (ts && !isNaN(ts.getTime()) && isWeekStartMoment(ts)) {
        const { data, error } = await supabaseClient.from('missions')
          .update({ user1_progress: 0, user2_progress: 0, created_at: weekStartIso })
          .eq('id', row.id)
          .lt('created_at', weekStartIso)
          .select('id');
        if (!error) changed = true;
        // 이 폰이 초기화를 실제로 수행한 경우에만 지난주 결과를 자동 정산 (두 폰이 동시에 해도 한 번만)
        if (!error && Array.isArray(data) && data.length > 0) {
          const penalty = buildAutoSettlePenalty(row.title, row.penalty_reward, row.user1_progress || 0, row.user2_progress || 0, row.unit || '');
          if (penalty) syncPenaltyToSupabase(penalty);
        }
      } else {
        let q = supabaseClient.from('missions').update({ created_at: weekStartIso }).eq('id', row.id);
        q = row.created_at ? q.eq('created_at', row.created_at) : q.is('created_at', null);
        const { error } = await q;
        if (!error) changed = true;
      }
    } catch (e) {
      console.warn('weekly mission reset warning:', e);
    }
  }
  return changed;
}

// 미션이 속한 주의 시작일(YYYY-MM-DD). week_start 칸이 비어 있으면 예전 표식(created_at)에서 읽음
function missionWeekStartOf(row) {
  if (row.week_start) return String(row.week_start).slice(0, 10);
  const ts = row.created_at ? new Date(row.created_at) : null;
  if (ts && !isNaN(ts.getTime()) && isWeekStartMoment(ts)) return dateToStr(ts);
  return null;
}

// --- 새 구조: missions.week_start 로 주간 초기화 + mission_results 에 결과 기록 ---
async function applyWeeklyMissionResetByWeekStart(missionRows) {
  const cur = dateToStr(getWeekStartDate());
  let changed = false;

  for (const row of missionRows) {
    const prev = missionWeekStartOf(row);
    if (prev && prev >= cur) {
      // 표식은 이번 주인데 칸만 비어 있으면 채워둠
      if (!row.week_start) {
        const { error } = await supabaseClient.from('missions').update({ week_start: prev }).eq('id', row.id).is('week_start', null);
        if (!error) changed = true;
      }
      continue;
    }

    try {
      if (prev) {
        // 지난주 미션 → 진행도 0 + 이번 주로. 조건부 업데이트라 두 폰이 동시에 해도 한 번만 적용됨
        let q = supabaseClient.from('missions')
          .update({ user1_progress: 0, user2_progress: 0, week_start: cur })
          .eq('id', row.id);
        q = row.week_start ? q.eq('week_start', row.week_start) : q.is('week_start', null);
        const { data, error } = await q.select('id');
        if (!error) changed = true;
        if (!error && Array.isArray(data) && data.length > 0) {
          const bf = row.user1_progress || 0, gf = row.user2_progress || 0;
          const penalty = buildAutoSettlePenalty(row.title, row.penalty_reward, bf, gf, row.unit || '');
          if (penalty) syncPenaltyToSupabase(penalty);
          if (bf > 0 || gf > 0) {
            recordMissionResult({
              mission_id: row.id,
              title: String(row.title || '').slice(0, 100),
              week_start: prev,
              bf_progress: bf,
              gf_progress: gf,
              winner_role: bf === gf ? null : (bf > gf ? 'boyfriend' : 'girlfriend'),
              penalty: String(row.penalty_reward || '').slice(0, 150)
            });
          }
        }
      } else {
        // 표식이 전혀 없는 예전 미션 → 진행도는 유지하고 이번 주부터 관리 시작
        const { error } = await supabaseClient.from('missions').update({ week_start: cur }).eq('id', row.id).is('week_start', null);
        if (!error) changed = true;
      }
    } catch (e) {
      console.warn('weekly mission reset warning:', e);
    }
  }
  return changed;
}

// 결과를 화면에 바로 반영하고 서버에 저장
function recordMissionResult(result) {
  if (!dbFeatures.results) return;
  if (!Array.isArray(store.data.missionResults)) store.data.missionResults = [];
  store.data.missionResults.push({ winner: result.winner_role });
  syncMissionResultToSupabase(result);
}

// 지난주 미션 자동 정산: 진행도가 높은 쪽이 승리, 진 쪽에게 벌칙 등록 (동점이거나 둘 다 0이면 무승부)
function buildAutoSettlePenalty(title, penaltyText, bfProgress, gfProgress, unit) {
  if (bfProgress === gfProgress) {
    if (bfProgress > 0) showToast(`🤝 지난주 '${title}' 미션은 ${bfProgress}${unit} 동점으로 무승부예요.`);
    return null;
  }
  const winner = bfProgress > gfProgress ? 'boyfriend' : 'girlfriend';
  const loser = winner === 'boyfriend' ? 'girlfriend' : 'boyfriend';
  showToast(`🏆 지난주 '${title}' 자동 정산\n${nm(winner)} 승리! (${bfProgress} : ${gfProgress})`, 'success');
  return {
    id: generateUUID(),
    title: String(penaltyText || '벌칙').slice(0, 150),
    loser,
    loserName: nmFull(loser),
    targetName: nmFull(winner),
    fromMission: `${String(title).slice(0, 70)} (자동 정산 ${bfProgress}:${gfProgress})`, // DB 칸이 100자라 제목을 잘라 넣음
    completed: false,
    completedAt: null,
    createdAt: getTodayStr()
  };
}

// 미션 전적: 미션에서 나온 벌칙 기록으로 계산 (직접 등록한 벌칙은 제외)
function getMissionRecord() {
  const rec = { boyfriend: 0, girlfriend: 0 };
  // 새 구조: 주차별 결과 기록으로 계산 (벌칙을 지워도 전적은 그대로)
  if (dbFeatures.results && Array.isArray(store.data.missionResults)) {
    store.data.missionResults.forEach(r => { if (rec[r.winner] !== undefined) rec[r.winner]++; });
    return rec;
  }
  (store.data.penalties || []).forEach(p => {
    if (!p.fromMission || p.fromMission === '직접 등록한 벌칙') return;
    if (p.loser === 'boyfriend') rec.girlfriend++;
    else if (p.loser === 'girlfriend') rec.boyfriend++;
  });
  return rec;
}

// 주간 리셋 (로컬 모드 전용)
function applyWeeklyMissionResetLocal() {
  if (supabaseClient || !Array.isArray(store.data.missions)) return;
  const weekStart = getWeekStartDate();
  let changed = false;
  store.data.missions.forEach(m => {
    const ps = m.periodStart ? new Date(m.periodStart) : null;
    if (!ps || isNaN(ps.getTime())) {
      m.periodStart = weekStart.toISOString(); // 기존 미션은 이번 주부터 관리 시작
      changed = true;
    } else if (ps.getTime() < weekStart.getTime()) {
      const penalty = buildAutoSettlePenalty(m.title, m.penalty, m.bfProgress || 0, m.gfProgress || 0, m.unit || '');
      if (penalty) store.data.penalties.unshift(penalty);
      m.bfProgress = 0;
      m.gfProgress = 0;
      m.periodStart = weekStart.toISOString();
      changed = true;
    }
  });
  if (changed) store.save();
}

async function deleteMissionFromSupabase(missionId) {
  if (!supabaseClient) return;
  try {
    await mustOk(supabaseClient.from('missions').delete().eq('id', missionId));
  } catch (e) {
    console.error('Supabase mission delete error:', e);
    throw e;
  }
}

async function syncWishlistToSupabase(item) {
  if (!supabaseClient) return;
  try {
    const row = {
      id: item.id,
      title: item.title,
      category: item.category || '기타 😋',
      author_role: item.authorRole || 'boyfriend',
      author_name: item.authorName || nmFull('boyfriend'),
      memo: item.memo || '',
      is_eaten: !!item.isEaten,
      eaten_date: item.eatenDate || null
    };
    await mustOk(supabaseClient.from('food_wishlist').upsert(row));
  } catch (e) {
    console.error('Supabase wishlist sync error:', e);
    throw e;
  }
}

async function deleteWishlistFromSupabase(id) {
  if (!supabaseClient) return;
  try {
    await mustOk(supabaseClient.from('food_wishlist').delete().eq('id', id));
  } catch (e) {
    console.error('Supabase wishlist delete error:', e);
    throw e;
  }
}

async function syncCouponToSupabase(cp) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cp.id);
    const row = {
      title: cp.title,
      required_hearts: cp.requiredHearts,
      is_unlocked: cp.unlocked,
      is_used: cp.used,
      used_at: cp.usedAt || null
    };
    if (isNumericId) row.id = cp.id;
    await mustOk(supabaseClient.from('reward_box').upsert(row));
  } catch (e) {
    console.error('Supabase coupon sync error:', e);
    throw e;
  }
}

async function syncCouponUsageToSupabase(cp) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cp.id);
    if (isNumericId) {
      await mustOk(supabaseClient.from('reward_box').update({
        is_used: cp.used,
        used_at: cp.usedAt || null
      }).eq('id', cp.id));
    }
  } catch (e) {
    console.error('Supabase coupon usage sync error:', e);
    throw e;
  }
}

async function deleteCouponFromSupabase(couponId) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(couponId);
    if (isNumericId) {
      await mustOk(supabaseClient.from('reward_box').delete().eq('id', couponId));
    }
  } catch (e) {
    console.error('Supabase coupon delete error:', e);
    throw e;
  }
}

async function syncPenaltyToSupabase(p) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
    const row = {
      title: p.title,
      loser_role: p.loser,
      loser_name: p.loserName,
      target_name: p.targetName,
      from_mission: p.fromMission || '',
      is_completed: p.completed,
      completed_at: p.completedAt || null
    };
    if (isNumericId) row.id = p.id;
    await mustOk(supabaseClient.from('penalties').upsert(row));
  } catch (e) {
    console.error('Supabase penalty sync error:', e);
    throw e;
  }
}

async function deletePenaltyFromSupabase(penaltyId) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(penaltyId);
    if (isNumericId) {
      await mustOk(supabaseClient.from('penalties').delete().eq('id', penaltyId));
    }
  } catch (e) {
    console.error('Supabase penalty delete error:', e);
    throw e;
  }
}

async function syncPinToSupabase(role, newPin) {
  if (!supabaseClient) return;
  try {
    await mustOk(supabaseClient.from('couple_pins').upsert({
      user_role: role,
      pin: String(newPin),
      updated_at: new Date().toISOString()
    }));
  } catch (err) {
    console.error('Supabase PIN sync error:', err);
    throw err;
  }
}

// --- 커플 공용 설정 (이름·사귄 날짜·걸음 목표) ---
// 별도 테이블 없이 couple_pins 테이블에 'cfg_' 로 시작하는 줄로 저장해 두 폰이 같은 값을 씀
const COUPLE_CONFIG_KEYS = ['cfg_bf_name', 'cfg_gf_name', 'cfg_dday', 'cfg_step_goal'];

function applyCoupleConfigRow(key, value) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return false;
  const c = store.data.couple;
  const before = JSON.stringify(c);
  if (key === 'cfg_bf_name') c.bfName = `${v} ${ROLE_EMOJI.boyfriend}`;
  else if (key === 'cfg_gf_name') c.gfName = `${v} ${ROLE_EMOJI.girlfriend}`;
  else if (key === 'cfg_dday' && /^\d{4}-\d{2}-\d{2}$/.test(v)) c.ddayDate = v;
  else if (key === 'cfg_step_goal' && parseInt(v, 10) > 0) c.stepGoal = parseInt(v, 10);
  return JSON.stringify(c) !== before;
}

const COUPLE_SETTINGS_COLUMNS = { cfg_bf_name: 'bf_name', cfg_gf_name: 'gf_name', cfg_dday: 'dday_date', cfg_step_goal: 'step_goal' };

async function syncConfigToSupabase(key, value) {
  if (!supabaseClient) return;
  try {
    if (dbFeatures.settings && COUPLE_SETTINGS_COLUMNS[key]) {
      const col = COUPLE_SETTINGS_COLUMNS[key];
      const val = key === 'cfg_step_goal' ? parseInt(value, 10) : String(value);
      await mustOk(supabaseClient.from('couple_settings').upsert({ id: true, [col]: val }));
      return;
    }
    await mustOk(supabaseClient.from('couple_pins').upsert({
      user_role: key,
      pin: String(value),
      updated_at: new Date().toISOString()
    }));
  } catch (err) {
    console.error('Supabase config sync error:', err);
    throw err;
  }
}

// 예전 방식(couple_pins 의 cfg_ 줄)으로 남아 있는 설정을 couple_settings 로 옮기고 원본을 정리
let migratingCoupleConfig = 0;
async function migrateLegacyCoupleConfig(rows) {
  if (!supabaseClient || !dbFeatures.settings || migratingCoupleConfig > 0) return;
  migratingCoupleConfig++;
  try {
    const patch = { id: true };
    rows.forEach(p => {
      const col = COUPLE_SETTINGS_COLUMNS[p.user_role];
      const v = String(p.pin).trim();
      if (!col || !v) return;
      if (col === 'step_goal') { const n = parseInt(v, 10); if (n >= 1000 && n <= 50000) patch[col] = n; }
      else if (col === 'dday_date') { if (/^\d{4}-\d{2}-\d{2}$/.test(v)) patch[col] = v; }
      else patch[col] = v.slice(0, 20);
    });
    const { error } = await supabaseClient.from('couple_settings').upsert(patch);
    if (!error) {
      for (const p of rows) await supabaseClient.from('couple_pins').delete().eq('user_role', p.user_role);
    }
  } catch (e) {
    console.warn('couple config migration warning:', e);
  }
  migratingCoupleConfig--;
}

// 목표 체중: 새 구조에서는 서버(user_settings)에 저장해 폰을 바꿔도 유지
let goalWeightPushedOnce = false;
async function syncGoalWeightFromServer() {
  const role = store.data.currentRole;
  const { data, error } = await supabaseClient.from('user_settings').select('*').eq('user_role', role).limit(1);
  if (error || !Array.isArray(data)) return;
  const key = 'couple_goal_weight_' + role;
  const local = getGoalWeight(role);
  try {
    if (data[0]) {
      const server = data[0].goal_weight_kg == null ? null : parseFloat(data[0].goal_weight_kg);
      if (server == null) localStorage.removeItem(key);
      else if (server !== local) localStorage.setItem(key, String(server));
    } else if (local != null && !goalWeightPushedOnce) {
      // 서버에 아직 없고 이 폰에만 있으면 한 번 올려둠
      goalWeightPushedOnce = true;
      syncGoalWeightToSupabase(role, local);
    }
  } catch (e) {}
}

async function syncGoalWeightToSupabase(role, value) {
  if (!supabaseClient || !dbFeatures.userSettings) return;
  try {
    await mustOk(supabaseClient.from('user_settings').upsert({ user_role: role, goal_weight_kg: value }));
  } catch (err) {
    console.error('Supabase goal weight sync error:', err);
    throw err;
  }
}

// 미션 주차별 결과 저장 (새 구조에서만)
async function syncMissionResultToSupabase(result) {
  if (!supabaseClient || !dbFeatures.results) return;
  try {
    await mustOk(supabaseClient.from('mission_results').insert(result));
  } catch (err) {
    console.error('Supabase mission result sync error:', err);
    throw err;
  }
}

async function refreshPinFromSupabase(role) {
  if (!supabaseClient || !role) return;
  try {
    const { data } = await supabaseClient.from('couple_pins').select('*').eq('user_role', role).maybeSingle();
    if (data && data.pin) {
      if (!store.data.pins) store.data.pins = { boyfriend: '1234', girlfriend: '1234' };
      store.data.pins[role] = String(data.pin);
      store.save();
    }
  } catch (e) {
    console.warn('refreshPin error:', e);
  }
}

async function handleResetWeightData() {
  if (confirm('저장된 모든 체중 기록(두 사람 모두)을 초기화할까요?\n* 클라우드 DB와 기기에서 체중 데이터가 완전히 삭제됩니다.')) {
    store.data.weightLogs = { boyfriend: [], girlfriend: [] };
    store.save();

    if (supabaseClient) {
      try {
        await supabaseClient.from('weight_logs').delete().neq('user_role', 'none');
      } catch (e) {
        console.error('Supabase weight reset error:', e);
      }
    }

    isWeightUnlocked = false;
    renderStatsScreen();
    showToast('체중 기록이 깨끗하게 초기화되었습니다! ✨');
    closeModal('modal-settings');
  }
}

function handleResetAppData() {
  if (confirm('기기에 저장된 모든 출석, 체중, 식단, 미션 기록을 깨끗하게 초기화할까요?')) {
    store.resetAll();
    renderHomeScreen();
    if (currentTab === 'stats') renderStatsScreen();
    if (currentTab === 'diet') renderDietScreen();
    if (currentTab === 'missions') renderMissionsScreen();
    showToast('모든 데이터가 깨끗하게 초기화되었습니다! ✨');
    closeModal('modal-settings');
  }
}

// --- 13. PIN 인증 & 프로필 전환 방어 & 체중 잠금해제 로직 ---
let activeAuthAction = null; // 'unlock_weight' | 'switch_profile'
let targetProfileForSwitch = null;
let currentPinBuffer = '';

function handleProfileSwitchClick(targetRole) {
  if (store.data.currentRole === targetRole) return;

  targetProfileForSwitch = targetRole;
  activeAuthAction = 'switch_profile';

  const roleName = nmFull(targetRole);
  const roleEmoji = targetRole === 'boyfriend' ? '🏃‍♂️' : '🐰';

  openPinAuthModal(
    `[${roleName}] 프로필 전환`,
    `본인 인증을 위해 ${roleName}의 4자리 PIN을 입력하세요`,
    roleEmoji
  );
}

function requestWeightUnlock() {
  const role = store.data.currentRole;
  activeAuthAction = 'unlock_weight';

  const roleName = nmFull(role);
  openPinAuthModal(
    `[${roleName}] 체중 잠금해제`,
    `체중 확인을 위해 본인의 4자리 PIN을 입력하세요`,
    '🔒'
  );
}

function lockWeightDisplay() {
  isWeightUnlocked = false;
  renderStatsScreen();
}

function openPinAuthModal(title, desc, icon = '🔒') {
  const targetRole = activeAuthAction === 'switch_profile' ? targetProfileForSwitch : store.data.currentRole;
  if (targetRole) {
    refreshPinFromSupabase(targetRole);
  }

  document.getElementById('pin-auth-title').innerText = title;
  document.getElementById('pin-auth-desc').innerText = desc;
  document.getElementById('pin-auth-icon').innerText = icon;
  currentPinBuffer = '';
  updatePinDots();
  openModal('modal-pin-auth');
}

function enterPinDigit(digit) {
  if (currentPinBuffer.length < 4) {
    currentPinBuffer += digit;
    updatePinDots();
    sfx.playSuccess();
    if (currentPinBuffer.length === 4) {
      setTimeout(validatePinAuth, 120);
    }
  }
}

function deletePinDigit() {
  if (currentPinBuffer.length > 0) {
    currentPinBuffer = currentPinBuffer.slice(0, -1);
    updatePinDots();
  }
}

function clearPinInput() {
  currentPinBuffer = '';
  updatePinDots();
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`pindot-${i}`);
    if (dot) {
      if (i < currentPinBuffer.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    }
  }
}

function validatePinAuth() {
  const targetRole = activeAuthAction === 'switch_profile' ? targetProfileForSwitch : store.data.currentRole;
  const correctPin = (store.data.pins && store.data.pins[targetRole]) || '1234';

  if (currentPinBuffer === correctPin) {
    closeModal('modal-pin-auth');
    currentPinBuffer = '';
    sfx.playSuccess();

    if (activeAuthAction === 'switch_profile') {
      store.data.currentRole = targetRole;
      isWeightUnlocked = false; // 프로필 전환 시 체중은 즉시 잠금 상태로 유지
      store.save();
      createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 20);
      renderHomeScreen();
      if (currentTab === 'stats') renderStatsScreen();
      if (currentTab === 'diet') renderDietScreen();
      if (currentTab === 'missions') renderMissionsScreen();
    } else if (activeAuthAction === 'unlock_weight') {
      isWeightUnlocked = true;
      renderStatsScreen();
      createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 12);
    }
  } else {
    sfx.playRest();
    showToast('비밀번호(PIN)가 일치하지 않습니다. 다시 입력해주세요! (초기 기본값: 1234)');
    clearPinInput();
  }
}

function setDeviceDefaultOwner(role) {
  localStorage.setItem('couple_device_owner', role);
  store.data.currentRole = role;
  store.save();
  renderHomeScreen();
  if (currentTab === 'stats') renderStatsScreen();
  if (currentTab === 'diet') renderDietScreen();
  if (currentTab === 'missions') renderMissionsScreen();
  showToast(`📱 이 폰의 기본 사용자를 ${nmFull(role)}(으)로 정했어요.`);
  updateProfileSwitchUI();
}

async function changeMyPin() {
  const role = store.data.currentRole;
  const roleName = nmFull(role);

  if (supabaseClient) {
    await refreshPinFromSupabase(role);
  }

  const currentPin = (store.data.pins && store.data.pins[role]) || '1234';

  const enteredCurrent = document.getElementById('pin-current-input').value.trim();
  const enteredNew = document.getElementById('pin-new-input').value.trim();
  const enteredConfirm = document.getElementById('pin-confirm-input').value.trim();

  if (enteredCurrent !== currentPin) {
    sfx.playRest();
    return showToast('현재 비밀번호가 일치하지 않습니다. (기본 초기값: 1234)');
  }

  if (!/^\d{4}$/.test(enteredNew)) {
    return showToast('새 비밀번호는 숫자 4자리로 입력해주세요!');
  }

  if (enteredNew !== enteredConfirm) {
    return showToast('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
  }

  if (!store.data.pins) store.data.pins = {};
  store.data.pins[role] = enteredNew;
  store.save();

  // 클라우드 Supabase에 즉시 동기화
  await syncPinToSupabase(role, enteredNew);

  sfx.playSuccess();
  document.getElementById('pin-current-input').value = '';
  document.getElementById('pin-new-input').value = '';
  document.getElementById('pin-confirm-input').value = '';

  showToast(`🔒 [${roleName}]의 4자리 비밀번호가 안전하게 변경되어 클라우드에 동기화되었습니다!`);
}

function saveAllAppSettings() {
  const url = document.getElementById('supabase-url-input').value.trim();
  const key = document.getElementById('supabase-key-input').value.trim();

  const reconnect = url !== store.data.supabase.url || key !== store.data.supabase.anonKey;
  store.data.supabase.url = url;
  store.data.supabase.anonKey = key;
  store.data.supabase.connected = !!(url && key);

  // 커플 정보 (바뀐 항목만 두 폰에 공유)
  const c = store.data.couple;
  const bfNameIn = (document.getElementById('cfg-bf-name').value || '').trim().slice(0, 10);
  const gfNameIn = (document.getElementById('cfg-gf-name').value || '').trim().slice(0, 10);
  const ddayIn = document.getElementById('cfg-dday').value;
  const goalIn = parseInt(document.getElementById('cfg-step-goal').value, 10);
  const changes = [];
  if (bfNameIn && bfNameIn !== nm('boyfriend')) changes.push(['cfg_bf_name', bfNameIn]);
  if (gfNameIn && gfNameIn !== nm('girlfriend')) changes.push(['cfg_gf_name', gfNameIn]);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ddayIn) && ddayIn !== c.ddayDate) {
    if (ddayIn > getTodayStr()) return showToast('사귄 날짜는 오늘 이후로 정할 수 없어요.', 'warn');
    changes.push(['cfg_dday', ddayIn]);
  }
  if (!isNaN(goalIn) && goalIn !== c.stepGoal) {
    if (goalIn < 1000 || goalIn > 50000) return showToast('걸음 목표는 1,000~50,000 사이로 입력해주세요.', 'warn');
    changes.push(['cfg_step_goal', goalIn]);
  }
  changes.forEach(([k, v]) => applyCoupleConfigRow(k, v));
  store.save();

  if (reconnect) initSupabase();
  changes.forEach(([k, v]) => syncConfigToSupabase(k, v));

  applyNamesToDom();
  renderHomeScreen();
  if (currentTab === 'stats') renderStatsScreen();
  if (currentTab === 'diet') renderDietScreen();
  if (currentTab === 'missions') renderMissionsScreen();
  showToast('설정을 저장했어요 ✨', 'success');
  closeModal('modal-settings');
}

// --- 14. Application Initialization ---
// 모든 동기화 함수를 보관함 래퍼로 감쌈 (호출하는 쪽 코드는 그대로)
SYNC_FN_NAMES.forEach(name => {
  if (typeof window[name] !== 'function') return;
  SYNC_ORIGINALS[name] = window[name];
  window[name] = (...args) => runSync(name, args);
});

document.addEventListener('DOMContentLoaded', () => {
  // 기기 기본 사용자 불러오기
  const savedOwner = localStorage.getItem('couple_device_owner');
  if (savedOwner === 'boyfriend' || savedOwner === 'girlfriend') {
    store.data.currentRole = savedOwner;
  }

  seedDietPhotoCacheFromStore();
  updateSyncStatus();
  initSupabase();

  // 설정 모달 열릴 때 초기값 채우기
  const suUrlInput = document.getElementById('supabase-url-input');
  const suKeyInput = document.getElementById('supabase-key-input');
  if (suUrlInput) suUrlInput.value = store.data.supabase.url || '';
  if (suKeyInput) suKeyInput.value = store.data.supabase.anonKey || '';

  // 기기 소유자 라디오 버튼 동기화
  const ownerRadios = document.getElementsByName('device-owner-role');
  for (let r of ownerRadios) {
    if (r.value === store.data.currentRole) r.checked = true;
  }

  // 2. 탭 내비게이션 바인딩
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // 3. 식단 식사 구분 칩 바인딩
  document.querySelectorAll('.meal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.meal-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedMealType = chip.getAttribute('data-type');
    });
  });

  // 4. 달력 월 이동 바인딩
  const prevMonthBtn = document.getElementById('btn-prev-month');
  const nextMonthBtn = document.getElementById('btn-next-month');
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
      renderCalendar();
    });
  }
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
      renderCalendar();
    });
  }

  // 5. 초기 화면 렌더링
  switchTab('home');
});
