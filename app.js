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
    gfName: '김해솔 🐰'
  },
  supabase: {
    url: 'https://phrquhzdmssheveiyvei.supabase.co',
    anonKey: 'sb_publishable_T-fLfm7ATY-3Vec4ZjS24Q_DtACNgqK',
    connected: false
  },
  pins: {
    boyfriend: '1234',
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
      id: 'e1a2b3c4-d5e6-4789-8012-3456789abcde',
      title: '이번 주 5일 걷기/러닝 달성하기 👟',
      target: 5,
      unit: '일',
      bfProgress: 0,
      gfProgress: 0,
      penalty: '진 사람이 주말에 달콤한 디저트 사주기 🍰'
    },
    {
      id: 'f2b3c4d5-e6f7-4890-9123-456789abcdef',
      title: '스쿼트 총 200개 채우기 🏋️',
      target: 200,
      unit: '개',
      bfProgress: 0,
      gfProgress: 0,
      penalty: '진 사람이 10분 어깨 마사지해주기 💆'
    }
  ],
  cheers: [],
  penalties: [
    {
      id: 'p1a2b3c4-d5e6-4789-8012-3456789abcde',
      title: '진 사람이 주말에 달콤한 디저트 사주기 🍰',
      loser: 'boyfriend',
      loserName: '오동원 🏃‍♂️',
      targetName: '김해솔 🐰',
      fromMission: '이번 주 5일 걷기/러닝 달성하기 👟',
      completed: false,
      completedAt: null,
      createdAt: '2025-10-20'
    }
  ],
  coupons: [
    { id: 'c1a2b3c4-d5e6-4789-8012-3456789abcde', title: '☕ 스타벅스 커피 & 조각케이크 쿠폰', requiredHearts: 5, unlocked: false, used: false },
    { id: 'c2b3c4d5-e6f7-4890-9123-456789abcdef', title: '🥩 치팅데이 삼겹살/오마카세 데이트권', requiredHearts: 12, unlocked: false, used: false },
    { id: 'c3c4d5e6-f7a8-4901-0234-56789abcdef0', title: '💆 주말 전신 힐링 마사지 30분권', requiredHearts: 20, unlocked: false, used: false },
    { id: 'c4d5e6f7-a8b9-4012-1345-6789abcdef01', title: '🎬 영화관 VIP 팝콘 세트 데이트권', requiredHearts: 30, unlocked: false, used: false }
  ],
  foodWishlist: [
    {
      id: 'w1a2b3c4-d5e6-4789-8012-3456789abcde',
      title: '연남동 숙성 삼겹살 & 김치말이국수 🥩',
      category: '고기/구이 🥩',
      authorRole: 'boyfriend',
      authorName: '오동원 🏃‍♂️',
      memo: '다이어트 끝나고 첫 번째 치팅데이 1순위!',
      isEaten: false,
      eatenDate: null,
      createdAt: '2025-10-20'
    },
    {
      id: 'w2b3c4d5-e6f7-4890-9123-456789abcdef',
      title: '망원동 소금빵 & 생딸기 생크림 케이크 🍓🍰',
      category: '디저트/카페 🍰',
      authorRole: 'girlfriend',
      authorName: '김해솔 🐰',
      memo: '해솔이가 찜해둔 달콤한 디저트 맛집',
      isEaten: false,
      eatenDate: null,
      createdAt: '2025-10-20'
    }
  ]
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
      data.couple = {
        ...data.couple,
        ddayDate: '2026-06-13',
        bfName: '오동원 🏃‍♂️',
        gfName: '김해솔 🐰'
      };
      if (!Array.isArray(data.penalties)) data.penalties = [];
      if (!Array.isArray(data.coupons)) data.coupons = [];
      if (!Array.isArray(data.foodWishlist)) data.foodWishlist = [];
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
      localStorage.setItem('couple_fit_data', JSON.stringify(this.data));
    } catch (e) {
      console.error('Save failed:', e);
    }
  }
  cleanSampleData() {
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
      this.save();
    }
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
function formatKoreanDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m)}월 ${parseInt(d)}일`;
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
  if (ddayEl) ddayEl.innerText = calculateDday(store.data.couple.ddayDate);

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

  // 스트릭 계산 (연속 출석일수)
  for (let i = 0; i < 60; i++) {
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
  if (weeklyRateEl) weeklyRateEl.innerText = `${weeklyRate}% (${weekSuccessCount}/7일)`;
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

function toggleDateAttendance(dateStr, e) {
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

  syncAttendanceToSupabase(dateStr, role, newVal);
  renderHomeScreen();
}

function toggleTodayAttendance(e) {
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

  syncAttendanceToSupabase(today, role, newVal);
  renderHomeScreen();
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
  if (titleEl) titleEl.innerText = titleMap[target] || '📅 날짜 선택';

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
  }

  closeModal('modal-custom-datepicker');
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
}

function updateStepUI() {
  const lbl = document.getElementById('step-date-label');
  if (lbl) lbl.innerText = formatDatePretty(selectedStepDate);

  const role = store.data.currentRole;
  const data = store.data.stepLogs[selectedStepDate] || { boyfriend: 0, girlfriend: 0 };
  const stepInput = document.getElementById('step-input');
  if (stepInput) stepInput.value = data[role] > 0 ? data[role] : '';
}

function updateWeightUI() {
  const lbl = document.getElementById('weight-date-label');
  if (lbl) lbl.innerText = formatDatePretty(selectedWeightDate);

  const role = store.data.currentRole;
  const list = store.data.weightLogs[role] || [];
  const existing = list.find(item => item.date === selectedWeightDate);
  const weightInput = document.getElementById('weight-input');
  if (weightInput) weightInput.value = existing ? existing.weight : '';
}

function updateDietInputUI() {
  const lbl = document.getElementById('diet-date-label');
  if (lbl) lbl.innerText = formatDatePretty(selectedDietDate);
}

// --- 8. Stats Screen Rendering (비밀번호 보안 잠금) ---
let isWeightUnlocked = false;

function renderStatsScreen() {
  const role = store.data.currentRole;
  const partnerRole = role === 'boyfriend' ? 'girlfriend' : 'boyfriend';

  updateStepUI();
  updateWeightUI();
  drawWeeklyStepChart();

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
    partnerNameLabel.innerText = `${role === 'boyfriend' ? '김해솔 🐰' : '오동원 🏃‍♂️'}의 체중 변화 추이`;
  }

  // 본인 체중: 잠금 상태 제어
  if (isWeightUnlocked) {
    if (lockedView) lockedView.style.display = 'none';
    if (unlockedView) unlockedView.style.display = 'flex';

    if (myLatest) {
      if (myWeightDisplay) myWeightDisplay.innerText = `${myLatest.weight} kg`;
      const diff = (myLatest.weight - myLatest.baseline).toFixed(1);
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      if (myDeltaDisplay) myDeltaDisplay.innerText = `시작 대비 ${sign} kg (${diff <= 0 ? '감량 성공 중! 👏' : '유지 중'})`;
    } else {
      if (myWeightDisplay) myWeightDisplay.innerText = `- kg`;
      if (myDeltaDisplay) myDeltaDisplay.innerText = `체중을 기록해보세요`;
    }
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
        <div style="font-size:1.15rem; font-weight:800; color:#2E7D32; margin-top:4px;">
          시작 대비 <span style="font-size:1.35rem;">${pSign} kg</span> 변화 중! ✨
        </div>
        <div style="font-size:0.75rem; color:#66BB6A; margin-top:4px;">
          🔒 프라이버시 보호: 실제 체중 숫자는 어떤 경우에도 상대방에게 노출되지 않습니다.
        </div>
      `;
    }
  } else {
    if (partnerDeltaDisplay) partnerDeltaDisplay.innerText = `파트너의 기록을 기다리는 중이에요`;
  }
}

