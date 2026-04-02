import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = { DB: D1Database }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

// ============================================================
// HELPER: Simple hash (Web Crypto API compatible)
// ============================================================
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'accounting-academy-salt-2026')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============================================================
// AUTH API ROUTES
// ============================================================

// Register
app.post('/api/auth/register', async (c) => {
  try {
    const { username, email, password, displayName } = await c.req.json()
    if (!username || !email || !password || !displayName) {
      return c.json({ error: 'جميع الحقول مطلوبة' }, 400)
    }
    if (password.length < 6) {
      return c.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, 400)
    }

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ?').bind(email, username).first()
    if (existing) {
      return c.json({ error: 'البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل' }, 409)
    }

    const passwordHash = await hashPassword(password)
    const result = await c.env.DB.prepare('INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)').bind(username, email, passwordHash, displayName).run()
    const userId = result.meta.last_row_id

    // Create initial progress
    await c.env.DB.prepare('INSERT INTO user_progress (user_id) VALUES (?)').bind(userId).run()

    // Create session
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await c.env.DB.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').bind(userId, token, expiresAt).run()

    return c.json({ token, user: { id: userId, username, email, displayName } })
  } catch (e: any) {
    return c.json({ error: 'حدث خطأ في التسجيل: ' + e.message }, 500)
  }
})

// Login
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) {
      return c.json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, 400)
    }

    const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    if (!user) {
      return c.json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }, 401)
    }

    const passwordHash = await hashPassword(password)
    if (user.password_hash !== passwordHash) {
      return c.json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }, 401)
    }

    // Clean old sessions
    await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < datetime("now")').bind(user.id).run()

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await c.env.DB.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').bind(user.id, token, expiresAt).run()

    return c.json({ token, user: { id: user.id, username: user.username, email: user.email, displayName: user.display_name } })
  } catch (e: any) {
    return c.json({ error: 'حدث خطأ في تسجيل الدخول' }, 500)
  }
})

// Verify session & get user
app.get('/api/auth/me', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) return c.json({ error: 'غير مصرح' }, 401)

    const session: any = await c.env.DB.prepare('SELECT s.*, u.id as user_id, u.username, u.email, u.display_name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime("now")').bind(token).first()
    if (!session) return c.json({ error: 'الجلسة منتهية' }, 401)

    return c.json({ user: { id: session.user_id, username: session.username, email: session.email, displayName: session.display_name } })
  } catch (e) {
    return c.json({ error: 'خطأ' }, 500)
  }
})

// Logout
app.post('/api/auth/logout', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (token) {
      await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    }
    return c.json({ success: true })
  } catch (e) {
    return c.json({ success: true })
  }
})

// Save progress
app.post('/api/progress/save', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) return c.json({ error: 'غير مصرح' }, 401)

    const session: any = await c.env.DB.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")').bind(token).first()
    if (!session) return c.json({ error: 'الجلسة منتهية' }, 401)

    const data = await c.req.json()
    await c.env.DB.prepare(`UPDATE user_progress SET 
      completed_lessons = ?, quiz_scores = ?, bookmarks = ?, notes = ?, 
      expanded_levels = ?, dark_mode = ?, updated_at = datetime("now")
      WHERE user_id = ?`).bind(
      JSON.stringify(data.completedLessons || []),
      JSON.stringify(data.quizScores || {}),
      JSON.stringify(data.bookmarks || []),
      JSON.stringify(data.notes || {}),
      JSON.stringify(data.expandedLevels || []),
      data.darkMode ? 1 : 0,
      session.user_id
    ).run()

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: 'خطأ في حفظ التقدم' }, 500)
  }
})

// Load progress
app.get('/api/progress/load', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) return c.json({ error: 'غير مصرح' }, 401)

    const session: any = await c.env.DB.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")').bind(token).first()
    if (!session) return c.json({ error: 'الجلسة منتهية' }, 401)

    const progress: any = await c.env.DB.prepare('SELECT * FROM user_progress WHERE user_id = ?').bind(session.user_id).first()
    if (!progress) return c.json({ completedLessons: [], quizScores: {}, bookmarks: [], notes: {}, expandedLevels: [], darkMode: false })

    return c.json({
      completedLessons: JSON.parse(progress.completed_lessons || '[]'),
      quizScores: JSON.parse(progress.quiz_scores || '{}'),
      bookmarks: JSON.parse(progress.bookmarks || '[]'),
      notes: JSON.parse(progress.notes || '{}'),
      expandedLevels: JSON.parse(progress.expanded_levels || '[]'),
      darkMode: progress.dark_mode === 1
    })
  } catch (e) {
    return c.json({ error: 'خطأ في تحميل التقدم' }, 500)
  }
})

// ============================================================
// DATA: Course Levels with ALL Lessons (expanded)
// ============================================================

