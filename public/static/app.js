// ============================================
// ACCOUNTING ACADEMY - MAIN APP
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
  if (icon) icon.className = state.darkMode ? 'fas fa-sun' : 'fas fa-moon';
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
        <div class="flex items-center gap-3 mb-3">
          <i class="fas fa-graduation-cap text-3xl"></i>
          <div>
            <h2 class="text-2xl font-bold">أكاديمية المحاسبة المالية</h2>
            <p class="opacity-90 text-sm">رحلتك من الصفر إلى الاحتراف في عالم المحاسبة</p>
          </div>
        </div>
        ${completedCount > 0 ? `
          <div class="mt-4 bg-white/10 rounded-xl p-3">
            <div class="flex justify-between text-sm mb-1">
              <span>التقدم العام</span>
              <span>${progress}% (${completedCount}/${totalLessons})</span>
            </div>
            <div class="progress-bar-bg" style="background: rgba(255,255,255,0.2)">
              <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
          </div>
        ` : ''}
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-number">${statsData?.totalLevels || 0}</span>
            <span class="stat-label">مساقات</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${statsData?.totalLessons || 0}</span>
            <span class="stat-label">درس</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${statsData?.totalQuizzes || 0}</span>
            <span class="stat-label">اختبار</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${statsData?.totalGlossaryTerms || 0}</span>
            <span class="stat-label">مصطلح</span>
          </div>
        </div>
      </div>
    </div>

    <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">
      <i class="fas fa-book-open text-emerald-500 ml-2"></i>المساقات والدروس
    </h2>
    <div class="space-y-3" id="levelsContainer">
  `;

  levelsData.forEach((level, idx) => {
    const completedInLevel = level.lessons.filter(l => state.completedLessons.includes(l.id)).length;
    const isExpanded = state.expandedLevels.includes(level.id);
    
    html += `
      <div class="level-card ${isExpanded ? 'expanded' : ''}" id="level-${level.id}">
        <div class="level-header" onclick="toggleLevel('${level.id}')">
          <div class="level-icon" style="background: ${level.color}">
            <i class="fas ${level.icon}"></i>
          </div>
          <div class="level-info">
            <h3>${level.title}</h3>
            <p>${level.subtitle}</p>
          </div>
          <div class="level-badge" style="background: ${level.colorLight}; color: ${level.color}">
            ${completedInLevel}/${level.lessonsCount} <i class="fas fa-chevron-down mr-1" style="font-size:10px; transition: transform 0.3s; ${isExpanded ? 'transform: rotate(180deg)' : ''}"></i>
          </div>
        </div>
        <div class="level-lessons">
          ${level.lessons.map(lesson => {
            const isCompleted = state.completedLessons.includes(lesson.id);
            return `
              <div class="lesson-item" onclick="showLesson('${level.id}', '${lesson.id}')">
                <div class="lesson-icon" style="background: ${level.colorLight}; color: ${level.color}">
                  <i class="fas ${lesson.icon}"></i>
                </div>
                <span class="lesson-title">${lesson.title}</span>
                <span class="video-badge"><i class="fab fa-youtube"></i> فيديو</span>
                <span class="lesson-duration"><i class="far fa-clock ml-1"></i>${lesson.duration}</span>
                ${isCompleted ? '<span class="lesson-check"><i class="fas fa-check-circle"></i></span>' : ''}
              </div>
            `;
          }).join('')}
          ${quizzesData?.find(q => q.levelId === level.id) ? `
            <div class="lesson-item" onclick="showQuiz('${level.id}')" style="background: linear-gradient(135deg, ${level.colorLight}, transparent); border: 1px dashed ${level.color}">
              <div class="lesson-icon" style="background: ${level.color}; color: white">
                <i class="fas fa-clipboard-check"></i>
              </div>
              <span class="lesson-title" style="color: ${level.color}">اختبار ${level.title}</span>
              <span class="lesson-duration">
                ${state.quizScores[level.id] !== undefined ? `<span style="color: ${state.quizScores[level.id] >= 70 ? '#10b981' : '#ef4444'}; font-weight: 700">${state.quizScores[level.id]}%</span>` : 'لم يُحل بعد'}
              </span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  html += '</div>';
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
  
  // Toggle chevron
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
        <!-- Navigation -->
        <div class="lesson-nav">
          <button class="lesson-nav-btn btn-back" onclick="showHome()">
            <i class="fas fa-arrow-right"></i> الرئيسية
          </button>
          ${prevLesson ? `
            <button class="lesson-nav-btn btn-prev" onclick="showLesson('${levelId}', '${prevLesson.id}')">
              <i class="fas fa-arrow-right"></i> السابق
            </button>
          ` : ''}
          ${nextLesson ? `
            <button class="lesson-nav-btn btn-next" onclick="showLesson('${levelId}', '${nextLesson.id}')">
              التالي <i class="fas fa-arrow-left"></i>
            </button>
          ` : ''}
        </div>

        <!-- Lesson Header -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700">
          <div class="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div class="text-sm font-semibold mb-1" style="color: ${lesson.levelColor}">${lesson.levelTitle}</div>
              <h2 class="text-2xl font-bold text-gray-800 dark:text-white">${lesson.title}</h2>
              <div class="flex items-center gap-3 mt-2 text-sm text-gray-500">
                <span><i class="far fa-clock ml-1"></i>${lesson.duration}</span>
                <span><i class="fab fa-youtube text-red-500 ml-1"></i>يتضمن فيديو تعليمي</span>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="toggleBookmark('${lessonId}')" class="nav-btn" title="${isBookmarked ? 'إزالة من المحفوظات' : 'حفظ'}">
                <i class="fas fa-bookmark ${isBookmarked ? 'text-yellow-500' : ''}"></i>
              </button>
              <button onclick="toggleComplete('${lessonId}')" class="nav-btn" title="${isCompleted ? 'إلغاء الإتمام' : 'تم الإنتهاء'}">
                <i class="fas fa-check-circle ${isCompleted ? 'text-emerald-500' : ''}"></i>
              </button>
              <button onclick="window.print()" class="nav-btn" title="طباعة"><i class="fas fa-print"></i></button>
            </div>
          </div>
        </div>

        <!-- Video Section -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-200 dark:border-gray-700">
          <div class="video-label">
            <i class="fab fa-youtube text-lg"></i>
            <span>${lesson.videoTitle}</span>
          </div>
          <div class="video-container">
            <iframe 
              src="https://www.youtube.com/embed/${lesson.videoId}?rel=0&modestbranding=1" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
              loading="lazy"
              title="${lesson.videoTitle}">
            </iframe>
          </div>
        </div>

        <!-- Lesson Content -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">
            <i class="fas fa-file-alt text-emerald-500 ml-2"></i>محتوى الدرس
          </h3>
          ${lesson.content}
        </div>

        <!-- Notes Section -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3">
            <i class="fas fa-sticky-note text-yellow-500 ml-2"></i>ملاحظاتي
          </h3>
          <textarea 
            id="lessonNote" 
            class="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:border-emerald-500 outline-none transition resize-y min-h-[100px]"
            placeholder="اكتب ملاحظاتك هنا..." 
            oninput="saveNote('${lessonId}')"
            rows="4"
          >${note}</textarea>
        </div>

        <!-- Bottom Navigation -->
        <div class="flex justify-between items-center mt-4">
          ${prevLesson ? `
            <button class="lesson-nav-btn btn-prev" onclick="showLesson('${levelId}', '${prevLesson.id}')">
              <i class="fas fa-arrow-right"></i> ${prevLesson.title}
            </button>
          ` : '<div></div>'}
          ${nextLesson ? `
            <button class="lesson-nav-btn btn-next" onclick="showLesson('${levelId}', '${nextLesson.id}')">
              ${nextLesson.title} <i class="fas fa-arrow-left"></i>
            </button>
          ` : `
            <button class="lesson-nav-btn btn-next" onclick="showHome()" style="background: #f59e0b">
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
            <i class="fas fa-arrow-right"></i> الرئيسية
          </button>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">
            <i class="fas fa-clipboard-check ml-2" style="color: ${level.color}"></i>${quiz.title}
          </h2>
          <p class="text-gray-500 text-sm">${quiz.questions.length} أسئلة - اختر الإجابة الصحيحة</p>
        </div>
        <div id="quizQuestions">
    `;

    quiz.questions.forEach((q, qi) => {
      html += `
        <div class="quiz-question" id="qq-${qi}">
          <h4>${qi + 1}. ${q.q}</h4>
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
          <button onclick="submitQuiz('${levelId}')" id="submitQuizBtn" class="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-lg">
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
  // Remove previous selection
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
    
    // Disable all options
    document.querySelectorAll(`#qq-${qi} .quiz-option`).forEach(el => {
      el.style.pointerEvents = 'none';
    });

    // Show correct/wrong
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

  // Hide submit button
  document.getElementById('submitQuizBtn').style.display = 'none';

  // Show result
  const passed = score >= 70;
  document.getElementById('quizResult').innerHTML = `
    <div class="quiz-result ${passed ? 'pass' : 'fail'} animate-fade">
      <i class="fas ${passed ? 'fa-trophy' : 'fa-redo'} text-4xl mb-3"></i>
      <h3 class="text-2xl font-bold mb-2">${passed ? 'أحسنت! نجحت في الاختبار' : 'لم تنجح - حاول مرة أخرى'}</h3>
      <p class="text-lg">حصلت على ${correct} من ${quiz.questions.length} (${score}%)</p>
      <div class="mt-4 flex gap-3 justify-center">
        <button onclick="showQuiz('${levelId}')" class="px-6 py-2 bg-white/30 rounded-lg font-bold hover:bg-white/40 transition">
          <i class="fas fa-redo ml-1"></i>إعادة المحاولة
        </button>
        <button onclick="showHome()" class="px-6 py-2 bg-white/30 rounded-lg font-bold hover:bg-white/40 transition">
          <i class="fas fa-home ml-1"></i>الرئيسية
        </button>
      </div>
    </div>
  `;
}