function saveStepLog() {
  const val = parseInt(document.getElementById('step-input').value, 10);
  if (isNaN(val) || val < 0) return alert('올바른 걸음 수를 입력해주세요!');

  const targetDate = selectedStepDate || getTodayStr();
  const role = store.data.currentRole;

  if (!store.data.stepLogs[targetDate]) store.data.stepLogs[targetDate] = { boyfriend: 0, girlfriend: 0 };
  store.data.stepLogs[targetDate][role] = val;
  store.save();

  syncStepToSupabase(targetDate, role, val);

  sfx.playSuccess();
  alert(`${formatDatePretty(targetDate)} 걸음 수가 저장되었습니다! 👟`);
  renderStatsScreen();
}

function saveWeightLog() {
  const val = parseFloat(document.getElementById('weight-input').value);
  if (isNaN(val) || val <= 20 || val >= 250) return alert('올바른 체중(kg)을 입력해주세요!');

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
  syncWeightToSupabase(targetDate, role, val, baseline);

  sfx.playSuccess();
  document.getElementById('weight-input').value = '';
  alert(`${formatDatePretty(targetDate)} 비공개 체중이 기록되었습니다! 상대방에게는 변화량만 공유됩니다. 🔒`);
  renderStatsScreen();
}

function drawWeeklyStepChart() {
  const canvas = document.getElementById('weekly-step-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(getDateOffsetStr(-i));
  }

  const barWidth = 14;
  const gap = (w - 40) / 7;
  const maxStep = 12000;

  // 가이드라인
  ctx.strokeStyle = '#F0EAE6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, h - 30);
  ctx.lineTo(w - 20, h - 30);
  ctx.stroke();

  days.forEach((dStr, idx) => {
    const data = store.data.stepLogs[dStr] || { boyfriend: 0, girlfriend: 0 };
    const xCenter = 30 + idx * gap;

    const bfHeight = Math.min((data.boyfriend / maxStep) * (h - 60), h - 60);
    const gfHeight = Math.min((data.girlfriend / maxStep) * (h - 60), h - 60);

    // 오빠 막대 (Blue)
    ctx.fillStyle = '#64B5F6';
    ctx.beginPath();
    ctx.roundRect(xCenter - barWidth - 2, h - 30 - bfHeight, barWidth, bfHeight, [4, 4, 0, 0]);
    ctx.fill();

    // 자기 막대 (Pink)
    ctx.fillStyle = '#FF85A1';
    ctx.beginPath();
    ctx.roundRect(xCenter + 2, h - 30 - gfHeight, barWidth, gfHeight, [4, 4, 0, 0]);
    ctx.fill();

    // 날짜 레이블
    const dateObj = new Date(dStr);
    const dayLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    ctx.fillStyle = '#8E8A98';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(dayLabel, xCenter, h - 12);
  });
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
    filterLabel.innerText = selectedDietFilterDate ? formatDatePretty(selectedDietFilterDate) : '모든 날짜 보기';
  }

  let logs = [...store.data.dietLogs].reverse();

  if (selectedDietFilterDate) {
    logs = logs.filter(item => item.date === selectedDietFilterDate);
  }

  if (logs.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 24px 10px; color: var(--text-muted); font-size: 0.85rem;">
        ${selectedDietFilterDate ? `📅 <b>${formatDatePretty(selectedDietFilterDate)}</b>에 등록된 식단 일기가 없어요.` : `🥗 아직 등록된 식단 일기가 없어요.<br>먹은 맛있는 식사를 사진과 함께 남겨보세요!`}
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
        <img src="${item.photoUrl}" class="diet-thumb" onclick="openPhotoLightbox('${item.id}')" title="사진 확대 및 다운로드" alt="식단 사진" />
      ` : `
        <div class="diet-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.8rem;cursor:default;">🍽️</div>
      `}
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; background:${badgeColor}; padding:2px 8px; border-radius:12px; font-weight:700;">
            ${authorName} · ${item.mealType}
          </span>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:0.72rem; color:var(--text-light);">${formatKoreanDate(item.date)}</span>
            <div class="diet-actions">
              <button class="icon-btn" style="width:24px; height:24px; font-size:0.7rem;" onclick="openEditDietModal('${item.id}')" title="수정">✏️</button>
              <button class="icon-btn" style="width:24px; height:24px; font-size:0.7rem;" onclick="deleteDietLog('${item.id}')" title="삭제">🗑️</button>
            </div>
          </div>
        </div>
        <p style="font-size:0.88rem; font-weight:600; color:var(--text-main); margin-top:6px; line-height:1.4;">
          ${item.memo || '맛있게 건강하게 식사 완료! 😋'}
        </p>
      </div>
    `;
    container.appendChild(card);
  });
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
      <div style="font-weight:800; font-size:0.95rem; margin-bottom:2px;">${authorName} · ${item.mealType} (${formatKoreanDate(item.date)})</div>
      <div style="font-size:0.82rem; opacity:0.9;">${item.memo || ''}</div>
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
      const maxW = 800;
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
      currentDietEditPhoto = canvas.toDataURL('image/jpeg', 0.8);

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

function saveEditedDietLog() {
  const editId = document.getElementById('diet-edit-id').value;
  const item = store.data.dietLogs.find(d => d.id === editId);
  if (!item) return;

  const memo = document.getElementById('diet-edit-memo').value.trim();
  item.memo = memo || `${editSelectedMealType} 식사 기록`;
  item.mealType = editSelectedMealType;
  if (currentDietEditPhoto) item.photoUrl = currentDietEditPhoto;

  store.save();
  updateDietInSupabase(item);

  sfx.playSuccess();
  closeModal('modal-diet-edit');
  renderDietScreen();
  alert('식단 일기가 성공적으로 수정되었습니다! 🥗');
}

