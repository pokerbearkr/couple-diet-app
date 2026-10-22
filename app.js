/**
 * ========================================================
 * 커플 다이어트 & 운동 메이트 (Couple Fit) - Full Application Logic
 * ========================================================
 */

// --- 1. Audio Synthesizer (Web Audio API for Timer & Cheer Chimes) ---
class SoundEffects {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
  }
  playBeep(freq = 520, duration = 0.15, type = 'sine') {
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.log('Audio error:', e);
    }
  }
  playSuccess() {
    this.playBeep(523.25, 0.12); // C5
    setTimeout(() => this.playBeep(659.25, 0.12), 120); // E5
    setTimeout(() => this.playBeep(783.99, 0.25), 240); // G5
  }
  playRest() {
    this.playBeep(440, 0.18, 'triangle');
    setTimeout(() => this.playBeep(349.23, 0.25, 'triangle'), 180);
  }
}
const sfx = new SoundEffects();

// --- 2. Initial State & Local Storage Data Store ---
const DEFAULT_STATE = {
  currentRole: 'boyfriend', // 'boyfriend' | 'girlfriend'
  couple: {
    code: 'LOVE-2026',
    ddayDate: '2026-06-13',
    bfName: '오동원 🏃‍♂️',
    gfName: '김해솔 🐰'
  },
  supabase: {
    url: '',
    anonKey: '',
    connected: false
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
      id: 'm1',
      title: '이번 주 5일 걷기/러닝 달성하기 👟',
      target: 5,
      unit: '일',
      bfProgress: 0,
      gfProgress: 0,
      penalty: '진 사람이 주말에 달콤한 디저트 사주기 🍰'
    },
    {
      id: 'm2',
      title: '스쿼트 총 200개 채우기 🏋️',
      target: 200,
      unit: '개',
      bfProgress: 0,
      gfProgress: 0,
      penalty: '진 사람이 10분 어깨 마사지해주기 💆'
    }
  ],
  cheers: [],
  coupons: [
    { id: 'cp1', title: '☕ 스타벅스 커피 & 조각케이크 쿠폰', requiredHearts: 5, unlocked: false, used: false },
    { id: 'cp2', title: '🥩 치팅데이 삼겹살/오마카세 데이트권', requiredHearts: 12, unlocked: false, used: false },
    { id: 'cp3', title: '💆 주말 전신 힐링 마사지 30분권', requiredHearts: 20, unlocked: false, used: false },
    { id: 'cp4', title: '🎬 영화관 VIP 팝콘 세트 데이트권', requiredHearts: 30, unlocked: false, used: false }
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

  // 빈 칸 추가
  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'calendar-cell';
    blank.style.background = 'transparent';
    container.appendChild(blank);
  }

  // 날짜 채우기
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'calendar-cell' + (dateStr === todayStr ? ' today' : '');

    const dateNum = document.createElement('span');
    dateNum.className = 'calendar-date-num';
    dateNum.innerText = d;
    cell.appendChild(dateNum);

    const stampsBox = document.createElement('div');
    stampsBox.className = 'calendar-stamps';

    const att = store.data.attendance[dateStr];
    if (att) {
      if (att.boyfriend && att.girlfriend) {
        // 둘 다 완료 -> 💖 반짝이는 하트!
        const heart = document.createElement('span');
        heart.className = 'stamp-heart';
        heart.innerText = '💖';
        stampsBox.appendChild(heart);
      } else {
        if (att.boyfriend) {
          const bfDot = document.createElement('span');
          bfDot.className = 'stamp-dot stamp-bf';
          bfDot.title = '오동원 운동 완료';
          stampsBox.appendChild(bfDot);
        }
        if (att.girlfriend) {
          const gfDot = document.createElement('span');
          gfDot.className = 'stamp-dot stamp-gf';
          gfDot.title = '김해솔 운동 완료';
          stampsBox.appendChild(gfDot);
        }
      }
    }

    cell.appendChild(stampsBox);
    container.appendChild(cell);
  }
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

