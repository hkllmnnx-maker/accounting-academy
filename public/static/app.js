// ============================================
// ACCOUNTING ACADEMY - MAIN APP v3.0 (with Auth)
// ============================================

// State Management
let state = { completedLessons: [], quizScores: {}, bookmarks: [], notes: {}, expandedLevels: [], darkMode: false };
let authState = { token: null, user: null };
let levelsData = null, glossaryData = null, quizzesData = null, statsData = null;
let syncTimeout = null;

// ============================================
// AUTH SYSTEM
// ============================================
function loadAuth() {
  try {
    const saved = localStorage.getItem('aa_auth');
    if (saved) authState = JSON.parse(saved);
  } catch(e) {}
}

function saveAuth() {
  try { localStorage.setItem('aa_auth', JSON.stringify(authState)); } catch(e) {}
}

function isLoggedIn() { return !!authState.token && !!authState.user; }

async function verifySession() {
  if (!authState.token) return false;
  try {
    const res = await fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + authState.token } });
    if (!res.ok) { authState = { token: null, user: null }; saveAuth(); return false; }
    const data = await res.json();
    authState.user = data.user;
    saveAuth();
    return true;
  } catch(e) { return false; }
}

async function loadProgressFromServer() {
  if (!isLoggedIn()) return;
  try {
    const res = await fetch('/api/progress/load', { headers: { 'Authorization': 'Bearer ' + authState.token } });
    if (res.ok) {
      const data = await res.json();
      state = { ...state, ...data };
      saveState();
    }
  } catch(e) { console.error('Error loading progress:', e); }
}

function syncProgressToServer() {
  if (!isLoggedIn()) return;
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await fetch('/api/progress/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authState.token },
        body: JSON.stringify(state)
      });
    } catch(e) {}
  }, 1500);
}

function renderAuthButton() {
  const btn = document.getElementById('authBtn');
  if (!btn) return;
  if (isLoggedIn()) {
    btn.innerHTML = `<div class="auth-user-btn" onclick="showAuthMenu()">
      <div class="auth-avatar">${authState.user.displayName?.charAt(0) || 'م'}</div>
    </div>`;
  } else {
    btn.innerHTML = `<button onclick="showAuthModal('login')" class="auth-login-btn">
      <i class="fas fa-sign-in-alt ml-1"></i><span class="hidden sm:inline">تسجيل الدخول</span>
    </button>`;
  }
}

function showAuthMenu() {
  const modal = document.getElementById('authModal');
  modal.classList.remove('hidden');
  modal.innerHTML = `<div class="modal-content" style="max-width:360px">
    <div class="text-center mb-5">
      <div class="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">${authState.user?.displayName?.charAt(0) || 'م'}</div>
      <h3 class="text-lg font-bold dark:text-white">${authState.user?.displayName || ''}</h3>
      <p class="text-sm text-gray-500">${authState.user?.email || ''}</p>
    </div>
    <div class="space-y-2">
      <div class="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl"><i class="fas fa-cloud-upload-alt text-emerald-500"></i><span class="text-sm font-semibold dark:text-white">التقدم محفوظ على السيرفر</span></div>
      <button onclick="logout()" class="w-full p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 font-bold text-sm flex items-center gap-3 hover:bg-red-100 transition"><i class="fas fa-sign-out-alt"></i>تسجيل الخروج</button>
    </div>
    <button onclick="closeAuthModal()" class="w-full mt-4 p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 transition">إغلاق</button>
  </div>`;
}

function showAuthModal(mode) {
  const modal = document.getElementById('authModal');
  modal.classList.remove('hidden');
  if (mode === 'login') {
    modal.innerHTML = `<div class="modal-content" style="max-width:420px">
      <div class="text-center mb-5">
        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl mx-auto mb-3"><i class="fas fa-sign-in-alt"></i></div>
        <h3 class="text-xl font-black dark:text-white">تسجيل الدخول</h3>
        <p class="text-sm text-gray-500 mt-1">سجل دخولك لحفظ تقدمك بشكل دائم</p>
      </div>
      <div id="authError" class="hidden bg-red-50 dark:bg-red-900/20 text-red-600 p-3 rounded-xl text-sm mb-3 font-bold text-center"></div>
      <input type="email" id="loginEmail" class="auth-input" placeholder="البريد الإلكتروني" dir="ltr">
      <input type="password" id="loginPassword" class="auth-input" placeholder="كلمة المرور" dir="ltr">
      <button onclick="doLogin()" id="loginBtn" class="auth-submit-btn"><i class="fas fa-sign-in-alt ml-2"></i>تسجيل الدخول</button>
      <div class="text-center mt-4"><span class="text-gray-500 text-sm">ليس لديك حساب؟ </span><button onclick="showAuthModal('register')" class="text-emerald-600 font-bold text-sm hover:underline">إنشاء حساب جديد</button></div>
      <button onclick="closeAuthModal()" class="w-full mt-3 p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 transition">إغلاق</button>
    </div>`;
  } else {
    modal.innerHTML = `<div class="modal-content" style="max-width:420px">
      <div class="text-center mb-5">
        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl mx-auto mb-3"><i class="fas fa-user-plus"></i></div>
        <h3 class="text-xl font-black dark:text-white">إنشاء حساب جديد</h3>
        <p class="text-sm text-gray-500 mt-1">أنشئ حسابا لحفظ تقدمك عبر الأجهزة</p>
      </div>
      <div id="authError" class="hidden bg-red-50 dark:bg-red-900/20 text-red-600 p-3 rounded-xl text-sm mb-3 font-bold text-center"></div>
      <input type="text" id="regName" class="auth-input" placeholder="الاسم الكامل">
      <input type="text" id="regUsername" class="auth-input" placeholder="اسم المستخدم (بالإنجليزية)" dir="ltr">
      <input type="email" id="regEmail" class="auth-input" placeholder="البريد الإلكتروني" dir="ltr">
      <input type="password" id="regPassword" class="auth-input" placeholder="كلمة المرور (6 أحرف على الأقل)" dir="ltr">
      <button onclick="doRegister()" id="regBtn" class="auth-submit-btn"><i class="fas fa-user-plus ml-2"></i>إنشاء الحساب</button>
      <div class="text-center mt-4"><span class="text-gray-500 text-sm">لديك حساب؟ </span><button onclick="showAuthModal('login')" class="text-emerald-600 font-bold text-sm hover:underline">تسجيل الدخول</button></div>
      <button onclick="closeAuthModal()" class="w-full mt-3 p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 transition">إغلاق</button>
    </div>`;
  }
}

