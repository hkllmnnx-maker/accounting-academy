// ============================================
// ACCOUNTING ACADEMY - MAIN APP v2.0
// ============================================

// State Management
let state = {
  completedLessons: [],
  quizScores: {},
  bookmarks: [],
  notes: {},
  expandedLevels: [],
  darkMode: false
};

// Load state from localStorage
function loadState() {
  try {
    const saved = localStorage.getItem('accountingAcademy');
    if (saved) state = { ...state, ...JSON.parse(saved) };
    if (state.darkMode) document.documentElement.classList.add('dark');
    updateDarkModeIcon();
  } catch (e) { console.error('Error loading state:', e); }
}

function saveState() {
  try { localStorage.setItem('accountingAcademy', JSON.stringify(state)); }
  catch (e) { console.error('Error saving state:', e); }
}

// Data cache
let levelsData = null;
let glossaryData = null;
let quizzesData = null;
let statsData = null;

// Fetch data
async function fetchData() {
  try {
    const [levels, glossary, quizzes, stats] = await Promise.all([
      fetch('/api/levels').then(r => r.json()),
      fetch('/api/glossary').then(r => r.json()),
      fetch('/api/quizzes').then(r => r.json()),
      fetch('/api/stats').then(r => r.json())
    ]);
    levelsData = levels;
    glossaryData = glossary;
    quizzesData = quizzes;
    statsData = stats;
  } catch (e) { console.error('Error fetching data:', e); }
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
// SCROLL TO TOP
// ============================================
function initScrollToTop() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) btn.classList.add('visible');
    else btn.classList.remove('visible');
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
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
    <!-- Hero Section -->
    <div class="hero-section animate-fade">
      <div class="relative z-10">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center animate-float">
            <i class="fas fa-graduation-cap text-3xl"></i>
          </div>
          <div>
            <h2 class="text-2xl sm:text-3xl font-black leading-tight">أكاديمية المحاسبة المالية</h2>
            <p class="opacity-90 text-sm mt-1">رحلتك الشاملة من الصفر إلى الاحتراف في عالم المحاسبة</p>
          </div>
        </div>
        ${completedCount > 0 ? `
          <div class="mt-5 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div class="flex justify-between text-sm mb-2">
              <span><i class="fas fa-chart-line ml-1"></i>التقدم العام</span>
              <span class="font-bold">${progress}% (${completedCount}/${totalLessons} درس)</span>
            </div>
            <div class="progress-bar-bg" style="background: rgba(255,255,255,0.2)">
              <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
            ${progress >= 100 ? '<div class="text-center mt-2 text-yellow-300 font-bold"><i class="fas fa-trophy ml-1"></i>مبروك! أتممت جميع الدروس</div>' : ''}
          </div>
        ` : ''}
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-number">${statsData?.totalLevels || 0}</span>
            <span class="stat-label"><i class="fas fa-layer-group ml-1"></i>مساق</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${statsData?.totalLessons || 0}</span>
            <span class="stat-label"><i class="fas fa-play-circle ml-1"></i>درس</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${statsData?.totalQuizzes || 0}</span>
            <span class="stat-label"><i class="fas fa-clipboard-check ml-1"></i>اختبار</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${statsData?.totalGlossaryTerms || 0}</span>
            <span class="stat-label"><i class="fas fa-book ml-1"></i>مصطلح</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions stagger-children">
      <button onclick="showSection('search')" class="quick-action-btn">
        <i class="fas fa-search text-blue-500"></i>
        <span>بحث سريع</span>
      </button>
      <button onclick="showSection('glossary')" class="quick-action-btn">
        <i class="fas fa-book text-emerald-500"></i>
        <span>المعجم المحاسبي</span>
      </button>
      <button onclick="showSection('calculator')" class="quick-action-btn">
        <i class="fas fa-calculator text-purple-500"></i>
        <span>الآلة الحاسبة</span>
      </button>
      <button onclick="showSection('about')" class="quick-action-btn">
        <i class="fas fa-info-circle text-amber-500"></i>
        <span>عن الأكاديمية</span>
      </button>
    </div>

    <!-- Courses Section -->
    <div class="section-header">
      <h2><i class="fas fa-book-open text-emerald-500"></i>المساقات والدروس</h2>
      <span class="section-count">${statsData?.totalLevels || 0} مساقات</span>
    </div>
    <div class="space-y-3 stagger-children" id="levelsContainer">
  `;

  levelsData.forEach((level, idx) => {
    const completedInLevel = level.lessons.filter(l => state.completedLessons.includes(l.id)).length;
    const isExpanded = state.expandedLevels.includes(level.id);
    const levelPercent = Math.round((completedInLevel / level.lessonsCount) * 100);
    
    html += `
      <div class="level-card ${isExpanded ? 'expanded' : ''}" id="level-${level.id}">
        <div class="level-header" onclick="toggleLevel('${level.id}')">
          <div class="level-icon" style="background: linear-gradient(135deg, ${level.color}, ${level.color}dd)">
            <i class="fas ${level.icon}"></i>
          </div>
          <div class="level-info">
            <h3>${level.title}</h3>
            <p>${level.subtitle} &bull; ${level.lessonsCount} دروس</p>
            ${completedInLevel > 0 ? `
              <div class="mt-1.5">
                <div class="progress-bar-bg" style="height:5px"><div class="progress-bar-fill" style="width: ${levelPercent}%"></div></div>
              </div>
            ` : ''}
          </div>
          <div class="level-badge" style="background: ${level.colorLight}; color: ${level.color}">
            ${completedInLevel}/${level.lessonsCount}
            <i class="fas fa-chevron-down" style="font-size:10px; transition: transform 0.3s; ${isExpanded ? 'transform: rotate(180deg)' : ''}"></i>
          </div>
        </div>
        <div class="level-lessons">
          ${level.lessons.map((lesson, li) => {
            const isCompleted = state.completedLessons.includes(lesson.id);
            const isBookmarked = state.bookmarks.includes(lesson.id);
            return `
              <div class="lesson-item" onclick="showLesson('${level.id}', '${lesson.id}')">
                <div class="lesson-icon" style="background: ${level.colorLight}; color: ${level.color}">
                  <i class="fas ${lesson.icon}"></i>
                </div>
                <span class="lesson-title">${lesson.title}</span>
                <span class="video-badge"><i class="fab fa-youtube"></i> فيديو</span>
                <span class="lesson-duration"><i class="far fa-clock ml-1"></i>${lesson.duration}</span>
                ${isBookmarked ? '<span style="color:#f59e0b;font-size:0.8rem"><i class="fas fa-bookmark"></i></span>' : ''}
                ${isCompleted ? '<span class="lesson-check"><i class="fas fa-check-circle"></i></span>' : ''}
              </div>
            `;
          }).join('')}
          ${quizzesData?.find(q => q.levelId === level.id) ? `
            <div class="lesson-item" onclick="showQuiz('${level.id}')" style="background: linear-gradient(135deg, ${level.colorLight}80, transparent); border: 1px dashed ${level.color}60">
              <div class="lesson-icon" style="background: ${level.color}; color: white">
                <i class="fas fa-clipboard-check"></i>
              </div>
              <span class="lesson-title" style="color: ${level.color}; font-weight:700">اختبار ${level.title}</span>
              <span class="lesson-duration">
                ${state.quizScores[level.id] !== undefined ? `<span style="color: ${state.quizScores[level.id] >= 70 ? '#10b981' : '#ef4444'}; font-weight: 700">${state.quizScores[level.id]}%</span>` : '<span style="color:#9ca3af">لم يُحل</span>'}
              </span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  html += '</div>';

  // Tips Section
  html += `
    <div class="tips-section mt-8 animate-fade">
      <div class="section-header" style="margin-bottom:1rem">
        <h2><i class="fas fa-lightbulb text-amber-500"></i>نصائح مهنية</h2>
      </div>
      <div class="stagger-children">
        <div class="tip-card">
          <div class="tip-icon" style="background:#ecfdf5; color:#059669"><i class="fas fa-road"></i></div>
          <div class="tip-content">
            <h4>ابدأ بالأساسيات أولاً</h4>
            <p>لا تتخطى المستوى المبتدئ حتى لو كانت لديك خبرة سابقة. الأساسيات المتينة هي مفتاح النجاح في المحاسبة.</p>
          </div>
        </div>
        <div class="tip-card">
          <div class="tip-icon" style="background:#eff6ff; color:#3b82f6"><i class="fas fa-pencil-alt"></i></div>
          <div class="tip-content">
            <h4>طبّق ما تتعلم عملياً</h4>
            <p>حل التمارين والأمثلة يدوياً. المحاسبة مهارة تحتاج ممارسة عملية وليست فقط حفظ نظري.</p>
          </div>
        </div>
        <div class="tip-card">
          <div class="tip-icon" style="background:#fef3c7; color:#f59e0b"><i class="fas fa-certificate"></i></div>
          <div class="tip-content">
            <h4>استهدف شهادة مهنية</h4>
            <p>الشهادات المهنية مثل CPA و SOCPA و CMA ترفع من قيمتك في سوق العمل بشكل كبير.</p>
          </div>
        </div>
        <div class="tip-card">
          <div class="tip-icon" style="background:#f5f3ff; color:#8b5cf6"><i class="fas fa-sync-alt"></i></div>
          <div class="tip-content">
            <h4>تابع التحديثات المحاسبية</h4>
            <p>المعايير المحاسبية تتطور باستمرار. تابع تحديثات IFRS وهيئة الزكاة والضريبة لتبقى على اطلاع.</p>
          </div>
        </div>
        <div class="tip-card">
          <div class="tip-icon" style="background:#fce7f3; color:#ec4899"><i class="fas fa-laptop-code"></i></div>
          <div class="tip-content">
            <h4>أتقن البرامج المحاسبية</h4>
            <p>تعلم Excel المتقدم وبرنامج محاسبي واحد على الأقل (QuickBooks أو SAP أو قيود) لزيادة فرصك الوظيفية.</p>
          </div>
        </div>
        <div class="tip-card">
          <div class="tip-icon" style="background:#f0fdfa; color:#14b8a6"><i class="fas fa-users"></i></div>
          <div class="tip-content">
            <h4>انضم لمجتمعات المحاسبين</h4>
            <p>شارك في مجتمعات المحاسبين المهنية والمنتديات المتخصصة لتبادل الخبرات والاستفادة من تجارب الآخرين.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Resources Section -->
    <div class="section-header mt-8">
      <h2><i class="fas fa-external-link-alt text-blue-500"></i>موارد مفيدة</h2>
    </div>
    <div class="resources-grid stagger-children mb-8">
      <a href="https://www.ifrs.org" target="_blank" rel="noopener" class="resource-card">
        <div class="resource-icon" style="background: linear-gradient(135deg, #3b82f6, #2563eb)"><i class="fas fa-globe"></i></div>
        <h4>IFRS Foundation</h4>
        <p>الموقع الرسمي لمعايير التقارير المالية الدولية</p>
      </a>
      <a href="https://www.zatca.gov.sa" target="_blank" rel="noopener" class="resource-card">
        <div class="resource-icon" style="background: linear-gradient(135deg, #10b981, #059669)"><i class="fas fa-landmark"></i></div>
        <h4>هيئة الزكاة والضريبة</h4>
        <p>الأنظمة واللوائح الضريبية في المملكة العربية السعودية</p>
      </a>
      <a href="https://socpa.org.sa" target="_blank" rel="noopener" class="resource-card">
        <div class="resource-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed)"><i class="fas fa-award"></i></div>
        <h4>الهيئة السعودية للمحاسبين</h4>
        <p>SOCPA - زمالة المحاسبين والتسجيل المهني</p>
      </a>
      <a href="https://www.investopedia.com/accounting-4689674" target="_blank" rel="noopener" class="resource-card">
        <div class="resource-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706)"><i class="fas fa-book-reader"></i></div>
        <h4>Investopedia</h4>
        <p>مرجع شامل لمفاهيم المحاسبة والمالية بالإنجليزية</p>
      </a>
    </div>
  `;

  main.innerHTML = html;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// Toggle Level
// ============================================
function toggleLevel(levelId) {
  const idx = state.expandedLevels.indexOf(levelId);
  if (idx > -1) state.expandedLevels.splice(idx, 1);
  else state.expandedLevels.push(levelId);
  saveState();
  
  const card = document.getElementById(`level-${levelId}`);
  if (card) card.classList.toggle('expanded');
  
  const badge = card?.querySelector('.level-badge i');
  if (badge) {
    badge.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : '';
  }
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
    main.innerHTML = `
      <div class="lesson-view animate-fade">
        <!-- Breadcrumb -->
        <div class="lesson-nav">
          <button class="lesson-nav-btn btn-back" onclick="showHome()">
            <i class="fas fa-home"></i> الرئيسية
          </button>
          <span class="text-gray-400 dark:text-gray-600 text-sm mx-1">/</span>
          <span class="text-sm font-semibold" style="color: ${lesson.levelColor}">${lesson.levelTitle}</span>
          ${prevLesson ? `
            <button class="lesson-nav-btn btn-prev mr-auto" onclick="showLesson('${levelId}', '${prevLesson.id}')">
              <i class="fas fa-arrow-right"></i> السابق
            </button>
          ` : ''}
          ${nextLesson ? `
            <button class="lesson-nav-btn btn-next ${!prevLesson ? 'mr-auto' : ''}" onclick="showLesson('${levelId}', '${nextLesson.id}')">
              التالي <i class="fas fa-arrow-left"></i>
            </button>
          ` : ''}
        </div>

        <!-- Lesson Header -->
        <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
          <div class="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div class="inline-flex items-center gap-2 text-xs font-bold mb-2 px-3 py-1 rounded-full" style="background: ${lesson.levelColor}15; color: ${lesson.levelColor}">
                <i class="fas fa-layer-group"></i>${lesson.levelTitle} &bull; الدرس ${lessonIdx + 1} من ${level.lessonsCount}
              </div>
              <h2 class="text-2xl font-black text-gray-800 dark:text-white">${lesson.title}</h2>
              <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span><i class="far fa-clock ml-1"></i>${lesson.duration}</span>
                <span><i class="fab fa-youtube text-red-500 ml-1"></i>يتضمن فيديو تعليمي</span>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="toggleBookmark('${lessonId}')" class="nav-btn" title="${isBookmarked ? 'إزالة من المحفوظات' : 'حفظ'}">
                <i class="fas fa-bookmark ${isBookmarked ? 'text-yellow-500' : ''}"></i>
              </button>
              <button onclick="toggleComplete('${lessonId}')" class="nav-btn ${isCompleted ? '' : ''}" title="${isCompleted ? 'إلغاء الإتمام' : 'تم الإنتهاء'}" style="${isCompleted ? 'background:#dcfce7;' : ''}">
                <i class="fas fa-check-circle ${isCompleted ? 'text-emerald-500' : ''}"></i>
              </button>
              <button onclick="window.print()" class="nav-btn" title="طباعة"><i class="fas fa-print"></i></button>
            </div>
          </div>
        </div>

        <!-- Video Section -->
        <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-4 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
          <div class="video-label">
            <i class="fab fa-youtube text-lg"></i>
            <span>${lesson.videoTitle}</span>
          </div>
          <div class="video-container">
            <iframe 
              src="https://www.youtube.com/embed/${lesson.videoId}?rel=0&modestbranding=1&hl=ar" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen loading="lazy"
              title="${lesson.videoTitle}">
            </iframe>
          </div>
        </div>

        <!-- Lesson Content -->
        <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <i class="fas fa-file-alt text-emerald-500 text-sm"></i>
            </div>
            محتوى الدرس
          </h3>
          ${lesson.content}
        </div>

        <!-- Notes Section -->
        <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center">
              <i class="fas fa-sticky-note text-yellow-500 text-sm"></i>
            </div>
            ملاحظاتي الشخصية
          </h3>
          <textarea 
            id="lessonNote" 
            class="w-full p-4 border-2 border-gray-200 dark:border-gray-600/50 rounded-xl bg-gray-50 dark:bg-gray-900/50 dark:text-white focus:border-emerald-500 outline-none transition-all resize-y"
            placeholder="اكتب ملاحظاتك هنا... يمكنك تدوين النقاط المهمة أو الأسئلة التي تريد مراجعتها لاحقاً" 
            oninput="saveNote('${lessonId}')"
            rows="4"
            style="min-height:100px"
          >${note}</textarea>
        </div>

        <!-- Bottom Navigation -->
        <div class="flex justify-between items-center mt-6 gap-3 flex-wrap">
          ${prevLesson ? `
            <button class="lesson-nav-btn btn-prev" onclick="showLesson('${levelId}', '${prevLesson.id}')">
              <i class="fas fa-arrow-right"></i> ${prevLesson.title}
            </button>
          ` : '<div></div>'}
          
          <button class="lesson-nav-btn" onclick="toggleComplete('${lessonId}')" style="background:${isCompleted ? '#f59e0b' : '#059669'}; color:white; padding: 10px 24px; font-size: 0.95rem;">
            <i class="fas ${isCompleted ? 'fa-undo' : 'fa-check'} ml-1"></i>
            ${isCompleted ? 'إلغاء إتمام الدرس' : 'تم إنهاء الدرس'}
          </button>

          ${nextLesson ? `
            <button class="lesson-nav-btn btn-next" onclick="showLesson('${levelId}', '${nextLesson.id}')">
              ${nextLesson.title} <i class="fas fa-arrow-left"></i>
            </button>
          ` : `
            <button class="lesson-nav-btn" onclick="showHome()" style="background: #f59e0b; color: white">
              <i class="fas fa-home ml-1"></i> العودة للرئيسية
            </button>
          `}
        </div>
      </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    console.error('Error loading lesson:', e);
    alert('حدث خطأ في تحميل الدرس');
  }
}