// --- 7. Feature 2 & 3: Stats (Steps & Weight) Logic ---
function renderStatsScreen() {
  const role = store.data.currentRole;
  const partnerRole = role === 'boyfriend' ? 'girlfriend' : 'boyfriend';
  const today = getTodayStr();

  // 날짜 선택기 기본값 세팅
  const stepDateInput = document.getElementById('step-date-input');
  if (stepDateInput && !stepDateInput.value) stepDateInput.value = today;

  const weightDateInput = document.getElementById('weight-date-input');
  if (weightDateInput && !weightDateInput.value) weightDateInput.value = today;

  // 선택된 날짜의 걸음 수 표시
  onStepDateChange();

  // 주간 걸음 수 비교 차트 (Canvas)
  drawWeeklyStepChart();

  // 체중 기록 섹션 (프라이버시 중심)
  const myLogs = store.data.weightLogs[role] || [];
  const partnerLogs = store.data.weightLogs[partnerRole] || [];

  const myLatest = myLogs[myLogs.length - 1];
  const partnerLatest = partnerLogs[partnerLogs.length - 1];

  const myWeightDisplay = document.getElementById('my-weight-display');
  const myDeltaDisplay = document.getElementById('my-delta-display');
  const partnerDeltaDisplay = document.getElementById('partner-delta-display');
  const partnerNameLabel = document.getElementById('partner-weight-label');

  if (partnerNameLabel) {
    partnerNameLabel.innerText = `${role === 'boyfriend' ? '김해솔 🐰' : '오동원 🏃‍♂️'}의 체중 변화 추이`;
  }

  if (myLatest) {
    if (myWeightDisplay) myWeightDisplay.innerText = `${myLatest.weight} kg`;
    const diff = (myLatest.weight - myLatest.baseline).toFixed(1);
    const sign = diff > 0 ? `+${diff}` : `${diff}`;
    if (myDeltaDisplay) myDeltaDisplay.innerText = `시작 대비 ${sign} kg (${diff <= 0 ? '감량 성공 중! 👏' : '유지 중'})`;
  } else {
    if (myWeightDisplay) myWeightDisplay.innerText = `- kg`;
    if (myDeltaDisplay) myDeltaDisplay.innerText = `체중을 기록해보세요`;
  }

  // 상대방 체중은 '절대 숫자'를 숨기고 '변화량만' 표시
  if (partnerLatest) {
    const pDiff = (partnerLatest.weight - partnerLatest.baseline).toFixed(1);
    const pSign = pDiff > 0 ? `+${pDiff}` : `${pDiff}`;
    if (partnerDeltaDisplay) {
      partnerDeltaDisplay.innerHTML = `
        <div style="font-size:1.15rem; font-weight:800; color:#2E7D32; margin-top:4px;">
          시작 대비 <span style="font-size:1.35rem;">${pSign} kg</span> 변화 중! ✨
        </div>
        <div style="font-size:0.78rem; color:#66BB6A; margin-top:4px;">
          🔒 프라이버시 보호: 실제 체중 숫자는 비공개 처리됩니다.
        </div>
      `;
    }
  } else {
    if (partnerDeltaDisplay) partnerDeltaDisplay.innerText = `파트너의 기록을 기다리는 중이에요`;
  }
}

function onStepDateChange() {
  const dateInput = document.getElementById('step-date-input');
  const targetDate = (dateInput && dateInput.value) || getTodayStr();
  const role = store.data.currentRole;

  const data = store.data.stepLogs[targetDate] || { boyfriend: 0, girlfriend: 0 };
  const stepInput = document.getElementById('step-input');
  if (stepInput) {
    stepInput.value = data[role] > 0 ? data[role] : '';
  }
}

function onWeightDateChange() {
  const dateInput = document.getElementById('weight-date-input');
  const targetDate = (dateInput && dateInput.value) || getTodayStr();
  const role = store.data.currentRole;

  const list = store.data.weightLogs[role] || [];
  const existing = list.find(item => item.date === targetDate);
  const weightInput = document.getElementById('weight-input');
  if (weightInput) {
    weightInput.value = existing ? existing.weight : '';
  }
}

function saveStepLog() {
  const val = parseInt(document.getElementById('step-input').value, 10);
  if (isNaN(val) || val < 0) return alert('올바른 걸음 수를 입력해주세요!');

  const dateInput = document.getElementById('step-date-input');
  const targetDate = (dateInput && dateInput.value) || getTodayStr();

  if (!store.data.stepLogs[targetDate]) store.data.stepLogs[targetDate] = { boyfriend: 0, girlfriend: 0 };
  store.data.stepLogs[targetDate][store.data.currentRole] = val;
  store.save();

  sfx.playSuccess();
  alert(`${formatKoreanDate(targetDate)} 걸음 수가 저장되었습니다! 👟`);
  renderStatsScreen();
}