function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

async function doLogin() {
  const email = document.getElementById('loginEmail')?.value;
  const password = document.getElementById('loginPassword')?.value;
  if (!email || !password) { showAuthError('يرجى ملء جميع الحقول'); return; }
  
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i>جاري تسجيل الدخول...';
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { showAuthError(data.error || 'خطأ في تسجيل الدخول'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt ml-2"></i>تسجيل الدخول'; return; }
    
    authState = { token: data.token, user: data.user };
    saveAuth();
    await loadProgressFromServer();
    closeAuthModal();
    renderAuthButton();
    showHome();
  } catch(e) { showAuthError('حدث خطأ في الاتصال'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt ml-2"></i>تسجيل الدخول'; }
}

async function doRegister() {
  const displayName = document.getElementById('regName')?.value;
  const username = document.getElementById('regUsername')?.value;
  const email = document.getElementById('regEmail')?.value;
  const password = document.getElementById('regPassword')?.value;
  if (!displayName || !username || !email || !password) { showAuthError('يرجى ملء جميع الحقول'); return; }
  
  const btn = document.getElementById('regBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i>جاري إنشاء الحساب...';
  
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, displayName })
    });
    const data = await res.json();
    if (!res.ok) { showAuthError(data.error || 'خطأ في التسجيل'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus ml-2"></i>إنشاء الحساب'; return; }
    
    authState = { token: data.token, user: data.user };
    saveAuth();
    // Sync current local progress to server
    syncProgressToServer();
    closeAuthModal();
    renderAuthButton();
    showHome();
  } catch(e) { showAuthError('حدث خطأ في الاتصال'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus ml-2"></i>إنشاء الحساب'; }
}

async function logout() {
  try { await fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + authState.token } }); } catch(e) {}
  authState = { token: null, user: null };
  saveAuth();
  closeAuthModal();
  renderAuthButton();
  showHome();
}

// ============================================
// State Management
// ============================================
function loadState() {
  try {
    const saved = localStorage.getItem('accountingAcademy');
    if (saved) state = { ...state, ...JSON.parse(saved) };
    if (state.darkMode) document.documentElement.classList.add('dark');
    updateDarkModeIcon();
  } catch(e) {}
}

function saveState() {
  try { localStorage.setItem('accountingAcademy', JSON.stringify(state)); } catch(e) {}
  syncProgressToServer();
}

async function fetchData() {
  try {
    const [levels, glossary, quizzes, stats] = await Promise.all([
      fetch('/api/levels').then(r => r.json()),
      fetch('/api/glossary').then(r => r.json()),
      fetch('/api/quizzes').then(r => r.json()),
      fetch('/api/stats').then(r => r.json())
    ]);
    levelsData = levels; glossaryData = glossary; quizzesData = quizzes; statsData = stats;
  } catch(e) { console.error('Error fetching data:', e); }
}

// ============================================
// Dark Mode
// ============================================
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  document.documentElement.classList.toggle('dark');
  updateDarkModeIcon();
  saveState();
}

function updateDarkModeIcon() {
  const icon = document.getElementById('darkModeIcon');
  if (icon) icon.className = state.darkMode ? 'fas fa-sun text-yellow-400' : 'fas fa-moon';
}