const courseLevels = [
  {
    id: 'beginner',
    title: 'المستوى المبتدئ',
    subtitle: 'أساسيات المحاسبة المالية',
    icon: 'fa-seedling',
    color: '#10b981',
    colorLight: '#d1fae5',
    lessons: [
      {
        id: 'b1', title: 'ما هي المحاسبة المالية؟', duration: '15 دقيقة', icon: 'fa-question-circle',
        videoId: 'NHRk18rumz4', videoTitle: 'شرح مقرر المحاسبة المالية كاملا',
        content: `<div class="content-section"><h3><i class="fas fa-lightbulb text-yellow-500"></i> تعريف المحاسبة المالية</h3><div class="info-box green"><p><strong>المحاسبة المالية</strong> هي عملية منهجية لتسجيل وتصنيف وتلخيص وتفسير المعاملات المالية للمنشأة، بهدف إنتاج معلومات مالية مفيدة لاتخاذ القرارات الاقتصادية.</p></div><h3><i class="fas fa-bullseye text-red-500"></i> أهداف المحاسبة المالية</h3><ul class="styled-list"><li>تسجيل جميع العمليات المالية بشكل دقيق ومنظم</li><li>إعداد القوائم المالية (قائمة الدخل، الميزانية العمومية، التدفقات النقدية)</li><li>توفير معلومات مالية موثوقة للمستخدمين الداخليين والخارجيين</li><li>المساعدة في اتخاذ القرارات الاقتصادية والاستثمارية</li><li>الرقابة على أصول المنشأة وحمايتها</li><li>تحديد نتيجة النشاط من ربح أو خسارة</li></ul><h3><i class="fas fa-users text-blue-500"></i> مستخدمو المعلومات المحاسبية</h3><div class="table-container"><table><thead><tr><th>المستخدم</th><th>الغرض من المعلومات</th></tr></thead><tbody><tr><td>الإدارة</td><td>التخطيط والرقابة واتخاذ القرارات</td></tr><tr><td>المستثمرون</td><td>تقييم أداء الشركة واتخاذ قرارات الاستثمار</td></tr><tr><td>الدائنون والبنوك</td><td>تقييم القدرة على السداد</td></tr><tr><td>الجهات الحكومية</td><td>الضرائب والرقابة التنظيمية</td></tr><tr><td>الموظفون</td><td>تقييم استقرار المنشأة ومستحقاتهم</td></tr></tbody></table></div><h3><i class="fas fa-code-branch text-purple-500"></i> فروع المحاسبة</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-chart-line text-green-500"></i><strong>محاسبة مالية</strong><p>تسجيل المعاملات وإعداد القوائم</p></div><div class="mini-card"><i class="fas fa-cogs text-blue-500"></i><strong>محاسبة إدارية</strong><p>معلومات للقرارات الداخلية</p></div><div class="mini-card"><i class="fas fa-calculator text-orange-500"></i><strong>محاسبة تكاليف</strong><p>تحديد تكلفة المنتجات</p></div><div class="mini-card"><i class="fas fa-search text-red-500"></i><strong>مراجعة وتدقيق</strong><p>فحص القوائم المالية</p></div><div class="mini-card"><i class="fas fa-landmark text-indigo-500"></i><strong>محاسبة حكومية</strong><p>محاسبة الوحدات الحكومية</p></div><div class="mini-card"><i class="fas fa-file-invoice-dollar text-yellow-600"></i><strong>محاسبة ضريبية</strong><p>حساب وتخطيط الضرائب</p></div></div></div>`
      },
      {
        id: 'b2', title: 'المعادلة المحاسبية الأساسية', duration: '20 دقيقة', icon: 'fa-balance-scale',
        videoId: '3-jD5F_djq0', videoTitle: 'شرح المعادلة المحاسبية - Accounting Equation',
        content: `<div class="content-section"><h3><i class="fas fa-equals text-blue-500"></i> المعادلة المحاسبية</h3><div class="equation-box"><span class="eq-part assets">الأصول</span><span class="eq-sign">=</span><span class="eq-part liabilities">الخصوم</span><span class="eq-sign">+</span><span class="eq-part equity">حقوق الملكية</span></div><div class="info-box blue"><p>هذه المعادلة هي أساس نظام القيد المزدوج وتعكس حقيقة أن كل أصل يتم تمويله إما من خلال الاقتراض (خصوم) أو من أموال المالكين (حقوق ملكية).</p></div><h3><i class="fas fa-puzzle-piece text-green-500"></i> مكونات المعادلة</h3><div class="table-container"><table><thead><tr><th>العنصر</th><th>التعريف</th><th>أمثلة</th></tr></thead><tbody><tr><td><strong>الأصول</strong></td><td>الموارد الاقتصادية المملوكة للمنشأة</td><td>النقدية، المخزون، المباني، المعدات</td></tr><tr><td><strong>الخصوم</strong></td><td>التزامات المنشأة تجاه الغير</td><td>القروض، الموردون، الأوراق المستحقة</td></tr><tr><td><strong>حقوق الملكية</strong></td><td>حقوق أصحاب المنشأة في أصولها</td><td>رأس المال، الأرباح المحتجزة</td></tr></tbody></table></div><h3><i class="fas fa-tasks text-orange-500"></i> أمثلة عملية</h3><div class="example-box"><p><strong>مثال 1:</strong> بدأ أحمد مشروعا برأس مال 100,000 ريال نقدا</p><div class="mini-equation">أصول (نقدية 100,000) = خصوم (0) + حقوق ملكية (رأس مال 100,000)</div></div><div class="example-box"><p><strong>مثال 2:</strong> اشترى معدات بـ 30,000 ريال نقدا</p><div class="mini-equation">أصول (نقدية 70,000 + معدات 30,000) = خصوم (0) + حقوق ملكية (100,000)</div></div><div class="example-box"><p><strong>مثال 3:</strong> اقترض 50,000 ريال من البنك</p><div class="mini-equation">أصول (نقدية 120,000 + معدات 30,000) = خصوم (قرض 50,000) + حقوق ملكية (100,000)</div></div></div>`
      },
      {
        id: 'b3', title: 'الحسابات وأنواعها', duration: '25 دقيقة', icon: 'fa-folder-open',
        videoId: 'HYluTilJVOw', videoTitle: 'مبادئ المحاسبة - الفصل الأول',
        content: `<div class="content-section"><h3><i class="fas fa-sitemap text-blue-500"></i> أنواع الحسابات الرئيسية</h3><div class="accounts-grid"><div class="account-card" style="border-right:4px solid #10b981"><div class="account-icon" style="background:#d1fae5"><i class="fas fa-building text-green-600"></i></div><h4>الأصول (Assets)</h4><p>الموارد الاقتصادية المملوكة للمنشأة</p><ul><li>أصول متداولة: نقدية، مدينون، مخزون</li><li>أصول ثابتة: أراضي، مباني، معدات</li><li>أصول غير ملموسة: شهرة، براءات اختراع</li></ul><div class="account-rule"><strong>القاعدة:</strong> تزيد بالمدين وتنقص بالدائن</div></div><div class="account-card" style="border-right:4px solid #ef4444"><div class="account-icon" style="background:#fee2e2"><i class="fas fa-hand-holding-usd text-red-600"></i></div><h4>الخصوم (Liabilities)</h4><p>التزامات المنشأة تجاه الآخرين</p><ul><li>خصوم متداولة: دائنون، قروض قصيرة</li><li>خصوم طويلة الأجل: قروض بنكية</li></ul><div class="account-rule"><strong>القاعدة:</strong> تزيد بالدائن وتنقص بالمدين</div></div><div class="account-card" style="border-right:4px solid #6366f1"><div class="account-icon" style="background:#e0e7ff"><i class="fas fa-user-tie text-indigo-600"></i></div><h4>حقوق الملكية (Equity)</h4><p>حقوق أصحاب المنشأة</p><ul><li>رأس المال</li><li>الأرباح المحتجزة</li><li>الاحتياطيات</li></ul><div class="account-rule"><strong>القاعدة:</strong> تزيد بالدائن وتنقص بالمدين</div></div></div></div>`
      },
      {
        id: 'b4', title: 'القيد المحاسبي المزدوج', duration: '25 دقيقة', icon: 'fa-exchange-alt',
        videoId: 'v2l3_PG9k0c', videoTitle: 'المحاسبة لغير المحاسبين - القيد المزدوج',
        content: `<div class="content-section"><h3><i class="fas fa-sync text-blue-500"></i> نظام القيد المزدوج</h3><div class="info-box purple"><p><strong>القاعدة الذهبية:</strong> لكل عملية مالية طرفان متساويان على الأقل - طرف مدين وطرف دائن، ويجب أن يتساوى مجموع الطرف المدين مع مجموع الطرف الدائن.</p></div><h3><i class="fas fa-book text-green-500"></i> قواعد المدين والدائن</h3><div class="table-container"><table><thead><tr><th>نوع الحساب</th><th>يزيد بـ</th><th>ينقص بـ</th><th>الطبيعة</th></tr></thead><tbody><tr><td>الأصول</td><td class="debit">مدين</td><td class="credit">دائن</td><td>مدينة</td></tr><tr><td>المصروفات</td><td class="debit">مدين</td><td class="credit">دائن</td><td>مدينة</td></tr><tr><td>الخصوم</td><td class="credit">دائن</td><td class="debit">مدين</td><td>دائنة</td></tr><tr><td>حقوق الملكية</td><td class="credit">دائن</td><td class="debit">مدين</td><td>دائنة</td></tr><tr><td>الإيرادات</td><td class="credit">دائن</td><td class="debit">مدين</td><td>دائنة</td></tr></tbody></table></div><h3><i class="fas fa-pencil-alt text-orange-500"></i> أمثلة عملية على القيود</h3><div class="journal-entry"><div class="je-header">مثال 1: شراء بضاعة بمبلغ 10,000 ريال نقدا</div><div class="je-row"><span class="je-debit">10,000 من حـ/ المشتريات</span></div><div class="je-row"><span class="je-credit">10,000 إلى حـ/ النقدية</span></div></div><div class="journal-entry"><div class="je-header">مثال 2: بيع بضاعة بمبلغ 15,000 ريال على الحساب</div><div class="je-row"><span class="je-debit">15,000 من حـ/ المدينون</span></div><div class="je-row"><span class="je-credit">15,000 إلى حـ/ المبيعات</span></div></div></div>`
      },
      {
        id: 'b5', title: 'دفتر اليومية ودفتر الأستاذ', duration: '30 دقيقة', icon: 'fa-book-open',
        videoId: 'K2ELU0gfkYI', videoTitle: 'كورس المحاسبة المالية من الصفر',
        content: `<div class="content-section"><h3><i class="fas fa-journal-whills text-blue-500"></i> دفتر اليومية (Journal)</h3><div class="info-box blue"><p>دفتر اليومية هو السجل الأول الذي تقيد فيه العمليات المالية بترتيب زمني (تاريخي). يعد أساس النظام المحاسبي.</p></div><div class="table-container"><table><thead><tr><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th></tr></thead><tbody><tr><td>1/1</td><td>من حـ/ النقدية<br>إلى حـ/ رأس المال<br><em>(بدء النشاط برأس مال نقدي)</em></td><td>100,000</td><td><br>100,000</td></tr><tr><td>5/1</td><td>من حـ/ المعدات<br>إلى حـ/ النقدية<br><em>(شراء معدات نقدا)</em></td><td>25,000</td><td><br>25,000</td></tr></tbody></table></div><h3><i class="fas fa-file-alt text-green-500"></i> دفتر الأستاذ (Ledger)</h3><div class="info-box green"><p>دفتر الأستاذ هو السجل الذي يتم فيه تصنيف وتبويب القيود حسب الحسابات. كل حساب له صفحة مستقلة.</p></div></div>`
      },
      {
        id: 'b6', title: 'ميزان المراجعة', duration: '20 دقيقة', icon: 'fa-balance-scale-right',
        videoId: 'DZZq06cxOgw', videoTitle: 'مقدمة في المحاسبة المالية',
        content: `<div class="content-section"><h3><i class="fas fa-check-double text-blue-500"></i> ما هو ميزان المراجعة؟</h3><div class="info-box blue"><p><strong>ميزان المراجعة</strong> هو كشف يحتوي على جميع أرصدة الحسابات في دفتر الأستاذ في تاريخ معين، ويستخدم للتأكد من صحة التسجيل المحاسبي وتساوي مجموع الأرصدة المدينة مع الدائنة.</p></div><div class="table-container"><table><thead><tr><th>اسم الحساب</th><th>رصيد مدين</th><th>رصيد دائن</th></tr></thead><tbody><tr><td>النقدية</td><td>75,000</td><td></td></tr><tr><td>المعدات</td><td>25,000</td><td></td></tr><tr><td>المشتريات</td><td>15,000</td><td></td></tr><tr><td>رأس المال</td><td></td><td>100,000</td></tr><tr><td>الدائنون</td><td></td><td>15,000</td></tr><tr class="total-row"><td><strong>المجموع</strong></td><td><strong>115,000</strong></td><td><strong>115,000</strong></td></tr></tbody></table></div></div>`
      },
      {
        id: 'b7', title: 'المبادئ المحاسبية الأساسية', duration: '25 دقيقة', icon: 'fa-gavel',
        videoId: 'PLv3eU6mpJLx4r-ZWwNmkqn_izIq5OQiVn', videoTitle: 'المبادئ والفروض المحاسبية',
        content: `<div class="content-section"><h3><i class="fas fa-gavel text-blue-500"></i> المبادئ المحاسبية المقبولة عموما (GAAP)</h3><div class="info-box green"><p>المبادئ المحاسبية هي القواعد والإرشادات التي يجب اتباعها عند إعداد القوائم المالية لضمان الاتساق والموثوقية.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-history text-blue-500"></i><strong>مبدأ التكلفة التاريخية</strong><p>تسجيل الأصول بتكلفة اقتنائها الفعلية وليس بقيمتها السوقية</p></div><div class="mini-card"><i class="fas fa-calendar-check text-green-500"></i><strong>مبدأ الاستحقاق</strong><p>تسجيل الإيرادات والمصروفات عند تحققها بغض النظر عن التحصيل أو الدفع</p></div><div class="mini-card"><i class="fas fa-building text-purple-500"></i><strong>فرض الوحدة المحاسبية</strong><p>فصل أنشطة المنشأة عن الأنشطة الشخصية لمالكيها</p></div><div class="mini-card"><i class="fas fa-infinity text-orange-500"></i><strong>فرض الاستمرارية</strong><p>افتراض أن المنشأة ستستمر في العمل لفترة غير محددة</p></div><div class="mini-card"><i class="fas fa-calendar text-red-500"></i><strong>فرض الفترة المحاسبية</strong><p>تقسيم حياة المنشأة إلى فترات زمنية متساوية لقياس الأداء</p></div><div class="mini-card"><i class="fas fa-money-bill text-teal-500"></i><strong>فرض الوحدة النقدية</strong><p>استخدام النقد كوحدة قياس موحدة لجميع المعاملات</p></div></div></div>`
      },
      {
        id: 'b8', title: 'الدورة المحاسبية الكاملة', duration: '35 دقيقة', icon: 'fa-recycle',
        videoId: 'AToUj0DmerQ', videoTitle: 'المحاسبة المالية - الدورة المحاسبية',
        content: `<div class="content-section"><h3><i class="fas fa-recycle text-blue-500"></i> خطوات الدورة المحاسبية</h3><div class="info-box blue"><p>الدورة المحاسبية هي سلسلة من الخطوات المتتابعة التي تبدأ بتحليل المعاملات وتنتهي بإعداد القوائم المالية وإقفال الحسابات.</p></div><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>تحليل المعاملات المالية:</strong> فهم طبيعة العملية وتحديد الحسابات المتأثرة</p></div><div class="step"><span class="step-num">2</span><p><strong>التسجيل في دفتر اليومية:</strong> إعداد القيود المحاسبية بالترتيب الزمني</p></div><div class="step"><span class="step-num">3</span><p><strong>الترحيل إلى دفتر الأستاذ:</strong> نقل القيود إلى حسابات الأستاذ المختصة</p></div><div class="step"><span class="step-num">4</span><p><strong>إعداد ميزان المراجعة:</strong> التأكد من تساوي المجاميع المدينة والدائنة</p></div><div class="step"><span class="step-num">5</span><p><strong>التسويات الجردية:</strong> تعديل الحسابات لتعكس الواقع الفعلي</p></div><div class="step"><span class="step-num">6</span><p><strong>إعداد القوائم المالية:</strong> قائمة الدخل والميزانية والتدفقات النقدية</p></div><div class="step"><span class="step-num">7</span><p><strong>قيود الإقفال:</strong> إقفال الحسابات المؤقتة (الإيرادات والمصروفات)</p></div><div class="step"><span class="step-num">8</span><p><strong>ميزان المراجعة بعد الإقفال:</strong> التحقق النهائي من صحة الأرصدة</p></div></div></div>`
      }
    ]
  },
  {
    id: 'intermediate',
    title: 'المستوى المتوسط',
    subtitle: 'القوائم المالية والتسويات',
    icon: 'fa-chart-line',
    color: '#3b82f6',
    colorLight: '#dbeafe',
    lessons: [
      { id: 'i1', title: 'قائمة الدخل', duration: '30 دقيقة', icon: 'fa-file-invoice-dollar', videoId: 'AToUj0DmerQ', videoTitle: 'المحاسبة المالية - قائمة الدخل',
        content: `<div class="content-section"><h3><i class="fas fa-chart-bar text-blue-500"></i> قائمة الدخل (Income Statement)</h3><div class="info-box blue"><p>قائمة الدخل هي تقرير مالي يظهر نتيجة أعمال المنشأة من ربح أو خسارة خلال فترة زمنية محددة.</p></div><div class="income-statement"><div class="is-title">قائمة الدخل للسنة المنتهية في 31/12</div><div class="is-row"><span>المبيعات</span><span>500,000</span></div><div class="is-row minus"><span>(-) تكلفة المبيعات</span><span>(300,000)</span></div><div class="is-row subtotal"><span><strong>مجمل الربح</strong></span><span><strong>200,000</strong></span></div><div class="is-row minus"><span>(-) مصروفات تشغيلية</span><span></span></div><div class="is-row sub"><span>مصروف الرواتب</span><span>(50,000)</span></div><div class="is-row sub"><span>مصروف الإيجار</span><span>(24,000)</span></div><div class="is-row sub"><span>مصروف الإهلاك</span><span>(10,000)</span></div><div class="is-row subtotal"><span><strong>صافي الربح التشغيلي</strong></span><span><strong>116,000</strong></span></div><div class="is-row total"><span><strong>صافي الربح</strong></span><span><strong>113,000</strong></span></div></div></div>` },
      { id: 'i2', title: 'الميزانية العمومية', duration: '30 دقيقة', icon: 'fa-balance-scale-left', videoId: 'h_-jXv3ZolQ', videoTitle: 'القوائم المالية - الميزانية العمومية',
        content: `<div class="content-section"><h3><i class="fas fa-clipboard-list text-blue-500"></i> الميزانية العمومية (Balance Sheet)</h3><div class="info-box green"><p>الميزانية العمومية هي قائمة مالية تظهر المركز المالي للمنشأة في لحظة زمنية محددة، وتشمل الأصول والخصوم وحقوق الملكية.</p></div><div class="balance-sheet"><div class="bs-title">الميزانية العمومية في 31/12</div><div class="bs-columns"><div class="bs-col"><h4 class="text-green-600">الأصول</h4><div class="bs-section"><strong>أصول متداولة:</strong></div><div class="bs-row"><span>النقدية</span><span>50,000</span></div><div class="bs-row"><span>المدينون</span><span>35,000</span></div><div class="bs-row"><span>المخزون</span><span>45,000</span></div><div class="bs-row subtotal"><span>إجمالي الأصول المتداولة</span><span>130,000</span></div><div class="bs-row total"><span><strong>إجمالي الأصول</strong></span><span><strong>200,000</strong></span></div></div><div class="bs-col"><h4 class="text-red-600">الخصوم وحقوق الملكية</h4><div class="bs-section"><strong>خصوم متداولة:</strong></div><div class="bs-row"><span>الدائنون</span><span>25,000</span></div><div class="bs-row"><span>مصروفات مستحقة</span><span>8,000</span></div><div class="bs-section"><strong>حقوق الملكية:</strong></div><div class="bs-row"><span>رأس المال</span><span>100,000</span></div><div class="bs-row total"><span><strong>الإجمالي</strong></span><span><strong>200,000</strong></span></div></div></div></div></div>` },
      { id: 'i3', title: 'التسويات الجردية', duration: '35 دقيقة', icon: 'fa-sliders-h', videoId: 'DZZq06cxOgw', videoTitle: 'أساسيات التسويات الجردية',
        content: `<div class="content-section"><h3><i class="fas fa-adjust text-blue-500"></i> التسويات الجردية</h3><div class="info-box orange"><p>التسويات الجردية هي قيود يومية تجرى في نهاية الفترة المالية لتحديث الحسابات وضمان تطبيق مبدأ الاستحقاق.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-hourglass-start text-blue-500"></i><strong>مصروفات مقدمة</strong><p>مصروفات دفعت مقدما ولم تستخدم بعد</p><div class="example-small">مثال: إيجار مدفوع مقدما لعدة أشهر</div></div><div class="mini-card"><i class="fas fa-hourglass-end text-red-500"></i><strong>مصروفات مستحقة</strong><p>مصروفات تحققت ولم تدفع بعد</p><div class="example-small">مثال: رواتب مستحقة لم تصرف</div></div><div class="mini-card"><i class="fas fa-coins text-green-500"></i><strong>إيرادات مقدمة</strong><p>إيرادات حصلت مقدما ولم تكتسب بعد</p><div class="example-small">مثال: اشتراك سنوي محصل مقدما</div></div><div class="mini-card"><i class="fas fa-money-check-alt text-yellow-500"></i><strong>إيرادات مستحقة</strong><p>إيرادات اكتسبت ولم تحصل بعد</p><div class="example-small">مثال: فوائد مستحقة على ودائع</div></div></div></div>` },
      { id: 'i4', title: 'قائمة التدفقات النقدية', duration: '35 دقيقة', icon: 'fa-money-bill-wave', videoId: 'DKb3eDwp2bU', videoTitle: 'قراءة وفهم القوائم المالية',
        content: `<div class="content-section"><h3><i class="fas fa-water text-blue-500"></i> قائمة التدفقات النقدية</h3><div class="info-box blue"><p>تظهر هذه القائمة حركة النقد داخل وخارج المنشأة خلال فترة محددة، وتقسم إلى ثلاثة أنشطة رئيسية.</p></div><div class="cash-flow-diagram"><div class="cf-activity operating"><h4><i class="fas fa-industry"></i> أنشطة تشغيلية</h4><ul><li>تحصيل من العملاء: +480,000</li><li>مدفوعات للموردين: -280,000</li><li>رواتب ومصروفات: -100,000</li><li><strong>صافي: +100,000</strong></li></ul></div><div class="cf-activity investing"><h4><i class="fas fa-chart-line"></i> أنشطة استثمارية</h4><ul><li>شراء معدات: -50,000</li><li>بيع استثمارات: +20,000</li><li><strong>صافي: -30,000</strong></li></ul></div><div class="cf-activity financing"><h4><i class="fas fa-university"></i> أنشطة تمويلية</h4><ul><li>قرض بنكي: +40,000</li><li>توزيعات أرباح: -15,000</li><li><strong>صافي: +25,000</strong></li></ul></div></div><div class="total-cf"><strong>صافي التغير في النقدية: +95,000 ريال</strong></div></div>` },
      { id: 'i5', title: 'المحاسبة عن المخزون', duration: '30 دقيقة', icon: 'fa-warehouse', videoId: 'K2ELU0gfkYI', videoTitle: 'أساسيات المحاسبة - المخزون',
        content: `<div class="content-section"><h3><i class="fas fa-boxes text-blue-500"></i> طرق تقييم المخزون</h3><div class="info-box green"><p>يقيم المخزون بعدة طرق تؤثر على تكلفة البضاعة المباعة وصافي الربح.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-sort-amount-down text-blue-500"></i><strong>FIFO - الوارد أولا صادر أولا</strong><p>أول بضاعة تم شراؤها هي أول بضاعة تباع</p></div><div class="mini-card"><i class="fas fa-sort-amount-up text-red-500"></i><strong>LIFO - الوارد أخيرا صادر أولا</strong><p>آخر بضاعة تم شراؤها هي أول بضاعة تباع</p><div class="example-small">غير مقبولة وفق IFRS</div></div><div class="mini-card"><i class="fas fa-calculator text-green-500"></i><strong>المتوسط المرجح</strong><p>حساب متوسط تكلفة الوحدة بعد كل عملية شراء</p></div></div></div>` },
      { id: 'i6', title: 'الأصول الثابتة والإهلاك', duration: '35 دقيقة', icon: 'fa-building',
        videoId: 'h_-jXv3ZolQ', videoTitle: 'المحاسبة عن الأصول الثابتة',
        content: `<div class="content-section"><h3><i class="fas fa-building text-blue-500"></i> الأصول الثابتة</h3><div class="info-box blue"><p>الأصول الثابتة هي أصول طويلة الأجل تمتلكها المنشأة لاستخدامها في العمليات التشغيلية وليس لإعادة البيع، مثل المباني والمعدات والسيارات.</p></div><h3><i class="fas fa-chart-line text-green-500"></i> طرق الإهلاك</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-minus text-blue-500"></i><strong>القسط الثابت</strong><p>توزيع متساوي لتكلفة الأصل على عمره الإنتاجي</p><div class="example-small">الإهلاك السنوي = (التكلفة - القيمة التخريدية) / العمر الإنتاجي</div></div><div class="mini-card"><i class="fas fa-sort-amount-down text-green-500"></i><strong>القسط المتناقص</strong><p>نسبة ثابتة من القيمة الدفترية المتبقية كل سنة</p><div class="example-small">إهلاك أكبر في السنوات الأولى</div></div><div class="mini-card"><i class="fas fa-chart-bar text-orange-500"></i><strong>وحدات الإنتاج</strong><p>الإهلاك حسب حجم الاستخدام الفعلي للأصل</p><div class="example-small">مناسب للآلات والمعدات الصناعية</div></div></div><h3><i class="fas fa-pencil-alt text-orange-500"></i> مثال عملي</h3><div class="example-box"><p><strong>مثال:</strong> آلة تكلفتها 100,000 ريال، قيمتها التخريدية 10,000 ريال، عمرها 5 سنوات</p><p>الإهلاك السنوي = (100,000 - 10,000) / 5 = <strong>18,000 ريال</strong></p></div></div>` },
      { id: 'i7', title: 'قائمة التغيرات في حقوق الملكية', duration: '25 دقيقة', icon: 'fa-exchange-alt',
        videoId: 'DKb3eDwp2bU', videoTitle: 'فهم قائمة حقوق الملكية',
        content: `<div class="content-section"><h3><i class="fas fa-exchange-alt text-blue-500"></i> قائمة التغيرات في حقوق الملكية</h3><div class="info-box purple"><p>تظهر هذه القائمة التغيرات التي طرأت على حقوق الملكية خلال الفترة المالية، وتشمل رأس المال والأرباح المحتجزة والاحتياطيات.</p></div><div class="table-container"><table><thead><tr><th>البيان</th><th>رأس المال</th><th>أرباح محتجزة</th><th>الإجمالي</th></tr></thead><tbody><tr><td>الرصيد في بداية الفترة</td><td>100,000</td><td>20,000</td><td>120,000</td></tr><tr><td>(+) صافي ربح الفترة</td><td>-</td><td>97,000</td><td>97,000</td></tr><tr><td>(-) توزيعات أرباح</td><td>-</td><td>(15,000)</td><td>(15,000)</td></tr><tr class="total-row"><td><strong>الرصيد في نهاية الفترة</strong></td><td><strong>100,000</strong></td><td><strong>102,000</strong></td><td><strong>202,000</strong></td></tr></tbody></table></div></div>` }
    ]
  },
  {
    id: 'advanced',
    title: 'المستوى المتقدم',
    subtitle: 'التحليل المالي والمعايير الدولية',
    icon: 'fa-chart-bar',
    color: '#8b5cf6',
    colorLight: '#ede9fe',
    lessons: [
      { id: 'a1', title: 'تحليل النسب المالية', duration: '40 دقيقة', icon: 'fa-percentage', videoId: 'DKb3eDwp2bU', videoTitle: 'قراءة وتحليل القوائم المالية',
        content: `<div class="content-section"><h3><i class="fas fa-chart-pie text-blue-500"></i> التحليل المالي بالنسب</h3><div class="info-box purple"><p>التحليل المالي بالنسب هو أداة لتقييم أداء المنشأة المالي من خلال حساب نسب محددة من القوائم المالية ومقارنتها.</p></div><h3>نسب السيولة</h3><div class="ratio-card"><div class="ratio-formula">النسبة الجارية = الأصول المتداولة / الخصوم المتداولة</div><div class="ratio-example">مثال: 130,000 / 33,000 = <strong>3.94</strong> (ممتازة)</div></div><h3>نسب الربحية</h3><div class="ratio-card"><div class="ratio-formula">هامش الربح الصافي = صافي الربح / المبيعات * 100</div><div class="ratio-example">مثال: 97,000 / 500,000 * 100 = <strong>19.4%</strong></div></div></div>` },
      { id: 'a2', title: 'المعايير الدولية IFRS', duration: '45 دقيقة', icon: 'fa-globe', videoId: '9OrigJMgsw0', videoTitle: 'أهم المعايير المحاسبية الدولية IFRS',
        content: `<div class="content-section"><h3><i class="fas fa-globe-americas text-blue-500"></i> المعايير الدولية لإعداد التقارير المالية</h3><div class="info-box blue"><p><strong>IFRS</strong> هي مجموعة من المعايير المحاسبية الدولية تطبق في أكثر من 140 دولة.</p></div><div class="table-container"><table><thead><tr><th>المعيار</th><th>الموضوع</th></tr></thead><tbody><tr><td>IFRS 1</td><td>التطبيق الأول للمعايير الدولية</td></tr><tr><td>IFRS 9</td><td>الأدوات المالية</td></tr><tr><td>IFRS 15</td><td>الإيراد من العقود مع العملاء</td></tr><tr><td>IFRS 16</td><td>عقود الإيجار</td></tr><tr><td>IAS 1</td><td>عرض القوائم المالية</td></tr><tr><td>IAS 2</td><td>المخزون</td></tr><tr><td>IAS 16</td><td>الممتلكات والآلات والمعدات</td></tr></tbody></table></div></div>` },
      { id: 'a3', title: 'محاسبة الزكاة وضريبة القيمة المضافة', duration: '40 دقيقة', icon: 'fa-hand-holding-usd', videoId: 'O6DptItZRMY', videoTitle: 'محاسبة التكاليف والزكاة',
        content: `<div class="content-section"><h3><i class="fas fa-mosque text-green-600"></i> محاسبة الزكاة</h3><div class="info-box green"><p><strong>زكاة عروض التجارة:</strong> تحسب الزكاة بنسبة 2.5% من الوعاء الزكوي في نهاية الحول.</p></div><div class="formula-box"><strong>الوعاء الزكوي = الأصول الزكوية - الخصوم المسموح بحسمها</strong><br>الزكاة = الوعاء الزكوي * 2.5%</div><h3><i class="fas fa-percent text-red-500"></i> ضريبة القيمة المضافة (VAT)</h3><div class="info-box red"><p>ضريبة القيمة المضافة تفرض على السلع والخدمات بنسبة 15% في المملكة العربية السعودية.</p></div></div>` },
      { id: 'a4', title: 'القوائم المالية الموحدة', duration: '45 دقيقة', icon: 'fa-project-diagram', videoId: 'NHRk18rumz4', videoTitle: 'شرح المحاسبة المالية المتقدمة',
        content: `<div class="content-section"><h3><i class="fas fa-network-wired text-blue-500"></i> القوائم المالية الموحدة</h3><div class="info-box purple"><p>القوائم المالية الموحدة تعرض البيانات المالية لمجموعة شركات كما لو كانت كيانا اقتصاديا واحدا.</p></div><h3><i class="fas fa-cogs text-orange-500"></i> خطوات إعداد القوائم الموحدة</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p>جمع القوائم المالية للشركة الأم والتابعة</p></div><div class="step"><span class="step-num">2</span><p>استبعاد المعاملات البينية</p></div><div class="step"><span class="step-num">3</span><p>استبعاد الاستثمار في الشركة التابعة مقابل حقوق الملكية</p></div><div class="step"><span class="step-num">4</span><p>حساب حقوق الأقلية</p></div><div class="step"><span class="step-num">5</span><p>حساب الشهرة</p></div></div></div>` },
      { id: 'a5', title: 'محاسبة الأدوات المالية', duration: '40 دقيقة', icon: 'fa-chart-area', videoId: 'AToUj0DmerQ', videoTitle: 'المحاسبة المالية - الأدوات المالية',
        content: `<div class="content-section"><h3><i class="fas fa-layer-group text-blue-500"></i> تصنيف الأدوات المالية (IFRS 9)</h3><div class="info-box blue"><p>يصنف معيار IFRS 9 الأصول المالية إلى ثلاث فئات رئيسية حسب نموذج الأعمال وخصائص التدفقات النقدية.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-dollar-sign text-green-500"></i><strong>التكلفة المطفأة</strong><p>الاحتفاظ لتحصيل التدفقات النقدية التعاقدية</p></div><div class="mini-card"><i class="fas fa-chart-line text-blue-500"></i><strong>القيمة العادلة من خلال الدخل الشامل</strong><p>الاحتفاظ للتحصيل والبيع</p></div><div class="mini-card"><i class="fas fa-exchange-alt text-red-500"></i><strong>القيمة العادلة من خلال الربح أو الخسارة</strong><p>المتاجرة وتحقيق أرباح رأسمالية</p></div></div></div>` },
      { id: 'a6', title: 'الاعتراف بالإيراد (IFRS 15)', duration: '35 دقيقة', icon: 'fa-file-contract', videoId: '9OrigJMgsw0', videoTitle: 'معايير الإيراد الدولية',
        content: `<div class="content-section"><h3><i class="fas fa-tasks text-blue-500"></i> نموذج الخطوات الخمس (IFRS 15)</h3><div class="info-box green"><p>يحدد معيار IFRS 15 نموذجا من خمس خطوات للاعتراف بالإيراد من العقود مع العملاء.</p></div><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>تحديد العقد</strong></p></div><div class="step"><span class="step-num">2</span><p><strong>تحديد التزامات الأداء</strong></p></div><div class="step"><span class="step-num">3</span><p><strong>تحديد سعر المعاملة</strong></p></div><div class="step"><span class="step-num">4</span><p><strong>تخصيص سعر المعاملة</strong></p></div><div class="step"><span class="step-num">5</span><p><strong>الاعتراف بالإيراد عند الوفاء بالتزام الأداء</strong></p></div></div></div>` },
      { id: 'a7', title: 'عقود الإيجار (IFRS 16)', duration: '35 دقيقة', icon: 'fa-key',
        videoId: '9OrigJMgsw0', videoTitle: 'معيار عقود الإيجار IFRS 16',
        content: `<div class="content-section"><h3><i class="fas fa-key text-blue-500"></i> معيار عقود الإيجار IFRS 16</h3><div class="info-box blue"><p>يتطلب IFRS 16 من المستأجر الاعتراف بأصل حق الاستخدام والتزام الإيجار في الميزانية العمومية لمعظم عقود الإيجار.</p></div><h3><i class="fas fa-pencil-alt text-green-500"></i> المعالجة المحاسبية للمستأجر</h3><div class="journal-entry"><div class="je-header">عند بداية عقد الإيجار</div><div class="je-row"><span class="je-debit">xxx من حـ/ أصل حق الاستخدام</span></div><div class="je-row"><span class="je-credit">xxx إلى حـ/ التزام الإيجار</span></div></div><div class="journal-entry"><div class="je-header">عند سداد القسط الدوري</div><div class="je-row"><span class="je-debit">xxx من حـ/ التزام الإيجار (أصل القسط)</span></div><div class="je-row"><span class="je-debit">xxx من حـ/ مصروف الفائدة</span></div><div class="je-row"><span class="je-credit">xxx إلى حـ/ النقدية</span></div></div></div>` }
    ]
  },
  {
    id: 'cost-accounting', title: 'محاسبة التكاليف', subtitle: 'تحديد وتحليل وإدارة التكاليف', icon: 'fa-cogs', color: '#f59e0b', colorLight: '#fef3c7',
    lessons: [
      { id: 'c1', title: 'مقدمة في محاسبة التكاليف', duration: '30 دقيقة', icon: 'fa-info-circle', videoId: 'O6DptItZRMY', videoTitle: 'سلسلة محاسبة التكاليف - مقدمة',
        content: `<div class="content-section"><h3><i class="fas fa-cogs text-yellow-600"></i> ما هي محاسبة التكاليف؟</h3><div class="info-box yellow"><p><strong>محاسبة التكاليف</strong> هي فرع من فروع المحاسبة يهتم بقياس وتسجيل وتحليل تكاليف الإنتاج والخدمات.</p></div><div class="cost-triangle"><div class="cost-element materials"><i class="fas fa-cubes"></i><strong>مواد مباشرة</strong><p>المواد الخام الداخلة في المنتج</p></div><div class="cost-element labor"><i class="fas fa-users"></i><strong>أجور مباشرة</strong><p>أجور العمال المنتجين</p></div><div class="cost-element overhead"><i class="fas fa-industry"></i><strong>تكاليف صناعية غير مباشرة</strong><p>إيجار المصنع، إهلاك الآلات</p></div></div></div>` },
      { id: 'c2', title: 'تصنيف التكاليف', duration: '35 دقيقة', icon: 'fa-tags', videoId: 'gmyvJk2nK9s', videoTitle: 'مقدمة في محاسبة التكاليف',
        content: `<div class="content-section"><h3><i class="fas fa-layer-group text-blue-500"></i> تصنيفات التكاليف</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-arrows-alt-h text-blue-500"></i><strong>تكاليف ثابتة</strong><p>لا تتغير مع تغير حجم الإنتاج</p><div class="example-small">مثال: إيجار المصنع = 10,000 شهريا</div></div><div class="mini-card"><i class="fas fa-chart-line text-green-500"></i><strong>تكاليف متغيرة</strong><p>تتغير طرديا مع حجم الإنتاج</p><div class="example-small">مثال: مواد خام = 5 ريال/وحدة</div></div><div class="mini-card"><i class="fas fa-random text-orange-500"></i><strong>تكاليف مختلطة</strong><p>تحتوي على جزء ثابت وجزء متغير</p><div class="example-small">مثال: فاتورة الكهرباء</div></div></div></div>` },
      { id: 'c3', title: 'نظام تكاليف الأوامر الإنتاجية', duration: '40 دقيقة', icon: 'fa-clipboard-list', videoId: 'OP2Mc_dB0nI', videoTitle: 'محاسبة التكاليف - الأوامر',
        content: `<div class="content-section"><h3><i class="fas fa-file-invoice text-blue-500"></i> نظام تكاليف الأوامر</h3><div class="info-box blue"><p>يستخدم عندما يكون الإنتاج حسب طلب العميل، حيث يتم تجميع التكاليف لكل أمر إنتاجي بشكل منفصل.</p></div><div class="table-container"><table><thead><tr><th>عنصر التكلفة</th><th>أمر إنتاج 101</th><th>أمر إنتاج 102</th></tr></thead><tbody><tr><td>مواد مباشرة</td><td>12,000</td><td>8,000</td></tr><tr><td>أجور مباشرة</td><td>6,000</td><td>4,500</td></tr><tr><td>ت. صناعية غير مباشرة</td><td>9,000</td><td>6,750</td></tr><tr class="total-row"><td><strong>إجمالي تكلفة الأمر</strong></td><td><strong>27,000</strong></td><td><strong>19,250</strong></td></tr></tbody></table></div></div>` },
      { id: 'c4', title: 'نظام تكاليف المراحل الإنتاجية', duration: '40 دقيقة', icon: 'fa-stream', videoId: 'w9hH516gua4', videoTitle: 'سلسلة محاسبة التكاليف - المراحل',
        content: `<div class="content-section"><h3><i class="fas fa-stream text-purple-500"></i> نظام تكاليف المراحل</h3><div class="info-box purple"><p>يستخدم في الصناعات ذات الإنتاج المستمر والمتماثل.</p></div><h3><i class="fas fa-sort-amount-down text-blue-500"></i> الوحدات المعادلة</h3><div class="example-box"><p><strong>مثال:</strong> 200 وحدة تحت التشغيل مكتملة بنسبة 60%</p><p>الوحدات المعادلة = 200 * 60% = <strong>120 وحدة معادلة</strong></p></div></div>` },
      { id: 'c5', title: 'تحليل التعادل', duration: '30 دقيقة', icon: 'fa-balance-scale', videoId: 'pmIxkbxGQ9E', videoTitle: 'تحليل التعادل',
        content: `<div class="content-section"><h3><i class="fas fa-crosshairs text-red-500"></i> تحليل التعادل</h3><div class="info-box red"><p><strong>نقطة التعادل</strong> هي النقطة التي تتساوى فيها الإيرادات الكلية مع التكاليف الكلية.</p></div><div class="formula-box"><strong>نقطة التعادل بالوحدات = التكاليف الثابتة / (سعر البيع - التكلفة المتغيرة للوحدة)</strong></div><div class="example-box"><p><strong>مثال:</strong> تكاليف ثابتة 100,000، سعر بيع 50، تكلفة متغيرة 30</p><p>نقطة التعادل = 100,000 / (50-30) = <strong>5,000 وحدة</strong></p></div></div>` },
      { id: 'c6', title: 'التكاليف المعيارية', duration: '35 دقيقة', icon: 'fa-ruler',
        videoId: 'gmyvJk2nK9s', videoTitle: 'التكاليف المعيارية وتحليل الانحرافات',
        content: `<div class="content-section"><h3><i class="fas fa-ruler text-blue-500"></i> نظام التكاليف المعيارية</h3><div class="info-box blue"><p>التكاليف المعيارية هي تكاليف محددة مسبقا لكل عنصر من عناصر التكلفة، تستخدم كمعيار للمقارنة مع التكاليف الفعلية.</p></div><h3>أنواع المعايير</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-star text-yellow-500"></i><strong>معايير مثالية</strong><p>تمثل أفضل أداء ممكن في ظروف مثالية</p></div><div class="mini-card"><i class="fas fa-check-circle text-green-500"></i><strong>معايير عملية</strong><p>قابلة للتحقيق في ظروف التشغيل العادية</p></div><div class="mini-card"><i class="fas fa-history text-blue-500"></i><strong>معايير تاريخية</strong><p>مبنية على متوسطات الأداء السابق</p></div></div></div>` }
    ]
  },
  {
    id: 'managerial', title: 'المحاسبة الإدارية', subtitle: 'أدوات اتخاذ القرار والتخطيط', icon: 'fa-briefcase', color: '#ec4899', colorLight: '#fce7f3',
    lessons: [
      { id: 'm1', title: 'مقدمة في المحاسبة الإدارية', duration: '25 دقيقة', icon: 'fa-info-circle', videoId: 'bBExdVqgxl0', videoTitle: 'المحاسبة الإدارية - الفصل الأول',
        content: `<div class="content-section"><h3><i class="fas fa-briefcase text-pink-500"></i> ما هي المحاسبة الإدارية؟</h3><div class="info-box pink"><p><strong>المحاسبة الإدارية</strong> فرع يهتم بتوفير المعلومات المالية وغير المالية للإدارة لمساعدتها في التخطيط والرقابة واتخاذ القرارات.</p></div><div class="table-container"><table><thead><tr><th>المعيار</th><th>المحاسبة المالية</th><th>المحاسبة الإدارية</th></tr></thead><tbody><tr><td>المستخدمون</td><td>خارجيون</td><td>داخليون (إدارة)</td></tr><tr><td>الإلزامية</td><td>إلزامية قانونيا</td><td>اختيارية</td></tr><tr><td>التوقيت</td><td>تاريخية</td><td>مستقبلية</td></tr><tr><td>المعايير</td><td>IFRS / GAAP</td><td>لا توجد معايير ملزمة</td></tr></tbody></table></div></div>` },
      { id: 'm2', title: 'الموازنات التقديرية', duration: '40 دقيقة', icon: 'fa-file-alt', videoId: 'lciWn5Bh4Us', videoTitle: 'شرح مادة محاسبة إدارية - الموازنات',
        content: `<div class="content-section"><h3><i class="fas fa-file-invoice text-blue-500"></i> الموازنات التقديرية</h3><div class="info-box blue"><p>الموازنة هي خطة مالية تفصيلية تعد لفترة مستقبلية.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-shopping-cart text-blue-500"></i><strong>موازنة المبيعات</strong><p>نقطة البداية للموازنة الشاملة</p></div><div class="mini-card"><i class="fas fa-industry text-green-500"></i><strong>موازنة الإنتاج</strong><p>تحديد كمية الإنتاج المطلوبة</p></div><div class="mini-card"><i class="fas fa-cubes text-orange-500"></i><strong>موازنة المشتريات</strong><p>تحديد المواد الخام المطلوبة</p></div><div class="mini-card"><i class="fas fa-money-bill text-red-500"></i><strong>الموازنة النقدية</strong><p>التدفقات النقدية المتوقعة</p></div></div></div>` },
      { id: 'm3', title: 'تحليل الانحرافات', duration: '35 دقيقة', icon: 'fa-not-equal', videoId: '0qhnOTkJRSo', videoTitle: 'المحاسبة الإدارية - تحليل الانحرافات',
        content: `<div class="content-section"><h3><i class="fas fa-not-equal text-red-500"></i> تحليل الانحرافات</h3><div class="info-box orange"><p>تحليل الانحرافات هو مقارنة الأداء الفعلي بالأداء المعياري.</p></div><div class="table-container"><table><thead><tr><th>نوع الانحراف</th><th>المعياري</th><th>الفعلي</th><th>النوع</th></tr></thead><tbody><tr><td>انحراف المواد (سعر)</td><td>10 ر/كغ</td><td>11 ر/كغ</td><td class="unfavorable">غير ملائم</td></tr><tr><td>انحراف المواد (كمية)</td><td>500 كغ</td><td>480 كغ</td><td class="favorable">ملائم</td></tr><tr><td>انحراف الأجور (معدل)</td><td>20 ر/ساعة</td><td>19 ر/ساعة</td><td class="favorable">ملائم</td></tr></tbody></table></div></div>` },
      { id: 'm4', title: 'اتخاذ القرارات قصيرة الأجل', duration: '35 دقيقة', icon: 'fa-random', videoId: 'ZL1iWqr90PY', videoTitle: 'المحاسبة الإدارية - اتخاذ القرارات',
        content: `<div class="content-section"><h3><i class="fas fa-random text-blue-500"></i> أنواع قرارات الإدارة</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-industry text-blue-500"></i><strong>قرار الصنع أو الشراء</strong><p>هل نصنع المكون داخليا أم نشتريه؟</p></div><div class="mini-card"><i class="fas fa-tag text-green-500"></i><strong>قبول أو رفض طلبية خاصة</strong><p>هل نقبل طلبية بسعر أقل؟</p></div><div class="mini-card"><i class="fas fa-trash text-red-500"></i><strong>الاستمرار أو التوقف</strong><p>هل نستمر في إنتاج منتج خاسر؟</p></div><div class="mini-card"><i class="fas fa-tools text-orange-500"></i><strong>البيع أو التصنيع الإضافي</strong><p>هل نبيع كما هو أم نضيف تصنيعا؟</p></div></div><div class="info-box purple"><p><strong>التكلفة ذات الصلة:</strong> هي التكلفة المستقبلية التي تختلف بين البدائل المتاحة. التكاليف الغارقة لا تكون ذات صلة بالقرار.</p></div></div>` },
      { id: 'm5', title: 'تسعير المنتجات والخدمات', duration: '30 دقيقة', icon: 'fa-tags',
        videoId: 'lciWn5Bh4Us', videoTitle: 'استراتيجيات التسعير المحاسبي',
        content: `<div class="content-section"><h3><i class="fas fa-tags text-blue-500"></i> استراتيجيات التسعير</h3><div class="info-box green"><p>تسعير المنتجات يعتمد على فهم التكاليف وتحديد هامش الربح المناسب مع مراعاة المنافسة والسوق.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-plus-circle text-blue-500"></i><strong>التسعير على أساس التكلفة الكاملة</strong><p>سعر البيع = التكلفة الكلية + هامش الربح</p></div><div class="mini-card"><i class="fas fa-percentage text-green-500"></i><strong>التسعير على أساس هامش المساهمة</strong><p>سعر البيع = التكلفة المتغيرة + هامش المساهمة</p></div><div class="mini-card"><i class="fas fa-chart-line text-purple-500"></i><strong>التسعير على أساس السوق</strong><p>تحديد السعر بناء على أسعار المنافسين</p></div></div><div class="example-box"><p><strong>مثال:</strong> تكلفة إنتاج الوحدة = 40 ريال، هامش ربح مستهدف = 25%</p><p>سعر البيع = 40 * (1 + 0.25) = <strong>50 ريال</strong></p></div></div>` }
    ]
  },
  {
    id: 'auditing', title: 'المراجعة والتدقيق', subtitle: 'أساسيات التدقيق المحاسبي', icon: 'fa-search-dollar', color: '#14b8a6', colorLight: '#ccfbf1',
    lessons: [
      { id: 'au1', title: 'مقدمة في المراجعة والتدقيق', duration: '30 دقيقة', icon: 'fa-search', videoId: '6sEAi4AQFAk', videoTitle: 'أهم خطوات التدقيق',
        content: `<div class="content-section"><h3><i class="fas fa-search-dollar text-teal-500"></i> ما هي المراجعة؟</h3><div class="info-box teal"><p><strong>المراجعة</strong> هي فحص منهجي ومستقل للقوائم المالية والسجلات المحاسبية للتأكد من أنها تعبر بعدالة عن المركز المالي.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-user-tie text-blue-500"></i><strong>مراجعة خارجية</strong><p>يقوم بها مراجع مستقل من خارج المنشأة</p></div><div class="mini-card"><i class="fas fa-users text-green-500"></i><strong>مراجعة داخلية</strong><p>يقوم بها قسم المراجعة الداخلية</p></div><div class="mini-card"><i class="fas fa-landmark text-red-500"></i><strong>مراجعة حكومية</strong><p>رقابة الأجهزة الحكومية</p></div></div></div>` },
      { id: 'au2', title: 'إجراءات التدقيق والأدلة', duration: '35 دقيقة', icon: 'fa-clipboard-check', videoId: 'DLPy0hiFy4c', videoTitle: 'فحص القيود وإجراءات التدقيق',
        content: `<div class="content-section"><h3><i class="fas fa-clipboard-check text-blue-500"></i> أدلة المراجعة</h3><div class="info-box blue"><p>أدلة المراجعة هي المعلومات التي يحصل عليها المراجع لتكوين رأيه حول عدالة القوائم المالية.</p></div><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>الفحص المستندي:</strong> فحص الفواتير والعقود</p></div><div class="step"><span class="step-num">2</span><p><strong>الملاحظة:</strong> مشاهدة العمليات مباشرة</p></div><div class="step"><span class="step-num">3</span><p><strong>الاستفسار:</strong> طرح الأسئلة على الموظفين</p></div><div class="step"><span class="step-num">4</span><p><strong>المصادقات:</strong> التأكد من الأرصدة مع أطراف خارجية</p></div><div class="step"><span class="step-num">5</span><p><strong>إعادة الحساب:</strong> التحقق من الدقة الحسابية</p></div></div></div>` },
      { id: 'au3', title: 'تقييم المخاطر والرقابة الداخلية', duration: '40 دقيقة', icon: 'fa-shield-alt', videoId: 'ak6FoeWJKjg', videoTitle: 'إدارة عمليات المراجعة',
        content: `<div class="content-section"><h3><i class="fas fa-shield-alt text-blue-500"></i> نظام الرقابة الداخلية</h3><div class="info-box green"><p>الرقابة الداخلية هي مجموعة السياسات والإجراءات لحماية أصول المنشأة وضمان دقة التقارير المالية.</p></div><h3>مكونات الرقابة الداخلية (COSO)</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>بيئة الرقابة</strong></p></div><div class="step"><span class="step-num">2</span><p><strong>تقييم المخاطر</strong></p></div><div class="step"><span class="step-num">3</span><p><strong>أنشطة الرقابة</strong></p></div><div class="step"><span class="step-num">4</span><p><strong>المعلومات والاتصال</strong></p></div><div class="step"><span class="step-num">5</span><p><strong>المتابعة</strong></p></div></div><div class="formula-box"><strong>مخاطر المراجعة = مخاطر متأصلة * مخاطر الرقابة * مخاطر الاكتشاف</strong></div></div>` },
      { id: 'au4', title: 'الغش والأخطاء المحاسبية', duration: '30 دقيقة', icon: 'fa-user-secret', videoId: 'u-zAZQU1u8k', videoTitle: 'إجراءات المراجعة وتقييم المخاطر',
        content: `<div class="content-section"><h3><i class="fas fa-user-secret text-red-500"></i> الغش مقابل الخطأ</h3><div class="table-container"><table><thead><tr><th>المعيار</th><th>الغش</th><th>الخطأ</th></tr></thead><tbody><tr><td>القصد</td><td>متعمد</td><td>غير متعمد</td></tr><tr><td>الطبيعة</td><td>تلاعب أو تزوير</td><td>سهو أو إغفال</td></tr><tr><td>المسؤولية</td><td>قانونية وجنائية</td><td>مهنية فقط</td></tr></tbody></table></div><h3>مثلث الغش</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-compress-arrows-alt text-red-500"></i><strong>الضغط/الدافع</strong><p>ضغوط مالية أو شخصية</p></div><div class="mini-card"><i class="fas fa-door-open text-yellow-500"></i><strong>الفرصة</strong><p>ضعف نظام الرقابة</p></div><div class="mini-card"><i class="fas fa-brain text-purple-500"></i><strong>التبرير</strong><p>القدرة على تبرير الفعل</p></div></div></div>` },
      { id: 'au5', title: 'أخلاقيات المهنة والمسؤولية المهنية', duration: '30 دقيقة', icon: 'fa-handshake',
        videoId: '6sEAi4AQFAk', videoTitle: 'أخلاقيات مهنة المراجعة',
        content: `<div class="content-section"><h3><i class="fas fa-handshake text-blue-500"></i> أخلاقيات مهنة المراجعة</h3><div class="info-box teal"><p>يلتزم المراجع بمجموعة من المبادئ الأخلاقية التي تحكم سلوكه المهني وتضمن جودة عمله.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-balance-scale text-blue-500"></i><strong>الاستقلالية</strong><p>عدم وجود علاقة تؤثر على حياد المراجع</p></div><div class="mini-card"><i class="fas fa-shield-alt text-green-500"></i><strong>النزاهة</strong><p>الصدق والأمانة في جميع العلاقات المهنية</p></div><div class="mini-card"><i class="fas fa-eye text-purple-500"></i><strong>الموضوعية</strong><p>عدم التحيز أو التأثر بالمصالح الشخصية</p></div><div class="mini-card"><i class="fas fa-lock text-red-500"></i><strong>السرية</strong><p>عدم إفشاء معلومات العميل دون إذن</p></div><div class="mini-card"><i class="fas fa-graduation-cap text-orange-500"></i><strong>الكفاءة المهنية</strong><p>الحفاظ على المعرفة والمهارات المهنية</p></div></div></div>` }
    ]
  },
  {
    id: 'tax', title: 'المحاسبة الضريبية', subtitle: 'الضرائب والزكاة والامتثال', icon: 'fa-file-invoice-dollar', color: '#ef4444', colorLight: '#fee2e2',
    lessons: [
      { id: 't1', title: 'مقدمة في النظام الضريبي', duration: '30 دقيقة', icon: 'fa-landmark', videoId: 'O6DptItZRMY', videoTitle: 'مقدمة في المحاسبة الضريبية',
        content: `<div class="content-section"><h3><i class="fas fa-landmark text-red-500"></i> النظام الضريبي</h3><div class="info-box red"><p>النظام الضريبي هو مجموعة القواعد والقوانين التي تنظم فرض وتحصيل الضرائب.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-building text-blue-500"></i><strong>ضريبة دخل الشركات</strong><p>20% على أرباح الشركات الأجنبية</p></div><div class="mini-card"><i class="fas fa-percent text-green-500"></i><strong>ضريبة القيمة المضافة</strong><p>15% على السلع والخدمات</p></div><div class="mini-card"><i class="fas fa-mosque text-yellow-600"></i><strong>الزكاة</strong><p>2.5% على الوعاء الزكوي</p></div><div class="mini-card"><i class="fas fa-hand-holding-usd text-red-500"></i><strong>ضريبة الاستقطاع</strong><p>5-20% على مدفوعات لغير المقيمين</p></div></div></div>` },
      { id: 't2', title: 'ضريبة القيمة المضافة - تطبيق عملي', duration: '40 دقيقة', icon: 'fa-receipt', videoId: 'pmIxkbxGQ9E', videoTitle: 'التطبيق العملي لضريبة القيمة المضافة',
        content: `<div class="content-section"><h3><i class="fas fa-receipt text-green-500"></i> آلية عمل ضريبة القيمة المضافة</h3><div class="formula-box"><strong>الضريبة المستحقة = ضريبة المخرجات (المبيعات) - ضريبة المدخلات (المشتريات)</strong></div><div class="example-box"><p><strong>مثال:</strong></p><p>مبيعات الشهر: 200,000 * 15% = ضريبة مخرجات 30,000</p><p>مشتريات الشهر: 120,000 * 15% = ضريبة مدخلات 18,000</p><p>الضريبة المستحقة = 30,000 - 18,000 = <strong>12,000 ريال</strong></p></div></div>` },
      { id: 't3', title: 'الفوترة الإلكترونية (فاتورة)', duration: '30 دقيقة', icon: 'fa-qrcode', videoId: '6nldIr3zW0g', videoTitle: 'الفوترة الإلكترونية',
        content: `<div class="content-section"><h3><i class="fas fa-qrcode text-blue-500"></i> نظام الفوترة الإلكترونية</h3><div class="info-box blue"><p>نظام الفوترة الإلكترونية يهدف إلى تحويل عملية إصدار الفواتير الورقية إلى عملية إلكترونية.</p></div><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>مرحلة الإصدار:</strong> إصدار الفواتير إلكترونيا</p></div><div class="step"><span class="step-num">2</span><p><strong>مرحلة الربط والتكامل:</strong> ربط الأنظمة بمنصة هيئة الزكاة والضريبة</p></div></div></div>` },
      { id: 't4', title: 'التخطيط الضريبي', duration: '35 دقيقة', icon: 'fa-chess',
        videoId: 'pmIxkbxGQ9E', videoTitle: 'التخطيط الضريبي الاستراتيجي',
        content: `<div class="content-section"><h3><i class="fas fa-chess text-blue-500"></i> التخطيط الضريبي</h3><div class="info-box green"><p>التخطيط الضريبي هو استخدام الطرق القانونية المشروعة لتقليل العبء الضريبي على المنشأة مع الالتزام الكامل بالأنظمة والقوانين.</p></div><h3>استراتيجيات التخطيط الضريبي</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-calendar text-blue-500"></i><strong>التوقيت الضريبي</strong><p>تأجيل أو تعجيل الاعتراف بالإيرادات والمصروفات</p></div><div class="mini-card"><i class="fas fa-building text-green-500"></i><strong>اختيار الهيكل القانوني</strong><p>اختيار الشكل القانوني الأمثل ضريبيا</p></div><div class="mini-card"><i class="fas fa-file-alt text-purple-500"></i><strong>استغلال الإعفاءات</strong><p>الاستفادة من الحوافز والإعفاءات الضريبية المتاحة</p></div></div></div>` }
    ]
  },
  {
    id: 'professional', title: 'المستوى الاحترافي', subtitle: 'الشهادات المهنية والبرامج المحاسبية', icon: 'fa-trophy', color: '#f97316', colorLight: '#ffedd5',
    lessons: [
      { id: 'p1', title: 'الشهادات المهنية في المحاسبة', duration: '30 دقيقة', icon: 'fa-certificate', videoId: '6IsANT01n7g', videoTitle: 'شهادة المدقق الداخلي المعتمد CIA',
        content: `<div class="content-section"><h3><i class="fas fa-award text-yellow-500"></i> أهم الشهادات المهنية</h3><div class="certs-grid"><div class="cert-card"><div class="cert-badge cpa">CPA</div><h4>محاسب قانوني معتمد</h4><p>الجهة: AICPA (أمريكا)</p></div><div class="cert-card"><div class="cert-badge socpa">SOCPA</div><h4>زمالة الهيئة السعودية</h4><p>الجهة: SOCPA (السعودية)</p></div><div class="cert-card"><div class="cert-badge cma">CMA</div><h4>محاسب إداري معتمد</h4><p>الجهة: IMA (أمريكا)</p></div><div class="cert-card"><div class="cert-badge acca">ACCA</div><h4>جمعية المحاسبين القانونيين</h4><p>الجهة: ACCA (بريطانيا)</p></div><div class="cert-card"><div class="cert-badge cia">CIA</div><h4>مدقق داخلي معتمد</h4><p>الجهة: IIA (أمريكا)</p></div></div></div>` },
      { id: 'p2', title: 'البرامج المحاسبية', duration: '25 دقيقة', icon: 'fa-laptop-code', videoId: 'si-N7_ToXjw', videoTitle: 'إدارة المحاسبة في برنامج أودو',
        content: `<div class="content-section"><h3><i class="fas fa-laptop-code text-blue-500"></i> أشهر البرامج المحاسبية</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-calculator text-green-500"></i><strong>QuickBooks</strong><p>الأكثر استخداما للشركات الصغيرة</p></div><div class="mini-card"><i class="fas fa-server text-blue-500"></i><strong>SAP</strong><p>نظام ERP شامل للشركات الكبرى</p></div><div class="mini-card"><i class="fas fa-puzzle-piece text-purple-500"></i><strong>Odoo</strong><p>نظام مفتوح المصدر متكامل</p></div><div class="mini-card"><i class="fas fa-table text-green-600"></i><strong>Microsoft Excel</strong><p>أداة أساسية لكل محاسب</p></div><div class="mini-card"><i class="fas fa-cloud text-cyan-500"></i><strong>Xero</strong><p>محاسبة سحابية للشركات الصغيرة</p></div><div class="mini-card"><i class="fas fa-file-invoice text-orange-500"></i><strong>قيود (Qoyod)</strong><p>برنامج محاسبة سحابي سعودي</p></div></div></div>` },
      { id: 'p3', title: 'تمارين شاملة ومراجعة نهائية', duration: '45 دقيقة', icon: 'fa-tasks', videoId: 'mp69yYnmb_c', videoTitle: 'دورة محاسبة التكاليف المتقدمة',
        content: `<div class="content-section"><h3><i class="fas fa-dumbbell text-blue-500"></i> تمارين شاملة</h3><div class="exercise-box"><h4>تمرين 1: إعداد قيود يومية</h4><p>سجل القيود المحاسبية للعمليات التالية:</p><ol><li>بدأ أحمد مشروعه بإيداع 200,000 ريال في حساب المنشأة البنكي</li><li>اشترى معدات بمبلغ 50,000 ريال، دفع نصف المبلغ نقدا والباقي على الحساب</li><li>اشترى بضاعة بمبلغ 30,000 ريال نقدا</li><li>باع بضاعة تكلفتها 20,000 ريال بمبلغ 35,000 ريال على الحساب</li><li>دفع إيجار المحل 5,000 ريال نقدا</li></ol></div><div class="exercise-box"><h4>تمرين 2: تحليل نسب مالية</h4><p>احسب النسب التالية:</p><ul><li>الأصول المتداولة: 150,000 | الخصوم المتداولة: 60,000</li><li>المخزون: 40,000 | المبيعات: 500,000</li><li>صافي الربح: 75,000 | حقوق الملكية: 300,000</li></ul></div></div>` },
      { id: 'p4', title: 'المحاسبة في عصر التحول الرقمي', duration: '30 دقيقة', icon: 'fa-robot',
        videoId: 'si-N7_ToXjw', videoTitle: 'التحول الرقمي في المحاسبة',
        content: `<div class="content-section"><h3><i class="fas fa-robot text-blue-500"></i> التحول الرقمي والمحاسبة</h3><div class="info-box blue"><p>يشهد مجال المحاسبة تحولا رقميا كبيرا مع ظهور تقنيات جديدة تغير طريقة عمل المحاسبين وتزيد من كفاءتهم.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-brain text-purple-500"></i><strong>الذكاء الاصطناعي</strong><p>أتمتة المهام الروتينية والتحليل التنبؤي</p></div><div class="mini-card"><i class="fas fa-link text-blue-500"></i><strong>البلوك تشين</strong><p>سجلات مالية شفافة وغير قابلة للتعديل</p></div><div class="mini-card"><i class="fas fa-cloud text-cyan-500"></i><strong>الحوسبة السحابية</strong><p>أنظمة محاسبية متاحة من أي مكان</p></div><div class="mini-card"><i class="fas fa-chart-bar text-green-500"></i><strong>تحليل البيانات الضخمة</strong><p>استخلاص رؤى من كميات كبيرة من البيانات</p></div><div class="mini-card"><i class="fas fa-cog text-orange-500"></i><strong>أتمتة العمليات (RPA)</strong><p>أتمتة إدخال البيانات والتقارير الدورية</p></div></div></div>` }
    ]
  }
]