function saveWeightLog() {
  const val = parseFloat(document.getElementById('weight-input').value);
  if (isNaN(val) || val <= 20 || val >= 250) return alert('올바른 체중(kg)을 입력해주세요!');

  const role = store.data.currentRole;
  const dateInput = document.getElementById('weight-date-input');
  const targetDate = (dateInput && dateInput.value) || getTodayStr();
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
  alert(`${formatKoreanDate(targetDate)} 비공개 체중이 기록되었습니다! 상대방에게는 변화량만 공유됩니다. 🔒`);
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

function renderDietScreen() {
  const container = document.getElementById('diet-timeline');
  if (!container) return;
  container.innerHTML = '';

  // 업로드 날짜 선택기 기본값 세팅
  const dietDateInput = document.getElementById('diet-date-input');
  if (dietDateInput && !dietDateInput.value) dietDateInput.value = getTodayStr();

  // 날짜 필터 확인
  const filterInput = document.getElementById('diet-filter-date');
  const filterDate = filterInput ? filterInput.value : '';

  let logs = [...store.data.dietLogs].reverse();

  if (filterDate) {
    logs = logs.filter(item => item.date === filterDate);
  }

  if (logs.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 30px 10px; color: var(--text-muted); font-size: 0.85rem;">
        ${filterDate ? `📅 <b>${formatKoreanDate(filterDate)}</b>에 등록된 식단 일기가 없어요.` : `🥗 아직 등록된 식단 일기가 없어요.<br>먹은 맛있는 식사를 사진과 함께 남겨보세요!`}
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
      ${item.photoUrl ? `<img src="${item.photoUrl}" class="diet-thumb" alt="식단 사진" />` : `<div class="diet-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.8rem;">🍽️</div>`}
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; background:${badgeColor}; padding:2px 8px; border-radius:12px; font-weight:700;">
            ${authorName} · ${item.mealType}
          </span>
          <span style="font-size:0.72rem; color:var(--text-light);">${formatKoreanDate(item.date)}</span>
        </div>
        <p style="font-size:0.88rem; font-weight:600; color:var(--text-main); margin-top:6px; line-height:1.4;">
          ${item.memo || '맛있게 건강하게 식사 완료! 😋'}
        </p>
      </div>
    `;
    container.appendChild(card);
  });
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
  const filterInput = document.getElementById('diet-filter-date');
  if (filterInput) filterInput.value = '';
  renderDietScreen();
}

function saveDietLog() {
  const memo = document.getElementById('diet-memo-input').value.trim();
  if (!currentPhotoDataUrl && !memo) {
    return alert('식단 사진을 등록하거나 한 줄 메모를 입력해주세요!');
  }

  const dateInput = document.getElementById('diet-date-input');
  const targetDate = (dateInput && dateInput.value) || getTodayStr();

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

  sfx.playSuccess();
  // 초기화
  currentPhotoDataUrl = null;
  document.getElementById('diet-memo-input').value = '';
  document.getElementById('diet-preview-img').style.display = 'none';
  document.getElementById('diet-upload-text').style.display = 'block';

  alert(`${formatKoreanDate(targetDate)} 식단 사진 일기가 등록되었습니다! 🥗`);
  renderDietScreen();
}

// --- 9. Feature 5, 6, 7: Missions, Cheers, Reward Box ---
function renderMissionsScreen() {
  // 1. 미션 리스트
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

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">${m.title}</div>
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
            <span class="penalty-tag">벌칙: ${m.penalty}</span>
            <div style="display:flex; gap:4px; align-items:center;">
              ${m.target >= 20 ? `
                <button class="btn-primary" style="padding:4px 8px; font-size:0.72rem;" onclick="incrementMission('${m.id}', 10)">+10</button>
                <button class="btn-primary" style="padding:4px 8px; font-size:0.72rem;" onclick="incrementMission('${m.id}', 50)">+50</button>
              ` : `
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

  // 2. 칭찬 피드
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

  // 3. 보상 상자 (하트 누적 쿠폰)
  renderCouponList();
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
      id: 'm_' + Date.now(),
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
  sfx.playSuccess();
  closeModal('modal-mission-edit');
  renderMissionsScreen();
}

function deleteMission(missionId) {
  if (confirm('이 주간 미션을 삭제하시겠습니까?')) {
    store.data.missions = store.data.missions.filter(item => item.id !== missionId);
    store.save();
    renderMissionsScreen();
  }
}

function incrementMission(missionId, amount = 1) {
  const m = store.data.missions.find(item => item.id === missionId);
  if (!m) return;

  const role = store.data.currentRole;
  if (role === 'boyfriend') {
    m.bfProgress = Math.max(0, m.bfProgress + amount);
  } else {
    m.gfProgress = Math.max(0, m.gfProgress + amount);
  }

  store.save();
  sfx.playSuccess();
  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 10);
  renderMissionsScreen();
}

function promptCustomMissionAmount(missionId) {
  const m = store.data.missions.find(item => item.id === missionId);
  if (!m) return;

  const role = store.data.currentRole;
  const currentVal = role === 'boyfriend' ? m.bfProgress : m.gfProgress;
  const input = prompt(`[${m.title}]\n추가할 수량을 입력하세요 (현재: ${currentVal}/${m.target}${m.unit})`, '20');

  if (input !== null) {
    const amount = parseInt(input, 10);
    if (!isNaN(amount) && amount !== 0) {
      incrementMission(missionId, amount);
    }
  }
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

  store.data.cheers.push({
    id: 'c_' + Date.now(),
    sender: role,
    senderName,
    message: msgText,
    time: timeStr
  });
  store.save();

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

// --- 커플 보상 쿠폰 생성/수정/삭제 로직 ---
function renderCouponList() {
  const container = document.getElementById('coupons-list');
  if (!container) return;
  container.innerHTML = '';

  const totalHearts = countTotalHearts();
  const heartCountEl = document.getElementById('total-heart-count');
  if (heartCountEl) heartCountEl.innerText = `현재 모은 커플 하트: 💖 ${totalHearts}개`;

  if (store.data.coupons.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:20px 10px; color:var(--text-muted); font-size:0.85rem;">
        🎁 아직 등록된 데이트 쿠폰이 없어요.<br>우측 상단 <b>'+ 쿠폰 만들기'</b>로 목표 보상을 걸어보세요!
      </div>
    `;
    return;
  }

  store.data.coupons.forEach(cp => {
    const isReady = totalHearts >= cp.requiredHearts;
    const card = document.createElement('div');
    card.className = `coupon-card ${!isReady ? 'locked' : ''}`;

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
          필요 하트: 💖 ${cp.requiredHearts}개 (${isReady ? '잠금 해제 완료!' : `앞으로 ${cp.requiredHearts - totalHearts}개 남음`})
        </div>
      </div>
      <div>
        ${cp.used
          ? `<button class="coupon-btn used">사용 완료</button>`
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
  sfx.playSuccess();
  closeModal('modal-coupon-edit');
  renderMissionsScreen();
}

function deleteCoupon(couponId) {
  if (confirm('이 보상 쿠폰을 삭제하시겠습니까?')) {
    store.data.coupons = store.data.coupons.filter(item => item.id !== couponId);
    store.save();
    renderMissionsScreen();
  }
}

function useCoupon(couponId) {
  const cp = store.data.coupons.find(c => c.id === couponId);
  if (!cp) return;

  if (confirm(`'${cp.title}' 데이트 쿠폰을 사용하시겠습니까? 🥰`)) {
    cp.used = true;
    store.save();
    sfx.playSuccess();
    createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 25);
    renderMissionsScreen();
  }
}

// --- 10. Feature 8: Workout Routine & Rest Timer ---
let timerInterval = null;
let timerRunning = false;
let currentPhase = 'ready'; // 'work' | 'rest' | 'ready'
let currentSet = 1;
let totalSets = 4;
let workSec = 45;
let restSec = 15;
let remainingSec = 45;

function renderTimerScreen() {
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const secEl = document.getElementById('timer-sec');
  const phaseEl = document.getElementById('timer-phase');
  const setEl = document.getElementById('timer-set-lbl');
  const circle = document.getElementById('timer-circle-progress');

  if (secEl) secEl.innerText = remainingSec;
  if (setEl) setEl.innerText = `세트 ${currentSet} / ${totalSets}`;

  const circumference = 2 * Math.PI * 88;
  const maxSec = currentPhase === 'rest' ? restSec : workSec;
  const offset = circumference - (remainingSec / maxSec) * circumference;

  if (circle) {
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = isNaN(offset) ? 0 : offset;
    circle.style.stroke = currentPhase === 'rest' ? '#4CAF50' : '#FF5E7E';
  }

  if (phaseEl) {
    if (currentPhase === 'ready') {
      phaseEl.innerText = '준비 완료 (시작을 눌러주세요)';
      phaseEl.style.color = '#8E8A98';
    } else if (currentPhase === 'work') {
      phaseEl.innerText = '🔥 열정 운동 중!';
      phaseEl.style.color = '#FF5E7E';
    } else if (currentPhase === 'rest') {
      phaseEl.innerText = '💧 숨 고르며 휴식 중';
      phaseEl.style.color = '#4CAF50';
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
  if (currentPhase === 'ready') {
    currentPhase = 'work';
    remainingSec = workSec;
    sfx.playBeep(600, 0.2);
  }

  timerRunning = true;
  updateTimerDisplay();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remainingSec--;

    if (remainingSec <= 3 && remainingSec > 0) {
      sfx.playBeep(440, 0.08); // 3초 카운트다운
    }

    if (remainingSec <= 0) {
      if (currentPhase === 'work') {
        // 운동 끝 -> 휴식
        sfx.playRest();
        if (currentSet < totalSets) {
          currentPhase = 'rest';
          remainingSec = restSec;
        } else {
          // 전체 세트 완료!
          finishWorkoutSession();
          return;
        }
      } else if (currentPhase === 'rest') {
        // 휴식 끝 -> 다음 세트 운동
        currentSet++;
        currentPhase = 'work';
        remainingSec = workSec;
        sfx.playBeep(650, 0.25);
      }
    }
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
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

  createFloatingHearts(window.innerWidth / 2, window.innerHeight / 2, 30);
  alert('🎉 홈트레이닝 완료! 오늘 운동 출석 도장이 자동으로 찍혔습니다!');
  switchTab('home');
}

function applyTimerSettings() {
  const w = parseInt(document.getElementById('custom-work-sec').value, 10);
  const r = parseInt(document.getElementById('custom-rest-sec').value, 10);
  const s = parseInt(document.getElementById('custom-sets-count').value, 10);

  if (w > 0) workSec = w;
  if (r > 0) restSec = r;
  if (s > 0) totalSets = s;

  resetTimer();
  closeModal('modal-timer-settings');
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
        used: c.is_used
      }));
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

  // 실시간 출석 / 칭찬 / 식단 구독
  supabaseClient
    .channel('couple_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
      loadFromSupabase();
      sfx.playSuccess();
      const currentRole = store.data.currentRole;
      if (payload.new && payload.new.user_role !== currentRole) {
        const partnerName = currentRole === 'boyfriend' ? store.data.couple.gfName : store.data.couple.bfName;
        showSystemNotification('🎉 파트너 운동 완료!', `${partnerName}님이 오늘 운동 출석 도장을 찍었어요! 💖`);
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'diet_logs' }, (payload) => {
      loadFromSupabase();
      const currentRole = store.data.currentRole;
      if (payload.new && payload.new.user_role !== currentRole) {
        const partnerName = currentRole === 'boyfriend' ? store.data.couple.gfName : store.data.couple.bfName;
        showSystemNotification('🥗 새 식단 일기 등록!', `${partnerName}님이 맛있는 식단 사진을 올렸어요.`);
      }
    })
    .subscribe();
}

async function syncAttendanceToSupabase(date, role, isCompleted) {
  if (!supabaseClient) return;
  try {
    if (isCompleted) {
      await supabaseClient.from('attendance').upsert({
        user_role: role,
        date: date,
        workout_type: '일반 운동'
      });
    } else {
      await supabaseClient.from('attendance').delete().match({ date: date, user_role: role });
    }
  } catch (e) {
    console.error('Supabase attendance sync error:', e);
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

function saveSupabaseSettings() {
  const url = document.getElementById('supabase-url-input').value.trim();
  const key = document.getElementById('supabase-key-input').value.trim();

  store.data.supabase.url = url;
  store.data.supabase.anonKey = key;
  store.data.supabase.connected = !!(url && key);
  store.save();

  initSupabase();
  alert('Supabase 연동이 저장되었습니다! 이제 두 폰 간 실시간 동기화가 이루어집니다. ☁️');
  closeModal('modal-settings');
}

// --- 13. Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  // 1. 유저 역할 전환 바 이벤트 바인딩
  const bfBtn = document.getElementById('switch-bf');
  const gfBtn = document.getElementById('switch-gf');
  if (bfBtn) {
    bfBtn.addEventListener('click', () => {
      store.data.currentRole = 'boyfriend';
      store.save();
      renderHomeScreen();
      if (currentTab === 'stats') renderStatsScreen();
      if (currentTab === 'missions') renderMissionsScreen();
    });
  }
  if (gfBtn) {
    gfBtn.addEventListener('click', () => {
      store.data.currentRole = 'girlfriend';
      store.save();
      renderHomeScreen();
      if (currentTab === 'stats') renderStatsScreen();
      if (currentTab === 'missions') renderMissionsScreen();
    });
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