function deleteDietLog(dietId) {
  if (confirm('이 식단 일기를 삭제하시겠습니까?')) {
    store.data.dietLogs = store.data.dietLogs.filter(d => d.id !== dietId);
    store.save();
    deleteDietFromSupabase(dietId);
    sfx.playSuccess();
    renderDietScreen();
  }
}

function handleDietPhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      // 사진 압축 (Canvas 이용 - 용량 절약)
      const canvas = document.createElement('canvas');
      const maxW = 800;
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
      currentPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.8);

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

function saveDietLog() {
  const memo = document.getElementById('diet-memo-input').value.trim();
  if (!currentPhotoDataUrl && !memo) {
    return alert('식단 사진을 등록하거나 한 줄 소감을 입력해주세요!');
  }

  const targetDate = selectedDietDate || getTodayStr();

  const newLog = {
    id: 'd_' + Date.now(),
    role: store.data.currentRole,
    date: targetDate,
    mealType: selectedMealType,
    photoUrl: currentPhotoDataUrl,
    memo: memo || `${selectedMealType} 식사 기록`,
    createdAt: new Date().toISOString()
  };

  store.data.dietLogs.push(newLog);
  store.save();
  syncDietToSupabase(newLog);

  sfx.playSuccess();
  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 16);

  // 초기화
  currentPhotoDataUrl = null;
  document.getElementById('diet-memo-input').value = '';
  document.getElementById('diet-preview-img').style.display = 'none';
  document.getElementById('diet-upload-text').style.display = 'block';

  alert(`${formatDatePretty(targetDate)} 식단 일기가 등록되었습니다! 🥗`);
  renderDietScreen();
}

// --- 9. Feature 5, 6, 7: Missions, Penalties, Cheers, Reward Box ---
let currentMissionSubTab = 'missions'; // 'missions' | 'penalties'
let currentPenaltyFilter = 'pending'; // 'pending' | 'completed'
let currentCouponSubTab = 'available'; // 'available' | 'history'