// ============================================================
// DATA: Glossary
// ============================================================
const glossary = [
  { term: 'الأصول', english: 'Assets', definition: 'الموارد الاقتصادية المملوكة للمنشأة والتي يتوقع أن تحقق منافع اقتصادية مستقبلية' },
  { term: 'الخصوم', english: 'Liabilities', definition: 'الالتزامات المالية المستحقة على المنشأة تجاه الغير' },
  { term: 'حقوق الملكية', english: 'Equity', definition: 'حقوق أصحاب المنشأة في أصولها بعد خصم الخصوم' },
  { term: 'الإيرادات', english: 'Revenue', definition: 'الدخل المتحقق من ممارسة النشاط الرئيسي للمنشأة' },
  { term: 'المصروفات', english: 'Expenses', definition: 'التكاليف المتكبدة في سبيل تحقيق الإيرادات' },
  { term: 'القيد المزدوج', english: 'Double Entry', definition: 'نظام تسجيل يتطلب أن يكون لكل عملية طرفان: مدين ودائن متساويان' },
  { term: 'دفتر اليومية', english: 'Journal', definition: 'السجل الأول الذي تقيد فيه العمليات المالية بترتيب زمني' },
  { term: 'دفتر الأستاذ', english: 'Ledger', definition: 'السجل الذي تبوب فيه العمليات حسب الحسابات' },
  { term: 'ميزان المراجعة', english: 'Trial Balance', definition: 'كشف يحتوي على أرصدة جميع الحسابات للتأكد من تساوي المدين والدائن' },
  { term: 'قائمة الدخل', english: 'Income Statement', definition: 'تقرير مالي يظهر إيرادات ومصروفات المنشأة وصافي الربح أو الخسارة' },
  { term: 'الميزانية العمومية', english: 'Balance Sheet', definition: 'قائمة تظهر المركز المالي للمنشأة في لحظة معينة' },
  { term: 'التدفقات النقدية', english: 'Cash Flow', definition: 'حركة النقد الداخل والخارج من المنشأة' },
  { term: 'الإهلاك', english: 'Depreciation', definition: 'التوزيع المنتظم لتكلفة الأصل الثابت على عمره الإنتاجي' },
  { term: 'المدين', english: 'Debit', definition: 'الطرف الأيسر من الحساب، يمثل زيادة في الأصول والمصروفات' },
  { term: 'الدائن', english: 'Credit', definition: 'الطرف الأيمن من الحساب، يمثل زيادة في الخصوم والإيرادات وحقوق الملكية' },
  { term: 'رأس المال', english: 'Capital', definition: 'المبلغ الذي يستثمره صاحب المنشأة في بداية النشاط' },
  { term: 'المخزون', english: 'Inventory', definition: 'البضاعة المتاحة للبيع أو المواد الخام للتصنيع' },
  { term: 'الشهرة', english: 'Goodwill', definition: 'أصل غير ملموس يمثل الفرق بين سعر شراء المنشأة وصافي أصولها العادلة' },
  { term: 'نقطة التعادل', english: 'Break-Even Point', definition: 'حجم المبيعات الذي تتساوى عنده الإيرادات مع التكاليف' },
  { term: 'المعايير الدولية', english: 'IFRS', definition: 'المعايير الدولية لإعداد التقارير المالية' },
  { term: 'العائد على حقوق الملكية', english: 'ROE', definition: 'نسبة صافي الربح إلى حقوق الملكية' },
  { term: 'العائد على الأصول', english: 'ROA', definition: 'نسبة صافي الربح إلى إجمالي الأصول' },
  { term: 'التسويات الجردية', english: 'Adjusting Entries', definition: 'قيود نهاية الفترة لتحديث الحسابات وتطبيق مبدأ الاستحقاق' },
  { term: 'التكلفة المتغيرة', english: 'Variable Cost', definition: 'تكلفة تتغير طرديا مع تغير حجم الإنتاج أو النشاط' },
  { term: 'التكلفة الثابتة', english: 'Fixed Cost', definition: 'تكلفة لا تتغير مع تغير حجم الإنتاج ضمن المدى الملائم' },
  { term: 'الموازنة التقديرية', english: 'Budget', definition: 'خطة مالية مستقبلية تعبر عن أهداف المنشأة بالأرقام' },
  { term: 'الأهمية النسبية', english: 'Materiality', definition: 'المبلغ الذي يؤثر حذفه أو تحريفه على قرارات مستخدمي القوائم المالية' },
  { term: 'هامش المساهمة', english: 'Contribution Margin', definition: 'الفرق بين سعر البيع والتكلفة المتغيرة للوحدة' },
  { term: 'محاسبة التحوط', english: 'Hedge Accounting', definition: 'معالجة محاسبية خاصة لتقليل تقلبات الأرباح من أدوات التحوط' },
  { term: 'الدورة المحاسبية', english: 'Accounting Cycle', definition: 'سلسلة الخطوات المتتابعة من تحليل المعاملات إلى إعداد القوائم المالية' },
  { term: 'التخطيط الضريبي', english: 'Tax Planning', definition: 'استخدام الطرق القانونية لتقليل العبء الضريبي' },
  { term: 'حق الاستخدام', english: 'Right-of-Use Asset', definition: 'أصل يمثل حق المستأجر في استخدام الأصل المؤجر وفقا لـ IFRS 16' },
]