// ============================================
// Scroll to Top
// ============================================
function initScrollToTop() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ============================================
// HOME PAGE
// ============================================
async function showHome() {
  if (!levelsData) await fetchData();
  const main = document.getElementById('mainContent');
  const completedCount = state.completedLessons.length;
  const totalLessons = statsData?.totalLessons || 0;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  let html = `
    <div class="hero-section animate-fade">
      <div class="relative z-10">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center animate-float"><i class="fas fa-graduation-cap text-3xl"></i></div>
          <div>
            <h2 class="text-2xl sm:text-3xl font-black leading-tight">أكاديمية المحاسبة المالية</h2>
            <p class="opacity-90 text-sm mt-1">رحلتك الشاملة من الصفر إلى الاحتراف في عالم المحاسبة</p>
          </div>
        </div>
        ${!isLoggedIn() ? `<div class="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-center gap-3 flex-wrap">
          <i class="fas fa-info-circle text-lg"></i>
          <span class="text-sm flex-1">سجل دخولك لحفظ تقدمك بشكل دائم حتى لو مسحت بيانات المتصفح</span>
          <button onclick="showAuthModal('register')" class="px-4 py-2 bg-white/20 rounded-lg font-bold text-sm hover:bg-white/30 transition">إنشاء حساب مجاني</button>
        </div>` : ''}
        ${completedCount > 0 ? `<div class="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div class="flex justify-between text-sm mb-2"><span><i class="fas fa-chart-line ml-1"></i>التقدم العام</span><span class="font-bold">${progress}% (${completedCount}/${totalLessons} درس)</span></div>
          <div class="progress-bar-bg" style="background:rgba(255,255,255,0.2)"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
          ${progress >= 100 ? '<div class="text-center mt-2 text-yellow-300 font-bold"><i class="fas fa-trophy ml-1"></i>مبروك! أتممت جميع الدروس</div>' : ''}
        </div>` : ''}
        <div class="stats-grid">
          <div class="stat-card"><span class="stat-number">${statsData?.totalLevels || 0}</span><span class="stat-label"><i class="fas fa-layer-group ml-1"></i>مساق</span></div>
          <div class="stat-card"><span class="stat-number">${statsData?.totalLessons || 0}</span><span class="stat-label"><i class="fas fa-play-circle ml-1"></i>درس</span></div>
          <div class="stat-card"><span class="stat-number">${statsData?.totalQuizzes || 0}</span><span class="stat-label"><i class="fas fa-clipboard-check ml-1"></i>اختبار</span></div>
          <div class="stat-card"><span class="stat-number">${statsData?.totalGlossaryTerms || 0}</span><span class="stat-label"><i class="fas fa-book ml-1"></i>مصطلح</span></div>
        </div>
      </div>
    </div>
    <div class="quick-actions stagger-children">
      <button onclick="showSection('search')" class="quick-action-btn"><i class="fas fa-search text-blue-500"></i><span>بحث سريع</span></button>
      <button onclick="showSection('glossary')" class="quick-action-btn"><i class="fas fa-book text-emerald-500"></i><span>المعجم المحاسبي</span></button>
      <button onclick="showSection('calculator')" class="quick-action-btn"><i class="fas fa-calculator text-purple-500"></i><span>الآلة الحاسبة</span></button>
      <button onclick="showSection('about')" class="quick-action-btn"><i class="fas fa-info-circle text-amber-500"></i><span>عن الأكاديمية</span></button>
    </div>
    <div class="section-header"><h2><i class="fas fa-book-open text-emerald-500"></i>المساقات والدروس</h2><span class="section-count">${statsData?.totalLevels || 0} مساقات</span></div>
    <div class="space-y-3 stagger-children" id="levelsContainer">`;

  levelsData.forEach(level => {
    const completedInLevel = level.lessons.filter(l => state.completedLessons.includes(l.id)).length;
    const isExpanded = state.expandedLevels.includes(level.id);
    const levelPercent = Math.round((completedInLevel / level.lessonsCount) * 100);
    
    html += `<div class="level-card ${isExpanded ? 'expanded' : ''}" id="level-${level.id}">
      <div class="level-header" onclick="toggleLevel('${level.id}')">
        <div class="level-icon" style="background:linear-gradient(135deg,${level.color},${level.color}dd)"><i class="fas ${level.icon}"></i></div>
        <div class="level-info">
          <h3>${level.title}</h3>
          <p>${level.subtitle} &bull; ${level.lessonsCount} دروس</p>
          ${completedInLevel > 0 ? `<div class="mt-1.5"><div class="progress-bar-bg" style="height:5px"><div class="progress-bar-fill" style="width:${levelPercent}%"></div></div></div>` : ''}
        </div>
        <div class="level-badge" style="background:${level.colorLight};color:${level.color}">
          ${completedInLevel}/${level.lessonsCount}
          <i class="fas fa-chevron-down" style="font-size:10px;transition:transform 0.3s;${isExpanded ? 'transform:rotate(180deg)' : ''}"></i>
        </div>
      </div>
      <div class="level-lessons">
        ${level.lessons.map(lesson => {
          const isCompleted = state.completedLessons.includes(lesson.id);
          const isBookmarked = state.bookmarks.includes(lesson.id);
          return `<div class="lesson-item" onclick="showLesson('${level.id}','${lesson.id}')">
            <div class="lesson-icon" style="background:${level.colorLight};color:${level.color}"><i class="fas ${lesson.icon}"></i></div>
            <span class="lesson-title">${lesson.title}</span>
            <span class="video-badge"><i class="fab fa-youtube"></i> فيديو</span>
            <span class="lesson-duration"><i class="far fa-clock ml-1"></i>${lesson.duration}</span>
            ${isBookmarked ? '<span style="color:#f59e0b;font-size:0.8rem"><i class="fas fa-bookmark"></i></span>' : ''}
            ${isCompleted ? '<span class="lesson-check"><i class="fas fa-check-circle"></i></span>' : ''}
          </div>`;
        }).join('')}
        ${quizzesData?.find(q => q.levelId === level.id) ? `<div class="lesson-item" onclick="showQuiz('${level.id}')" style="background:linear-gradient(135deg,${level.colorLight}80,transparent);border:1px dashed ${level.color}60">
          <div class="lesson-icon" style="background:${level.color};color:white"><i class="fas fa-clipboard-check"></i></div>
          <span class="lesson-title" style="color:${level.color};font-weight:700">اختبار ${level.title}</span>
          <span class="lesson-duration">${state.quizScores[level.id] !== undefined ? `<span style="color:${state.quizScores[level.id]>=70?'#10b981':'#ef4444'};font-weight:700">${state.quizScores[level.id]}%</span>` : '<span style="color:#9ca3af">لم يحل</span>'}</span>
        </div>` : ''}
      </div>
    </div>`;
  });

  html += '</div>';
  main.innerHTML = html;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleLevel(levelId) {
  const idx = state.expandedLevels.indexOf(levelId);
  if (idx > -1) state.expandedLevels.splice(idx, 1); else state.expandedLevels.push(levelId);
  saveState();
  const card = document.getElementById(`level-${levelId}`);
  if (card) card.classList.toggle('expanded');
  const badge = card?.querySelector('.level-badge i');
  if (badge) badge.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : '';
}

// ============================================
// LESSON VIEW
// ============================================
async function showLesson(levelId, lessonId) {
  try {
    const res = await fetch(`/api/lesson/${levelId}/${lessonId}`);
    const lesson = await res.json();
    if (lesson.error) { alert('الدرس غير موجود'); return; }
    const level = levelsData.find(l => l.id === levelId);
    const lessonIdx = level.lessons.findIndex(l => l.id === lessonId);
    const prevLesson = lessonIdx > 0 ? level.lessons[lessonIdx - 1] : null;
    const nextLesson = lessonIdx < level.lessons.length - 1 ? level.lessons[lessonIdx + 1] : null;
    const isCompleted = state.completedLessons.includes(lessonId);
    const isBookmarked = state.bookmarks.includes(lessonId);
    const note = state.notes[lessonId] || '';

    const main = document.getElementById('mainContent');
    main.innerHTML = `<div class="lesson-view animate-fade">
      <div class="lesson-nav">
        <button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-home"></i> الرئيسية</button>
        <span class="text-gray-400 dark:text-gray-600 text-sm mx-1">/</span>
        <span class="text-sm font-semibold" style="color:${lesson.levelColor}">${lesson.levelTitle}</span>
        ${prevLesson ? `<button class="lesson-nav-btn btn-prev mr-auto" onclick="showLesson('${levelId}','${prevLesson.id}')"><i class="fas fa-arrow-right"></i> السابق</button>` : ''}
        ${nextLesson ? `<button class="lesson-nav-btn btn-next ${!prevLesson?'mr-auto':''}" onclick="showLesson('${levelId}','${nextLesson.id}')">التالي <i class="fas fa-arrow-left"></i></button>` : ''}
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div class="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div class="inline-flex items-center gap-2 text-xs font-bold mb-2 px-3 py-1 rounded-full" style="background:${lesson.levelColor}15;color:${lesson.levelColor}"><i class="fas fa-layer-group"></i>${lesson.levelTitle} &bull; الدرس ${lessonIdx+1} من ${level.lessonsCount}</div>
            <h2 class="text-2xl font-black text-gray-800 dark:text-white">${lesson.title}</h2>
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-500"><span><i class="far fa-clock ml-1"></i>${lesson.duration}</span><span><i class="fab fa-youtube text-red-500 ml-1"></i>يتضمن فيديو تعليمي</span></div>
          </div>
          <div class="flex gap-2">
            <button onclick="toggleBookmark('${lessonId}')" class="nav-btn" title="${isBookmarked?'إزالة من المحفوظات':'حفظ'}"><i class="fas fa-bookmark ${isBookmarked?'text-yellow-500':''}"></i></button>
            <button onclick="toggleComplete('${lessonId}')" class="nav-btn" title="${isCompleted?'إلغاء الإتمام':'تم الإنتهاء'}" style="${isCompleted?'background:#dcfce7':''}"><i class="fas fa-check-circle ${isCompleted?'text-emerald-500':''}"></i></button>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-4 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div class="video-label"><i class="fab fa-youtube text-lg"></i><span>${lesson.videoTitle}</span></div>
        <div class="video-container"><iframe src="https://www.youtube.com/embed/${lesson.videoId}?rel=0&modestbranding=1&hl=ar" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" title="${lesson.videoTitle}"></iframe></div>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center"><i class="fas fa-file-alt text-emerald-500 text-sm"></i></div>محتوى الدرس</h3>
        ${lesson.content}
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><div class="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center"><i class="fas fa-sticky-note text-yellow-500 text-sm"></i></div>ملاحظاتي الشخصية</h3>
        <textarea id="lessonNote" class="w-full p-4 border-2 border-gray-200 dark:border-gray-600/50 rounded-xl bg-gray-50 dark:bg-gray-900/50 dark:text-white focus:border-emerald-500 outline-none transition-all resize-y" placeholder="اكتب ملاحظاتك هنا..." oninput="saveNote('${lessonId}')" rows="4" style="min-height:100px">${note}</textarea>
      </div>
      <div class="flex justify-between items-center mt-6 gap-3 flex-wrap">
        ${prevLesson ? `<button class="lesson-nav-btn btn-prev" onclick="showLesson('${levelId}','${prevLesson.id}')"><i class="fas fa-arrow-right"></i> ${prevLesson.title}</button>` : '<div></div>'}
        <button class="lesson-nav-btn" onclick="toggleComplete('${lessonId}')" style="background:${isCompleted?'#f59e0b':'#059669'};color:white;padding:10px 24px;font-size:0.95rem"><i class="fas ${isCompleted?'fa-undo':'fa-check'} ml-1"></i>${isCompleted?'إلغاء إتمام الدرس':'تم إنهاء الدرس'}</button>
        ${nextLesson ? `<button class="lesson-nav-btn btn-next" onclick="showLesson('${levelId}','${nextLesson.id}')">${nextLesson.title} <i class="fas fa-arrow-left"></i></button>` : `<button class="lesson-nav-btn" onclick="showHome()" style="background:#f59e0b;color:white"><i class="fas fa-home ml-1"></i>العودة للرئيسية</button>`}
      </div>
    </div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch(e) { console.error('Error loading lesson:', e); }
}

// ============================================
// QUIZ
// ============================================
async function showQuiz(levelId) {
  try {
    const res = await fetch(`/api/quiz/${levelId}`);
    const quiz = await res.json();
    if (quiz.error) return;
    const level = levelsData.find(l => l.id === levelId);
    const main = document.getElementById('mainContent');
    let html = `<div class="quiz-container animate-fade">
      <div class="lesson-nav"><button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-home"></i> الرئيسية</button><span class="text-gray-400 text-sm mx-1">/</span><span class="text-sm font-semibold" style="color:${level.color}">${level.title}</span></div>
      <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div class="flex items-center gap-3"><div class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl" style="background:${level.color}"><i class="fas fa-clipboard-check"></i></div><div><h2 class="text-xl font-black text-gray-800 dark:text-white">${quiz.title}</h2><p class="text-gray-500 text-sm">${quiz.questions.length} أسئلة</p></div></div>
      </div>
      <div id="quizQuestions" class="stagger-children">`;
    quiz.questions.forEach((q, qi) => {
      html += `<div class="quiz-question" id="qq-${qi}"><h4><span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ml-2" style="background:${level.color}">${qi+1}</span>${q.q}</h4><div class="space-y-2">${q.options.map((opt, oi) => `<label class="quiz-option" id="qo-${qi}-${oi}" onclick="selectOption(${qi},${oi})"><div class="quiz-radio"></div><span>${opt}</span><input type="radio" name="q${qi}" value="${oi}"></label>`).join('')}</div></div>`;
    });
    html += `</div><div class="text-center mt-6"><button onclick="submitQuiz('${levelId}')" id="submitQuizBtn" class="px-10 py-3.5 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1" style="background:linear-gradient(135deg,${level.color},${level.color}dd)"><i class="fas fa-paper-plane ml-2"></i>تسليم الاختبار</button></div><div id="quizResult"></div></div>`;
    main.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch(e) {}
}