function switchMissionSubTab(subTab) {
  currentMissionSubTab = subTab;
  const mBtn = document.getElementById('mission-tab-active');
  const pBtn = document.getElementById('mission-tab-penalty');
  const mView = document.getElementById('missions-active-view');
  const pView = document.getElementById('penalties-view');

  if (subTab === 'missions') {
    if (mBtn) mBtn.classList.add('active');
    if (pBtn) pBtn.classList.remove('active');
    if (mView) mView.style.display = 'block';
    if (pView) pView.style.display = 'none';
  } else {
    if (mBtn) mBtn.classList.remove('active');
    if (pBtn) pBtn.classList.add('active');
    if (mView) mView.style.display = 'none';
    if (pView) pView.style.display = 'block';
  }
  renderMissionsScreen();
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

  // 1. 진행 중인 미션 리스트 렌더링
  const missionContainer = document.getElementById('missions-list');
  if (missionContainer) {
    missionContainer.innerHTML = '';
    if (store.data.missions.length === 0) {
      missionContainer.innerHTML = `
        <div style="text-align:center; padding:24px 10px; color:var(--text-muted); font-size:0.85rem;">
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

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-weight:700; font-size:0.95rem; color:var(--text-main);">${m.title}</span>
                ${isGoalReached ? `<span style="background:#E8F5E9; color:#2E7D32; font-size:0.7rem; font-weight:800; padding:2px 6px; border-radius:4px;">🎉 목표 도달!</span>` : ''}
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">목표: ${m.target}${m.unit}</div>
            </div>
            <div style="display:flex; gap:4px;">
              <button class="icon-btn" style="width:26px; height:26px; font-size:0.75rem;" onclick="openEditMissionModal('${m.id}')" title="수정">✏️</button>
              <button class="icon-btn" style="width:26px; height:26px; font-size:0.75rem;" onclick="deleteMission('${m.id}')" title="삭제">🗑️</button>
            </div>
          </div>
          
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700; margin-top:10px;">
            <span style="color:#1976D2;">🏃‍♂️ 오동원: ${m.bfProgress}/${m.target}${m.unit}</span>
            <span style="color:#D81B60;">🐰 김해솔: ${m.gfProgress}/${m.target}${m.unit}</span>
          </div>
          
          <div class="mission-progress-bar-bg">
            <div class="mission-bar-bf" style="width: ${bfPct / 2}%;"></div>
            <div class="mission-bar-gf" style="width: ${gfPct / 2}%;"></div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; flex-wrap:wrap; gap:6px;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="penalty-tag">벌칙: ${m.penalty}</span>
              <button class="btn-primary" style="padding:3px 8px; font-size:0.72rem; background:linear-gradient(135deg, #FFB74D, #FF9800);" onclick="openSettleMissionModal('${m.id}')">🏆 승부 정산</button>
            </div>
            <div style="display:flex; gap:4px; align-items:center;">
              ${m.target >= 20 ? `
                <button class="btn-primary" style="padding:4px 6px; font-size:0.72rem; background:#ECEFF1; color:#37474F; box-shadow:none;" onclick="incrementMission('${m.id}', -10)">-10</button>
                <button class="btn-primary" style="padding:4px 8px; font-size:0.72rem;" onclick="incrementMission('${m.id}', 10)">+10</button>
                <button class="btn-primary" style="padding:4px 8px; font-size:0.72rem;" onclick="incrementMission('${m.id}', 50)">+50</button>
              ` : `
                <button class="btn-primary" style="padding:4px 6px; font-size:0.75rem; background:#ECEFF1; color:#37474F; box-shadow:none;" onclick="incrementMission('${m.id}', -1)">-1</button>
                <button class="btn-primary" style="padding:4px 10px; font-size:0.75rem;" onclick="incrementMission('${m.id}', 1)">+1 ${m.unit}</button>
              `}
              <button class="btn-primary" style="padding:4px 8px; font-size:0.72rem; background:#ECEFF1; color:#37474F; box-shadow:none;" onclick="promptCustomMissionAmount('${m.id}')">✏️ 직접입력</button>
            </div>
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

  // 4. 칭찬 피드
  const cheerContainer = document.getElementById('cheer-messages-list');
  if (cheerContainer) {
    cheerContainer.innerHTML = '';
    if (store.data.cheers.length === 0) {
      cheerContainer.innerHTML = `
        <div style="text-align:center; padding:16px 10px; color:var(--text-muted); font-size:0.82rem;">
          💌 아직 주고받은 응원 메시지가 없어요.<br>위 입력창에 달콤한 응원 한마디를 남겨보세요!
        </div>
      `;
    } else {
      store.data.cheers.slice(-5).reverse().forEach(c => {
        const msgBox = document.createElement('div');
        msgBox.className = 'cheer-msg-card';
        msgBox.innerHTML = `
          <div>
            <span style="font-weight:700; color:${c.sender === 'boyfriend' ? '#1976D2' : '#D81B60'};">${c.senderName}</span>:
            <span>${c.message}</span>
          </div>
          <span style="font-size:0.7rem; color:var(--text-light);">${c.time}</span>
        `;
        cheerContainer.appendChild(msgBox);
      });
    }
  }

  // 4. 보상 상자 (하트 누적 쿠폰)
  renderCouponList();
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
        <div style="text-align:center; padding:24px 10px; color:var(--text-muted); font-size:0.85rem;">
          🎉 현재 수행 대기 중인 벌칙이 없어요!<br>미션 승부를 정산하거나 <b>'+ 벌칙 추가'</b>로 재미있는 벌칙을 걸어보세요.
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:24px 10px; color:var(--text-muted); font-size:0.85rem;">
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
      ? `<span class="penalty-user-badge bf">🏃‍♂️ 오동원 (수행자)</span>`
      : `<span class="penalty-user-badge gf">🐰 김해솔 (수행자)</span>`;
    
    const targetBadge = isBfLoser
      ? `<span class="penalty-user-badge gf">🐰 김해솔에게</span>`
      : `<span class="penalty-user-badge bf">🏃‍♂️ 오동원에게</span>`;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
            ${loserBadge}
            <span style="font-size:0.75rem; color:var(--text-light);">➔</span>
            ${targetBadge}
          </div>
          <div style="font-weight:800; font-size:0.95rem; color:var(--text-main); margin-top:4px;">
            ${p.title}
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
            ${p.fromMission ? `계기: ${p.fromMission} • ` : ''}등록: ${p.createdAt || '최근'}
            ${p.completed ? ` • <b style="color:#2E7D32;">✅ ${p.completedAt || '수행 완료'}</b>` : ''}
          </div>
        </div>
        <div style="display:flex; gap:4px;">
          <button class="icon-btn" style="width:26px; height:26px; font-size:0.75rem;" onclick="openEditPenaltyModal('${p.id}')" title="수정">✏️</button>
          <button class="icon-btn" style="width:26px; height:26px; font-size:0.75rem;" onclick="deletePenalty('${p.id}')" title="삭제">🗑️</button>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:10px; gap:6px;">
        ${!p.completed ? `
          <button class="btn-primary" style="padding:5px 12px; font-size:0.78rem; background:linear-gradient(135deg, #4CAF50, #43A047);" onclick="togglePenaltyComplete('${p.id}', true)">
            수행 완료! 🎉
          </button>
        ` : `
          <button class="btn-primary" style="padding:4px 10px; font-size:0.72rem; background:#ECEFF1; color:#455A64; box-shadow:none;" onclick="togglePenaltyComplete('${p.id}', false)">
            되돌리기 ↩️
          </button>
        `}
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
      <div style="font-weight:800; font-size:0.92rem; color:var(--text-main); margin-bottom:4px;">${m.title}</div>
      <div style="color:var(--text-muted); font-size:0.78rem;">
        🏃‍♂️ 오동원: <b>${m.bfProgress}${m.unit}</b> vs 🐰 김해솔: <b>${m.gfProgress}${m.unit}</b> (목표: ${m.target}${m.unit})
      </div>
      <div style="color:#E65100; font-size:0.78rem; font-weight:700; margin-top:4px;">
        패자 벌칙: ${m.penalty}
      </div>
    `;
  }
  openModal('modal-mission-settle');
}

function confirmSettleWinner(winnerRole) {
  const missionId = document.getElementById('settle-mission-id').value;
  const m = store.data.missions.find(item => item.id === missionId);
  if (!m) return;

  const loserRole = winnerRole === 'boyfriend' ? 'girlfriend' : 'boyfriend';
  const loserName = loserRole === 'boyfriend' ? store.data.couple.bfName : store.data.couple.gfName;
  const winnerName = winnerRole === 'boyfriend' ? store.data.couple.bfName : store.data.couple.gfName;

  // 벌칙 등록
  const newPenalty = {
    id: 'p_' + Date.now(),
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

  // 미션 진행률 리셋 (다음 라운드 시작)
  m.bfProgress = 0;
  m.gfProgress = 0;
  store.save();

  syncPenaltyToSupabase(newPenalty);
  syncMissionProgressToSupabase(m);

  closeModal('modal-mission-settle');
  sfx.playSuccess();
  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 25);
  alert(`🎉 ${winnerName} 승리!\n'${loserName}'에게 [${m.penalty}] 벌칙이 부여되었습니다! 🏆`);

  // 벌칙 탭으로 자동 이동
  switchMissionSubTab('penalties');
  setPenaltyFilter('pending');
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

function savePenaltyData() {
  const editId = document.getElementById('penalty-edit-id').value;
  const title = document.getElementById('penalty-title-input').value.trim();
  const fromMission = document.getElementById('penalty-from-input').value.trim();

  let loser = 'boyfriend';
  const radios = document.getElementsByName('penalty-loser');
  for (let r of radios) {
    if (r.checked) loser = r.value;
  }

  if (!title) return alert('벌칙 내용을 입력해주세요!');

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
      id: 'p_' + Date.now(),
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
  if (targetP) syncPenaltyToSupabase(targetP);

  sfx.playSuccess();
  closeModal('modal-penalty-edit');
  renderMissionsScreen();
}

function deletePenalty(penaltyId) {
  if (confirm('이 벌칙을 삭제하시겠습니까?')) {
    store.data.penalties = store.data.penalties.filter(item => item.id !== penaltyId);
    store.save();
    deletePenaltyFromSupabase(penaltyId);
    renderMissionsScreen();
  }
}

function togglePenaltyComplete(penaltyId, markAsCompleted) {
  const p = store.data.penalties.find(item => item.id === penaltyId);
  if (!p) return;

  p.completed = markAsCompleted;
  p.completedAt = markAsCompleted ? getTodayStr() : null;
  store.save();
  syncPenaltyToSupabase(p);

  if (markAsCompleted) {
    sfx.playSuccess();
    createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 20);
    alert(`👏 벌칙 [${p.title}] 수행이 완료되었습니다!`);
  }
  renderMissionsScreen();
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

function saveMissionData() {
  const editId = document.getElementById('mission-edit-id').value;
  const title = document.getElementById('mission-title-input').value.trim();
  const target = parseInt(document.getElementById('mission-target-input').value, 10);
  const unit = document.getElementById('mission-unit-input').value.trim() || '회';
  const penalty = document.getElementById('mission-penalty-input').value.trim() || '진 사람이 맛있는 거 사주기 😋';

  if (!title) return alert('미션 제목을 입력해주세요!');
  if (isNaN(target) || target <= 0) return alert('올바른 목표 수치를 입력해주세요!');

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
      penalty
    };
    store.data.missions.push(newMission);
  }

  store.save();
  const targetM = editId ? store.data.missions.find(item => item.id === editId) : store.data.missions[store.data.missions.length - 1];
  if (targetM) syncMissionToSupabase(targetM);

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
  syncMissionProgressToSupabase(m);

  sfx.playSuccess();
  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 10);
  renderMissionsScreen();
}