// ============================================
// QUIZ
// ============================================
async function showQuiz(levelId) {
  try {
    const res = await fetch(`/api/quiz/${levelId}`);
    const quiz = await res.json();
    if (quiz.error) { alert('الاختبار غير موجود'); return; }

    const main = document.getElementById('mainContent');
    const level = levelsData.find(l => l.id === levelId);

    let html = `
      <div class="quiz-container animate-fade">
        <div class="lesson-nav">
          <button class="lesson-nav-btn btn-back" onclick="showHome()">
            <i class="fas fa-home"></i> الرئيسية
          </button>
          <span class="text-gray-400 dark:text-gray-600 text-sm mx-1">/</span>
          <span class="text-sm font-semibold" style="color: ${level.color}">${level.title}</span>
        </div>
        <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl" style="background: ${level.color}">
              <i class="fas fa-clipboard-check"></i>
            </div>
            <div>
              <h2 class="text-xl font-black text-gray-800 dark:text-white">${quiz.title}</h2>
              <p class="text-gray-500 text-sm">${quiz.questions.length} اسئلة - اختر الاجابة الصحيحة لكل سؤال</p>
            </div>
          </div>
        </div>
        <div id="quizQuestions" class="stagger-children">
    `;

    quiz.questions.forEach((q, qi) => {
      html += `
        <div class="quiz-question" id="qq-${qi}">
          <h4><span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ml-2" style="background:${level.color}">${qi + 1}</span>${q.q}</h4>
          <div class="space-y-2">
            ${q.options.map((opt, oi) => `
              <label class="quiz-option" id="qo-${qi}-${oi}" onclick="selectOption(${qi}, ${oi})">
                <div class="quiz-radio"></div>
                <span>${opt}</span>
                <input type="radio" name="q${qi}" value="${oi}">
              </label>
            `).join('')}
          </div>
        </div>
      `;
    });

    html += `
        </div>
        <div class="text-center mt-6">
          <button onclick="submitQuiz('${levelId}')" id="submitQuizBtn" class="px-10 py-3.5 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1" style="background: linear-gradient(135deg, ${level.color}, ${level.color}dd)">
            <i class="fas fa-paper-plane ml-2"></i>تسليم الاختبار
          </button>
        </div>
        <div id="quizResult"></div>
      </div>
    `;

    main.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    console.error('Error loading quiz:', e);
  }
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
    
    document.querySelectorAll(`#qq-${qi} .quiz-option`).forEach(el => {
      el.style.pointerEvents = 'none';
    });

    if (selectedVal === q.correct) {
      correct++;
      document.getElementById(`qo-${qi}-${selectedVal}`).classList.add('correct');
    } else {
      if (selectedVal >= 0) document.getElementById(`qo-${qi}-${selectedVal}`).classList.add('wrong');
      document.getElementById(`qo-${qi}-${q.correct}`).classList.add('correct');
    }
  });

  const score = Math.round((correct / quiz.questions.length) * 100);
  state.quizScores[levelId] = score;
  saveState();

  document.getElementById('submitQuizBtn').style.display = 'none';

  const passed = score >= 70;
  document.getElementById('quizResult').innerHTML = `
    <div class="quiz-result ${passed ? 'pass' : 'fail'} animate-bounce-in">
      <i class="fas ${passed ? 'fa-trophy' : 'fa-redo'} text-5xl mb-3"></i>
      <h3 class="text-2xl font-black mb-2">${passed ? 'أحسنت! نجحت في الاختبار' : 'لم تنجح - حاول مرة أخرى'}</h3>
      <p class="text-lg mb-1">حصلت على ${correct} من ${quiz.questions.length} (${score}%)</p>
      <div class="mt-4 flex gap-3 justify-center flex-wrap">
        <button onclick="showQuiz('${levelId}')" class="px-6 py-2.5 bg-white/30 rounded-xl font-bold hover:bg-white/40 transition">
          <i class="fas fa-redo ml-1"></i>إعادة المحاولة
        </button>
        <button onclick="showHome()" class="px-6 py-2.5 bg-white/30 rounded-xl font-bold hover:bg-white/40 transition">
          <i class="fas fa-home ml-1"></i>الرئيسية
        </button>
      </div>
    </div>
  `;
  
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
  main.innerHTML = `
    <div class="animate-fade">
      <div class="lesson-nav">
        <button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-home"></i> الرئيسية</button>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <i class="fas fa-book text-emerald-500 text-xl"></i>
          </div>
          <div>
            <h2 class="text-xl font-black text-gray-800 dark:text-white">معجم المصطلحات المحاسبية</h2>
            <p class="text-sm text-gray-500">${glossaryData.length} مصطلح عربي - إنجليزي</p>
          </div>
        </div>
        <div class="relative">
          <input type="text" class="search-input" placeholder="ابحث عن مصطلح عربي أو إنجليزي..." oninput="filterGlossary(this.value)" id="glossarySearch">
          <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>
      <div id="glossaryList" class="stagger-children">
        ${glossaryData.map(g => `
          <div class="glossary-item">
            <div class="flex justify-between items-start gap-2">
              <span class="glossary-term">${g.term}</span>
              <span class="glossary-english text-left" dir="ltr">${g.english}</span>
            </div>
            <div class="glossary-def">${g.definition}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterGlossary(query) {
  const items = document.querySelectorAll('.glossary-item');
  const q = query.toLowerCase();
  let count = 0;
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    const show = text.includes(q);
    item.style.display = show ? '' : 'none';
    if (show) count++;
  });
}