function selectOption(qi, oi) {
  document.querySelectorAll(`#qq-${qi} .quiz-option`).forEach(el => el.classList.remove('selected'));
  document.getElementById(`qo-${qi}-${oi}`).classList.add('selected');
  document.querySelector(`input[name="q${qi}"][value="${oi}"]`).checked = true;
}

async function submitQuiz(levelId) {
  const quiz = quizzesData.find(q => q.levelId === levelId);
  if (!quiz) return;
  let correct = 0;
  quiz.questions.forEach((q, qi) => {
    const selected = document.querySelector(`input[name="q${qi}"]:checked`);
    const selectedVal = selected ? parseInt(selected.value) : -1;
    document.querySelectorAll(`#qq-${qi} .quiz-option`).forEach(el => { el.style.pointerEvents = 'none'; });
    if (selectedVal === q.correct) { correct++; document.getElementById(`qo-${qi}-${selectedVal}`).classList.add('correct'); }
    else { if (selectedVal >= 0) document.getElementById(`qo-${qi}-${selectedVal}`).classList.add('wrong'); document.getElementById(`qo-${qi}-${q.correct}`).classList.add('correct'); }
  });
  const score = Math.round((correct / quiz.questions.length) * 100);
  state.quizScores[levelId] = score;
  saveState();
  document.getElementById('submitQuizBtn').style.display = 'none';
  const passed = score >= 70;
  document.getElementById('quizResult').innerHTML = `<div class="quiz-result ${passed?'pass':'fail'} animate-bounce-in">
    <i class="fas ${passed?'fa-trophy':'fa-redo'} text-5xl mb-3"></i>
    <h3 class="text-2xl font-black mb-2">${passed?'أحسنت! نجحت في الاختبار':'لم تنجح - حاول مرة أخرى'}</h3>
    <p class="text-lg mb-1">حصلت على ${correct} من ${quiz.questions.length} (${score}%)</p>
    <div class="mt-4 flex gap-3 justify-center flex-wrap">
      <button onclick="showQuiz('${levelId}')" class="px-6 py-2.5 bg-white/30 rounded-xl font-bold hover:bg-white/40 transition"><i class="fas fa-redo ml-1"></i>إعادة</button>
      <button onclick="showHome()" class="px-6 py-2.5 bg-white/30 rounded-xl font-bold hover:bg-white/40 transition"><i class="fas fa-home ml-1"></i>الرئيسية</button>
    </div>
  </div>`;
  document.getElementById('quizResult').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// SECTIONS
// ============================================
function showSection(section) {
  if (section === 'glossary') showGlossary();
  else if (section === 'calculator') showCalculator();
  else if (section === 'search') showSearch();
  else if (section === 'about') showAbout();
}

function showGlossary() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `<div class="animate-fade"><div class="lesson-nav"><button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-home"></i> الرئيسية</button></div>
    <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
      <div class="flex items-center gap-3 mb-4"><div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center"><i class="fas fa-book text-emerald-500 text-xl"></i></div><div><h2 class="text-xl font-black text-gray-800 dark:text-white">معجم المصطلحات المحاسبية</h2><p class="text-sm text-gray-500">${glossaryData.length} مصطلح</p></div></div>
      <div class="relative"><input type="text" class="search-input" placeholder="ابحث عن مصطلح..." oninput="filterGlossary(this.value)"><i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i></div>
    </div>
    <div id="glossaryList" class="stagger-children">${glossaryData.map(g => `<div class="glossary-item"><div class="flex justify-between items-start gap-2"><span class="glossary-term">${g.term}</span><span class="glossary-english text-left" dir="ltr">${g.english}</span></div><div class="glossary-def">${g.definition}</div></div>`).join('')}</div>
  </div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterGlossary(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.glossary-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function showCalculator() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `<div class="animate-fade"><div class="lesson-nav"><button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-home"></i> الرئيسية</button></div>
    <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
      <div class="flex items-center gap-3"><div class="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center"><i class="fas fa-calculator text-purple-500 text-xl"></i></div><div><h2 class="text-xl font-black text-gray-800 dark:text-white">الآلة الحاسبة المحاسبية</h2><p class="text-sm text-gray-500">أدوات حسابية احترافية</p></div></div>
    </div>
    <div class="calc-grid stagger-children">
      <div class="calc-card"><h4><i class="fas fa-chart-line text-blue-500"></i>حاسبة الإهلاك</h4><input type="number" class="calc-input" id="depCost" placeholder="تكلفة الأصل"><input type="number" class="calc-input" id="depSalvage" placeholder="القيمة التخريدية"><input type="number" class="calc-input" id="depLife" placeholder="العمر الإنتاجي (سنوات)"><button class="calc-btn" onclick="calcDep()"><i class="fas fa-calculator ml-1"></i>احسب</button><div class="calc-result" id="depResult"></div></div>
      <div class="calc-card"><h4><i class="fas fa-crosshairs text-red-500"></i>حاسبة نقطة التعادل</h4><input type="number" class="calc-input" id="beFixed" placeholder="التكاليف الثابتة"><input type="number" class="calc-input" id="bePrice" placeholder="سعر بيع الوحدة"><input type="number" class="calc-input" id="beVar" placeholder="التكلفة المتغيرة للوحدة"><button class="calc-btn" onclick="calcBE()"><i class="fas fa-calculator ml-1"></i>احسب</button><div class="calc-result" id="beResult"></div></div>
      <div class="calc-card"><h4><i class="fas fa-percent text-yellow-500"></i>حاسبة ضريبة القيمة المضافة</h4><input type="number" class="calc-input" id="vatAmt" placeholder="المبلغ قبل الضريبة"><input type="number" class="calc-input" id="vatRate" placeholder="نسبة الضريبة %" value="15"><button class="calc-btn" onclick="calcVAT()"><i class="fas fa-calculator ml-1"></i>احسب</button><div class="calc-result" id="vatResult"></div></div>
      <div class="calc-card"><h4><i class="fas fa-mosque text-emerald-600"></i>حاسبة الزكاة</h4><input type="number" class="calc-input" id="zakatA" placeholder="الأصول الزكوية"><input type="number" class="calc-input" id="zakatL" placeholder="الخصوم المسموح بحسمها"><button class="calc-btn" onclick="calcZakat()"><i class="fas fa-calculator ml-1"></i>احسب</button><div class="calc-result" id="zakatResult"></div></div>
      <div class="calc-card"><h4><i class="fas fa-balance-scale text-green-500"></i>حاسبة النسبة الجارية</h4><input type="number" class="calc-input" id="crA" placeholder="الأصول المتداولة"><input type="number" class="calc-input" id="crL" placeholder="الخصوم المتداولة"><button class="calc-btn" onclick="calcCR()"><i class="fas fa-calculator ml-1"></i>احسب</button><div class="calc-result" id="crResult"></div></div>
      <div class="calc-card"><h4><i class="fas fa-percentage text-indigo-500"></i>حاسبة العائد على حقوق الملكية</h4><input type="number" class="calc-input" id="roeP" placeholder="صافي الربح"><input type="number" class="calc-input" id="roeE" placeholder="حقوق الملكية"><button class="calc-btn" onclick="calcROE()"><i class="fas fa-calculator ml-1"></i>احسب</button><div class="calc-result" id="roeResult"></div></div>
    </div></div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fmt(n) { return n.toLocaleString('ar-SA'); }
function calcDep() { const c=parseFloat(document.getElementById('depCost').value),s=parseFloat(document.getElementById('depSalvage').value)||0,l=parseFloat(document.getElementById('depLife').value); if(!c||!l){document.getElementById('depResult').innerHTML='يرجى إدخال القيم';return;} const d=(c-s)/l; document.getElementById('depResult').innerHTML=`الإهلاك السنوي: <strong>${fmt(d)} ريال</strong>`; }
function calcBE() { const f=parseFloat(document.getElementById('beFixed').value),p=parseFloat(document.getElementById('bePrice').value),v=parseFloat(document.getElementById('beVar').value); if(!f||!p||p<=v){document.getElementById('beResult').innerHTML='يرجى إدخال قيم صحيحة';return;} const u=Math.ceil(f/(p-v)); document.getElementById('beResult').innerHTML=`نقطة التعادل: <strong>${fmt(u)} وحدة</strong> = ${fmt(u*p)} ريال`; }
function calcVAT() { const a=parseFloat(document.getElementById('vatAmt').value),r=parseFloat(document.getElementById('vatRate').value); if(!a||!r){document.getElementById('vatResult').innerHTML='يرجى إدخال القيم';return;} const t=a*(r/100); document.getElementById('vatResult').innerHTML=`الضريبة: <strong>${fmt(t)} ريال</strong><br>الإجمالي: ${fmt(a+t)} ريال`; }
function calcZakat() { const a=parseFloat(document.getElementById('zakatA').value),l=parseFloat(document.getElementById('zakatL').value)||0; if(!a){document.getElementById('zakatResult').innerHTML='يرجى إدخال القيم';return;} const z=(a-l)*0.025; document.getElementById('zakatResult').innerHTML=`الزكاة: <strong>${fmt(z)} ريال</strong>`; }
function calcCR() { const a=parseFloat(document.getElementById('crA').value),l=parseFloat(document.getElementById('crL').value); if(!a||!l){document.getElementById('crResult').innerHTML='يرجى إدخال القيم';return;} const r=(a/l).toFixed(2); document.getElementById('crResult').innerHTML=`النسبة الجارية: <strong>${r}</strong> (${r>=2?'ممتازة':r>=1?'مقبولة':'ضعيفة'})`; }
function calcROE() { const p=parseFloat(document.getElementById('roeP').value),e=parseFloat(document.getElementById('roeE').value); if(!p||!e){document.getElementById('roeResult').innerHTML='يرجى إدخال القيم';return;} const r=((p/e)*100).toFixed(1); document.getElementById('roeResult').innerHTML=`ROE: <strong>${r}%</strong>`; }

function showSearch() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `<div class="animate-fade"><div class="lesson-nav"><button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-home"></i> الرئيسية</button></div>
    <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
      <div class="flex items-center gap-3 mb-4"><div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center"><i class="fas fa-search text-blue-500 text-xl"></i></div><div><h2 class="text-xl font-black text-gray-800 dark:text-white">البحث الشامل</h2><p class="text-sm text-gray-500">ابحث في الدروس والمصطلحات</p></div></div>
      <div class="relative"><input type="text" class="search-input" placeholder="اكتب كلمة البحث..." oninput="performSearch(this.value)" id="mainSearch" autofocus><i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i></div>
    </div><div id="searchResults"></div></div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function performSearch(query) {
  if (!query || query.length < 2) { document.getElementById('searchResults').innerHTML = '<div class="text-center text-gray-400 py-8 text-sm">اكتب كلمتين على الأقل للبحث</div>'; return; }
  const q = query.toLowerCase();
  let results = [];
  levelsData.forEach(level => {
    level.lessons.forEach(lesson => {
      if (lesson.title.toLowerCase().includes(q)) results.push({ type: 'lesson', title: lesson.title, subtitle: level.title, icon: lesson.icon, color: level.color, action: `showLesson('${level.id}','${lesson.id}')` });
    });
  });
  glossaryData.forEach(g => {
    if (g.term.includes(q) || g.english.toLowerCase().includes(q) || g.definition.includes(q)) results.push({ type: 'glossary', title: `${g.term} (${g.english})`, subtitle: g.definition, icon: 'fa-book', color: '#6b7280' });
  });
  const div = document.getElementById('searchResults');
  if (!results.length) { div.innerHTML = '<div class="text-center text-gray-500 py-10"><i class="fas fa-search text-4xl mb-3 block text-gray-300"></i><p class="font-bold">لا توجد نتائج</p></div>'; return; }
  div.innerHTML = `<p class="text-sm text-gray-500 mb-3 px-1"><strong>${results.length}</strong> نتيجة</p>` + results.map(r => `<div class="glossary-item cursor-pointer" ${r.action?`onclick="${r.action}"`:''}><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${r.color}15;color:${r.color}"><i class="fas ${r.icon} text-sm"></i></div><div class="min-w-0 flex-1"><div class="font-bold text-gray-800 dark:text-white text-sm">${r.title}</div><div class="text-xs text-gray-500 truncate">${r.subtitle}</div></div><span class="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg font-bold ${r.type==='lesson'?'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30':'bg-gray-100 text-gray-600 dark:bg-gray-700'}">${r.type==='lesson'?'درس':'مصطلح'}</span></div></div>`).join('');
}