function promptCustomMissionAmount(missionId) {
  const m = store.data.missions.find(item => item.id === missionId);
  if (!m) return;

  const role = store.data.currentRole;
  const roleName = role === 'boyfriend' ? '오동원 🏃‍♂️' : '김해솔 🐰';
  const currentVal = role === 'boyfriend' ? (m.bfProgress || 0) : (m.gfProgress || 0);
  const input = prompt(`[${m.title}]\n${roleName}의 진행 수량을 입력하세요:\n- 숫자를 바로 입력 (예: 50 입력 시 50으로 변경)\n- 또는 +10, -5 형태로 입력 시 가감됩니다. (현재: ${currentVal}/${m.target}${m.unit})`, `${currentVal}`);

  if (input !== null && input.trim() !== '') {
    const trimmed = input.trim();
    if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
      const delta = parseInt(trimmed, 10);
      if (!isNaN(delta)) {
        incrementMission(missionId, delta);
      }
    } else {
      const exact = parseInt(trimmed, 10);
      if (!isNaN(exact) && exact >= 0) {
        if (role === 'boyfriend') {
          m.bfProgress = exact;
        } else {
          m.gfProgress = exact;
        }
        store.save();
        syncMissionProgressToSupabase(m);
        sfx.playSuccess();
        createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 10);
        renderMissionsScreen();
      }
    }
  }
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

function saveWishlistData() {
  const editId = document.getElementById('wishlist-edit-id').value;
  const title = document.getElementById('wishlist-title-input').value.trim();
  const memo = document.getElementById('wishlist-memo-input').value.trim();
  const category = selectedWishlistCategory || '기타 😋';

  if (!title) return alert('음식 또는 맛집 이름을 입력해주세요!');

  if (!store.data.foodWishlist) store.data.foodWishlist = [];

  const role = store.data.currentRole;
  const roleName = role === 'boyfriend' ? '오동원 🏃‍♂️' : '김해솔 🐰';

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
  if (targetItem) syncWishlistToSupabase(targetItem);

  sfx.playSuccess();
  closeModal('modal-wishlist-edit');
  renderWishlist();
}

function toggleWishlistEaten(id) {
  if (!store.data.foodWishlist) store.data.foodWishlist = [];
  const item = store.data.foodWishlist.find(w => w.id === id);
  if (!item) return;

  item.isEaten = !item.isEaten;
  item.eatenDate = item.isEaten ? getTodayStr() : null;

  store.save();
  syncWishlistToSupabase(item);

  if (item.isEaten) {
    sfx.playSuccess();
    createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 25);
    alert(`🎉 '${item.title}' 정복 완료!\n다이어트 목표 달성을 축하합니다! 🍽️✨`);
  } else {
    sfx.playBeep();
  }

  renderWishlist();
}