// ============================================================
// DATA: Quizzes
// ============================================================
const quizzes = [
  {
    levelId: 'beginner', title: 'اختبار المستوى المبتدئ',
    questions: [
      { q: 'ما هي المعادلة المحاسبية الأساسية؟', options: ['الأصول = الخصوم + حقوق الملكية', 'الأصول = الإيرادات - المصروفات', 'الأصول + الخصوم = حقوق الملكية', 'الإيرادات = المصروفات + الربح'], correct: 0 },
      { q: 'أي من التالي يعد أصلا؟', options: ['القروض البنكية', 'رأس المال', 'النقدية', 'الإيرادات'], correct: 2 },
      { q: 'ما هي طبيعة حساب المصروفات؟', options: ['دائنة', 'مدينة', 'مختلطة', 'محايدة'], correct: 1 },
      { q: 'ما هو دفتر اليومية؟', options: ['كشف بأرصدة الحسابات', 'سجل القيود بترتيب زمني', 'تقرير مالي سنوي', 'قائمة الدخل'], correct: 1 },
      { q: 'عند شراء بضاعة نقدا، ما هو الطرف الدائن؟', options: ['المشتريات', 'النقدية', 'المبيعات', 'البضاعة'], correct: 1 },
      { q: 'ميزان المراجعة يعد لغرض:', options: ['حساب الربح', 'التأكد من تساوي المدين والدائن', 'تحديد الضرائب', 'تسجيل القيود'], correct: 1 },
      { q: 'ما هو مبدأ القيد المزدوج؟', options: ['تسجيل العملية مرتين', 'لكل عملية طرف مدين ودائن متساويان', 'مراجعة القيود مرتين', 'تسجيل في دفترين مختلفين'], correct: 1 },
      { q: 'أي من التالي يعد خصما؟', options: ['المعدات', 'المدينون', 'الدائنون', 'المخزون'], correct: 2 },
      { q: 'فرض الاستمرارية يعني:', options: ['المنشأة ستتوقف قريبا', 'المنشأة ستستمر في العمل لفترة غير محددة', 'المنشأة مملوكة للحكومة', 'المنشأة لا تحقق أرباحا'], correct: 1 },
      { q: 'كم عدد خطوات الدورة المحاسبية الكاملة؟', options: ['5 خطوات', '6 خطوات', '7 خطوات', '8 خطوات'], correct: 3 },
    ]
  },
  {
    levelId: 'intermediate', title: 'اختبار المستوى المتوسط',
    questions: [
      { q: 'ما المقصود بمبدأ الاستحقاق؟', options: ['تسجيل العمليات عند الدفع النقدي', 'تسجيل الإيرادات والمصروفات عند تحققها بغض النظر عن النقد', 'تسجيل فقط العمليات النقدية', 'تأجيل تسجيل المصروفات'], correct: 1 },
      { q: 'أي قائمة تظهر المركز المالي في لحظة معينة؟', options: ['قائمة الدخل', 'الميزانية العمومية', 'التدفقات النقدية', 'التغيرات في حقوق الملكية'], correct: 1 },
      { q: 'ما هو الإهلاك؟', options: ['نقص قيمة المخزون', 'توزيع تكلفة الأصل على عمره الإنتاجي', 'خسارة في قيمة الاستثمارات', 'نقص في النقدية'], correct: 1 },
      { q: 'أي طريقة لتقييم المخزون غير مقبولة وفق IFRS؟', options: ['FIFO', 'المتوسط المرجح', 'LIFO', 'التكلفة المحددة'], correct: 2 },
      { q: 'قائمة التدفقات النقدية تقسم إلى:', options: ['تشغيلية واستثمارية فقط', 'تشغيلية واستثمارية وتمويلية', 'جارية وطويلة الأجل', 'إيرادات ومصروفات'], correct: 1 },
      { q: 'المصروف المقدم يصنف كـ:', options: ['خصم متداول', 'أصل متداول', 'مصروف في قائمة الدخل', 'حقوق ملكية'], correct: 1 },
      { q: 'أي طريقة إهلاك تعطي إهلاك أكبر في السنوات الأولى؟', options: ['القسط الثابت', 'القسط المتناقص', 'وحدات الإنتاج', 'لا يوجد فرق'], correct: 1 },
    ]
  },
  {
    levelId: 'advanced', title: 'اختبار المستوى المتقدم',
    questions: [
      { q: 'ما هي النسبة الجارية إذا كانت الأصول المتداولة 200,000 والخصوم المتداولة 80,000؟', options: ['1.5', '2.0', '2.5', '3.0'], correct: 2 },
      { q: 'ما هو معيار IFRS 15؟', options: ['عقود الإيجار', 'الإيراد من العقود مع العملاء', 'الأدوات المالية', 'القوائم الموحدة'], correct: 1 },
      { q: 'نسبة الزكاة على عروض التجارة هي:', options: ['5%', '2.5%', '10%', '15%'], correct: 1 },
      { q: 'ما هو معيار IFRS 16؟', options: ['الإيراد', 'عقود الإيجار', 'المخزون', 'الأدوات المالية'], correct: 1 },
      { q: 'نسبة ضريبة القيمة المضافة في السعودية هي:', options: ['5%', '10%', '15%', '20%'], correct: 2 },
    ]
  },
  {
    levelId: 'cost-accounting', title: 'اختبار محاسبة التكاليف',
    questions: [
      { q: 'ما هي عناصر تكلفة الإنتاج؟', options: ['مواد + أجور + مصروفات بيعية', 'مواد مباشرة + أجور مباشرة + ت. صناعية غير مباشرة', 'مواد + إيجار + كهرباء', 'أجور + إهلاك'], correct: 1 },
      { q: 'التكلفة الثابتة هي:', options: ['تتغير مع حجم الإنتاج', 'لا تتغير ضمن المدى الملائم', 'تتغير عكسيا مع الإنتاج', 'ليس لها علاقة بالإنتاج'], correct: 1 },
      { q: 'نقطة التعادل تعني:', options: ['أقصى ربح', 'لا ربح ولا خسارة', 'أقل خسارة', 'أعلى مبيعات'], correct: 1 },
      { q: 'نظام تكاليف الأوامر يستخدم في:', options: ['الإنتاج المستمر', 'الإنتاج حسب الطلب', 'كل أنواع الإنتاج', 'الخدمات فقط'], correct: 1 },
      { q: 'إذا كانت التكاليف الثابتة 60,000 وهامش المساهمة 20 ريال/وحدة، كم نقطة التعادل؟', options: ['2,000 وحدة', '3,000 وحدة', '4,000 وحدة', '5,000 وحدة'], correct: 1 },
    ]
  },
  {
    levelId: 'managerial', title: 'اختبار المحاسبة الإدارية',
    questions: [
      { q: 'المحاسبة الإدارية تخدم بشكل رئيسي:', options: ['المستثمرين', 'الإدارة الداخلية', 'الدائنين', 'الجهات الحكومية'], correct: 1 },
      { q: 'الموازنة التقديرية هي:', options: ['تقرير عن الأداء السابق', 'خطة مالية مستقبلية', 'قائمة مالية رسمية', 'تقرير ضريبي'], correct: 1 },
      { q: 'تحليل الانحرافات يقارن بين:', options: ['السنة الحالية والسابقة', 'الأداء الفعلي والمعياري', 'الإيرادات والمصروفات', 'الأصول والخصوم'], correct: 1 },
      { q: 'التكلفة ذات الصلة بالقرار هي:', options: ['التكلفة الغارقة', 'التكلفة المستقبلية المختلفة بين البدائل', 'التكلفة الثابتة', 'التكلفة التاريخية'], correct: 1 },
    ]
  },
  {
    levelId: 'auditing', title: 'اختبار المراجعة والتدقيق',
    questions: [
      { q: 'الهدف الرئيسي من المراجعة الخارجية:', options: ['اكتشاف الغش', 'إبداء رأي حول عدالة القوائم المالية', 'حساب الضرائب', 'تحسين الأداء'], correct: 1 },
      { q: 'مكونات COSO للرقابة الداخلية عددها:', options: ['3', '4', '5', '6'], correct: 2 },
      { q: 'مثلث الغش يتكون من:', options: ['ضغط + فرصة + تبرير', 'نية + فعل + نتيجة', 'سرقة + تزوير + إخفاء', 'ضعف + جهل + إهمال'], correct: 0 },
      { q: 'الأهمية النسبية (Materiality) تعني:', options: ['أهمية المراجع', 'المبلغ المؤثر على قرارات المستخدمين', 'حجم الشركة', 'عدد المعاملات'], correct: 1 },
    ]
  }
]