function showAbout() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `<div class="animate-fade"><div class="lesson-nav"><button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-home"></i> الرئيسية</button></div>
    <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-8 mb-6 border border-gray-200 dark:border-gray-700/50 shadow-sm text-center">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg"><i class="fas fa-graduation-cap"></i></div>
      <h2 class="text-2xl font-black text-gray-800 dark:text-white mb-2">أكاديمية المحاسبة المالية</h2>
      <p class="text-gray-500 max-w-2xl mx-auto leading-relaxed">منصة تعليمية عربية شاملة تهدف لتعليم المحاسبة المالية من الصفر إلى الاحتراف. تجمع بين المحتوى النظري الغني والفيديوهات التعليمية والاختبارات التفاعلية.</p>
    </div>
    <div class="about-features stagger-children">
      <div class="about-feature bg-emerald-50 dark:bg-emerald-900/20"><i class="fas fa-book-open text-emerald-500"></i><h4>${statsData?.totalLessons||0} درس تعليمي</h4><p>محتوى شامل يغطي كل فروع المحاسبة</p></div>
      <div class="about-feature bg-red-50 dark:bg-red-900/20"><i class="fab fa-youtube text-red-500"></i><h4>فيديوهات يوتيوب</h4><p>كل درس مرفق بفيديو تعليمي</p></div>
      <div class="about-feature bg-blue-50 dark:bg-blue-900/20"><i class="fas fa-clipboard-check text-blue-500"></i><h4>${statsData?.totalQuizzes||0} اختبارات تفاعلية</h4><p>اختبر معلوماتك بعد كل مساق</p></div>
      <div class="about-feature bg-purple-50 dark:bg-purple-900/20"><i class="fas fa-user-lock text-purple-500"></i><h4>حفظ دائم للتقدم</h4><p>سجل لحفظ تقدمك حتى لو مسحت بيانات المتصفح</p></div>
    </div></div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// HELPERS
// ============================================
function toggleComplete(lessonId) {
  const idx = state.completedLessons.indexOf(lessonId);
  if (idx > -1) state.completedLessons.splice(idx, 1); else state.completedLessons.push(lessonId);
  saveState();
  const levelId = levelsData.find(l => l.lessons.some(le => le.id === lessonId))?.id;
  if (levelId) showLesson(levelId, lessonId);
}

function toggleBookmark(lessonId) {
  const idx = state.bookmarks.indexOf(lessonId);
  if (idx > -1) state.bookmarks.splice(idx, 1); else state.bookmarks.push(lessonId);
  saveState();
  const levelId = levelsData.find(l => l.lessons.some(le => le.id === lessonId))?.id;
  if (levelId) showLesson(levelId, lessonId);
}

function saveNote(lessonId) {
  state.notes[lessonId] = document.getElementById('lessonNote')?.value || '';
  saveState();
}

// ============================================
// PROGRESS
// ============================================
function toggleProgress() {
  const modal = document.getElementById('progressModal');
  modal.classList.toggle('hidden');
  if (!modal.classList.contains('hidden')) renderProgress();
}

function renderProgress() {
  const content = document.getElementById('progressContent');
  const total = statsData?.totalLessons || 1;
  const completed = state.completedLessons.length;
  const percent = Math.round((completed / total) * 100);
  let html = `<div class="text-center mb-5"><div class="text-5xl font-black text-emerald-600 dark:text-emerald-400 mb-1">${percent}%</div><p class="text-gray-500 text-sm">أكملت ${completed} من ${total} درس</p><div class="progress-bar-bg mt-3"><div class="progress-bar-fill" style="width:${percent}%"></div></div></div>`;
  levelsData?.forEach(level => {
    const lc = level.lessons.filter(l => state.completedLessons.includes(l.id)).length;
    const lp = Math.round((lc / level.lessons.length) * 100);
    const qs = state.quizScores[level.id];
    html += `<div class="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"><div class="flex justify-between items-center mb-1"><span class="font-bold text-sm dark:text-white flex items-center gap-2"><span class="w-2 h-2 rounded-full" style="background:${level.color}"></span>${level.title}</span><span class="text-xs text-gray-500">${lc}/${level.lessons.length}</span></div><div class="progress-bar-bg" style="height:6px"><div class="progress-bar-fill" style="width:${lp}%"></div></div>${qs!==undefined?`<div class="text-xs mt-1.5 font-bold ${qs>=70?'text-emerald-600':'text-red-500'}"><i class="fas ${qs>=70?'fa-check-circle':'fa-times-circle'} ml-1"></i>الاختبار: ${qs}%</div>`:''}</div>`;
  });
  content.innerHTML = html;
}

function resetProgress() {
  if (!confirm('هل أنت متأكد من إعادة تعيين كل التقدم؟')) return;
  state = { completedLessons: [], quizScores: {}, bookmarks: [], notes: {}, expandedLevels: [], darkMode: state.darkMode };
  saveState();
  toggleProgress();
  showHome();
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.ctrlKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); showSearch(); setTimeout(() => document.getElementById('mainSearch')?.focus(), 100); }
  if (e.key === 'Escape') { const m = document.getElementById('progressModal'); if (!m.classList.contains('hidden')) toggleProgress(); closeAuthModal(); }
});

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  loadState();
  loadAuth();
  renderAuthButton();
  
  // Init DB on first load
  try { await fetch('/api/init-db'); } catch(e) {}
  
  if (isLoggedIn()) {
    const valid = await verifySession();
    if (valid) await loadProgressFromServer();
    else renderAuthButton();
  }
  
  showHome();
  initScrollToTop();
});