function deleteWishlist(id) {
  if (confirm('이 위시리스트 항목을 삭제하시겠습니까?')) {
    if (!store.data.foodWishlist) store.data.foodWishlist = [];
    store.data.foodWishlist = store.data.foodWishlist.filter(w => w.id !== id);
    store.save();
    deleteWishlistFromSupabase(id);
    renderWishlist();
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
      <div style="text-align:center; padding:24px 10px; color:var(--text-muted); font-size:0.85rem;">
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
    const authorColor = isGf ? '#D81B60' : '#1976D2';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span class="wishlist-tag">${item.category || '기타 😋'}</span>
          <span style="font-size:0.72rem; font-weight:700; color:${authorColor};">${item.authorName || (isGf ? '김해솔 🐰' : '오동원 🏃‍♂️')} 픽</span>
        </div>
        <div style="display:flex; gap:4px;">
          <button class="icon-btn" style="width:26px; height:26px; font-size:0.75rem;" onclick="openEditWishlistModal('${item.id}')" title="수정">✏️</button>
          <button class="icon-btn" style="width:26px; height:26px; font-size:0.75rem;" onclick="deleteWishlist('${item.id}')" title="삭제">🗑️</button>
        </div>
      </div>

      <div style="font-size:0.95rem; font-weight:800; color:var(--text-main);">
        ${item.title}
      </div>

      ${item.memo ? `<div style="font-size:0.75rem; color:var(--text-muted); background:#F8F9FA; padding:6px 10px; border-radius:8px;">📝 ${item.memo}</div>` : ''}

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
        <span style="font-size:0.7rem; color:var(--text-light);">
          ${item.isEaten ? `🎉 ${item.eatenDate || ''} 정복 완료` : '😋 다이어트 종료 대기 중'}
        </span>
        <button class="btn-primary" style="padding:6px 12px; font-size:0.75rem; ${item.isEaten ? 'background:#ECEFF1; color:#546E7A; box-shadow:none;' : 'background:linear-gradient(135deg, #FF7043, #F4511E);'}" onclick="toggleWishlistEaten('${item.id}')">
          ${item.isEaten ? '↩️ 다시 가고 싶어요' : '🍽️ 정복 완료 체크!'}
        </button>
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
  if (!text) return alert('응원할 메시지를 입력해주세요! 🥰');

  sendCheerMessage(text);
  input.value = '';
}

function sendCheerMessage(msgText) {
  const role = store.data.currentRole;
  const senderName = role === 'boyfriend' ? store.data.couple.bfName : store.data.couple.gfName;

  const now = new Date();
  const timeStr = `${now.getHours() >= 12 ? '오후' : '오전'} ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newCheer = {
    id: 'c_' + Date.now(),
    sender: role,
    senderName,
    message: msgText,
    time: timeStr
  };
  store.data.cheers.push(newCheer);
  store.save();
  syncCheerToSupabase(newCheer);

  sfx.playSuccess();
  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 20);
  renderMissionsScreen();
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
  if (heartCountEl) heartCountEl.innerText = `현재 모은 커플 하트: 💖 ${totalHearts}개`;

  const filteredCoupons = store.data.coupons.filter(cp => currentCouponSubTab === 'history' ? cp.used : !cp.used);

  if (filteredCoupons.length === 0) {
    if (currentCouponSubTab === 'available') {
      container.innerHTML = `
        <div style="text-align:center; padding:20px 10px; color:var(--text-muted); font-size:0.85rem;">
          🎁 보유 중인 데이트 쿠폰이 없어요.<br>우측 상단 <b>'+ 쿠폰 만들기'</b>로 새로운 목표를 세워보세요!
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:20px 10px; color:var(--text-muted); font-size:0.85rem;">
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
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:0.92rem; font-weight:800; color:var(--text-main);">${cp.title}</div>
          <div style="display:flex; gap:2px; margin-right:8px;">
            <button class="icon-btn" style="width:24px; height:24px; font-size:0.7rem;" onclick="openEditCouponModal('${cp.id}')" title="수정">✏️</button>
            <button class="icon-btn" style="width:24px; height:24px; font-size:0.7rem;" onclick="deleteCoupon('${cp.id}')" title="삭제">🗑️</button>
          </div>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
          ${cp.used ? `
            <span style="color:#2E7D32; font-weight:700;">🎉 ${cp.usedAt || '최근'} 사용 완료</span>
          ` : `
            필요 하트: 💖 ${cp.requiredHearts}개 (${isReady ? '잠금 해제 완료!' : `앞으로 ${cp.requiredHearts - totalHearts}개 남음`})
          `}
        </div>
      </div>
      <div>
        ${cp.used
          ? `<button class="coupon-btn" style="background:#ECEFF1; color:#455A64; box-shadow:none; padding:5px 10px; font-size:0.72rem;" onclick="restoreCoupon('${cp.id}')">되돌리기 ↩️</button>`
          : isReady
            ? `<button class="coupon-btn" onclick="useCoupon('${cp.id}')">사용하기 🎁</button>`
            : `<button class="coupon-btn locked" style="background:#B0BEC5; cursor:not-allowed;">🔒 잠김</button>`
        }
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

function saveCouponData() {
  const editId = document.getElementById('coupon-edit-id').value;
  const title = document.getElementById('coupon-title-input').value.trim();
  const requiredHearts = parseInt(document.getElementById('coupon-hearts-input').value, 10);

  if (!title) return alert('쿠폰 이름을 입력해주세요!');
  if (isNaN(requiredHearts) || requiredHearts <= 0) return alert('올바른 필요 하트 개수를 입력해주세요!');

  if (editId) {
    const cp = store.data.coupons.find(item => item.id === editId);
    if (cp) {
      cp.title = title;
      cp.requiredHearts = requiredHearts;
    }
  } else {
    const newCoupon = {
      id: 'cp_' + Date.now(),
      title,
      requiredHearts,
      unlocked: false,
      used: false
    };
    store.data.coupons.push(newCoupon);
  }

  store.save();
  const targetCp = editId ? store.data.coupons.find(item => item.id === editId) : store.data.coupons[store.data.coupons.length - 1];
  if (targetCp) syncCouponToSupabase(targetCp);

  sfx.playSuccess();
  closeModal('modal-coupon-edit');
  renderMissionsScreen();
}

function deleteCoupon(couponId) {
  if (confirm('이 보상 쿠폰을 삭제하시겠습니까?')) {
    store.data.coupons = store.data.coupons.filter(item => item.id !== couponId);
    store.save();
    deleteCouponFromSupabase(couponId);
    renderMissionsScreen();
  }
}

function useCoupon(couponId) {
  const cp = store.data.coupons.find(c => c.id === couponId);
  if (!cp) return;

  if (confirm(`'${cp.title}' 데이트 쿠폰을 사용하시겠습니까? 🥰`)) {
    cp.used = true;
    cp.usedAt = getTodayStr();
    store.save();
    syncCouponUsageToSupabase(cp);
    sfx.playSuccess();
    createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 25);
    renderMissionsScreen();
  }
}

function restoreCoupon(couponId) {
  const cp = store.data.coupons.find(c => c.id === couponId);
  if (!cp) return;

  if (confirm(`'${cp.title}' 쿠폰을 다시 보유 중인 쿠폰으로 되돌리시겠습니까?`)) {
    cp.used = false;
    delete cp.usedAt;
    store.save();
    syncCouponUsageToSupabase(cp);
    renderMissionsScreen();
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
    if (currentPhase === 'ready') {
      phaseEl.innerText = '준비 완료 (시작을 눌러주세요)';
      phaseEl.style.color = '#8E8A98';
      phaseEl.style.background = '#F5F5F5';
    } else if (currentPhase === 'work') {
      phaseEl.innerText = '🔥 열정 달리기 / 운동 중!';
      phaseEl.classList.add('work');
    } else if (currentPhase === 'rest') {
      phaseEl.innerText = '🍃 숨고르기 / 가볍게 걷기';
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
  alert('🎉 홈트 & 러닝 완료! 오늘 운동 출석 도장이 자동으로 찍혔습니다! 💖');
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

  if (totalWork <= 0) return alert('운동 시간은 최소 1초 이상이어야 합니다!');
  if (totalRest < 0) return alert('숨고르기 시간을 확인해주세요!');

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
  if (modal) modal.classList.add('active');
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// --- 12. Supabase Cloud Backend & Realtime Synchronization ---
let supabaseClient = null;

function initSupabase() {
  const url = store.data.supabase.url;
  const key = store.data.supabase.anonKey;

  if (url && key && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      console.log('✅ Supabase Cloud Connected!');
      updateCloudSyncStatusBadge(true);
      setupSupabaseRealtime();
      loadFromSupabase();
    } catch (e) {
      console.error('Supabase init error:', e);
      updateCloudSyncStatusBadge(false);
    }
  } else {
    updateCloudSyncStatusBadge(false);
  }
}

function updateCloudSyncStatusBadge(isConnected) {
  const badge = document.getElementById('cloud-sync-status');
  if (badge) {
    if (isConnected) {
      badge.innerHTML = '☁️ 실시간 연동 중';
      badge.style.color = '#2E7D32';
      badge.style.background = '#E8F5E9';
    } else {
      badge.innerHTML = '💾 로컬 모드 (Supabase 미연동)';
      badge.style.color = '#E65100';
      badge.style.background = '#FFF3E0';
    }
  }
}

async function loadFromSupabase() {
  if (!supabaseClient) return;
  try {
    // 1. 출석 불러오기
    const { data: attList } = await supabaseClient.from('attendance').select('*');
    if (attList && attList.length > 0) {
      attList.forEach(item => {
        if (!store.data.attendance[item.date]) {
          store.data.attendance[item.date] = { boyfriend: false, girlfriend: false };
        }
        if (item.user_role === 'boyfriend') store.data.attendance[item.date].boyfriend = true;
        if (item.user_role === 'girlfriend') store.data.attendance[item.date].girlfriend = true;
      });
    }

    // 2. 걸음 수 불러오기
    const { data: stepList } = await supabaseClient.from('step_logs').select('*');
    if (stepList && stepList.length > 0) {
      stepList.forEach(s => {
        if (!store.data.stepLogs[s.date]) store.data.stepLogs[s.date] = { boyfriend: 0, girlfriend: 0 };
        store.data.stepLogs[s.date][s.user_role] = s.step_count;
      });
    }

    // 3. 체중 기록 불러오기
    const { data: weightList } = await supabaseClient.from('weight_logs').select('*').order('date', { ascending: true });
    if (weightList && weightList.length > 0) {
      store.data.weightLogs.boyfriend = weightList
        .filter(w => w.user_role === 'boyfriend')
        .map(w => ({ date: w.date, weight: Number(w.weight_kg), baseline: Number(w.baseline_weight) }));
      store.data.weightLogs.girlfriend = weightList
        .filter(w => w.user_role === 'girlfriend')
        .map(w => ({ date: w.date, weight: Number(w.weight_kg), baseline: Number(w.baseline_weight) }));
    }

    // 4. 식단 불러오기
    const { data: dietList } = await supabaseClient.from('diet_logs').select('*').order('created_at', { ascending: true });
    if (dietList && dietList.length > 0) {
      store.data.dietLogs = dietList.map(d => ({
        id: d.id,
        role: d.user_role,
        date: d.date,
        mealType: d.meal_type,
        photoUrl: d.photo_url,
        memo: d.memo,
        createdAt: d.created_at
      }));
    }

    // 5. 칭찬 불러오기
    const { data: cheerList } = await supabaseClient.from('cheers').select('*').order('created_at', { ascending: true });
    if (cheerList && cheerList.length > 0) {
      store.data.cheers = cheerList.map(c => ({
        id: c.id,
        sender: c.sender_role,
        senderName: c.sender_name,
        message: c.message,
        time: new Date(c.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      }));
    }

    // 6. 미션 불러오기
    const { data: missionList } = await supabaseClient.from('missions').select('*');
    if (missionList && missionList.length > 0) {
      store.data.missions = missionList.map(m => ({
        id: m.id,
        title: m.title,
        target: m.target_count,
        unit: m.unit || '회',
        bfProgress: m.user1_progress || 0,
        gfProgress: m.user2_progress || 0,
        penalty: m.penalty_reward
      }));
    }

    // 7. 보상 쿠폰 불러오기
    const { data: couponList } = await supabaseClient.from('reward_box').select('*');
    if (couponList && couponList.length > 0) {
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
    const { data: penaltyList } = await supabaseClient.from('penalties').select('*').order('created_at', { ascending: false });
    if (penaltyList && penaltyList.length > 0) {
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

    // 9. 커플 PIN 비밀번호 불러오기
    try {
      const { data: pinList } = await supabaseClient.from('couple_pins').select('*');
      if (pinList && pinList.length > 0) {
        if (!store.data.pins) store.data.pins = { boyfriend: '1234', girlfriend: '1234' };
        pinList.forEach(p => {
          if (p.user_role && p.pin) {
            store.data.pins[p.user_role] = String(p.pin);
          }
        });
      }
    } catch (e) {
      console.warn('couple_pins fetch warning:', e);
    }

    // 10. 먹방 위시리스트 불러오기
    try {
      const { data: wishList } = await supabaseClient.from('food_wishlist').select('*').order('created_at', { ascending: false });
      if (wishList && wishList.length > 0) {
        store.data.foodWishlist = wishList.map(w => ({
          id: w.id,
          title: w.title,
          category: w.category || '기타 😋',
          authorRole: w.author_role || 'boyfriend',
          authorName: w.author_name || (w.author_role === 'girlfriend' ? '김해솔 🐰' : '오동원 🏃‍♂️'),
          memo: w.memo || '',
          isEaten: !!w.is_eaten,
          eatenDate: w.eaten_date || null,
          createdAt: w.created_at
        }));
      }
    } catch (e) {
      console.warn('food_wishlist fetch warning:', e);
    }

    store.save();
    renderHomeScreen();
    if (currentTab === 'stats') renderStatsScreen();
    if (currentTab === 'diet') renderDietScreen();
    if (currentTab === 'missions') renderMissionsScreen();
  } catch (err) {
    console.error('Supabase load error:', err);
  }
}

// --- 13. System Push Notifications (Web Notification API) ---
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return alert('이 브라우저는 알림 기능을 지원하지 않습니다.');
  }

  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      sfx.playSuccess();
      showSystemNotification('🔔 Couple Fit 알림 활성화!', '상대방이 운동을 완료하거나 응원을 보낼 때 알림을 받습니다.');
      const btn = document.getElementById('btn-enable-notify');
      if (btn) btn.style.color = '#FF5E7E';
    } else {
      alert('알림 권한이 거부되었습니다. 기기 설정에서 알림을 허용해주세요.');
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

  // 모든 핵심 테이블 실시간 구독
  supabaseClient
    .channel('couple_realtime_all')
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
      loadFromSupabase();
      const currentRole = store.data.currentRole;
      if (payload.new && payload.new.user_role !== currentRole) {
        const partnerName = currentRole === 'boyfriend' ? store.data.couple.gfName : store.data.couple.bfName;
        showSystemNotification('🥗 새 식단 일기 등록!', `${partnerName}님이 맛있는 식단 사진을 올렸어요.`);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cheers' }, (payload) => {
      loadFromSupabase();
      createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 20);
      const currentRole = store.data.currentRole;
      if (payload.new && payload.new.sender_role !== currentRole) {
        showSystemNotification(`💌 ${payload.new.sender_name}의 응원 도착!`, payload.new.message);
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
        if (!store.data.pins) store.data.pins = { boyfriend: '1234', girlfriend: '1234' };
        store.data.pins[payload.new.user_role] = String(payload.new.pin);
        store.save();
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'food_wishlist' }, () => {
      loadFromSupabase();
    })
    .subscribe();
}

// --- Supabase 개별 동기화 헬퍼 함수들 ---
async function syncAttendanceToSupabase(date, role, isCompleted) {
  if (!supabaseClient) return;
  try {
    if (isCompleted) {
      await supabaseClient.from('attendance').upsert({
        user_role: role,
        date: date,
        workout_type: '일반 운동'
      }, { onConflict: 'user_role,date' });
    } else {
      await supabaseClient.from('attendance').delete().match({ date: date, user_role: role });
    }
  } catch (e) {
    console.error('Supabase attendance sync error:', e);
  }
}

async function syncStepToSupabase(date, role, stepCount) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('step_logs').upsert({
      user_role: role,
      date: date,
      step_count: stepCount
    }, { onConflict: 'user_role,date' });
  } catch (e) {
    console.error('Supabase step sync error:', e);
  }
}

async function syncWeightToSupabase(date, role, weightKg, baselineWeight) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('weight_logs').upsert({
      user_role: role,
      date: date,
      weight_kg: weightKg,
      baseline_weight: baselineWeight
    }, { onConflict: 'user_role,date' });
  } catch (e) {
    console.error('Supabase weight sync error:', e);
  }
}