function showCalculator() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="animate-fade">
      <div class="lesson-nav">
        <button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-home"></i> الرئيسية</button>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
            <i class="fas fa-calculator text-purple-500 text-xl"></i>
          </div>
          <div>
            <h2 class="text-xl font-black text-gray-800 dark:text-white">الآلة الحاسبة المحاسبية</h2>
            <p class="text-sm text-gray-500">أدوات حسابية احترافية للمحاسبين</p>
          </div>
        </div>
      </div>
      <div class="calc-grid stagger-children">
        <!-- Depreciation -->
        <div class="calc-card">
          <h4><i class="fas fa-chart-line text-blue-500"></i>حاسبة الإهلاك (القسط الثابت)</h4>
          <input type="number" class="calc-input" id="depCost" placeholder="تكلفة الأصل (ريال)">
          <input type="number" class="calc-input" id="depSalvage" placeholder="القيمة التخريدية (ريال)">
          <input type="number" class="calc-input" id="depLife" placeholder="العمر الإنتاجي (سنوات)">
          <button class="calc-btn" onclick="calcDepreciation()"><i class="fas fa-calculator ml-1"></i>احسب الإهلاك</button>
          <div class="calc-result" id="depResult"></div>
        </div>
        <!-- Break-Even -->
        <div class="calc-card">
          <h4><i class="fas fa-crosshairs text-red-500"></i>حاسبة نقطة التعادل</h4>
          <input type="number" class="calc-input" id="beFixed" placeholder="التكاليف الثابتة (ريال)">
          <input type="number" class="calc-input" id="bePrice" placeholder="سعر بيع الوحدة (ريال)">
          <input type="number" class="calc-input" id="beVariable" placeholder="التكلفة المتغيرة للوحدة (ريال)">
          <button class="calc-btn" onclick="calcBreakEven()"><i class="fas fa-calculator ml-1"></i>احسب نقطة التعادل</button>
          <div class="calc-result" id="beResult"></div>
        </div>
        <!-- Current Ratio -->
        <div class="calc-card">
          <h4><i class="fas fa-balance-scale text-green-500"></i>حاسبة النسبة الجارية</h4>
          <input type="number" class="calc-input" id="crAssets" placeholder="الأصول المتداولة (ريال)">
          <input type="number" class="calc-input" id="crLiab" placeholder="الخصوم المتداولة (ريال)">
          <button class="calc-btn" onclick="calcCurrentRatio()"><i class="fas fa-calculator ml-1"></i>احسب النسبة</button>
          <div class="calc-result" id="crResult"></div>
        </div>
        <!-- VAT -->
        <div class="calc-card">
          <h4><i class="fas fa-percent text-yellow-500"></i>حاسبة ضريبة القيمة المضافة</h4>
          <input type="number" class="calc-input" id="vatAmount" placeholder="المبلغ قبل الضريبة (ريال)">
          <input type="number" class="calc-input" id="vatRate" placeholder="نسبة الضريبة %" value="15">
          <button class="calc-btn" onclick="calcVAT()"><i class="fas fa-calculator ml-1"></i>احسب الضريبة</button>
          <div class="calc-result" id="vatResult"></div>
        </div>
        <!-- Zakat -->
        <div class="calc-card">
          <h4><i class="fas fa-mosque text-emerald-600"></i>حاسبة الزكاة</h4>
          <input type="number" class="calc-input" id="zakatAssets" placeholder="الأصول الزكوية (ريال)">
          <input type="number" class="calc-input" id="zakatLiab" placeholder="الخصوم المسموح بحسمها (ريال)">
          <button class="calc-btn" onclick="calcZakat()"><i class="fas fa-calculator ml-1"></i>احسب الزكاة</button>
          <div class="calc-result" id="zakatResult"></div>
        </div>
        <!-- Profit Margin -->
        <div class="calc-card">
          <h4><i class="fas fa-chart-pie text-purple-500"></i>حاسبة هامش الربح</h4>
          <input type="number" class="calc-input" id="pmRevenue" placeholder="الإيرادات / المبيعات (ريال)">
          <input type="number" class="calc-input" id="pmProfit" placeholder="صافي الربح (ريال)">
          <button class="calc-btn" onclick="calcProfitMargin()"><i class="fas fa-calculator ml-1"></i>احسب الهامش</button>
          <div class="calc-result" id="pmResult"></div>
        </div>
        <!-- ROE -->
        <div class="calc-card">
          <h4><i class="fas fa-percentage text-indigo-500"></i>حاسبة العائد على حقوق الملكية</h4>
          <input type="number" class="calc-input" id="roeProfit" placeholder="صافي الربح (ريال)">
          <input type="number" class="calc-input" id="roeEquity" placeholder="حقوق الملكية (ريال)">
          <button class="calc-btn" onclick="calcROE()"><i class="fas fa-calculator ml-1"></i>احسب ROE</button>
          <div class="calc-result" id="roeResult"></div>
        </div>
        <!-- Quick Ratio -->
        <div class="calc-card">
          <h4><i class="fas fa-tachometer-alt text-teal-500"></i>حاسبة النسبة السريعة</h4>
          <input type="number" class="calc-input" id="qrAssets" placeholder="الأصول المتداولة (ريال)">
          <input type="number" class="calc-input" id="qrInventory" placeholder="المخزون (ريال)">
          <input type="number" class="calc-input" id="qrLiab" placeholder="الخصوم المتداولة (ريال)">
          <button class="calc-btn" onclick="calcQuickRatio()"><i class="fas fa-calculator ml-1"></i>احسب النسبة السريعة</button>
          <div class="calc-result" id="qrResult"></div>
        </div>
      </div>
    </div>
  `;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Calculator functions
function formatNum(n) { return n.toLocaleString('ar-SA'); }

function calcDepreciation() {
  const cost = parseFloat(document.getElementById('depCost').value);
  const salvage = parseFloat(document.getElementById('depSalvage').value);
  const life = parseFloat(document.getElementById('depLife').value);
  if (!cost || !life) { document.getElementById('depResult').innerHTML = '<i class="fas fa-exclamation-circle text-red-400 ml-1"></i>يرجى إدخال القيم'; return; }
  const dep = (cost - (salvage || 0)) / life;
  const rate = ((1/life)*100).toFixed(1);
  document.getElementById('depResult').innerHTML = `<div>الإهلاك السنوي: <strong>${formatNum(dep)} ريال</strong></div><div class="text-xs mt-1 opacity-80">معدل الإهلاك: ${rate}%</div>`;
}

function calcBreakEven() {
  const fixed = parseFloat(document.getElementById('beFixed').value);
  const price = parseFloat(document.getElementById('bePrice').value);
  const variable = parseFloat(document.getElementById('beVariable').value);
  if (!fixed || !price || price <= variable) { document.getElementById('beResult').innerHTML = '<i class="fas fa-exclamation-circle text-red-400 ml-1"></i>يرجى إدخال قيم صحيحة'; return; }
  const cm = price - variable;
  const units = Math.ceil(fixed / cm);
  const value = units * price;
  document.getElementById('beResult').innerHTML = `<div>نقطة التعادل: <strong>${formatNum(units)} وحدة</strong></div><div class="text-xs mt-1 opacity-80">= ${formatNum(value)} ريال | هامش المساهمة: ${formatNum(cm)} ريال/وحدة</div>`;
}

function calcCurrentRatio() {
  const assets = parseFloat(document.getElementById('crAssets').value);
  const liab = parseFloat(document.getElementById('crLiab').value);
  if (!assets || !liab) { document.getElementById('crResult').innerHTML = '<i class="fas fa-exclamation-circle text-red-400 ml-1"></i>يرجى إدخال القيم'; return; }
  const ratio = (assets / liab).toFixed(2);
  const status = ratio >= 2 ? 'ممتازة' : ratio >= 1 ? 'مقبولة' : 'ضعيفة';
  const statusColor = ratio >= 2 ? '#10b981' : ratio >= 1 ? '#f59e0b' : '#ef4444';
  document.getElementById('crResult').innerHTML = `<div>النسبة الجارية: <strong>${ratio}</strong></div><div class="text-xs mt-1" style="color:${statusColor}"><i class="fas fa-circle text-[6px] ml-1"></i>${status}</div>`;
}

function calcVAT() {
  const amount = parseFloat(document.getElementById('vatAmount').value);
  const rate = parseFloat(document.getElementById('vatRate').value);
  if (!amount || !rate) { document.getElementById('vatResult').innerHTML = '<i class="fas fa-exclamation-circle text-red-400 ml-1"></i>يرجى إدخال القيم'; return; }
  const tax = amount * (rate / 100);
  const total = amount + tax;
  document.getElementById('vatResult').innerHTML = `<div>الضريبة: <strong>${formatNum(tax)} ريال</strong></div><div class="text-xs mt-1 opacity-80">الإجمالي شامل الضريبة: ${formatNum(total)} ريال</div>`;
}

function calcZakat() {
  const assets = parseFloat(document.getElementById('zakatAssets').value);
  const liab = parseFloat(document.getElementById('zakatLiab').value) || 0;
  if (!assets) { document.getElementById('zakatResult').innerHTML = '<i class="fas fa-exclamation-circle text-red-400 ml-1"></i>يرجى إدخال القيم'; return; }
  const base = assets - liab;
  const zakat = base * 0.025;
  document.getElementById('zakatResult').innerHTML = `<div>الزكاة المستحقة: <strong>${formatNum(zakat)} ريال</strong></div><div class="text-xs mt-1 opacity-80">الوعاء الزكوي: ${formatNum(base)} ريال</div>`;
}

function calcProfitMargin() {
  const revenue = parseFloat(document.getElementById('pmRevenue').value);
  const profit = parseFloat(document.getElementById('pmProfit').value);
  if (!revenue) { document.getElementById('pmResult').innerHTML = '<i class="fas fa-exclamation-circle text-red-400 ml-1"></i>يرجى إدخال القيم'; return; }
  const margin = ((profit / revenue) * 100).toFixed(1);
  const status = margin >= 20 ? 'ممتاز' : margin >= 10 ? 'جيد' : margin >= 0 ? 'ضعيف' : 'خسارة';
  document.getElementById('pmResult').innerHTML = `<div>هامش الربح: <strong>${margin}%</strong></div><div class="text-xs mt-1 opacity-80">التقييم: ${status}</div>`;
}

function calcROE() {
  const profit = parseFloat(document.getElementById('roeProfit').value);
  const equity = parseFloat(document.getElementById('roeEquity').value);
  if (!profit || !equity) { document.getElementById('roeResult').innerHTML = '<i class="fas fa-exclamation-circle text-red-400 ml-1"></i>يرجى إدخال القيم'; return; }
  const roe = ((profit / equity) * 100).toFixed(1);
  document.getElementById('roeResult').innerHTML = `<div>العائد على حقوق الملكية: <strong>${roe}%</strong></div><div class="text-xs mt-1 opacity-80">${roe >= 15 ? 'أداء ممتاز' : roe >= 10 ? 'أداء جيد' : 'أداء يحتاج تحسين'}</div>`;
}

function calcQuickRatio() {
  const assets = parseFloat(document.getElementById('qrAssets').value);
  const inventory = parseFloat(document.getElementById('qrInventory').value) || 0;
  const liab = parseFloat(document.getElementById('qrLiab').value);
  if (!assets || !liab) { document.getElementById('qrResult').innerHTML = '<i class="fas fa-exclamation-circle text-red-400 ml-1"></i>يرجى إدخال القيم'; return; }
  const ratio = ((assets - inventory) / liab).toFixed(2);
  const status = ratio >= 1 ? 'ممتازة' : ratio >= 0.5 ? 'مقبولة' : 'ضعيفة';
  document.getElementById('qrResult').innerHTML = `<div>النسبة السريعة: <strong>${ratio}</strong></div><div class="text-xs mt-1 opacity-80">التقييم: ${status}</div>`;
}

// Search
function showSearch() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="animate-fade">
      <div class="lesson-nav">
        <button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-home"></i> الرئيسية</button>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <i class="fas fa-search text-blue-500 text-xl"></i>
          </div>
          <div>
            <h2 class="text-xl font-black text-gray-800 dark:text-white">البحث الشامل</h2>
            <p class="text-sm text-gray-500">ابحث في الدروس والمصطلحات المحاسبية</p>
          </div>
        </div>
        <div class="relative">
          <input type="text" class="search-input" placeholder="اكتب كلمة البحث..." oninput="performSearch(this.value)" id="mainSearch" autofocus>
          <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>
      <div id="searchResults"></div>
    </div>
  `;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function performSearch(query) {
  if (!query || query.length < 2) { document.getElementById('searchResults').innerHTML = '<div class="text-center text-gray-400 py-8 text-sm">اكتب كلمتين على الأقل للبحث</div>'; return; }
  const q = query.toLowerCase();
  let results = [];

  levelsData.forEach(level => {
    level.lessons.forEach(lesson => {
      if (lesson.title.toLowerCase().includes(q)) {
        results.push({
          type: 'lesson', title: lesson.title, subtitle: level.title,
          icon: lesson.icon, color: level.color,
          action: `showLesson('${level.id}', '${lesson.id}')`
        });
      }
    });
  });

  glossaryData.forEach(g => {
    if (g.term.includes(q) || g.english.toLowerCase().includes(q) || g.definition.includes(q)) {
      results.push({
        type: 'glossary', title: `${g.term} (${g.english})`,
        subtitle: g.definition, icon: 'fa-book', color: '#6b7280'
      });
    }
  });

  const resultsDiv = document.getElementById('searchResults');
  if (results.length === 0) {
    resultsDiv.innerHTML = '<div class="text-center text-gray-500 py-10"><i class="fas fa-search text-4xl mb-3 block text-gray-300"></i><p class="font-bold">لا توجد نتائج</p><p class="text-sm mt-1">جرّب كلمات بحث مختلفة</p></div>';
    return;
  }

  resultsDiv.innerHTML = `<p class="text-sm text-gray-500 mb-3 px-1">تم العثور على <strong>${results.length}</strong> نتيجة</p>` + results.map(r => `
    <div class="glossary-item cursor-pointer" ${r.action ? `onclick="${r.action}"` : ''}>
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ${r.color}15; color: ${r.color}">
          <i class="fas ${r.icon} text-sm"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="font-bold text-gray-800 dark:text-white text-sm">${r.title}</div>
          <div class="text-xs text-gray-500 truncate">${r.subtitle}</div>
        </div>
        <span class="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg font-bold ${r.type === 'lesson' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'bg-gray-100 text-gray-600 dark:bg-gray-700'}">${r.type === 'lesson' ? 'درس' : 'مصطلح'}</span>
      </div>
    </div>
  `).join('');
}

