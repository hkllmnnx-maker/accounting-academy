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
      },
      {
        id: 'b9', title: 'المستندات والوثائق المحاسبية', duration: '20 دقيقة', icon: 'fa-file-alt',
        videoId: 'HYluTilJVOw', videoTitle: 'المستندات المحاسبية وأنواعها',
        content: `<div class="content-section"><h3><i class="fas fa-file-alt text-blue-500"></i> أنواع المستندات المحاسبية</h3><div class="info-box green"><p>المستندات المحاسبية هي الأدلة المادية التي تثبت حدوث المعاملة المالية وتعد أساسا لتسجيل القيود المحاسبية.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-receipt text-blue-500"></i><strong>فاتورة المبيعات</strong><p>تصدر للعميل عند بيع سلعة أو تقديم خدمة</p></div><div class="mini-card"><i class="fas fa-file-invoice text-green-500"></i><strong>فاتورة المشتريات</strong><p>تستلم من المورد عند شراء بضاعة أو خدمة</p></div><div class="mini-card"><i class="fas fa-money-check text-purple-500"></i><strong>سند القبض</strong><p>يثبت استلام مبلغ نقدي من العميل أو أي جهة</p></div><div class="mini-card"><i class="fas fa-hand-holding-usd text-orange-500"></i><strong>سند الصرف</strong><p>يثبت دفع مبلغ نقدي لمورد أو موظف أو جهة</p></div><div class="mini-card"><i class="fas fa-exchange-alt text-red-500"></i><strong>إشعار مدين/دائن</strong><p>يصدر لتعديل قيمة فاتورة بسبب مرتجعات أو خصومات</p></div><div class="mini-card"><i class="fas fa-university text-cyan-500"></i><strong>كشف الحساب البنكي</strong><p>تقرير من البنك يوضح حركة الحساب والرصيد</p></div></div><div class="info-box orange"><p><strong>قاعدة مهمة:</strong> لا يجوز تسجيل أي قيد محاسبي بدون مستند مؤيد. المستندات تحمي المنشأة قانونيا وتسهل عمل المراجعين.</p></div></div>`
      },
      {
        id: 'b10', title: 'التسويات البنكية', duration: '25 دقيقة', icon: 'fa-university',
        videoId: 'DZZq06cxOgw', videoTitle: 'التسوية البنكية خطوة بخطوة',
        content: `<div class="content-section"><h3><i class="fas fa-university text-blue-500"></i> مذكرة التسوية البنكية</h3><div class="info-box blue"><p>مذكرة التسوية البنكية هي أداة لمطابقة رصيد النقدية في دفاتر المنشأة مع رصيد كشف الحساب البنكي وتحديد أسباب الاختلاف.</p></div><h3><i class="fas fa-list-ol text-green-500"></i> أسباب الاختلاف</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-clock text-blue-500"></i><strong>شيكات معلقة</strong><p>شيكات أصدرتها المنشأة ولم يصرفها المستفيد بعد</p></div><div class="mini-card"><i class="fas fa-inbox text-green-500"></i><strong>إيداعات في الطريق</strong><p>مبالغ أودعتها المنشأة ولم تظهر في كشف البنك</p></div><div class="mini-card"><i class="fas fa-minus-circle text-red-500"></i><strong>رسوم بنكية</strong><p>عمولات وخدمات خصمها البنك ولم تسجلها المنشأة</p></div><div class="mini-card"><i class="fas fa-plus-circle text-purple-500"></i><strong>فوائد مضافة</strong><p>فوائد أضافها البنك ولم تعلم بها المنشأة</p></div></div><div class="example-box"><p><strong>مثال:</strong> رصيد دفاتر المنشأة: 45,000 | رصيد كشف البنك: 52,000</p><p>شيكات معلقة: 10,000 | إيداعات في الطريق: 5,000 | رسوم بنكية: 2,000</p><p>الرصيد المعدل = 45,000 - 2,000 = <strong>43,000</strong></p><p>الرصيد المعدل = 52,000 - 10,000 + 5,000 - 4,000 = <strong>43,000</strong> ✓</p></div></div>`
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
        content: `<div class="content-section"><h3><i class="fas fa-exchange-alt text-blue-500"></i> قائمة التغيرات في حقوق الملكية</h3><div class="info-box purple"><p>تظهر هذه القائمة التغيرات التي طرأت على حقوق الملكية خلال الفترة المالية، وتشمل رأس المال والأرباح المحتجزة والاحتياطيات.</p></div><div class="table-container"><table><thead><tr><th>البيان</th><th>رأس المال</th><th>أرباح محتجزة</th><th>الإجمالي</th></tr></thead><tbody><tr><td>الرصيد في بداية الفترة</td><td>100,000</td><td>20,000</td><td>120,000</td></tr><tr><td>(+) صافي ربح الفترة</td><td>-</td><td>97,000</td><td>97,000</td></tr><tr><td>(-) توزيعات أرباح</td><td>-</td><td>(15,000)</td><td>(15,000)</td></tr><tr class="total-row"><td><strong>الرصيد في نهاية الفترة</strong></td><td><strong>100,000</strong></td><td><strong>102,000</strong></td><td><strong>202,000</strong></td></tr></tbody></table></div></div>` },
      { id: 'i8', title: 'المحاسبة عن الأوراق التجارية', duration: '30 دقيقة', icon: 'fa-file-signature',
        videoId: 'v2l3_PG9k0c', videoTitle: 'المحاسبة عن الأوراق التجارية',
        content: `<div class="content-section"><h3><i class="fas fa-file-signature text-blue-500"></i> الأوراق التجارية</h3><div class="info-box blue"><p>الأوراق التجارية هي أدوات دفع قابلة للتداول تستخدم في المعاملات التجارية، وتشمل الكمبيالات والسندات الإذنية والشيكات.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-file-alt text-blue-500"></i><strong>الكمبيالة</strong><p>أمر كتابي من الساحب إلى المسحوب عليه بدفع مبلغ محدد في تاريخ معين</p></div><div class="mini-card"><i class="fas fa-pen text-green-500"></i><strong>السند الإذني</strong><p>تعهد كتابي من المحرر بدفع مبلغ محدد للمستفيد في تاريخ الاستحقاق</p></div><div class="mini-card"><i class="fas fa-money-check text-purple-500"></i><strong>الشيك</strong><p>أمر غير مشروط من الساحب إلى البنك بدفع مبلغ محدد عند الاطلاع</p></div></div><h3><i class="fas fa-pencil-alt text-green-500"></i> المعالجة المحاسبية</h3><div class="journal-entry"><div class="je-header">عند استلام ورقة قبض من عميل</div><div class="je-row"><span class="je-debit">50,000 من حـ/ أوراق القبض</span></div><div class="je-row"><span class="je-credit">50,000 إلى حـ/ المدينون</span></div></div><div class="journal-entry"><div class="je-header">عند تحصيل ورقة القبض في تاريخ الاستحقاق</div><div class="je-row"><span class="je-debit">50,000 من حـ/ البنك</span></div><div class="je-row"><span class="je-credit">50,000 إلى حـ/ أوراق القبض</span></div></div></div>` }
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
        content: `<div class="content-section"><h3><i class="fas fa-ruler text-blue-500"></i> نظام التكاليف المعيارية</h3><div class="info-box blue"><p>التكاليف المعيارية هي تكاليف محددة مسبقا لكل عنصر من عناصر التكلفة، تستخدم كمعيار للمقارنة مع التكاليف الفعلية.</p></div><h3>أنواع المعايير</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-star text-yellow-500"></i><strong>معايير مثالية</strong><p>تمثل أفضل أداء ممكن في ظروف مثالية</p></div><div class="mini-card"><i class="fas fa-check-circle text-green-500"></i><strong>معايير عملية</strong><p>قابلة للتحقيق في ظروف التشغيل العادية</p></div><div class="mini-card"><i class="fas fa-history text-blue-500"></i><strong>معايير تاريخية</strong><p>مبنية على متوسطات الأداء السابق</p></div></div></div>` },
      { id: 'c7', title: 'نظام التكاليف على أساس الأنشطة (ABC)', duration: '35 دقيقة', icon: 'fa-project-diagram',
        videoId: 'OP2Mc_dB0nI', videoTitle: 'نظام التكاليف على أساس الأنشطة',
        content: `<div class="content-section"><h3><i class="fas fa-project-diagram text-yellow-600"></i> نظام ABC</h3><div class="info-box yellow"><p><strong>Activity-Based Costing</strong> هو نظام لتوزيع التكاليف غير المباشرة على المنتجات بناء على الأنشطة الفعلية التي تستهلك الموارد، بدلا من استخدام معدل توزيع واحد.</p></div><h3><i class="fas fa-cogs text-blue-500"></i> خطوات تطبيق ABC</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>تحديد الأنشطة الرئيسية:</strong> مثل: إعداد الآلات، فحص الجودة، الشحن والتسليم</p></div><div class="step"><span class="step-num">2</span><p><strong>تحديد محركات التكلفة:</strong> العامل الذي يسبب حدوث النشاط (عدد مرات الإعداد، ساعات الفحص)</p></div><div class="step"><span class="step-num">3</span><p><strong>حساب معدل التكلفة لكل نشاط:</strong> تكلفة النشاط / حجم محرك التكلفة</p></div><div class="step"><span class="step-num">4</span><p><strong>تحميل التكاليف على المنتجات:</strong> حسب استهلاك كل منتج من كل نشاط</p></div></div><div class="example-box"><p><strong>مثال:</strong> تكلفة نشاط فحص الجودة: 120,000 ريال | محرك التكلفة: ساعات الفحص = 600 ساعة</p><p>معدل التكلفة = 120,000 / 600 = <strong>200 ريال/ساعة</strong></p><p>منتج أ يستهلك 100 ساعة: يتحمل 100 × 200 = <strong>20,000 ريال</strong></p></div></div>` }
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
  },
  // ============================================================
  // NEW COURSE 8: المحاسبة الحكومية وغير الربحية
  // ============================================================
  {
    id: 'government', title: 'المحاسبة الحكومية', subtitle: 'محاسبة القطاع العام والمنظمات غير الربحية', icon: 'fa-university', color: '#0369a1', colorLight: '#e0f2fe',
    lessons: [
      { id: 'g1', title: 'مقدمة في المحاسبة الحكومية', duration: '30 دقيقة', icon: 'fa-landmark',
        videoId: 'NHRk18rumz4', videoTitle: 'مقدمة في المحاسبة الحكومية',
        content: `<div class="content-section"><h3><i class="fas fa-landmark text-blue-700"></i> ما هي المحاسبة الحكومية؟</h3><div class="info-box blue"><p><strong>المحاسبة الحكومية</strong> هي فرع متخصص من المحاسبة يهتم بتسجيل وتصنيف وتلخيص المعاملات المالية للوحدات الحكومية والهيئات العامة، وتختلف عن محاسبة القطاع الخاص في عدة جوانب جوهرية.</p></div><h3><i class="fas fa-exchange-alt text-green-500"></i> الفرق بين المحاسبة الحكومية والتجارية</h3><div class="table-container"><table><thead><tr><th>المعيار</th><th>المحاسبة الحكومية</th><th>المحاسبة التجارية</th></tr></thead><tbody><tr><td>الهدف</td><td>تقديم خدمات عامة</td><td>تحقيق الربح</td></tr><tr><td>مصدر التمويل</td><td>الضرائب والرسوم والمنح</td><td>رأس المال والقروض والمبيعات</td></tr><tr><td>الموازنة</td><td>إلزامية وقانونية</td><td>أداة تخطيطية داخلية</td></tr><tr><td>أساس القياس</td><td>الأساس النقدي المعدل غالبا</td><td>أساس الاستحقاق</td></tr><tr><td>الرقابة</td><td>رقابة برلمانية وديوان محاسبة</td><td>مراجعة خارجية</td></tr></tbody></table></div><h3><i class="fas fa-bullseye text-red-500"></i> أهداف المحاسبة الحكومية</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-shield-alt text-blue-500"></i><strong>المساءلة العامة</strong><p>ضمان استخدام الأموال العامة وفقا للأغراض المحددة</p></div><div class="mini-card"><i class="fas fa-balance-scale text-green-500"></i><strong>الرقابة المالية</strong><p>التأكد من الالتزام بالموازنة والقوانين المالية</p></div><div class="mini-card"><i class="fas fa-chart-pie text-purple-500"></i><strong>الشفافية</strong><p>إتاحة المعلومات المالية للجمهور</p></div><div class="mini-card"><i class="fas fa-file-alt text-orange-500"></i><strong>إعداد التقارير</strong><p>تقديم تقارير مالية دقيقة لصناع القرار</p></div></div></div>` },
      { id: 'g2', title: 'نظام الصناديق الحكومية', duration: '35 دقيقة', icon: 'fa-piggy-bank',
        videoId: 'AToUj0DmerQ', videoTitle: 'نظام الصناديق في المحاسبة الحكومية',
        content: `<div class="content-section"><h3><i class="fas fa-piggy-bank text-blue-500"></i> نظام الصناديق (Fund Accounting)</h3><div class="info-box green"><p>نظام الصناديق هو نظام محاسبي تستخدمه الحكومات لتتبع الموارد المالية المخصصة لأغراض محددة. كل صندوق هو كيان محاسبي مستقل له معادلته المحاسبية الخاصة.</p></div><h3><i class="fas fa-layer-group text-purple-500"></i> أنواع الصناديق الحكومية</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-building text-blue-600"></i><strong>الصندوق العام</strong><p>يمول الأنشطة الحكومية العامة غير المخصصة لصندوق معين (التعليم، الصحة، الأمن)</p></div><div class="mini-card"><i class="fas fa-road text-green-600"></i><strong>صناديق الإيرادات الخاصة</strong><p>إيرادات مقيدة بأغراض محددة مثل صيانة الطرق أو حماية البيئة</p></div><div class="mini-card"><i class="fas fa-hard-hat text-orange-600"></i><strong>صناديق المشاريع الرأسمالية</strong><p>تمويل بناء أو اقتناء الأصول الرأسمالية الكبرى</p></div><div class="mini-card"><i class="fas fa-credit-card text-red-600"></i><strong>صناديق خدمة الدين</strong><p>تجميع الموارد لسداد أصل وفوائد الديون الحكومية</p></div><div class="mini-card"><i class="fas fa-water text-cyan-600"></i><strong>صناديق المشاريع التجارية</strong><p>أنشطة حكومية تدار بأسلوب تجاري (المياه، الكهرباء)</p></div><div class="mini-card"><i class="fas fa-handshake text-purple-600"></i><strong>الصناديق الائتمانية</strong><p>أموال تحتفظ بها الحكومة بصفة أمين (معاشات الموظفين)</p></div></div></div>` },
      { id: 'g3', title: 'الموازنة العامة للدولة', duration: '40 دقيقة', icon: 'fa-file-invoice-dollar',
        videoId: 'DKb3eDwp2bU', videoTitle: 'الموازنة العامة - شرح شامل',
        content: `<div class="content-section"><h3><i class="fas fa-file-invoice-dollar text-blue-500"></i> الموازنة العامة للدولة</h3><div class="info-box blue"><p><strong>الموازنة العامة</strong> هي وثيقة قانونية ومالية تقدر فيها إيرادات ونفقات الدولة لفترة مقبلة (سنة عادة)، وتعد أداة رئيسية للتخطيط والرقابة المالية.</p></div><h3><i class="fas fa-cogs text-green-500"></i> مراحل إعداد الموازنة</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>مرحلة الإعداد والتحضير:</strong> تقوم وزارة المالية بإعداد التقديرات بالتنسيق مع الجهات الحكومية</p></div><div class="step"><span class="step-num">2</span><p><strong>مرحلة الاعتماد:</strong> يناقش البرلمان/مجلس الشورى الموازنة ويعتمدها</p></div><div class="step"><span class="step-num">3</span><p><strong>مرحلة التنفيذ:</strong> تنفذ الجهات الحكومية الموازنة المعتمدة</p></div><div class="step"><span class="step-num">4</span><p><strong>مرحلة الرقابة والمتابعة:</strong> يراقب ديوان المحاسبة تنفيذ الموازنة</p></div></div><h3><i class="fas fa-chart-bar text-orange-500"></i> مكونات الموازنة العامة</h3><div class="table-container"><table><thead><tr><th>البند</th><th>الأمثلة</th><th>التقدير (مليار ريال)</th></tr></thead><tbody><tr><td><strong>الإيرادات النفطية</strong></td><td>عائدات النفط والغاز</td><td>600</td></tr><tr><td><strong>الإيرادات غير النفطية</strong></td><td>ضرائب، رسوم، استثمارات</td><td>350</td></tr><tr><td><strong>النفقات الجارية</strong></td><td>رواتب، تشغيل، صيانة</td><td>700</td></tr><tr><td><strong>النفقات الرأسمالية</strong></td><td>مشاريع بنية تحتية</td><td>200</td></tr><tr class="total-row"><td><strong>العجز/الفائض</strong></td><td></td><td><strong>+50</strong></td></tr></tbody></table></div></div>` },
      { id: 'g4', title: 'معايير المحاسبة الحكومية الدولية (IPSAS)', duration: '35 دقيقة', icon: 'fa-globe-americas',
        videoId: '9OrigJMgsw0', videoTitle: 'معايير المحاسبة الحكومية الدولية',
        content: `<div class="content-section"><h3><i class="fas fa-globe-americas text-blue-500"></i> معايير IPSAS</h3><div class="info-box purple"><p><strong>IPSAS</strong> (International Public Sector Accounting Standards) هي معايير محاسبية دولية للقطاع العام صادرة عن المجلس الدولي لمعايير المحاسبة للقطاع العام (IPSASB).</p></div><h3><i class="fas fa-list-ol text-green-500"></i> أهم معايير IPSAS</h3><div class="table-container"><table><thead><tr><th>المعيار</th><th>الموضوع</th></tr></thead><tbody><tr><td>IPSAS 1</td><td>عرض القوائم المالية</td></tr><tr><td>IPSAS 2</td><td>قائمة التدفقات النقدية</td></tr><tr><td>IPSAS 5</td><td>تكاليف الاقتراض</td></tr><tr><td>IPSAS 12</td><td>المخزون</td></tr><tr><td>IPSAS 17</td><td>الممتلكات والآلات والمعدات</td></tr><tr><td>IPSAS 23</td><td>الإيراد من المعاملات غير التبادلية (الضرائب والتحويلات)</td></tr><tr><td>IPSAS 24</td><td>عرض معلومات الموازنة في القوائم المالية</td></tr><tr><td>IPSAS 33</td><td>التطبيق الأول لمعايير IPSAS على أساس الاستحقاق</td></tr></tbody></table></div><h3><i class="fas fa-star text-yellow-500"></i> فوائد تطبيق IPSAS</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-eye text-blue-500"></i><strong>الشفافية</strong><p>تحسين جودة التقارير المالية الحكومية</p></div><div class="mini-card"><i class="fas fa-globe text-green-500"></i><strong>المقارنة الدولية</strong><p>تسهيل مقارنة الأداء المالي بين الدول</p></div><div class="mini-card"><i class="fas fa-check-double text-purple-500"></i><strong>المساءلة</strong><p>تعزيز المساءلة عن استخدام الموارد العامة</p></div></div></div>` },
      { id: 'g5', title: 'محاسبة المنظمات غير الربحية', duration: '30 دقيقة', icon: 'fa-hands-helping',
        videoId: 'bBExdVqgxl0', videoTitle: 'محاسبة المنظمات غير الربحية',
        content: `<div class="content-section"><h3><i class="fas fa-hands-helping text-green-600"></i> المنظمات غير الربحية</h3><div class="info-box green"><p>المنظمات غير الربحية (NPOs) تهدف لخدمة المجتمع وليس تحقيق الأرباح. تشمل الجمعيات الخيرية والأوقاف والمؤسسات التعليمية والصحية.</p></div><h3><i class="fas fa-exchange-alt text-blue-500"></i> اختلافات محاسبية رئيسية</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-file-alt text-blue-500"></i><strong>قائمة الأنشطة</strong><p>بدلا من قائمة الدخل تعد قائمة الأنشطة التي تظهر التغير في صافي الأصول</p></div><div class="mini-card"><i class="fas fa-layer-group text-green-500"></i><strong>تصنيف صافي الأصول</strong><p>تصنف إلى: غير مقيدة، مقيدة مؤقتا، ومقيدة بشكل دائم</p></div><div class="mini-card"><i class="fas fa-donate text-purple-500"></i><strong>الاعتراف بالتبرعات</strong><p>تسجل التبرعات كإيراد عند استلامها أو التعهد بها</p></div><div class="mini-card"><i class="fas fa-hand-holding-heart text-red-500"></i><strong>الخدمات التطوعية</strong><p>قد تسجل كإيراد ومصروف إذا كانت متخصصة وقابلة للقياس</p></div></div><h3><i class="fas fa-clipboard-list text-orange-500"></i> القوائم المالية للمنظمات غير الربحية</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>قائمة المركز المالي:</strong> تعرض الأصول والخصوم وصافي الأصول</p></div><div class="step"><span class="step-num">2</span><p><strong>قائمة الأنشطة:</strong> تعرض الإيرادات والمصروفات والتغير في صافي الأصول</p></div><div class="step"><span class="step-num">3</span><p><strong>قائمة التدفقات النقدية:</strong> نفس هيكل القطاع التجاري</p></div><div class="step"><span class="step-num">4</span><p><strong>قائمة المصروفات الوظيفية:</strong> توزيع المصروفات حسب البرامج والأنشطة</p></div></div></div>` },
      { id: 'g6', title: 'الرقابة المالية الحكومية وديوان المحاسبة', duration: '30 دقيقة', icon: 'fa-gavel',
        videoId: 'ak6FoeWJKjg', videoTitle: 'الرقابة المالية في القطاع العام',
        content: `<div class="content-section"><h3><i class="fas fa-gavel text-blue-500"></i> الرقابة المالية الحكومية</h3><div class="info-box blue"><p>الرقابة المالية الحكومية هي مجموعة الإجراءات والأنظمة التي تهدف إلى التأكد من سلامة استخدام المال العام وفقا للأنظمة والتشريعات.</p></div><h3><i class="fas fa-sitemap text-green-500"></i> أنواع الرقابة المالية</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-clock text-blue-500"></i><strong>رقابة سابقة</strong><p>قبل صرف الأموال للتأكد من توفر الاعتماد والمستندات</p></div><div class="mini-card"><i class="fas fa-sync text-green-500"></i><strong>رقابة مرافقة</strong><p>أثناء تنفيذ العمليات المالية للتأكد من سلامتها</p></div><div class="mini-card"><i class="fas fa-search text-red-500"></i><strong>رقابة لاحقة</strong><p>بعد تنفيذ العمليات لفحص الحسابات والتقارير</p></div></div><h3><i class="fas fa-university text-purple-500"></i> دور ديوان المحاسبة</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>فحص الحسابات:</strong> مراجعة القوائم المالية والسجلات المحاسبية للجهات الحكومية</p></div><div class="step"><span class="step-num">2</span><p><strong>رقابة الأداء:</strong> تقييم كفاءة وفعالية استخدام الموارد العامة</p></div><div class="step"><span class="step-num">3</span><p><strong>رقابة الالتزام:</strong> التأكد من الالتزام بالأنظمة والتعليمات المالية</p></div><div class="step"><span class="step-num">4</span><p><strong>إعداد التقارير:</strong> رفع تقارير سنوية لرئيس الدولة والبرلمان</p></div></div></div>` }
    ]
  },
  // ============================================================
  // NEW COURSE 9: التحليل المالي المتقدم
  // ============================================================
  {
    id: 'financial-analysis', title: 'التحليل المالي المتقدم', subtitle: 'أدوات وتقنيات التحليل المالي الاحترافي', icon: 'fa-chart-pie', color: '#7c3aed', colorLight: '#ede9fe',
    lessons: [
      { id: 'fa1', title: 'التحليل الأفقي والرأسي', duration: '35 دقيقة', icon: 'fa-arrows-alt-h',
        videoId: 'DKb3eDwp2bU', videoTitle: 'التحليل المالي - الأفقي والرأسي',
        content: `<div class="content-section"><h3><i class="fas fa-arrows-alt-h text-purple-500"></i> التحليل الأفقي (Horizontal Analysis)</h3><div class="info-box purple"><p><strong>التحليل الأفقي</strong> هو مقارنة البنود المالية عبر فترات زمنية مختلفة لتحديد الاتجاهات والتغيرات.</p></div><div class="formula-box"><strong>نسبة التغير = (قيمة الفترة الحالية - قيمة فترة الأساس) / قيمة فترة الأساس × 100</strong></div><div class="table-container"><table><thead><tr><th>البند</th><th>2024</th><th>2025</th><th>التغير</th><th>النسبة</th></tr></thead><tbody><tr><td>المبيعات</td><td>500,000</td><td>600,000</td><td>+100,000</td><td class="favorable">+20%</td></tr><tr><td>تكلفة المبيعات</td><td>300,000</td><td>340,000</td><td>+40,000</td><td class="unfavorable">+13.3%</td></tr><tr><td>صافي الربح</td><td>80,000</td><td>110,000</td><td>+30,000</td><td class="favorable">+37.5%</td></tr></tbody></table></div><h3><i class="fas fa-arrows-alt-v text-blue-500"></i> التحليل الرأسي (Vertical Analysis)</h3><div class="info-box blue"><p><strong>التحليل الرأسي</strong> هو التعبير عن كل بند كنسبة مئوية من بند أساسي (المبيعات في قائمة الدخل، إجمالي الأصول في الميزانية).</p></div><div class="example-box"><p><strong>مثال:</strong> إذا كانت المبيعات 600,000 وتكلفة المبيعات 340,000</p><p>نسبة تكلفة المبيعات = 340,000 / 600,000 × 100 = <strong>56.7%</strong></p><p>نسبة مجمل الربح = 43.3% (ممتازة)</p></div></div>` },
      { id: 'fa2', title: 'نسب الكفاءة والنشاط', duration: '35 دقيقة', icon: 'fa-tachometer-alt',
        videoId: 'DKb3eDwp2bU', videoTitle: 'نسب الكفاءة والنشاط - التحليل المالي',
        content: `<div class="content-section"><h3><i class="fas fa-tachometer-alt text-purple-500"></i> نسب الكفاءة والنشاط</h3><div class="info-box green"><p>تقيس هذه النسب مدى كفاءة المنشأة في استخدام مواردها وإدارة أصولها لتوليد الإيرادات.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-sync text-blue-500"></i><strong>معدل دوران المخزون</strong><p>تكلفة المبيعات / متوسط المخزون</p><div class="example-small">مثال: 300,000 / 50,000 = <strong>6 مرات</strong> (جيد)</div></div><div class="mini-card"><i class="fas fa-user-clock text-green-500"></i><strong>معدل دوران المدينين</strong><p>صافي المبيعات الآجلة / متوسط المدينين</p><div class="example-small">مثال: 400,000 / 50,000 = <strong>8 مرات</strong></div></div><div class="mini-card"><i class="fas fa-calendar-day text-orange-500"></i><strong>متوسط فترة التحصيل</strong><p>365 / معدل دوران المدينين</p><div class="example-small">مثال: 365 / 8 = <strong>45.6 يوم</strong></div></div><div class="mini-card"><i class="fas fa-boxes text-red-500"></i><strong>متوسط فترة الاحتفاظ بالمخزون</strong><p>365 / معدل دوران المخزون</p><div class="example-small">مثال: 365 / 6 = <strong>60.8 يوم</strong></div></div><div class="mini-card"><i class="fas fa-industry text-purple-500"></i><strong>معدل دوران الأصول</strong><p>صافي المبيعات / متوسط إجمالي الأصول</p><div class="example-small">مثال: 600,000 / 400,000 = <strong>1.5 مرة</strong></div></div><div class="mini-card"><i class="fas fa-handshake text-cyan-500"></i><strong>معدل دوران الدائنين</strong><p>المشتريات / متوسط الدائنين</p><div class="example-small">مثال: 350,000 / 70,000 = <strong>5 مرات</strong></div></div></div></div>` },
      { id: 'fa3', title: 'نسب الرافعة المالية والهيكل التمويلي', duration: '35 دقيقة', icon: 'fa-layer-group',
        videoId: 'h_-jXv3ZolQ', videoTitle: 'تحليل الرافعة المالية',
        content: `<div class="content-section"><h3><i class="fas fa-layer-group text-purple-500"></i> نسب الرافعة المالية</h3><div class="info-box orange"><p>تقيس هذه النسب مدى اعتماد المنشأة على الديون في تمويل أصولها ومدى قدرتها على سداد التزاماتها طويلة الأجل.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-percentage text-red-500"></i><strong>نسبة الديون إلى الأصول</strong><p>إجمالي الديون / إجمالي الأصول</p><div class="example-small">مثال: 200,000 / 500,000 = <strong>40%</strong> (مقبولة)</div></div><div class="mini-card"><i class="fas fa-balance-scale text-blue-500"></i><strong>نسبة الديون إلى حقوق الملكية</strong><p>إجمالي الديون / حقوق الملكية</p><div class="example-small">مثال: 200,000 / 300,000 = <strong>0.67</strong></div></div><div class="mini-card"><i class="fas fa-shield-alt text-green-500"></i><strong>نسبة تغطية الفوائد</strong><p>الربح قبل الفوائد والضرائب / مصروف الفوائد</p><div class="example-small">مثال: 150,000 / 20,000 = <strong>7.5 مرة</strong> (ممتازة)</div></div><div class="mini-card"><i class="fas fa-chart-line text-purple-500"></i><strong>مضاعف حقوق الملكية</strong><p>إجمالي الأصول / حقوق الملكية</p><div class="example-small">مثال: 500,000 / 300,000 = <strong>1.67</strong></div></div></div><h3><i class="fas fa-exclamation-triangle text-yellow-500"></i> مخاطر الرافعة المالية العالية</h3><div class="info-box red"><p>الرافعة المالية سلاح ذو حدين: تزيد العائد في الأوقات الجيدة لكنها تضخم الخسائر في الأوقات الصعبة. نسبة ديون أعلى من 60% تعد مرتفعة وتزيد مخاطر الإفلاس.</p></div></div>` },
      { id: 'fa4', title: 'تحليل دوبونت (DuPont Analysis)', duration: '30 دقيقة', icon: 'fa-project-diagram',
        videoId: 'DKb3eDwp2bU', videoTitle: 'نموذج دوبونت للتحليل المالي',
        content: `<div class="content-section"><h3><i class="fas fa-project-diagram text-purple-500"></i> نموذج دوبونت (DuPont Model)</h3><div class="info-box purple"><p>نموذج دوبونت يحلل العائد على حقوق الملكية (ROE) إلى مكوناته الأساسية لفهم العوامل المؤثرة على ربحية المنشأة.</p></div><div class="formula-box"><strong>ROE = هامش الربح الصافي × معدل دوران الأصول × مضاعف حقوق الملكية</strong><br><br>ROE = (صافي الربح / المبيعات) × (المبيعات / الأصول) × (الأصول / حقوق الملكية)</div><div class="example-box"><p><strong>مثال عملي:</strong></p><p>صافي الربح: 90,000 | المبيعات: 600,000 | الأصول: 500,000 | حقوق الملكية: 300,000</p><p>هامش الربح = 90,000 / 600,000 = <strong>15%</strong></p><p>دوران الأصول = 600,000 / 500,000 = <strong>1.2</strong></p><p>مضاعف حقوق الملكية = 500,000 / 300,000 = <strong>1.67</strong></p><p>ROE = 15% × 1.2 × 1.67 = <strong>30%</strong></p></div><h3><i class="fas fa-lightbulb text-yellow-500"></i> تفسير النتائج</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-coins text-green-500"></i><strong>هامش الربح</strong><p>يعكس كفاءة إدارة التكاليف والتسعير</p></div><div class="mini-card"><i class="fas fa-sync text-blue-500"></i><strong>دوران الأصول</strong><p>يعكس كفاءة استخدام الأصول في توليد المبيعات</p></div><div class="mini-card"><i class="fas fa-balance-scale text-red-500"></i><strong>المضاعف المالي</strong><p>يعكس درجة استخدام الرافعة المالية</p></div></div></div>` },
      { id: 'fa5', title: 'التحليل باستخدام التدفقات النقدية', duration: '35 دقيقة', icon: 'fa-money-bill-wave',
        videoId: 'DKb3eDwp2bU', videoTitle: 'تحليل التدفقات النقدية',
        content: `<div class="content-section"><h3><i class="fas fa-money-bill-wave text-purple-500"></i> نسب التدفقات النقدية</h3><div class="info-box blue"><p>تحليل التدفقات النقدية يكشف عن الوضع النقدي الحقيقي للمنشأة، وهو أكثر موثوقية من الأرباح المحاسبية لأنه يصعب التلاعب به.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-shield-alt text-green-500"></i><strong>نسبة التدفق النقدي التشغيلي</strong><p>التدفق النقدي من العمليات / الخصوم المتداولة</p><div class="example-small">النسبة > 1 تعني قدرة ممتازة على السداد</div></div><div class="mini-card"><i class="fas fa-percentage text-blue-500"></i><strong>نسبة جودة الأرباح</strong><p>التدفق النقدي التشغيلي / صافي الربح</p><div class="example-small">النسبة > 1 تعني أرباح عالية الجودة (نقدية حقيقية)</div></div><div class="mini-card"><i class="fas fa-hand-holding-usd text-orange-500"></i><strong>التدفق النقدي الحر</strong><p>التدفق التشغيلي - النفقات الرأسمالية</p><div class="example-small">يمثل النقد المتاح للتوزيع على الملاك وسداد الديون</div></div><div class="mini-card"><i class="fas fa-chart-line text-purple-500"></i><strong>نسبة إعادة الاستثمار</strong><p>النفقات الرأسمالية / الإهلاك</p><div class="example-small">النسبة > 1 تعني نمو في الأصول الإنتاجية</div></div></div><div class="info-box orange"><p><strong>قاعدة ذهبية:</strong> الشركة التي تحقق أرباحا لكن تدفقاتها النقدية التشغيلية سالبة تعد علامة تحذيرية خطيرة قد تشير إلى مشاكل في التحصيل أو تضخم المخزون.</p></div></div>` },
      { id: 'fa6', title: 'تقييم الشركات وأسهمها', duration: '40 دقيقة', icon: 'fa-chart-bar',
        videoId: 'h_-jXv3ZolQ', videoTitle: 'أساسيات تقييم الشركات',
        content: `<div class="content-section"><h3><i class="fas fa-chart-bar text-purple-500"></i> مؤشرات تقييم الأسهم</h3><div class="info-box purple"><p>يستخدم المحللون الماليون مجموعة من المؤشرات لتقييم أسهم الشركات المدرجة واتخاذ قرارات الاستثمار.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-money-bill text-green-500"></i><strong>ربحية السهم (EPS)</strong><p>صافي الربح / عدد الأسهم العادية</p><div class="example-small">مثال: 90,000 / 10,000 = <strong>9 ريال/سهم</strong></div></div><div class="mini-card"><i class="fas fa-chart-line text-blue-500"></i><strong>مكرر الأرباح (P/E)</strong><p>سعر السهم السوقي / ربحية السهم</p><div class="example-small">مثال: 135 / 9 = <strong>15 مرة</strong></div></div><div class="mini-card"><i class="fas fa-book-open text-orange-500"></i><strong>مضاعف القيمة الدفترية (P/B)</strong><p>سعر السهم / القيمة الدفترية للسهم</p><div class="example-small">P/B > 1 يعني السوق يقيم الشركة أعلى من صافي أصولها</div></div><div class="mini-card"><i class="fas fa-hand-holding-usd text-red-500"></i><strong>عائد التوزيعات</strong><p>توزيعات السهم / سعر السهم × 100</p><div class="example-small">مثال: 3 / 135 × 100 = <strong>2.2%</strong></div></div><div class="mini-card"><i class="fas fa-award text-purple-500"></i><strong>القيمة المؤسسية (EV/EBITDA)</strong><p>قيمة المنشأة / الأرباح قبل الفوائد والضرائب والإهلاك</p><div class="example-small">مؤشر مقارنة مهم بين الشركات</div></div></div></div>` }
    ]
  },
  // ============================================================
  // NEW COURSE 10: المحاسبة الجنائية والاستشارية
  // ============================================================
  {
    id: 'forensic', title: 'المحاسبة الجنائية والاستشارية', subtitle: 'كشف الاحتيال والتحقيقات المالية', icon: 'fa-user-secret', color: '#dc2626', colorLight: '#fee2e2',
    lessons: [
      { id: 'fo1', title: 'مقدمة في المحاسبة الجنائية', duration: '30 دقيقة', icon: 'fa-search-dollar',
        videoId: '6sEAi4AQFAk', videoTitle: 'مقدمة في المحاسبة الجنائية',
        content: `<div class="content-section"><h3><i class="fas fa-search-dollar text-red-500"></i> ما هي المحاسبة الجنائية؟</h3><div class="info-box red"><p><strong>المحاسبة الجنائية</strong> (Forensic Accounting) هي تخصص يجمع بين المهارات المحاسبية والتحقيقية والقانونية لكشف الاحتيال المالي وتقديم الأدلة أمام المحاكم.</p></div><h3><i class="fas fa-users text-blue-500"></i> مجالات عمل المحاسب الجنائي</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-search text-red-500"></i><strong>كشف الاحتيال</strong><p>التحقيق في حالات الغش والتزوير المالي</p></div><div class="mini-card"><i class="fas fa-gavel text-blue-500"></i><strong>الدعم القضائي</strong><p>تقديم شهادات خبير أمام المحاكم</p></div><div class="mini-card"><i class="fas fa-file-contract text-green-500"></i><strong>نزاعات العقود</strong><p>تحليل المطالبات والنزاعات التجارية</p></div><div class="mini-card"><i class="fas fa-user-tie text-purple-500"></i><strong>العناية الواجبة</strong><p>فحص الشركات قبل الاستحواذ أو الاندماج</p></div><div class="mini-card"><i class="fas fa-money-bill-wave text-orange-500"></i><strong>غسيل الأموال</strong><p>تتبع مسارات الأموال المشبوهة</p></div><div class="mini-card"><i class="fas fa-fire text-yellow-500"></i><strong>مطالبات التأمين</strong><p>تقدير الخسائر في حالات الحرائق والكوارث</p></div></div></div>` },
      { id: 'fo2', title: 'أنواع الاحتيال المالي وأساليبه', duration: '40 دقيقة', icon: 'fa-mask',
        videoId: 'u-zAZQU1u8k', videoTitle: 'أنواع الاحتيال المالي',
        content: `<div class="content-section"><h3><i class="fas fa-mask text-red-500"></i> أنواع الاحتيال المالي</h3><div class="info-box red"><p>وفقا لتقرير ACFE (جمعية خبراء الاحتيال المعتمدين)، تخسر المنظمات حوالي 5% من إيراداتها سنويا بسبب الاحتيال.</p></div><h3>تصنيف شجرة الاحتيال (Fraud Tree)</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-hand-holding-usd text-red-600"></i><strong>اختلاس الأصول (86%)</strong><p>سرقة النقد، التلاعب بالمصروفات، سرقة المخزون</p><div class="example-small">متوسط الخسارة: 100,000 دولار</div></div><div class="mini-card"><i class="fas fa-file-alt text-orange-600"></i><strong>الاحتيال في القوائم المالية (9%)</strong><p>تضخيم الإيرادات، إخفاء المصروفات، تزوير الأرقام</p><div class="example-small">متوسط الخسارة: 954,000 دولار</div></div><div class="mini-card"><i class="fas fa-handshake text-purple-600"></i><strong>الفساد والرشوة (5%)</strong><p>رشاوى، تضارب مصالح، ابتزاز اقتصادي</p><div class="example-small">متوسط الخسارة: 250,000 دولار</div></div></div><h3><i class="fas fa-exclamation-triangle text-yellow-500"></i> العلامات التحذيرية (Red Flags)</h3><div class="steps-list"><div class="step"><span class="step-num"><i class="fas fa-flag text-red-400" style="font-size:0.7rem"></i></span><p>موظف يرفض أخذ إجازة أو يعمل ساعات إضافية بدون مبرر</p></div><div class="step"><span class="step-num"><i class="fas fa-flag text-red-400" style="font-size:0.7rem"></i></span><p>تحسن مفاجئ في مستوى المعيشة لا يتناسب مع الراتب</p></div><div class="step"><span class="step-num"><i class="fas fa-flag text-red-400" style="font-size:0.7rem"></i></span><p>فروقات غير مبررة في التسويات البنكية</p></div><div class="step"><span class="step-num"><i class="fas fa-flag text-red-400" style="font-size:0.7rem"></i></span><p>زيادة غير مبررة في المصروفات أو الخصومات</p></div><div class="step"><span class="step-num"><i class="fas fa-flag text-red-400" style="font-size:0.7rem"></i></span><p>نمو في الإيرادات لا يتناسب مع التدفقات النقدية</p></div></div></div>` },
      { id: 'fo3', title: 'تقنيات كشف الاحتيال', duration: '35 دقيقة', icon: 'fa-fingerprint',
        videoId: 'DLPy0hiFy4c', videoTitle: 'تقنيات كشف الاحتيال المالي',
        content: `<div class="content-section"><h3><i class="fas fa-fingerprint text-red-500"></i> أدوات وتقنيات الكشف</h3><div class="info-box blue"><p>يستخدم المحاسب الجنائي مجموعة متنوعة من الأدوات والتقنيات لكشف الاحتيال والتلاعب المالي.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-calculator text-blue-500"></i><strong>قانون بنفورد (Benford's Law)</strong><p>تحليل توزيع الأرقام الأولى في البيانات المالية. الانحراف عن التوزيع المتوقع يشير لاحتمال التلاعب.</p></div><div class="mini-card"><i class="fas fa-chart-area text-green-500"></i><strong>التحليل الإحصائي</strong><p>استخدام الأساليب الإحصائية لتحديد المعاملات الشاذة والأنماط غير الطبيعية</p></div><div class="mini-card"><i class="fas fa-database text-purple-500"></i><strong>تنقيب البيانات (Data Mining)</strong><p>البحث في قواعد البيانات الكبيرة عن أنماط وعلاقات مخفية</p></div><div class="mini-card"><i class="fas fa-sitemap text-orange-500"></i><strong>تتبع المعاملات</strong><p>متابعة مسار المعاملات المالية من البداية للنهاية للكشف عن الثغرات</p></div></div><h3><i class="fas fa-microscope text-green-500"></i> إجراءات التحقيق الجنائي</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>التخطيط:</strong> تحديد نطاق التحقيق والموارد المطلوبة</p></div><div class="step"><span class="step-num">2</span><p><strong>جمع الأدلة:</strong> الحصول على المستندات والسجلات الإلكترونية</p></div><div class="step"><span class="step-num">3</span><p><strong>التحليل:</strong> فحص البيانات باستخدام التقنيات المتخصصة</p></div><div class="step"><span class="step-num">4</span><p><strong>المقابلات:</strong> إجراء مقابلات مع الأطراف المعنية</p></div><div class="step"><span class="step-num">5</span><p><strong>إعداد التقرير:</strong> توثيق النتائج والأدلة بشكل قانوني</p></div></div></div>` },
      { id: 'fo4', title: 'مكافحة غسيل الأموال (AML)', duration: '35 دقيقة', icon: 'fa-shield-alt',
        videoId: 'ak6FoeWJKjg', videoTitle: 'مكافحة غسيل الأموال',
        content: `<div class="content-section"><h3><i class="fas fa-shield-alt text-red-500"></i> غسيل الأموال</h3><div class="info-box red"><p><strong>غسيل الأموال</strong> هو عملية تحويل الأموال المتحصلة من مصادر غير مشروعة إلى أموال تبدو مشروعة من خلال سلسلة من المعاملات المالية.</p></div><h3><i class="fas fa-sort-amount-down text-blue-500"></i> مراحل غسيل الأموال</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>مرحلة الإيداع (Placement):</strong> إدخال الأموال غير المشروعة في النظام المالي عبر إيداعات نقدية صغيرة أو شراء أصول</p></div><div class="step"><span class="step-num">2</span><p><strong>مرحلة التمويه (Layering):</strong> إخفاء مصدر الأموال عبر سلسلة معقدة من المعاملات والتحويلات بين حسابات متعددة</p></div><div class="step"><span class="step-num">3</span><p><strong>مرحلة الدمج (Integration):</strong> إعادة إدخال الأموال في الاقتصاد الشرعي كاستثمارات أو مشتريات عقارية</p></div></div><h3><i class="fas fa-tasks text-green-500"></i> إجراءات مكافحة غسيل الأموال</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-id-card text-blue-500"></i><strong>اعرف عميلك (KYC)</strong><p>التحقق من هوية العملاء والتأكد من مشروعية أنشطتهم</p></div><div class="mini-card"><i class="fas fa-bell text-red-500"></i><strong>الإبلاغ عن المعاملات المشبوهة</strong><p>إبلاغ الجهات المختصة عن أي معاملات غير عادية</p></div><div class="mini-card"><i class="fas fa-file-alt text-green-500"></i><strong>حفظ السجلات</strong><p>الاحتفاظ بسجلات العملاء والمعاملات لمدة لا تقل عن 10 سنوات</p></div></div></div>` },
      { id: 'fo5', title: 'التحقيقات المالية وإعداد التقارير القانونية', duration: '30 دقيقة', icon: 'fa-file-signature',
        videoId: '6sEAi4AQFAk', videoTitle: 'إعداد تقارير التحقيقات المالية',
        content: `<div class="content-section"><h3><i class="fas fa-file-signature text-red-500"></i> تقرير التحقيق الجنائي</h3><div class="info-box blue"><p>تقرير التحقيق المالي يجب أن يكون دقيقا وموضوعيا وقابلا للاستخدام كدليل في الإجراءات القانونية.</p></div><h3><i class="fas fa-list-ol text-green-500"></i> مكونات التقرير</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>الملخص التنفيذي:</strong> نظرة عامة موجزة عن القضية والنتائج الرئيسية</p></div><div class="step"><span class="step-num">2</span><p><strong>خلفية القضية:</strong> وصف الظروف المحيطة والادعاءات</p></div><div class="step"><span class="step-num">3</span><p><strong>المنهجية:</strong> الإجراءات والتقنيات المستخدمة في التحقيق</p></div><div class="step"><span class="step-num">4</span><p><strong>النتائج والأدلة:</strong> عرض تفصيلي للنتائج مدعومة بالأدلة</p></div><div class="step"><span class="step-num">5</span><p><strong>حساب الأضرار:</strong> تقدير حجم الخسائر المالية الناتجة عن الاحتيال</p></div><div class="step"><span class="step-num">6</span><p><strong>التوصيات:</strong> اقتراحات لمنع تكرار الاحتيال مستقبلا</p></div></div><h3><i class="fas fa-certificate text-yellow-500"></i> شهادة CFE</h3><div class="info-box green"><p><strong>CFE</strong> (Certified Fraud Examiner) هي الشهادة المهنية الأبرز في مجال كشف الاحتيال، تصدرها جمعية خبراء الاحتيال المعتمدين (ACFE). تتطلب خبرة عملية ونجاحا في 4 اختبارات: المعاملات المالية، التحقيق، القانون، وعلم الجريمة.</p></div></div>` }
    ]
  },
  // ============================================================
  // NEW COURSE 11: محاسبة المنشآت الصغيرة وريادة الأعمال
  // ============================================================
  {
    id: 'small-business', title: 'محاسبة المنشآت الصغيرة', subtitle: 'المحاسبة العملية لرواد الأعمال وأصحاب المشاريع', icon: 'fa-store', color: '#059669', colorLight: '#d1fae5',
    lessons: [
      { id: 'sb1', title: 'إعداد النظام المحاسبي للمشروع الجديد', duration: '30 دقيقة', icon: 'fa-rocket',
        videoId: 'K2ELU0gfkYI', videoTitle: 'إعداد النظام المحاسبي من الصفر',
        content: `<div class="content-section"><h3><i class="fas fa-rocket text-green-500"></i> تأسيس النظام المحاسبي</h3><div class="info-box green"><p>النظام المحاسبي الجيد هو أساس نجاح أي مشروع. يساعدك على فهم وضعك المالي واتخاذ قرارات مدروسة من اليوم الأول.</p></div><h3><i class="fas fa-tasks text-blue-500"></i> خطوات تأسيس النظام المحاسبي</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p><strong>فتح حساب بنكي تجاري:</strong> افصل أموال المشروع عن أموالك الشخصية تماما</p></div><div class="step"><span class="step-num">2</span><p><strong>اختيار البرنامج المحاسبي:</strong> اختر برنامجا مناسبا لحجم مشروعك (قيود، دفترة، QuickBooks)</p></div><div class="step"><span class="step-num">3</span><p><strong>إعداد شجرة الحسابات:</strong> حدد الحسابات الرئيسية المناسبة لنشاطك</p></div><div class="step"><span class="step-num">4</span><p><strong>تصميم نماذج الفواتير:</strong> أنشئ فواتير مبيعات ومشتريات متوافقة مع هيئة الزكاة</p></div><div class="step"><span class="step-num">5</span><p><strong>تحديد السياسات المالية:</strong> ضع سياسات واضحة للصرف والتحصيل والجرد</p></div></div><h3><i class="fas fa-sitemap text-purple-500"></i> شجرة حسابات مبسطة لمشروع صغير</h3><div class="table-container"><table><thead><tr><th>رقم الحساب</th><th>اسم الحساب</th><th>النوع</th></tr></thead><tbody><tr><td>1100</td><td>النقدية والبنوك</td><td>أصول متداولة</td></tr><tr><td>1200</td><td>المدينون (العملاء)</td><td>أصول متداولة</td></tr><tr><td>1300</td><td>المخزون</td><td>أصول متداولة</td></tr><tr><td>1500</td><td>المعدات والتجهيزات</td><td>أصول ثابتة</td></tr><tr><td>2100</td><td>الدائنون (الموردون)</td><td>خصوم متداولة</td></tr><tr><td>3100</td><td>رأس المال</td><td>حقوق ملكية</td></tr><tr><td>4100</td><td>المبيعات</td><td>إيرادات</td></tr><tr><td>5100</td><td>تكلفة المبيعات</td><td>مصروفات</td></tr><tr><td>5200</td><td>مصاريف الرواتب</td><td>مصروفات</td></tr><tr><td>5300</td><td>مصاريف الإيجار</td><td>مصروفات</td></tr></tbody></table></div></div>` },
      { id: 'sb2', title: 'إدارة التدفقات النقدية للمشاريع الصغيرة', duration: '35 دقيقة', icon: 'fa-money-check-alt',
        videoId: 'DKb3eDwp2bU', videoTitle: 'إدارة النقد في المشاريع الصغيرة',
        content: `<div class="content-section"><h3><i class="fas fa-money-check-alt text-green-500"></i> لماذا يفشل الكثير من المشاريع؟</h3><div class="info-box red"><p><strong>82% من المشاريع الصغيرة</strong> تفشل بسبب مشاكل في التدفقات النقدية وليس بسبب عدم الربحية. الفرق بين الربح والنقد هو ما يحدد بقاء المشروع.</p></div><h3><i class="fas fa-chart-bar text-blue-500"></i> جدول التدفقات النقدية الشهري</h3><div class="table-container"><table><thead><tr><th>البند</th><th>الشهر 1</th><th>الشهر 2</th><th>الشهر 3</th></tr></thead><tbody><tr><td><strong>رصيد أول المدة</strong></td><td>50,000</td><td>35,000</td><td>52,000</td></tr><tr><td>+ تحصيلات المبيعات</td><td>40,000</td><td>55,000</td><td>60,000</td></tr><tr><td>- مدفوعات الموردين</td><td>(25,000)</td><td>(20,000)</td><td>(22,000)</td></tr><tr><td>- رواتب</td><td>(15,000)</td><td>(15,000)</td><td>(15,000)</td></tr><tr><td>- إيجار ومصاريف</td><td>(15,000)</td><td>(3,000)</td><td>(3,000)</td></tr><tr class="total-row"><td><strong>رصيد آخر المدة</strong></td><td><strong>35,000</strong></td><td><strong>52,000</strong></td><td><strong>72,000</strong></td></tr></tbody></table></div><h3><i class="fas fa-lightbulb text-yellow-500"></i> نصائح ذهبية لإدارة النقد</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-clock text-blue-500"></i><strong>حصّل بسرعة</strong><p>قلل فترة التحصيل وقدم خصومات للسداد المبكر</p></div><div class="mini-card"><i class="fas fa-handshake text-green-500"></i><strong>تفاوض مع الموردين</strong><p>اطلب فترات سداد أطول لتحسين التدفق النقدي</p></div><div class="mini-card"><i class="fas fa-piggy-bank text-purple-500"></i><strong>احتفظ باحتياطي</strong><p>احتفظ بما يكفي لتغطية 3-6 أشهر من المصروفات الثابتة</p></div><div class="mini-card"><i class="fas fa-chart-line text-orange-500"></i><strong>تابع أسبوعيا</strong><p>راجع التدفقات النقدية أسبوعيا وليس شهريا</p></div></div></div>` },
      { id: 'sb3', title: 'التسعير وحساب تكلفة المنتجات', duration: '30 دقيقة', icon: 'fa-tag',
        videoId: 'lciWn5Bh4Us', videoTitle: 'كيف تسعر منتجاتك بشكل صحيح',
        content: `<div class="content-section"><h3><i class="fas fa-tag text-green-500"></i> استراتيجيات التسعير للمشاريع الصغيرة</h3><div class="info-box green"><p>التسعير الخاطئ هو أحد أكبر أسباب فشل المشاريع الصغيرة. يجب أن يغطي السعر جميع التكاليف ويحقق هامش ربح معقول.</p></div><h3><i class="fas fa-calculator text-blue-500"></i> حساب التكلفة الكاملة للمنتج</h3><div class="example-box"><p><strong>مثال: مشروع إنتاج حلويات</strong></p><div class="table-container"><table><thead><tr><th>عنصر التكلفة</th><th>المبلغ (ريال)</th></tr></thead><tbody><tr><td>مواد خام (مكونات)</td><td>8.00</td></tr><tr><td>تغليف وعبوات</td><td>2.00</td></tr><tr><td>أجور عمالة مباشرة</td><td>3.00</td></tr><tr><td>نصيب الوحدة من المصاريف الثابتة</td><td>4.00</td></tr><tr><td>نصيب الوحدة من التسويق</td><td>1.50</td></tr><tr class="total-row"><td><strong>التكلفة الكاملة للوحدة</strong></td><td><strong>18.50</strong></td></tr></tbody></table></div><p>هامش الربح المستهدف: 35%</p><p>سعر البيع = 18.50 × (1 + 0.35) = <strong>24.98 ≈ 25 ريال</strong></p></div><h3><i class="fas fa-exclamation-circle text-red-500"></i> أخطاء شائعة في التسعير</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-times-circle text-red-500"></i><strong>إغفال التكاليف الثابتة</strong><p>حساب تكلفة المواد فقط وتجاهل الإيجار والرواتب</p></div><div class="mini-card"><i class="fas fa-times-circle text-red-500"></i><strong>تجاهل وقتك الشخصي</strong><p>عدم احتساب أجر صاحب المشروع كمصروف</p></div><div class="mini-card"><i class="fas fa-times-circle text-red-500"></i><strong>المنافسة بالسعر فقط</strong><p>تخفيض السعر على حساب الجودة والاستدامة</p></div></div></div>` },
      { id: 'sb4', title: 'الفوترة الإلكترونية والالتزامات الضريبية', duration: '30 دقيقة', icon: 'fa-file-invoice',
        videoId: '6nldIr3zW0g', videoTitle: 'الفوترة الإلكترونية للمشاريع الصغيرة',
        content: `<div class="content-section"><h3><i class="fas fa-file-invoice text-green-500"></i> التزامات المنشآت الصغيرة</h3><div class="info-box blue"><p>يجب على جميع المنشآت المسجلة في ضريبة القيمة المضافة إصدار فواتير إلكترونية والالتزام بمتطلبات هيئة الزكاة والضريبة والجمارك.</p></div><h3><i class="fas fa-receipt text-blue-500"></i> عناصر الفاتورة الإلكترونية المبسطة</h3><div class="steps-list"><div class="step"><span class="step-num">1</span><p>اسم المنشأة وعنوانها ورقم السجل التجاري</p></div><div class="step"><span class="step-num">2</span><p>الرقم الضريبي للمنشأة</p></div><div class="step"><span class="step-num">3</span><p>تاريخ ووقت إصدار الفاتورة</p></div><div class="step"><span class="step-num">4</span><p>وصف السلعة أو الخدمة والكمية والسعر</p></div><div class="step"><span class="step-num">5</span><p>مبلغ ضريبة القيمة المضافة والإجمالي</p></div><div class="step"><span class="step-num">6</span><p>رمز QR (للفاتورة المبسطة)</p></div></div><h3><i class="fas fa-calendar-alt text-red-500"></i> مواعيد مهمة</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-calendar text-blue-500"></i><strong>إقرار ضريبة القيمة المضافة</strong><p>ربع سنوي (كل 3 أشهر) للمنشآت التي إيراداتها أقل من 40 مليون</p></div><div class="mini-card"><i class="fas fa-mosque text-green-600"></i><strong>إقرار الزكاة</strong><p>سنوي - خلال 120 يوما من نهاية السنة المالية</p></div><div class="mini-card"><i class="fas fa-users text-orange-500"></i><strong>التأمينات الاجتماعية</strong><p>شهري - يسدد في الشهر التالي لشهر الاستحقاق</p></div></div></div>` },
      { id: 'sb5', title: 'قراءة وتحليل تقاريرك المالية', duration: '35 دقيقة', icon: 'fa-glasses',
        videoId: 'DKb3eDwp2bU', videoTitle: 'فهم التقارير المالية لمشروعك',
        content: `<div class="content-section"><h3><i class="fas fa-glasses text-green-500"></i> أهم التقارير التي يحتاجها صاحب المشروع</h3><div class="info-box green"><p>لا تحتاج أن تكون محاسبا لتفهم تقاريرك المالية. ركز على هذه المؤشرات الرئيسية لاتخاذ قرارات أفضل.</p></div><div class="grid-cards"><div class="mini-card"><i class="fas fa-chart-line text-green-500"></i><strong>هامش الربح الإجمالي</strong><p>(المبيعات - تكلفة المبيعات) / المبيعات × 100</p><div class="example-small">الهدف: 40% فأكثر للتجزئة، 60% فأكثر للخدمات</div></div><div class="mini-card"><i class="fas fa-fire text-red-500"></i><strong>معدل حرق النقد</strong><p>المصروفات الشهرية - الإيرادات الشهرية</p><div class="example-small">كم شهرا يمكنك الاستمرار بالاحتياطي الحالي؟</div></div><div class="mini-card"><i class="fas fa-user-clock text-blue-500"></i><strong>متوسط فترة التحصيل</strong><p>المدينون / (المبيعات اليومية)</p><div class="example-small">الهدف: أقل من 30 يوما</div></div><div class="mini-card"><i class="fas fa-percentage text-purple-500"></i><strong>نقطة التعادل الشهرية</strong><p>المصروفات الثابتة / هامش المساهمة</p><div class="example-small">كم تحتاج تبيع شهريا لتغطية تكاليفك؟</div></div></div><div class="example-box"><p><strong>مثال عملي:</strong> مشروع مطعم</p><p>المبيعات الشهرية: 120,000 | تكلفة المبيعات: 48,000 | مصروفات ثابتة: 55,000</p><p>هامش الربح الإجمالي: (120,000 - 48,000) / 120,000 = <strong>60%</strong> (ممتاز)</p><p>صافي الربح: 120,000 - 48,000 - 55,000 = <strong>17,000 ريال</strong> (14.2%)</p></div></div>` }
    ]
  },
  // ============================================================
  // NEW COURSE 12: المحاسبة الإلكترونية وتقنية المعلومات المحاسبية
  // ============================================================
  {
    id: 'eaccounting', title: 'المحاسبة الإلكترونية', subtitle: 'نظم المعلومات المحاسبية والتقنيات الحديثة', icon: 'fa-laptop-code', color: '#0891b2', colorLight: '#cffafe',
    lessons: [
      { id: 'ea1', title: 'نظم المعلومات المحاسبية (AIS)', duration: '30 دقيقة', icon: 'fa-server',
        videoId: 'si-N7_ToXjw', videoTitle: 'نظم المعلومات المحاسبية',
        content: `<div class="content-section"><h3><i class="fas fa-server text-cyan-600"></i> ما هو نظام المعلومات المحاسبي؟</h3><div class="info-box blue"><p><strong>نظام المعلومات المحاسبي (AIS)</strong> هو نظام يجمع ويخزن ويعالج البيانات المالية والمحاسبية ويحولها إلى معلومات مفيدة لاتخاذ القرارات.</p></div><h3><i class="fas fa-cogs text-green-500"></i> مكونات نظام المعلومات المحاسبي</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-users text-blue-500"></i><strong>الأفراد (المستخدمون)</strong><p>المحاسبون والإداريون الذين يستخدمون النظام ويدخلون البيانات</p></div><div class="mini-card"><i class="fas fa-clipboard-list text-green-500"></i><strong>الإجراءات</strong><p>الخطوات والسياسات المتبعة في جمع ومعالجة البيانات</p></div><div class="mini-card"><i class="fas fa-database text-purple-500"></i><strong>البيانات</strong><p>المعاملات المالية والمعلومات المحاسبية المخزنة</p></div><div class="mini-card"><i class="fas fa-desktop text-orange-500"></i><strong>البرمجيات</strong><p>البرامج المحاسبية وأنظمة ERP المستخدمة</p></div><div class="mini-card"><i class="fas fa-hdd text-red-500"></i><strong>الأجهزة</strong><p>الخوادم والحواسيب والطابعات والماسحات الضوئية</p></div><div class="mini-card"><i class="fas fa-shield-alt text-cyan-500"></i><strong>الرقابة الداخلية</strong><p>إجراءات الأمان وصلاحيات الوصول والنسخ الاحتياطي</p></div></div></div>` },
      { id: 'ea2', title: 'أنظمة ERP وتكاملها المحاسبي', duration: '35 دقيقة', icon: 'fa-puzzle-piece',
        videoId: 'si-N7_ToXjw', videoTitle: 'أنظمة ERP المتكاملة',
        content: `<div class="content-section"><h3><i class="fas fa-puzzle-piece text-cyan-600"></i> أنظمة تخطيط موارد المؤسسة (ERP)</h3><div class="info-box blue"><p><strong>ERP</strong> (Enterprise Resource Planning) هو نظام متكامل يربط جميع أقسام المنشأة (المحاسبة، المبيعات، المشتريات، المخزون، الموارد البشرية) في قاعدة بيانات واحدة.</p></div><h3><i class="fas fa-th text-purple-500"></i> الوحدات الأساسية لنظام ERP</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-calculator text-green-500"></i><strong>الوحدة المالية والمحاسبية</strong><p>الأستاذ العام، الحسابات الدائنة والمدينة، الأصول الثابتة</p></div><div class="mini-card"><i class="fas fa-shopping-cart text-blue-500"></i><strong>وحدة المبيعات</strong><p>أوامر البيع، الفواتير، إدارة العملاء (CRM)</p></div><div class="mini-card"><i class="fas fa-truck text-orange-500"></i><strong>وحدة المشتريات</strong><p>أوامر الشراء، إدارة الموردين، استلام البضائع</p></div><div class="mini-card"><i class="fas fa-boxes text-red-500"></i><strong>وحدة المخازن</strong><p>إدارة المخزون، حركة الأصناف، الجرد</p></div><div class="mini-card"><i class="fas fa-users text-purple-500"></i><strong>وحدة الموارد البشرية</strong><p>الرواتب، الإجازات، التأمينات، شؤون الموظفين</p></div></div><h3><i class="fas fa-star text-yellow-500"></i> أشهر أنظمة ERP</h3><div class="table-container"><table><thead><tr><th>النظام</th><th>مناسب لـ</th><th>نوع الترخيص</th></tr></thead><tbody><tr><td><strong>SAP</strong></td><td>الشركات الكبرى والعملاقة</td><td>ترخيص مدفوع</td></tr><tr><td><strong>Oracle</strong></td><td>الشركات الكبيرة والمتوسطة</td><td>ترخيص مدفوع / سحابي</td></tr><tr><td><strong>Odoo</strong></td><td>الشركات الصغيرة والمتوسطة</td><td>مفتوح المصدر + مدفوع</td></tr><tr><td><strong>Microsoft Dynamics</strong></td><td>الشركات المتوسطة</td><td>سحابي مدفوع</td></tr><tr><td><strong>قيود (Qoyod)</strong></td><td>المنشآت الصغيرة (سعودي)</td><td>سحابي بالاشتراك</td></tr></tbody></table></div></div>` },
      { id: 'ea3', title: 'أمن المعلومات المحاسبية', duration: '30 دقيقة', icon: 'fa-lock',
        videoId: 'ak6FoeWJKjg', videoTitle: 'أمن البيانات المحاسبية',
        content: `<div class="content-section"><h3><i class="fas fa-lock text-cyan-600"></i> أمن المعلومات المحاسبية</h3><div class="info-box red"><p>تعد البيانات المحاسبية من أكثر البيانات حساسية في أي منشأة. اختراقها قد يؤدي إلى خسائر مالية فادحة وفقدان ثقة العملاء والمستثمرين.</p></div><h3><i class="fas fa-shield-alt text-green-500"></i> طبقات الحماية</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-user-lock text-blue-500"></i><strong>التحكم في الوصول</strong><p>صلاحيات مستخدمين محددة لكل موظف حسب دوره</p></div><div class="mini-card"><i class="fas fa-key text-green-500"></i><strong>كلمات المرور القوية</strong><p>سياسة كلمات مرور معقدة مع المصادقة الثنائية</p></div><div class="mini-card"><i class="fas fa-cloud-upload-alt text-purple-500"></i><strong>النسخ الاحتياطي</strong><p>نسخ يومي تلقائي مع حفظ نسخ خارج الموقع</p></div><div class="mini-card"><i class="fas fa-network-wired text-orange-500"></i><strong>جدار الحماية</strong><p>حماية الشبكة من الاختراقات الخارجية</p></div><div class="mini-card"><i class="fas fa-file-shield text-red-500"></i><strong>التشفير</strong><p>تشفير البيانات المالية أثناء النقل والتخزين</p></div><div class="mini-card"><i class="fas fa-history text-cyan-500"></i><strong>سجل المراجعة (Audit Trail)</strong><p>تتبع جميع التعديلات على البيانات المحاسبية</p></div></div><div class="info-box orange"><p><strong>قاعدة الفصل بين المهام:</strong> لا يجب أن يقوم شخص واحد بإنشاء القيد ومراجعته واعتماده. يجب توزيع الصلاحيات لمنع التلاعب.</p></div></div>` },
      { id: 'ea4', title: 'إكسل للمحاسبين - مهارات متقدمة', duration: '40 دقيقة', icon: 'fa-file-excel',
        videoId: 'mp69yYnmb_c', videoTitle: 'إكسل للمحاسبين المحترفين',
        content: `<div class="content-section"><h3><i class="fas fa-file-excel text-green-600"></i> أهم دوال إكسل للمحاسبين</h3><div class="info-box green"><p>برنامج إكسل هو الأداة الأكثر استخداما من قبل المحاسبين حول العالم. إتقان الدوال المتقدمة يوفر ساعات من العمل اليدوي.</p></div><h3><i class="fas fa-functions text-blue-500"></i> الدوال الأساسية</h3><div class="table-container"><table><thead><tr><th>الدالة</th><th>الاستخدام</th><th>مثال</th></tr></thead><tbody><tr><td><strong>VLOOKUP</strong></td><td>البحث عن قيمة في جدول</td><td>البحث عن سعر منتج برقمه</td></tr><tr><td><strong>SUMIFS</strong></td><td>جمع بشروط متعددة</td><td>إجمالي مبيعات منتج معين في شهر محدد</td></tr><tr><td><strong>IF</strong></td><td>تقييم شرط وإرجاع نتيجة</td><td>تصنيف العملاء حسب حجم المبيعات</td></tr><tr><td><strong>PMT</strong></td><td>حساب قسط القرض</td><td>القسط الشهري لقرض بنكي</td></tr><tr><td><strong>NPV</strong></td><td>صافي القيمة الحالية</td><td>تقييم جدوى مشروع استثماري</td></tr><tr><td><strong>IRR</strong></td><td>معدل العائد الداخلي</td><td>معدل العائد على الاستثمار</td></tr><tr><td><strong>PIVOT TABLE</strong></td><td>تلخيص البيانات</td><td>تقارير المبيعات حسب المنتج والشهر</td></tr></tbody></table></div><h3><i class="fas fa-lightbulb text-yellow-500"></i> نصائح للمحاسبين في إكسل</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-keyboard text-blue-500"></i><strong>اختصارات لوحة المفاتيح</strong><p>Ctrl+; للتاريخ الحالي | Ctrl+Shift+! لتنسيق الأرقام | F4 لتثبيت المراجع</p></div><div class="mini-card"><i class="fas fa-check-double text-green-500"></i><strong>التحقق من البيانات</strong><p>استخدم Data Validation لمنع إدخال بيانات خاطئة</p></div><div class="mini-card"><i class="fas fa-lock text-red-500"></i><strong>حماية الخلايا</strong><p>احمِ المعادلات واسمح بالتعديل على خلايا الإدخال فقط</p></div></div></div>` },
      { id: 'ea5', title: 'الذكاء الاصطناعي في المحاسبة', duration: '30 دقيقة', icon: 'fa-brain',
        videoId: 'si-N7_ToXjw', videoTitle: 'مستقبل المحاسبة والذكاء الاصطناعي',
        content: `<div class="content-section"><h3><i class="fas fa-brain text-cyan-600"></i> الذكاء الاصطناعي في المحاسبة</h3><div class="info-box blue"><p>يحدث الذكاء الاصطناعي ثورة في مجال المحاسبة من خلال أتمتة المهام الروتينية وتعزيز دقة التحليل والتنبؤ.</p></div><h3><i class="fas fa-robot text-purple-500"></i> تطبيقات AI في المحاسبة</h3><div class="grid-cards"><div class="mini-card"><i class="fas fa-receipt text-blue-500"></i><strong>قراءة الفواتير آليا (OCR)</strong><p>استخراج البيانات من الفواتير الورقية والإلكترونية تلقائيا وإدخالها في النظام المحاسبي</p></div><div class="mini-card"><i class="fas fa-check-circle text-green-500"></i><strong>التسوية البنكية التلقائية</strong><p>مطابقة المعاملات البنكية مع القيود المحاسبية بدقة عالية</p></div><div class="mini-card"><i class="fas fa-chart-line text-orange-500"></i><strong>التنبؤ المالي</strong><p>توقع الإيرادات والمصروفات والتدفقات النقدية المستقبلية</p></div><div class="mini-card"><i class="fas fa-search text-red-500"></i><strong>كشف الشذوذ والاحتيال</strong><p>تحديد المعاملات غير العادية والأنماط المشبوهة تلقائيا</p></div><div class="mini-card"><i class="fas fa-file-alt text-purple-500"></i><strong>إعداد التقارير الذكية</strong><p>إنشاء تقارير مالية مخصصة مع تحليلات وتوصيات</p></div><div class="mini-card"><i class="fas fa-comments text-cyan-500"></i><strong>المساعد المحاسبي الذكي</strong><p>أدوات chatbot تجيب عن الاستفسارات المحاسبية والضريبية</p></div></div><div class="info-box purple"><p><strong>مستقبل المحاسب:</strong> لن يحل الذكاء الاصطناعي محل المحاسبين، لكنه سيغير دورهم من مسجل بيانات إلى مستشار مالي استراتيجي. المحاسب الذي يتقن التقنية سيتميز عن غيره.</p></div></div>` }
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
  { term: 'نظام الصناديق', english: 'Fund Accounting', definition: 'نظام محاسبي حكومي لتتبع الموارد المخصصة لأغراض محددة' },
  { term: 'الموازنة العامة', english: 'Government Budget', definition: 'وثيقة قانونية تقدر إيرادات ونفقات الدولة لفترة مقبلة' },
  { term: 'المحاسبة الجنائية', english: 'Forensic Accounting', definition: 'تخصص يجمع بين المحاسبة والتحقيق لكشف الاحتيال وتقديم الأدلة القانونية' },
  { term: 'غسيل الأموال', english: 'Money Laundering', definition: 'تحويل أموال متحصلة من مصادر غير مشروعة إلى أموال تبدو مشروعة' },
  { term: 'اعرف عميلك', english: 'KYC - Know Your Customer', definition: 'إجراءات التحقق من هوية العملاء وأنشطتهم لمكافحة غسيل الأموال' },
  { term: 'التحليل الأفقي', english: 'Horizontal Analysis', definition: 'مقارنة البنود المالية عبر فترات زمنية مختلفة لتحديد الاتجاهات' },
  { term: 'التحليل الرأسي', english: 'Vertical Analysis', definition: 'التعبير عن كل بند كنسبة مئوية من بند أساسي في القوائم المالية' },
  { term: 'نموذج دوبونت', english: 'DuPont Model', definition: 'نموذج يحلل العائد على حقوق الملكية إلى هامش الربح ودوران الأصول والرافعة المالية' },
  { term: 'ربحية السهم', english: 'EPS - Earnings Per Share', definition: 'صافي ربح الشركة مقسوما على عدد الأسهم العادية' },
  { term: 'مكرر الأرباح', english: 'P/E Ratio', definition: 'نسبة سعر السهم السوقي إلى ربحية السهم، يقيس مدى استعداد المستثمرين للدفع' },
  { term: 'التدفق النقدي الحر', english: 'Free Cash Flow', definition: 'التدفق النقدي التشغيلي مخصوما منه النفقات الرأسمالية' },
  { term: 'الرافعة المالية', english: 'Financial Leverage', definition: 'استخدام الديون في تمويل الأصول لتعظيم العائد على حقوق الملكية' },
  { term: 'قانون بنفورد', english: "Benford's Law", definition: 'قانون إحصائي يحدد التوزيع المتوقع للأرقام الأولى ويستخدم لكشف التلاعب' },
  { term: 'معدل دوران المخزون', english: 'Inventory Turnover', definition: 'عدد مرات بيع واستبدال المخزون خلال فترة معينة' },
  { term: 'معايير IPSAS', english: 'IPSAS Standards', definition: 'المعايير الدولية لمحاسبة القطاع العام الصادرة عن IPSASB' },
  { term: 'اختلاس الأصول', english: 'Asset Misappropriation', definition: 'سرقة أو إساءة استخدام موارد المنشأة من قبل موظفيها' },
  { term: 'ديوان المحاسبة', english: 'Supreme Audit Institution', definition: 'جهاز رقابي مستقل يفحص حسابات الجهات الحكومية ويراقب الأداء المالي' },
  { term: 'نظام ERP', english: 'Enterprise Resource Planning', definition: 'نظام متكامل يربط جميع أقسام المنشأة في قاعدة بيانات واحدة' },
  { term: 'سجل المراجعة', english: 'Audit Trail', definition: 'سجل يتتبع جميع التعديلات والعمليات على البيانات المحاسبية' },
  { term: 'شجرة الحسابات', english: 'Chart of Accounts', definition: 'قائمة منظمة بجميع الحسابات المستخدمة في النظام المحاسبي' },
  { term: 'معدل حرق النقد', english: 'Cash Burn Rate', definition: 'معدل استهلاك النقد الشهري في المشاريع الناشئة قبل تحقيق الربحية' },
  { term: 'صافي القيمة الحالية', english: 'NPV - Net Present Value', definition: 'الفرق بين القيمة الحالية للتدفقات النقدية الداخلة والخارجة لمشروع استثماري' },
  { term: 'معدل العائد الداخلي', english: 'IRR - Internal Rate of Return', definition: 'معدل الخصم الذي يجعل صافي القيمة الحالية للمشروع مساويا للصفر' },
  { term: 'خبير الاحتيال المعتمد', english: 'CFE - Certified Fraud Examiner', definition: 'شهادة مهنية في مجال كشف الاحتيال والتحقيقات المالية من ACFE' },
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
  },
  {
    levelId: 'government', title: 'اختبار المحاسبة الحكومية',
    questions: [
      { q: 'ما هو نظام الصناديق في المحاسبة الحكومية؟', options: ['نظام لحفظ النقود', 'نظام محاسبي لتتبع الموارد المخصصة لأغراض محددة', 'نظام استثماري', 'برنامج محاسبي'], correct: 1 },
      { q: 'ما هو الهدف الرئيسي للمحاسبة الحكومية؟', options: ['تحقيق الربح', 'المساءلة العامة وضمان الاستخدام السليم للمال العام', 'زيادة الإيرادات الضريبية', 'تقليل النفقات فقط'], correct: 1 },
      { q: 'معايير IPSAS هي:', options: ['معايير محاسبية للشركات الخاصة', 'معايير دولية لمحاسبة القطاع العام', 'معايير التدقيق الداخلي', 'معايير إدارة الجودة'], correct: 1 },
      { q: 'ما هي المرحلة الأولى في إعداد الموازنة العامة؟', options: ['التنفيذ', 'الرقابة', 'الإعداد والتحضير', 'الاعتماد'], correct: 2 },
      { q: 'صندوق خدمة الدين يستخدم لـ:', options: ['تمويل المشاريع الجديدة', 'سداد أصل وفوائد الديون الحكومية', 'صرف الرواتب', 'شراء المخزون'], correct: 1 },
      { q: 'القوائم المالية للمنظمات غير الربحية تتضمن:', options: ['قائمة الدخل فقط', 'قائمة الأنشطة وقائمة المركز المالي', 'الميزانية العمومية فقط', 'قائمة التكاليف'], correct: 1 },
    ]
  },
  {
    levelId: 'financial-analysis', title: 'اختبار التحليل المالي المتقدم',
    questions: [
      { q: 'التحليل الأفقي يقارن:', options: ['بنود القائمة الواحدة ببعضها', 'البنود المالية عبر فترات زمنية مختلفة', 'الشركة بمنافسيها', 'الأصول بالخصوم فقط'], correct: 1 },
      { q: 'معدل دوران المخزون 6 مرات يعني أن فترة الاحتفاظ بالمخزون تقريبا:', options: ['30 يوم', '45 يوم', '61 يوم', '90 يوم'], correct: 2 },
      { q: 'مكونات نموذج دوبونت هي:', options: ['الإيرادات + المصروفات + الأصول', 'هامش الربح × دوران الأصول × المضاعف المالي', 'النسبة الجارية × نسبة المديونية', 'الأرباح ÷ الخسائر × رأس المال'], correct: 1 },
      { q: 'نسبة جودة الأرباح > 1 تعني:', options: ['أرباح مرتفعة', 'أرباح عالية الجودة مدعومة بتدفقات نقدية حقيقية', 'خسائر مالية', 'ارتفاع الديون'], correct: 1 },
      { q: 'مكرر الأرباح (P/E) يساوي 15 يعني:', options: ['الشركة تحقق 15% ربح', 'المستثمر يدفع 15 ريال مقابل كل ريال أرباح', 'الشركة عمرها 15 سنة', 'الأسهم عددها 15 مليون'], correct: 1 },
      { q: 'نسبة تغطية الفوائد 7.5 مرة تعد:', options: ['ضعيفة جدا', 'مقبولة', 'ممتازة', 'غير ذات صلة'], correct: 2 },
    ]
  },
  {
    levelId: 'forensic', title: 'اختبار المحاسبة الجنائية',
    questions: [
      { q: 'المحاسبة الجنائية تجمع بين:', options: ['المحاسبة والتسويق', 'المحاسبة والتحقيق والقانون', 'المحاسبة والبرمجة', 'المحاسبة والإدارة فقط'], correct: 1 },
      { q: 'أي نوع من الاحتيال الأكثر شيوعا وفقا لـ ACFE؟', options: ['الاحتيال في القوائم المالية', 'الفساد والرشوة', 'اختلاس الأصول', 'التهرب الضريبي'], correct: 2 },
      { q: 'قانون بنفورد يستخدم لـ:', options: ['حساب الضرائب', 'كشف التلاعب في البيانات المالية', 'تقييم الأصول', 'حساب الإهلاك'], correct: 1 },
      { q: 'المرحلة الأولى في غسيل الأموال هي:', options: ['التمويه', 'الدمج', 'الإيداع', 'التحويل'], correct: 2 },
      { q: 'شهادة CFE تصدرها:', options: ['AICPA', 'ACFE - جمعية خبراء الاحتيال المعتمدين', 'IMA', 'IFAC'], correct: 1 },
      { q: 'من العلامات التحذيرية للاحتيال:', options: ['موظف يأخذ إجازاته بانتظام', 'انتظام التسويات البنكية', 'موظف يرفض أخذ إجازة ويعمل ساعات إضافية', 'انخفاض المصروفات'], correct: 2 },
    ]
  },
  {
    levelId: 'small-business', title: 'اختبار محاسبة المنشآت الصغيرة',
    questions: [
      { q: 'ما هو السبب الرئيسي لفشل 82% من المشاريع الصغيرة؟', options: ['المنافسة الشديدة', 'مشاكل في التدفقات النقدية', 'ارتفاع الضرائب', 'نقص الموظفين'], correct: 1 },
      { q: 'أول خطوة في تأسيس النظام المحاسبي لمشروعك:', options: ['شراء برنامج محاسبي', 'فتح حساب بنكي تجاري منفصل', 'تعيين محاسب', 'إعداد قوائم مالية'], correct: 1 },
      { q: 'إذا كانت تكلفة المنتج 18.50 ريال وهامش الربح المستهدف 35%، فسعر البيع:', options: ['20 ريال', '23 ريال', '25 ريال تقريبا', '30 ريال'], correct: 2 },
      { q: 'كم يجب أن يكفي الاحتياطي النقدي من المصروفات الثابتة؟', options: ['شهر واحد', '3 إلى 6 أشهر', 'سنة كاملة', 'أسبوعين'], correct: 1 },
      { q: 'إقرار ضريبة القيمة المضافة للمنشآت الصغيرة يقدم:', options: ['شهريا', 'ربع سنوي', 'سنويا', 'أسبوعيا'], correct: 1 },
    ]
  },
  {
    levelId: 'eaccounting', title: 'اختبار المحاسبة الإلكترونية',
    questions: [
      { q: 'نظام ERP يعني:', options: ['برنامج محاسبي فقط', 'نظام متكامل يربط جميع أقسام المنشأة', 'جدول إكسل متقدم', 'نظام مبيعات إلكتروني'], correct: 1 },
      { q: 'أي نظام ERP مناسب للشركات الكبرى؟', options: ['QuickBooks', 'قيود', 'SAP', 'Excel'], correct: 2 },
      { q: 'قاعدة الفصل بين المهام تعني:', options: ['عدم استخدام نفس البرنامج', 'توزيع صلاحيات الإنشاء والمراجعة والاعتماد على أشخاص مختلفين', 'فصل المحاسبة عن الإدارة', 'استخدام برامج مختلفة لكل قسم'], correct: 1 },
      { q: 'سجل المراجعة (Audit Trail) يستخدم لـ:', options: ['حساب الضرائب', 'تتبع جميع التعديلات على البيانات المحاسبية', 'إنشاء القيود المحاسبية', 'طباعة التقارير'], correct: 1 },
      { q: 'مستقبل دور المحاسب مع الذكاء الاصطناعي:', options: ['سيختفي تماما', 'سيتحول من مسجل بيانات إلى مستشار مالي استراتيجي', 'لن يتأثر', 'سيقتصر على إدخال البيانات'], correct: 1 },
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