// ============================================
// SECTIONS (Glossary, Calculator, Search)
// ============================================
function showSection(section) {
  if (section === 'glossary') showGlossary();
  else if (section === 'calculator') showCalculator();
  else if (section === 'search') showSearch();
}

function showGlossary() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="animate-fade">
      <div class="lesson-nav">
        <button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-arrow-right"></i> الرئيسية</button>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">
          <i class="fas fa-book text-emerald-500 ml-2"></i>معجم المصطلحات المحاسبية (${glossaryData.length} مصطلح)
        </h2>
        <input type="text" class="search-input" placeholder="ابحث عن مصطلح..." oninput="filterGlossary(this.value)" id="glossarySearch">
      </div>
      <div id="glossaryList">
        ${glossaryData.map(g => `
          <div class="glossary-item">
            <div class="flex justify-between items-start">
              <span class="glossary-term">${g.term}</span>
              <span class="glossary-english">${g.english}</span>
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
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(q) ? '' : 'none';
  });
}

function showCalculator() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="animate-fade">
      <div class="lesson-nav">
        <button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-arrow-right"></i> الرئيسية</button>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white">
          <i class="fas fa-calculator text-emerald-500 ml-2"></i>الآلة الحاسبة المحاسبية
        </h2>
      </div>
      <div class="calc-grid">
        <!-- Depreciation -->
        <div class="calc-card">
          <h4><i class="fas fa-chart-line text-blue-500"></i>حاسبة الإهلاك (القسط الثابت)</h4>
          <input type="number" class="calc-input" id="depCost" placeholder="تكلفة الأصل">
          <input type="number" class="calc-input" id="depSalvage" placeholder="القيمة التخريدية">
          <input type="number" class="calc-input" id="depLife" placeholder="العمر الإنتاجي (سنوات)">
          <button class="calc-btn" onclick="calcDepreciation()">احسب الإهلاك</button>
          <div class="calc-result" id="depResult"></div>
        </div>
        <!-- Break-Even -->
        <div class="calc-card">
          <h4><i class="fas fa-crosshairs text-red-500"></i>حاسبة نقطة التعادل</h4>
          <input type="number" class="calc-input" id="beFixed" placeholder="التكاليف الثابتة">
          <input type="number" class="calc-input" id="bePrice" placeholder="سعر بيع الوحدة">
          <input type="number" class="calc-input" id="beVariable" placeholder="التكلفة المتغيرة للوحدة">
          <button class="calc-btn" onclick="calcBreakEven()">احسب نقطة التعادل</button>
          <div class="calc-result" id="beResult"></div>
        </div>
        <!-- Current Ratio -->
        <div class="calc-card">
          <h4><i class="fas fa-balance-scale text-green-500"></i>حاسبة النسبة الجارية</h4>
          <input type="number" class="calc-input" id="crAssets" placeholder="الأصول المتداولة">
          <input type="number" class="calc-input" id="crLiab" placeholder="الخصوم المتداولة">
          <button class="calc-btn" onclick="calcCurrentRatio()">احسب النسبة</button>
          <div class="calc-result" id="crResult"></div>
        </div>
        <!-- VAT -->
        <div class="calc-card">
          <h4><i class="fas fa-percent text-yellow-500"></i>حاسبة ضريبة القيمة المضافة</h4>
          <input type="number" class="calc-input" id="vatAmount" placeholder="المبلغ قبل الضريبة">
          <input type="number" class="calc-input" id="vatRate" placeholder="نسبة الضريبة %" value="15">
          <button class="calc-btn" onclick="calcVAT()">احسب الضريبة</button>
          <div class="calc-result" id="vatResult"></div>
        </div>
        <!-- Zakat -->
        <div class="calc-card">
          <h4><i class="fas fa-mosque text-emerald-600"></i>حاسبة الزكاة</h4>
          <input type="number" class="calc-input" id="zakatAssets" placeholder="الأصول الزكوية">
          <input type="number" class="calc-input" id="zakatLiab" placeholder="الخصوم المسموح بحسمها">
          <button class="calc-btn" onclick="calcZakat()">احسب الزكاة</button>
          <div class="calc-result" id="zakatResult"></div>
        </div>
        <!-- Profit Margin -->
        <div class="calc-card">
          <h4><i class="fas fa-chart-pie text-purple-500"></i>حاسبة هامش الربح</h4>
          <input type="number" class="calc-input" id="pmRevenue" placeholder="الإيرادات (المبيعات)">
          <input type="number" class="calc-input" id="pmProfit" placeholder="صافي الربح">
          <button class="calc-btn" onclick="calcProfitMargin()">احسب الهامش</button>
          <div class="calc-result" id="pmResult"></div>
        </div>
      </div>
    </div>
  `;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Calculator functions
function calcDepreciation() {
  const cost = parseFloat(document.getElementById('depCost').value);
  const salvage = parseFloat(document.getElementById('depSalvage').value);
  const life = parseFloat(document.getElementById('depLife').value);
  if (!cost || !life) { document.getElementById('depResult').textContent = 'يرجى إدخال القيم'; return; }
  const dep = (cost - (salvage || 0)) / life;
  document.getElementById('depResult').innerHTML = `الإهلاك السنوي: <strong>${dep.toLocaleString('ar-SA')} ريال</strong>`;
}

function calcBreakEven() {
  const fixed = parseFloat(document.getElementById('beFixed').value);
  const price = parseFloat(document.getElementById('bePrice').value);
  const variable = parseFloat(document.getElementById('beVariable').value);
  if (!fixed || !price || price <= variable) { document.getElementById('beResult').textContent = 'يرجى إدخال قيم صحيحة'; return; }
  const units = Math.ceil(fixed / (price - variable));
  const value = units * price;
  document.getElementById('beResult').innerHTML = `نقطة التعادل: <strong>${units.toLocaleString('ar-SA')} وحدة</strong> = <strong>${value.toLocaleString('ar-SA')} ريال</strong>`;
}

function calcCurrentRatio() {
  const assets = parseFloat(document.getElementById('crAssets').value);
  const liab = parseFloat(document.getElementById('crLiab').value);
  if (!assets || !liab) { document.getElementById('crResult').textContent = 'يرجى إدخال القيم'; return; }
  const ratio = (assets / liab).toFixed(2);
  const status = ratio >= 2 ? 'ممتازة ✅' : ratio >= 1 ? 'مقبولة ⚠️' : 'ضعيفة ❌';
  document.getElementById('crResult').innerHTML = `النسبة الجارية: <strong>${ratio}</strong> (${status})`;
}

function calcVAT() {
  const amount = parseFloat(document.getElementById('vatAmount').value);
  const rate = parseFloat(document.getElementById('vatRate').value);
  if (!amount || !rate) { document.getElementById('vatResult').textContent = 'يرجى إدخال القيم'; return; }
  const tax = amount * (rate / 100);
  const total = amount + tax;
  document.getElementById('vatResult').innerHTML = `الضريبة: <strong>${tax.toLocaleString('ar-SA')} ريال</strong> | الإجمالي: <strong>${total.toLocaleString('ar-SA')} ريال</strong>`;
}

function calcZakat() {
  const assets = parseFloat(document.getElementById('zakatAssets').value);
  const liab = parseFloat(document.getElementById('zakatLiab').value) || 0;
  if (!assets) { document.getElementById('zakatResult').textContent = 'يرجى إدخال القيم'; return; }
  const base = assets - liab;
  const zakat = base * 0.025;
  document.getElementById('zakatResult').innerHTML = `الوعاء الزكوي: <strong>${base.toLocaleString('ar-SA')}</strong> | الزكاة: <strong>${zakat.toLocaleString('ar-SA')} ريال</strong>`;
}

function calcProfitMargin() {
  const revenue = parseFloat(document.getElementById('pmRevenue').value);
  const profit = parseFloat(document.getElementById('pmProfit').value);
  if (!revenue || profit === undefined) { document.getElementById('pmResult').textContent = 'يرجى إدخال القيم'; return; }
  const margin = ((profit / revenue) * 100).toFixed(1);
  document.getElementById('pmResult').innerHTML = `هامش الربح: <strong>${margin}%</strong>`;
}

// Search
function showSearch() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="animate-fade">
      <div class="lesson-nav">
        <button class="lesson-nav-btn btn-back" onclick="showHome()"><i class="fas fa-arrow-right"></i> الرئيسية</button>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-200 dark:border-gray-700">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">
          <i class="fas fa-search text-emerald-500 ml-2"></i>البحث في الدروس والمصطلحات
        </h2>
        <div class="relative">
          <input type="text" class="search-input" placeholder="ابحث عن درس أو مصطلح..." oninput="performSearch(this.value)" id="mainSearch" autofocus>
          <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>
      <div id="searchResults"></div>
    </div>
  `;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function performSearch(query) {
  if (!query || query.length < 2) { document.getElementById('searchResults').innerHTML = ''; return; }
  const q = query.toLowerCase();
  let results = [];

  // Search lessons
  levelsData.forEach(level => {
    level.lessons.forEach(lesson => {
      if (lesson.title.toLowerCase().includes(q)) {
        results.push({
          type: 'lesson',
          title: lesson.title,
          subtitle: level.title,
          icon: lesson.icon,
          color: level.color,
          action: `showLesson('${level.id}', '${lesson.id}')`
        });
      }
    });
  });

  // Search glossary
  glossaryData.forEach(g => {
    if (g.term.includes(q) || g.english.toLowerCase().includes(q) || g.definition.includes(q)) {
      results.push({
        type: 'glossary',
        title: `${g.term} (${g.english})`,
        subtitle: g.definition,
        icon: 'fa-book',
        color: '#6b7280'
      });
    }
  });

  const resultsDiv = document.getElementById('searchResults');
  if (results.length === 0) {
    resultsDiv.innerHTML = '<div class="text-center text-gray-500 py-8"><i class="fas fa-search text-3xl mb-3 block"></i>لا توجد نتائج</div>';
    return;
  }

  resultsDiv.innerHTML = results.map(r => `
    <div class="glossary-item cursor-pointer" ${r.action ? `onclick="${r.action}"` : ''}>
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: ${r.color}20; color: ${r.color}">
          <i class="fas ${r.icon} text-sm"></i>
        </div>
        <div>
          <div class="font-bold text-gray-800 dark:text-white">${r.title}</div>
          <div class="text-sm text-gray-500">${r.subtitle}</div>
        </div>
        <span class="mr-auto text-xs px-2 py-1 rounded-lg ${r.type === 'lesson' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}">${r.type === 'lesson' ? 'درس' : 'مصطلح'}</span>
      </div>
    </div>
  `).join('');
}

// ============================================
// HELPERS
// ============================================
function toggleComplete(lessonId) {
  const idx = state.completedLessons.indexOf(lessonId);
  if (idx > -1) state.completedLessons.splice(idx, 1);
  else state.completedLessons.push(lessonId);
  saveState();
  // Refresh current view
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

  let html = `
    <div class="text-center mb-4">
      <div class="text-4xl font-black text-emerald-600 dark:text-emerald-400">${percent}%</div>
      <p class="text-gray-500 text-sm">أكملت ${completed} من ${total} درس</p>
      <div class="progress-bar-bg mt-2"><div class="progress-bar-fill" style="width: ${percent}%"></div></div>
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
          <span class="font-bold text-sm dark:text-white">${level.title}</span>
          <span class="text-xs text-gray-500">${levelCompleted}/${levelLessons}</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${levelPercent}%"></div></div>
        ${quizScore !== undefined ? `<div class="text-xs mt-1 ${quizScore >= 70 ? 'text-emerald-600' : 'text-red-500'}">نتيجة الاختبار: ${quizScore}%</div>` : ''}
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
});