// About Page
function showAbout() {
  const main = document.getElementById('mainContent');
  const totalHours = Math.round((statsData?.totalLessons || 0) * 0.5);
  main.innerHTML = `
    <div class="animate-fade">
      <div class="lesson-nav">
        <button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-home"></i> الرئيسية</button>
      </div>

      <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-8 mb-6 border border-gray-200 dark:border-gray-700/50 shadow-sm text-center">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
          <i class="fas fa-graduation-cap"></i>
        </div>
        <h2 class="text-2xl font-black text-gray-800 dark:text-white mb-2">أكاديمية المحاسبة المالية</h2>
        <p class="text-gray-500 max-w-2xl mx-auto leading-relaxed">
          منصة تعليمية عربية شاملة تهدف لتعليم المحاسبة المالية من الصفر إلى الاحتراف.
          تجمع بين المحتوى النظري الغني والفيديوهات التعليمية والاختبارات التفاعلية والأدوات الحسابية المتخصصة.
        </p>
      </div>

      <div class="about-features stagger-children">
        <div class="about-feature bg-emerald-50 dark:bg-emerald-900/20">
          <i class="fas fa-book-open text-emerald-500"></i>
          <h4>${statsData?.totalLessons || 0} درس تعليمي</h4>
          <p>محتوى شامل يغطي كل فروع المحاسبة من الأساسيات إلى المستوى الاحترافي</p>
        </div>
        <div class="about-feature bg-red-50 dark:bg-red-900/20">
          <i class="fab fa-youtube text-red-500"></i>
          <h4>فيديوهات يوتيوب</h4>
          <p>كل درس مرفق بفيديو تعليمي من أفضل القنوات المحاسبية العربية</p>
        </div>
        <div class="about-feature bg-blue-50 dark:bg-blue-900/20">
          <i class="fas fa-clipboard-check text-blue-500"></i>
          <h4>${statsData?.totalQuizzes || 0} اختبارات تفاعلية</h4>
          <p>اختبر معلوماتك بعد كل مساق وتابع تقدمك بدقة</p>
        </div>
        <div class="about-feature bg-purple-50 dark:bg-purple-900/20">
          <i class="fas fa-calculator text-purple-500"></i>
          <h4>أدوات حسابية متقدمة</h4>
          <p>8 آلات حاسبة محاسبية متخصصة لمساعدتك في العمليات الحسابية</p>
        </div>
        <div class="about-feature bg-amber-50 dark:bg-amber-900/20">
          <i class="fas fa-book text-amber-500"></i>
          <h4>${statsData?.totalGlossaryTerms || 0} مصطلح محاسبي</h4>
          <p>معجم شامل عربي-إنجليزي لأهم المصطلحات المحاسبية</p>
        </div>
        <div class="about-feature bg-teal-50 dark:bg-teal-900/20">
          <i class="fas fa-save text-teal-500"></i>
          <h4>حفظ التقدم تلقائياً</h4>
          <p>ملاحظاتك ومفضلاتك وتقدمك محفوظ دائماً في متصفحك</p>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 mt-6 border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4"><i class="fas fa-layer-group text-emerald-500 ml-2"></i>المساقات المتاحة</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${levelsData.map(l => `
            <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all" onclick="showHome(); setTimeout(() => toggleLevel('${l.id}'), 300)">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white" style="background:${l.color}"><i class="fas ${l.icon}"></i></div>
              <div>
                <div class="font-bold text-sm text-gray-800 dark:text-white">${l.title}</div>
                <div class="text-xs text-gray-500">${l.lessonsCount} دروس &bull; ${l.subtitle}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// HELPERS
// ============================================
function toggleComplete(lessonId) {
  const idx = state.completedLessons.indexOf(lessonId);
  if (idx > -1) state.completedLessons.splice(idx, 1);
  else state.completedLessons.push(lessonId);
  saveState();
  const levelId = levelsData.find(l => l.lessons.some(le => le.id === lessonId))?.id;
  if (levelId) showLesson(levelId, lessonId);
}

function toggleBookmark(lessonId) {
  const idx = state.bookmarks.indexOf(lessonId);
  if (idx > -1) state.bookmarks.splice(idx, 1);
  else state.bookmarks.push(lessonId);
  saveState();
  const levelId = levelsData.find(l => l.lessons.some(le => le.id === lessonId))?.id;
  if (levelId) showLesson(levelId, lessonId);
}

function saveNote(lessonId) {
  const note = document.getElementById('lessonNote')?.value || '';
  state.notes[lessonId] = note;
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
  const totalQuizzesTaken = Object.keys(state.quizScores).length;
  const avgScore = totalQuizzesTaken > 0 ? Math.round(Object.values(state.quizScores).reduce((a,b)=>a+b,0) / totalQuizzesTaken) : 0;

  let html = `
    <div class="text-center mb-5">
      <div class="text-5xl font-black text-emerald-600 dark:text-emerald-400 mb-1">${percent}%</div>
      <p class="text-gray-500 text-sm">أكملت ${completed} من ${total} درس</p>
      <div class="progress-bar-bg mt-3"><div class="progress-bar-fill" style="width: ${percent}%"></div></div>
      <div class="flex justify-around mt-4 text-center">
        <div><div class="text-lg font-bold text-blue-500">${totalQuizzesTaken}</div><div class="text-xs text-gray-500">اختبارات</div></div>
        <div><div class="text-lg font-bold text-purple-500">${avgScore}%</div><div class="text-xs text-gray-500">متوسط</div></div>
        <div><div class="text-lg font-bold text-amber-500">${state.bookmarks.length}</div><div class="text-xs text-gray-500">محفوظات</div></div>
      </div>
    </div>
  `;

  levelsData?.forEach(level => {
    const levelLessons = level.lessons.length;
    const levelCompleted = level.lessons.filter(l => state.completedLessons.includes(l.id)).length;
    const levelPercent = Math.round((levelCompleted / levelLessons) * 100);
    const quizScore = state.quizScores[level.id];

    html += `
      <div class="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <div class="flex justify-between items-center mb-1">
          <span class="font-bold text-sm dark:text-white flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" style="background:${level.color}"></span>
            ${level.title}
          </span>
          <span class="text-xs text-gray-500">${levelCompleted}/${levelLessons}</span>
        </div>
        <div class="progress-bar-bg" style="height:6px"><div class="progress-bar-fill" style="width: ${levelPercent}%"></div></div>
        ${quizScore !== undefined ? `<div class="text-xs mt-1.5 font-bold ${quizScore >= 70 ? 'text-emerald-600' : 'text-red-500'}"><i class="fas ${quizScore >= 70 ? 'fa-check-circle' : 'fa-times-circle'} ml-1"></i>الاختبار: ${quizScore}%</div>` : ''}
      </div>
    `;
  });

  content.innerHTML = html;
}

function exportProgress() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'accounting-academy-progress.json';
  a.click(); URL.revokeObjectURL(url);
}

function resetProgress() {
  if (!confirm('هل أنت متأكد من إعادة تعيين كل التقدم؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
  state = { completedLessons: [], quizScores: {}, bookmarks: [], notes: {}, expandedLevels: [], darkMode: state.darkMode };
  saveState();
  toggleProgress();
  showHome();
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.ctrlKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    showSearch();
    setTimeout(() => document.getElementById('mainSearch')?.focus(), 100);
  }
  if (e.key === 'Escape') {
    const modal = document.getElementById('progressModal');
    if (!modal.classList.contains('hidden')) toggleProgress();
  }
});

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  showHome();
  initScrollToTop();
});