async function syncDietToSupabase(newDiet) {
  if (!supabaseClient) return;
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
    await supabaseClient.from('diet_logs').upsert(row);
  } catch (e) {
    console.error('Supabase diet sync error:', e);
  }
}

async function updateDietInSupabase(dietItem) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dietItem.id);
    if (isNumericId) {
      await supabaseClient.from('diet_logs').update({
        meal_type: dietItem.mealType,
        photo_url: dietItem.photoUrl,
        memo: dietItem.memo
      }).eq('id', dietItem.id);
    }
  } catch (e) {
    console.error('Supabase diet update error:', e);
  }
}

async function deleteDietFromSupabase(dietId) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dietId);
    if (isNumericId) {
      await supabaseClient.from('diet_logs').delete().eq('id', dietId);
    }
  } catch (e) {
    console.error('Supabase diet delete error:', e);
  }
}

async function syncCheerToSupabase(newCheer) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('cheers').insert({
      sender_role: newCheer.sender,
      sender_name: newCheer.senderName,
      message: newCheer.message
    });
  } catch (e) {
    console.error('Supabase cheer sync error:', e);
  }
}

async function syncMissionToSupabase(m) {
  if (!supabaseClient) return;
  try {
    const row = {
      id: m.id,
      title: m.title,
      target_count: m.target,
      unit: m.unit,
      user1_progress: m.bfProgress,
      user2_progress: m.gfProgress,
      penalty_reward: m.penalty
    };
    await supabaseClient.from('missions').upsert(row);
  } catch (e) {
    console.error('Supabase mission sync error:', e);
  }
}