// ============================================================
// STATS
// ============================================================
const totalLessons = courseLevels.reduce((sum, l) => sum + l.lessons.length, 0)
const totalLevels = courseLevels.length
const totalQuizzes = quizzes.length
const totalGlossaryTerms = glossary.length

// ============================================================
// API Routes
// ============================================================
app.get('/api/levels', (c) => {
  return c.json(courseLevels.map(l => ({
    id: l.id, title: l.title, subtitle: l.subtitle, icon: l.icon,
    color: l.color, colorLight: l.colorLight,
    lessonsCount: l.lessons.length,
    lessons: l.lessons.map(le => ({
      id: le.id, title: le.title, duration: le.duration, icon: le.icon,
      videoId: le.videoId, videoTitle: le.videoTitle
    }))
  })))
})

app.get('/api/lesson/:levelId/:lessonId', (c) => {
  const { levelId, lessonId } = c.req.param()
  const level = courseLevels.find(l => l.id === levelId)
  if (!level) return c.json({ error: 'Level not found' }, 404)
  const lesson = level.lessons.find(l => l.id === lessonId)
  if (!lesson) return c.json({ error: 'Lesson not found' }, 404)
  return c.json({ ...lesson, levelTitle: level.title, levelColor: level.color, lessonsCount: level.lessons.length })
})

app.get('/api/glossary', (c) => c.json(glossary))
app.get('/api/quizzes', (c) => c.json(quizzes))
app.get('/api/quiz/:levelId', (c) => {
  const quiz = quizzes.find(q => q.levelId === c.req.param('levelId'))
  if (!quiz) return c.json({ error: 'Quiz not found' }, 404)
  return c.json(quiz)
})
app.get('/api/stats', (c) => c.json({ totalLessons, totalLevels, totalQuizzes, totalGlossaryTerms }))

// ============================================================
// DB INIT API (for local dev)
// ============================================================
app.get('/api/init-db', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, display_name TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`)
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS user_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, completed_lessons TEXT DEFAULT '[]', quiz_scores TEXT DEFAULT '{}', bookmarks TEXT DEFAULT '[]', notes TEXT DEFAULT '{}', expanded_levels TEXT DEFAULT '[]', dark_mode INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`)
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token TEXT UNIQUE NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`)
    return c.json({ success: true, message: 'Database initialized' })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ============================================================
// MAIN HTML (with auth UI)
// ============================================================
const mainHTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>أكاديمية المحاسبة المالية | من الصفر إلى الاحتراف</title>
  <meta name="description" content="تعلم المحاسبة المالية من الصفر إلى الاحتراف - دروس شاملة مع فيديوهات تعليمية واختبارات تفاعلية ومعجم محاسبي">
  <meta name="theme-color" content="#059669">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧮</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config={darkMode:'class',theme:{extend:{fontFamily:{sans:['Tajawal','sans-serif']}}}}</script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/style.css">
</head>
<body class="bg-gray-50 dark:bg-slate-900 font-sans transition-colors duration-300">
  <nav class="sticky top-0 z-50 bg-white/92 dark:bg-slate-800/92 backdrop-blur-xl shadow-sm border-b border-gray-200/80 dark:border-slate-700/50">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3 cursor-pointer group" onclick="showHome()">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg shadow-lg group-hover:scale-105 transition-transform">
          <i class="fas fa-graduation-cap"></i>
        </div>
        <div>
          <h1 class="text-base sm:text-lg font-extrabold text-gray-800 dark:text-white leading-tight">أكاديمية المحاسبة</h1>
          <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">من الصفر إلى الاحتراف</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 sm:gap-2">
        <button onclick="showSection('search')" class="nav-btn" title="بحث"><i class="fas fa-search"></i></button>
        <button onclick="showSection('glossary')" class="nav-btn hidden sm:flex" title="المعجم"><i class="fas fa-book"></i></button>
        <button onclick="showSection('calculator')" class="nav-btn hidden sm:flex" title="الآلة الحاسبة"><i class="fas fa-calculator"></i></button>
        <button onclick="toggleProgress()" class="nav-btn" title="تقدمي"><i class="fas fa-chart-pie"></i></button>
        <button onclick="toggleDarkMode()" class="nav-btn" title="الوضع الداكن"><i class="fas fa-moon" id="darkModeIcon"></i></button>
        <div id="authBtn"></div>
      </div>
    </div>
  </nav>
  <main id="mainContent" class="max-w-7xl mx-auto px-4 py-6"></main>
  <footer class="site-footer">
    <div class="footer-grid">
      <div class="footer-brand"><h3><i class="fas fa-graduation-cap ml-2"></i>أكاديمية المحاسبة المالية</h3><p>منصة تعليمية عربية شاملة لتعلم المحاسبة المالية من الصفر إلى الاحتراف.</p></div>
      <div class="footer-links"><h4>المساقات</h4><ul><li><a href="javascript:void(0)" onclick="showHome()"><i class="fas fa-chevron-left"></i>المستوى المبتدئ</a></li><li><a href="javascript:void(0)" onclick="showHome()"><i class="fas fa-chevron-left"></i>المستوى المتوسط</a></li><li><a href="javascript:void(0)" onclick="showHome()"><i class="fas fa-chevron-left"></i>المستوى المتقدم</a></li></ul></div>
      <div class="footer-links"><h4>أدوات</h4><ul><li><a href="javascript:void(0)" onclick="showSection('glossary')"><i class="fas fa-chevron-left"></i>المعجم المحاسبي</a></li><li><a href="javascript:void(0)" onclick="showSection('calculator')"><i class="fas fa-chevron-left"></i>الآلة الحاسبة</a></li><li><a href="javascript:void(0)" onclick="showSection('search')"><i class="fas fa-chevron-left"></i>البحث الشامل</a></li></ul></div>
    </div>
    <div class="footer-bottom"><span>أكاديمية المحاسبة المالية</span> &copy; 2026 - جميع الحقوق محفوظة</div>
  </footer>
  <button id="scrollTopBtn" class="scroll-top-btn" title="العودة للأعلى"><i class="fas fa-chevron-up"></i></button>
  <div id="progressModal" class="modal-overlay hidden"><div class="modal-content"><div class="flex justify-between items-center mb-4"><h3 class="text-xl font-extrabold dark:text-white"><i class="fas fa-chart-pie text-emerald-500 ml-2"></i>تقدمي في الدورة</h3><button onclick="toggleProgress()" class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition text-lg">&times;</button></div><div id="progressContent"></div><div class="mt-5 flex gap-2"><button onclick="resetProgress()" class="flex-1 bg-red-500 text-white py-2.5 rounded-xl hover:bg-red-600 transition text-sm font-bold"><i class="fas fa-trash ml-1"></i>إعادة تعيين</button></div></div></div>
  <div id="authModal" class="modal-overlay hidden"></div>
  <script src="/static/app.js"></script>
</body>
</html>`

app.get('/', (c) => c.html(mainHTML))
app.get('/*', (c) => c.html(mainHTML))

export default app