async function syncMissionProgressToSupabase(m) {
  if (!supabaseClient) return;
  try {
    const row = {
      id: m.id,
      title: m.title,
      target_count: m.target,
      unit: m.unit,
      user1_progress: m.bfProgress,
      user2_progress: m.gfProgress,
      penalty_reward: m.penalty
    };
    await supabaseClient.from('missions').upsert(row);
  } catch (e) {
    console.error('Supabase mission progress sync error:', e);
  }
}

async function deleteMissionFromSupabase(missionId) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('missions').delete().eq('id', missionId);
  } catch (e) {
    console.error('Supabase mission delete error:', e);
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
      author_name: item.authorName || '오동원 🏃‍♂️',
      memo: item.memo || '',
      is_eaten: !!item.isEaten,
      eaten_date: item.eatenDate || null
    };
    await supabaseClient.from('food_wishlist').upsert(row);
  } catch (e) {
    console.error('Supabase wishlist sync error:', e);
  }
}

async function deleteWishlistFromSupabase(id) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('food_wishlist').delete().eq('id', id);
  } catch (e) {
    console.error('Supabase wishlist delete error:', e);
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
    await supabaseClient.from('reward_box').upsert(row);
  } catch (e) {
    console.error('Supabase coupon sync error:', e);
  }
}

async function syncCouponUsageToSupabase(cp) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cp.id);
    if (isNumericId) {
      await supabaseClient.from('reward_box').update({
        is_used: cp.used,
        used_at: cp.usedAt || null
      }).eq('id', cp.id);
    }
  } catch (e) {
    console.error('Supabase coupon usage sync error:', e);
  }
}

async function deleteCouponFromSupabase(couponId) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(couponId);
    if (isNumericId) {
      await supabaseClient.from('reward_box').delete().eq('id', couponId);
    }
  } catch (e) {
    console.error('Supabase coupon delete error:', e);
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
    await supabaseClient.from('penalties').upsert(row);
  } catch (e) {
    console.error('Supabase penalty sync error:', e);
  }
}

async function deletePenaltyFromSupabase(penaltyId) {
  if (!supabaseClient) return;
  try {
    const isNumericId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(penaltyId);
    if (isNumericId) {
      await supabaseClient.from('penalties').delete().eq('id', penaltyId);
    }
  } catch (e) {
    console.error('Supabase penalty delete error:', e);
  }
}

async function syncPinToSupabase(role, newPin) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('couple_pins').upsert({
      user_role: role,
      pin: String(newPin),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Supabase PIN sync error:', err);
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
  if (confirm('저장된 모든 체중 기록(오동원 & 김해솔)을 초기화할까요?\n* 클라우드 DB와 기기에서 체중 데이터가 완전히 삭제됩니다.')) {
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
    alert('체중 기록이 깨끗하게 초기화되었습니다! ✨');
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
    alert('모든 데이터가 깨끗하게 초기화되었습니다! ✨');
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

  const roleName = targetRole === 'boyfriend' ? '오동원 🏃‍♂️' : '김해솔 🐰';
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

  const roleName = role === 'boyfriend' ? '오동원 🏃‍♂️' : '김해솔 🐰';
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
    alert('비밀번호(PIN)가 일치하지 않습니다. 다시 입력해주세요! (초기 기본값: 1234)');
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
  alert(`📱 이 기기의 기본 사용자가 '${role === 'boyfriend' ? '오동원 🏃‍♂️' : '김해솔 🐰'}'으로 고정되었습니다!`);
}

async function changeMyPin() {
  const role = store.data.currentRole;
  const roleName = role === 'boyfriend' ? '오동원 🏃‍♂️' : '김해솔 🐰';

  if (supabaseClient) {
    await refreshPinFromSupabase(role);
  }

  const currentPin = (store.data.pins && store.data.pins[role]) || '1234';

  const enteredCurrent = document.getElementById('pin-current-input').value.trim();
  const enteredNew = document.getElementById('pin-new-input').value.trim();
  const enteredConfirm = document.getElementById('pin-confirm-input').value.trim();

  if (enteredCurrent !== currentPin) {
    sfx.playRest();
    return alert('현재 비밀번호가 일치하지 않습니다. (기본 초기값: 1234)');
  }

  if (!/^\d{4}$/.test(enteredNew)) {
    return alert('새 비밀번호는 숫자 4자리로 입력해주세요!');
  }

  if (enteredNew !== enteredConfirm) {
    return alert('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
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

  alert(`🔒 [${roleName}]의 4자리 비밀번호가 안전하게 변경되어 클라우드에 동기화되었습니다!`);
}

function saveAllAppSettings() {
  const url = document.getElementById('supabase-url-input').value.trim();
  const key = document.getElementById('supabase-key-input').value.trim();

  store.data.supabase.url = url;
  store.data.supabase.anonKey = key;
  store.data.supabase.connected = !!(url && key);
  store.save();

  initSupabase();
  alert('설정이 안전하게 저장되었습니다! ✨');
  closeModal('modal-settings');
}

// --- 14. Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // 기기 기본 사용자 불러오기
  const savedOwner = localStorage.getItem('couple_device_owner');
  if (savedOwner === 'boyfriend' || savedOwner === 'girlfriend') {
    store.data.currentRole = savedOwner;
  }

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
