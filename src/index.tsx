import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/api/*', cors())

// ============================================================
// DATA: Course Levels with Video Lessons
// ============================================================

const courseLevels = [
  // ==================== BEGINNER ====================
  {
    id: 'beginner',
    title: 'المستوى المبتدئ',
    subtitle: 'أساسيات المحاسبة المالية',
    icon: 'fa-seedling',
    color: '#10b981',
    colorLight: '#d1fae5',
    lessons: [
      {
        id: 'b1',
        title: 'ما هي المحاسبة المالية؟',
        duration: '15 دقيقة',
        icon: 'fa-question-circle',
        videoId: 'NHRk18rumz4',
        videoTitle: 'شرح مقرر المحاسبة المالية كاملاً',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-lightbulb text-yellow-500"></i> تعريف المحاسبة المالية</h3>
            <div class="info-box green">
              <p><strong>المحاسبة المالية</strong> هي عملية منهجية لتسجيل وتصنيف وتلخيص وتفسير المعاملات المالية للمنشأة، بهدف إنتاج معلومات مالية مفيدة لاتخاذ القرارات الاقتصادية.</p>
            </div>
            <h3><i class="fas fa-bullseye text-red-500"></i> أهداف المحاسبة المالية</h3>
            <ul class="styled-list">
              <li>تسجيل جميع العمليات المالية بشكل دقيق ومنظم</li>
              <li>إعداد القوائم المالية (قائمة الدخل، الميزانية العمومية، التدفقات النقدية)</li>
              <li>توفير معلومات مالية موثوقة للمستخدمين الداخليين والخارجيين</li>
              <li>المساعدة في اتخاذ القرارات الاقتصادية والاستثمارية</li>
              <li>الرقابة على أصول المنشأة وحمايتها</li>
              <li>تحديد نتيجة النشاط من ربح أو خسارة</li>
            </ul>
            <h3><i class="fas fa-users text-blue-500"></i> مستخدمو المعلومات المحاسبية</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>المستخدم</th><th>الغرض من المعلومات</th></tr></thead>
                <tbody>
                  <tr><td>الإدارة</td><td>التخطيط والرقابة واتخاذ القرارات</td></tr>
                  <tr><td>المستثمرون</td><td>تقييم أداء الشركة واتخاذ قرارات الاستثمار</td></tr>
                  <tr><td>الدائنون والبنوك</td><td>تقييم القدرة على السداد</td></tr>
                  <tr><td>الجهات الحكومية</td><td>الضرائب والرقابة التنظيمية</td></tr>
                  <tr><td>الموظفون</td><td>تقييم استقرار المنشأة ومستحقاتهم</td></tr>
                </tbody>
              </table>
            </div>
            <h3><i class="fas fa-code-branch text-purple-500"></i> فروع المحاسبة</h3>
            <div class="grid-cards">
              <div class="mini-card"><i class="fas fa-chart-line text-green-500"></i><strong>محاسبة مالية</strong><p>تسجيل المعاملات وإعداد القوائم</p></div>
              <div class="mini-card"><i class="fas fa-cogs text-blue-500"></i><strong>محاسبة إدارية</strong><p>معلومات للقرارات الداخلية</p></div>
              <div class="mini-card"><i class="fas fa-calculator text-orange-500"></i><strong>محاسبة تكاليف</strong><p>تحديد تكلفة المنتجات</p></div>
              <div class="mini-card"><i class="fas fa-search text-red-500"></i><strong>مراجعة وتدقيق</strong><p>فحص القوائم المالية</p></div>
              <div class="mini-card"><i class="fas fa-landmark text-indigo-500"></i><strong>محاسبة حكومية</strong><p>محاسبة الوحدات الحكومية</p></div>
              <div class="mini-card"><i class="fas fa-file-invoice-dollar text-yellow-600"></i><strong>محاسبة ضريبية</strong><p>حساب وتخطيط الضرائب</p></div>
            </div>
          </div>`
      },
      {
        id: 'b2',
        title: 'المعادلة المحاسبية الأساسية',
        duration: '20 دقيقة',
        icon: 'fa-balance-scale',
        videoId: '3-jD5F_djq0',
        videoTitle: 'شرح المعادلة المحاسبية - Accounting Equation',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-equals text-blue-500"></i> المعادلة المحاسبية</h3>
            <div class="equation-box">
              <span class="eq-part assets">الأصول</span>
              <span class="eq-sign">=</span>
              <span class="eq-part liabilities">الخصوم</span>
              <span class="eq-sign">+</span>
              <span class="eq-part equity">حقوق الملكية</span>
            </div>
            <div class="info-box blue">
              <p>هذه المعادلة هي أساس نظام القيد المزدوج وتعكس حقيقة أن كل أصل يتم تمويله إما من خلال الاقتراض (خصوم) أو من أموال المالكين (حقوق ملكية).</p>
            </div>
            <h3><i class="fas fa-puzzle-piece text-green-500"></i> مكونات المعادلة</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>العنصر</th><th>التعريف</th><th>أمثلة</th></tr></thead>
                <tbody>
                  <tr><td><strong>الأصول</strong></td><td>الموارد الاقتصادية المملوكة للمنشأة</td><td>النقدية، المخزون، المباني، المعدات</td></tr>
                  <tr><td><strong>الخصوم</strong></td><td>التزامات المنشأة تجاه الغير</td><td>القروض، الموردون، الأوراق المستحقة</td></tr>
                  <tr><td><strong>حقوق الملكية</strong></td><td>حقوق أصحاب المنشأة في أصولها</td><td>رأس المال، الأرباح المحتجزة</td></tr>
                </tbody>
              </table>
            </div>
            <h3><i class="fas fa-tasks text-orange-500"></i> أمثلة عملية</h3>
            <div class="example-box">
              <p><strong>مثال 1:</strong> بدأ أحمد مشروعاً برأس مال 100,000 ريال نقداً</p>
              <div class="mini-equation">أصول (نقدية 100,000) = خصوم (0) + حقوق ملكية (رأس مال 100,000)</div>
            </div>
            <div class="example-box">
              <p><strong>مثال 2:</strong> اشترى معدات بـ 30,000 ريال نقداً</p>
              <div class="mini-equation">أصول (نقدية 70,000 + معدات 30,000) = خصوم (0) + حقوق ملكية (100,000)</div>
            </div>
            <div class="example-box">
              <p><strong>مثال 3:</strong> اقترض 50,000 ريال من البنك</p>
              <div class="mini-equation">أصول (نقدية 120,000 + معدات 30,000) = خصوم (قرض 50,000) + حقوق ملكية (100,000)</div>
            </div>
          </div>`
      },
      {
        id: 'b3',
        title: 'الحسابات وأنواعها',
        duration: '25 دقيقة',
        icon: 'fa-folder-open',
        videoId: 'HYluTilJVOw',
        videoTitle: 'مبادئ المحاسبة - الفصل الأول',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-sitemap text-blue-500"></i> أنواع الحسابات الرئيسية</h3>
            <div class="accounts-grid">
              <div class="account-card" style="border-right: 4px solid #10b981">
                <div class="account-icon" style="background: #d1fae5"><i class="fas fa-building text-green-600"></i></div>
                <h4>الأصول (Assets)</h4>
                <p>الموارد الاقتصادية المملوكة للمنشأة</p>
                <ul><li>أصول متداولة: نقدية، مدينون، مخزون</li><li>أصول ثابتة: أراضي، مباني، معدات، سيارات</li><li>أصول غير ملموسة: شهرة، براءات اختراع</li></ul>
                <div class="account-rule"><strong>القاعدة:</strong> تزيد بالمدين وتنقص بالدائن</div>
              </div>
              <div class="account-card" style="border-right: 4px solid #ef4444">
                <div class="account-icon" style="background: #fee2e2"><i class="fas fa-hand-holding-usd text-red-600"></i></div>
                <h4>الخصوم (Liabilities)</h4>
                <p>التزامات المنشأة تجاه الآخرين</p>
                <ul><li>خصوم متداولة: دائنون، قروض قصيرة الأجل</li><li>خصوم طويلة الأجل: قروض بنكية، سندات</li></ul>
                <div class="account-rule"><strong>القاعدة:</strong> تزيد بالدائن وتنقص بالمدين</div>
              </div>
              <div class="account-card" style="border-right: 4px solid #6366f1">
                <div class="account-icon" style="background: #e0e7ff"><i class="fas fa-user-tie text-indigo-600"></i></div>
                <h4>حقوق الملكية (Equity)</h4>
                <p>حقوق أصحاب المنشأة</p>
                <ul><li>رأس المال</li><li>الأرباح المحتجزة</li><li>الاحتياطيات</li></ul>
                <div class="account-rule"><strong>القاعدة:</strong> تزيد بالدائن وتنقص بالمدين</div>
              </div>
              <div class="account-card" style="border-right: 4px solid #f59e0b">
                <div class="account-icon" style="background: #fef3c7"><i class="fas fa-arrow-up text-yellow-600"></i></div>
                <h4>الإيرادات (Revenue)</h4>
                <p>الدخل الناتج عن أنشطة المنشأة</p>
                <ul><li>إيرادات المبيعات</li><li>إيرادات الخدمات</li><li>إيرادات أخرى</li></ul>
                <div class="account-rule"><strong>القاعدة:</strong> تزيد بالدائن وتنقص بالمدين</div>
              </div>
              <div class="account-card" style="border-right: 4px solid #ec4899">
                <div class="account-icon" style="background: #fce7f3"><i class="fas fa-arrow-down text-pink-600"></i></div>
                <h4>المصروفات (Expenses)</h4>
                <p>التكاليف المتكبدة لتحقيق الإيرادات</p>
                <ul><li>مصروفات تشغيلية: رواتب، إيجار</li><li>مصروفات إدارية وبيعية</li><li>مصروفات أخرى</li></ul>
                <div class="account-rule"><strong>القاعدة:</strong> تزيد بالمدين وتنقص بالدائن</div>
              </div>
            </div>
          </div>`
      },
      {
        id: 'b4',
        title: 'القيد المحاسبي المزدوج',
        duration: '25 دقيقة',
        icon: 'fa-exchange-alt',
        videoId: 'v2l3_PG9k0c',
        videoTitle: 'المحاسبة لغير المحاسبين - القيد المزدوج',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-sync text-blue-500"></i> نظام القيد المزدوج</h3>
            <div class="info-box purple">
              <p><strong>القاعدة الذهبية:</strong> لكل عملية مالية طرفان متساويان على الأقل - طرف مدين وطرف دائن، ويجب أن يتساوى مجموع الطرف المدين مع مجموع الطرف الدائن.</p>
            </div>
            <h3><i class="fas fa-book text-green-500"></i> قواعد المدين والدائن</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>نوع الحساب</th><th>يزيد بـ</th><th>ينقص بـ</th><th>الطبيعة</th></tr></thead>
                <tbody>
                  <tr><td>الأصول</td><td class="debit">مدين</td><td class="credit">دائن</td><td>مدينة</td></tr>
                  <tr><td>المصروفات</td><td class="debit">مدين</td><td class="credit">دائن</td><td>مدينة</td></tr>
                  <tr><td>الخصوم</td><td class="credit">دائن</td><td class="debit">مدين</td><td>دائنة</td></tr>
                  <tr><td>حقوق الملكية</td><td class="credit">دائن</td><td class="debit">مدين</td><td>دائنة</td></tr>
                  <tr><td>الإيرادات</td><td class="credit">دائن</td><td class="debit">مدين</td><td>دائنة</td></tr>
                </tbody>
              </table>
            </div>
            <h3><i class="fas fa-pencil-alt text-orange-500"></i> أمثلة عملية على القيود</h3>
            <div class="journal-entry">
              <div class="je-header">مثال 1: شراء بضاعة بمبلغ 10,000 ريال نقداً</div>
              <div class="je-row"><span class="je-debit">10,000 من حـ/ المشتريات</span></div>
              <div class="je-row"><span class="je-credit">10,000 إلى حـ/ النقدية</span></div>
            </div>
            <div class="journal-entry">
              <div class="je-header">مثال 2: بيع بضاعة بمبلغ 15,000 ريال على الحساب</div>
              <div class="je-row"><span class="je-debit">15,000 من حـ/ المدينون</span></div>
              <div class="je-row"><span class="je-credit">15,000 إلى حـ/ المبيعات</span></div>
            </div>
            <div class="journal-entry">
              <div class="je-header">مثال 3: دفع رواتب بمبلغ 8,000 ريال</div>
              <div class="je-row"><span class="je-debit">8,000 من حـ/ مصروف الرواتب</span></div>
              <div class="je-row"><span class="je-credit">8,000 إلى حـ/ النقدية</span></div>
            </div>
          </div>`
      },
      {
        id: 'b5',
        title: 'دفتر اليومية ودفتر الأستاذ',
        duration: '30 دقيقة',
        icon: 'fa-book-open',
        videoId: 'K2ELU0gfkYI',
        videoTitle: 'كورس المحاسبة المالية من الصفر',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-journal-whills text-blue-500"></i> دفتر اليومية (Journal)</h3>
            <div class="info-box blue">
              <p>دفتر اليومية هو السجل الأول الذي تُقيد فيه العمليات المالية بترتيب زمني (تاريخي). يُعد أساس النظام المحاسبي.</p>
            </div>
            <div class="table-container">
              <table>
                <thead><tr><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th></tr></thead>
                <tbody>
                  <tr><td>1/1</td><td>من حـ/ النقدية<br>إلى حـ/ رأس المال<br><em>(بدء النشاط برأس مال نقدي)</em></td><td>100,000</td><td><br>100,000</td></tr>
                  <tr><td>5/1</td><td>من حـ/ المعدات<br>إلى حـ/ النقدية<br><em>(شراء معدات نقداً)</em></td><td>25,000</td><td><br>25,000</td></tr>
                  <tr><td>10/1</td><td>من حـ/ المشتريات<br>إلى حـ/ الدائنين<br><em>(شراء بضاعة على الحساب)</em></td><td>15,000</td><td><br>15,000</td></tr>
                </tbody>
              </table>
            </div>
            <h3><i class="fas fa-file-alt text-green-500"></i> دفتر الأستاذ (Ledger)</h3>
            <div class="info-box green">
              <p>دفتر الأستاذ هو السجل الذي يتم فيه تصنيف وتبويب القيود حسب الحسابات. كل حساب له صفحة مستقلة تُظهر حركاته.</p>
            </div>
            <div class="ledger-account">
              <div class="ledger-title">حـ/ النقدية</div>
              <div class="ledger-grid">
                <div class="ledger-side">
                  <div class="ledger-header debit-header">مدين</div>
                  <div class="ledger-row">1/1 رأس المال - 100,000</div>
                </div>
                <div class="ledger-side">
                  <div class="ledger-header credit-header">دائن</div>
                  <div class="ledger-row">5/1 معدات - 25,000</div>
                </div>
              </div>
              <div class="ledger-balance">الرصيد: 75,000 ريال (مدين)</div>
            </div>
          </div>`
      },
      {
        id: 'b6',
        title: 'ميزان المراجعة',
        duration: '20 دقيقة',
        icon: 'fa-balance-scale-right',
        videoId: 'DZZq06cxOgw',
        videoTitle: 'مقدمة في المحاسبة المالية',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-check-double text-blue-500"></i> ما هو ميزان المراجعة؟</h3>
            <div class="info-box blue">
              <p><strong>ميزان المراجعة</strong> هو كشف يحتوي على جميع أرصدة الحسابات في دفتر الأستاذ في تاريخ معين، ويُستخدم للتأكد من صحة التسجيل المحاسبي وتساوي مجموع الأرصدة المدينة مع الدائنة.</p>
            </div>
            <h3><i class="fas fa-table text-green-500"></i> نموذج ميزان المراجعة</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>اسم الحساب</th><th>رصيد مدين</th><th>رصيد دائن</th></tr></thead>
                <tbody>
                  <tr><td>النقدية</td><td>75,000</td><td></td></tr>
                  <tr><td>المعدات</td><td>25,000</td><td></td></tr>
                  <tr><td>المشتريات</td><td>15,000</td><td></td></tr>
                  <tr><td>رأس المال</td><td></td><td>100,000</td></tr>
                  <tr><td>الدائنون</td><td></td><td>15,000</td></tr>
                  <tr class="total-row"><td><strong>المجموع</strong></td><td><strong>115,000</strong></td><td><strong>115,000</strong></td></tr>
                </tbody>
              </table>
            </div>
            <h3><i class="fas fa-exclamation-triangle text-yellow-500"></i> أخطاء لا يكشفها ميزان المراجعة</h3>
            <ul class="styled-list">
              <li><strong>خطأ الحذف:</strong> نسيان تسجيل عملية كاملة</li>
              <li><strong>خطأ التعويض:</strong> خطأ في حساب يعوضه خطأ في حساب آخر</li>
              <li><strong>خطأ الترحيل:</strong> ترحيل المبلغ الصحيح إلى حساب خاطئ</li>
              <li><strong>خطأ المبدأ:</strong> تسجيل العملية في حساب من نوع خاطئ</li>
            </ul>
          </div>`
      }
    ]
  },
  // ==================== INTERMEDIATE ====================
  {
    id: 'intermediate',
    title: 'المستوى المتوسط',
    subtitle: 'القوائم المالية والتسويات',
    icon: 'fa-chart-line',
    color: '#3b82f6',
    colorLight: '#dbeafe',
    lessons: [
      {
        id: 'i1',
        title: 'قائمة الدخل',
        duration: '30 دقيقة',
        icon: 'fa-file-invoice-dollar',
        videoId: 'AToUj0DmerQ',
        videoTitle: 'المحاسبة المالية - مراجعة شاملة',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-chart-bar text-blue-500"></i> قائمة الدخل (Income Statement)</h3>
            <div class="info-box blue">
              <p>قائمة الدخل هي تقرير مالي يُظهر نتيجة أعمال المنشأة من ربح أو خسارة خلال فترة زمنية محددة، وتتضمن الإيرادات والمصروفات.</p>
            </div>
            <h3><i class="fas fa-list-ol text-green-500"></i> مكونات قائمة الدخل</h3>
            <div class="income-statement">
              <div class="is-title">قائمة الدخل للسنة المنتهية في 31/12</div>
              <div class="is-row"><span>المبيعات</span><span>500,000</span></div>
              <div class="is-row minus"><span>(-) تكلفة المبيعات</span><span>(300,000)</span></div>
              <div class="is-row subtotal"><span><strong>مجمل الربح</strong></span><span><strong>200,000</strong></span></div>
              <div class="is-row minus"><span>(-) مصروفات تشغيلية</span><span></span></div>
              <div class="is-row sub"><span>مصروف الرواتب</span><span>(50,000)</span></div>
              <div class="is-row sub"><span>مصروف الإيجار</span><span>(24,000)</span></div>
              <div class="is-row sub"><span>مصروف الإهلاك</span><span>(10,000)</span></div>
              <div class="is-row sub"><span>مصروفات إدارية أخرى</span><span>(16,000)</span></div>
              <div class="is-row subtotal"><span><strong>صافي الربح التشغيلي</strong></span><span><strong>100,000</strong></span></div>
              <div class="is-row"><span>(+) إيرادات أخرى</span><span>5,000</span></div>
              <div class="is-row minus"><span>(-) مصروفات أخرى (فوائد)</span><span>(8,000)</span></div>
              <div class="is-row total"><span><strong>صافي الربح</strong></span><span><strong>97,000</strong></span></div>
            </div>
          </div>`
      },
      {
        id: 'i2',
        title: 'الميزانية العمومية',
        duration: '30 دقيقة',
        icon: 'fa-balance-scale-left',
        videoId: 'h_-jXv3ZolQ',
        videoTitle: 'القوائم المالية والأخلاقيات المحاسبية',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-clipboard-list text-blue-500"></i> الميزانية العمومية (Balance Sheet)</h3>
            <div class="info-box green">
              <p>الميزانية العمومية هي قائمة مالية تُظهر المركز المالي للمنشأة في لحظة زمنية محددة، وتشمل الأصول والخصوم وحقوق الملكية.</p>
            </div>
            <div class="balance-sheet">
              <div class="bs-title">الميزانية العمومية في 31/12</div>
              <div class="bs-columns">
                <div class="bs-col">
                  <h4 class="text-green-600">الأصول</h4>
                  <div class="bs-section"><strong>أصول متداولة:</strong></div>
                  <div class="bs-row"><span>النقدية</span><span>50,000</span></div>
                  <div class="bs-row"><span>المدينون</span><span>35,000</span></div>
                  <div class="bs-row"><span>المخزون</span><span>45,000</span></div>
                  <div class="bs-row subtotal"><span>إجمالي الأصول المتداولة</span><span>130,000</span></div>
                  <div class="bs-section"><strong>أصول ثابتة:</strong></div>
                  <div class="bs-row"><span>المعدات</span><span>80,000</span></div>
                  <div class="bs-row"><span>(-) مجمع الإهلاك</span><span>(10,000)</span></div>
                  <div class="bs-row subtotal"><span>صافي الأصول الثابتة</span><span>70,000</span></div>
                  <div class="bs-row total"><span><strong>إجمالي الأصول</strong></span><span><strong>200,000</strong></span></div>
                </div>
                <div class="bs-col">
                  <h4 class="text-red-600">الخصوم وحقوق الملكية</h4>
                  <div class="bs-section"><strong>خصوم متداولة:</strong></div>
                  <div class="bs-row"><span>الدائنون</span><span>25,000</span></div>
                  <div class="bs-row"><span>مصروفات مستحقة</span><span>8,000</span></div>
                  <div class="bs-row subtotal"><span>إجمالي الخصوم المتداولة</span><span>33,000</span></div>
                  <div class="bs-section"><strong>خصوم طويلة الأجل:</strong></div>
                  <div class="bs-row"><span>قرض بنكي</span><span>40,000</span></div>
                  <div class="bs-section"><strong>حقوق الملكية:</strong></div>
                  <div class="bs-row"><span>رأس المال</span><span>100,000</span></div>
                  <div class="bs-row"><span>أرباح محتجزة</span><span>27,000</span></div>
                  <div class="bs-row total"><span><strong>الإجمالي</strong></span><span><strong>200,000</strong></span></div>
                </div>
              </div>
            </div>
          </div>`
      },
      {
        id: 'i3',
        title: 'التسويات الجردية',
        duration: '35 دقيقة',
        icon: 'fa-sliders-h',
        videoId: 'PLv3eU6mpJLx4r-ZWwNmkqn_izIq5OQiVn',
        videoTitle: 'أساسيات المحاسبة والتسويات',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-adjust text-blue-500"></i> التسويات الجردية (Adjusting Entries)</h3>
            <div class="info-box orange">
              <p>التسويات الجردية هي قيود يومية تُجرى في نهاية الفترة المالية لتحديث الحسابات وضمان تطبيق مبدأ الاستحقاق، حيث تُسجل الإيرادات والمصروفات في الفترة التي تخصها.</p>
            </div>
            <h3><i class="fas fa-layer-group text-green-500"></i> أنواع التسويات</h3>
            <div class="grid-cards">
              <div class="mini-card">
                <i class="fas fa-hourglass-start text-blue-500"></i>
                <strong>مصروفات مقدمة</strong>
                <p>مصروفات دُفعت مقدماً ولم تُستخدم بعد</p>
                <div class="example-small">مثال: إيجار مدفوع مقدماً لعدة أشهر</div>
              </div>
              <div class="mini-card">
                <i class="fas fa-hourglass-end text-red-500"></i>
                <strong>مصروفات مستحقة</strong>
                <p>مصروفات تحققت ولم تُدفع بعد</p>
                <div class="example-small">مثال: رواتب مستحقة لم تُصرف</div>
              </div>
              <div class="mini-card">
                <i class="fas fa-coins text-green-500"></i>
                <strong>إيرادات مقدمة</strong>
                <p>إيرادات حُصّلت مقدماً ولم تُكتسب بعد</p>
                <div class="example-small">مثال: اشتراك سنوي مُحصّل مقدماً</div>
              </div>
              <div class="mini-card">
                <i class="fas fa-money-check-alt text-yellow-500"></i>
                <strong>إيرادات مستحقة</strong>
                <p>إيرادات اكتُسبت ولم تُحصّل بعد</p>
                <div class="example-small">مثال: فوائد مستحقة على ودائع</div>
              </div>
            </div>
            <h3><i class="fas fa-tools text-purple-500"></i> الإهلاك (Depreciation)</h3>
            <div class="journal-entry">
              <div class="je-header">قيد الإهلاك السنوي</div>
              <div class="je-row"><span class="je-debit">10,000 من حـ/ مصروف الإهلاك</span></div>
              <div class="je-row"><span class="je-credit">10,000 إلى حـ/ مجمع الإهلاك</span></div>
            </div>
          </div>`
      },
      {
        id: 'i4',
        title: 'قائمة التدفقات النقدية',
        duration: '35 دقيقة',
        icon: 'fa-money-bill-wave',
        videoId: 'DKb3eDwp2bU',
        videoTitle: 'قراءة وفهم القوائم المالية',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-water text-blue-500"></i> قائمة التدفقات النقدية</h3>
            <div class="info-box blue">
              <p>تُظهر هذه القائمة حركة النقد داخل وخارج المنشأة خلال فترة محددة، وتُقسم إلى ثلاثة أنشطة رئيسية.</p>
            </div>
            <div class="cash-flow-diagram">
              <div class="cf-activity operating">
                <h4><i class="fas fa-industry"></i> أنشطة تشغيلية</h4>
                <ul>
                  <li>تحصيل من العملاء: +480,000</li>
                  <li>مدفوعات للموردين: -280,000</li>
                  <li>رواتب ومصروفات: -100,000</li>
                  <li><strong>صافي: +100,000</strong></li>
                </ul>
              </div>
              <div class="cf-activity investing">
                <h4><i class="fas fa-chart-line"></i> أنشطة استثمارية</h4>
                <ul>
                  <li>شراء معدات: -50,000</li>
                  <li>بيع استثمارات: +20,000</li>
                  <li><strong>صافي: -30,000</strong></li>
                </ul>
              </div>
              <div class="cf-activity financing">
                <h4><i class="fas fa-university"></i> أنشطة تمويلية</h4>
                <ul>
                  <li>قرض بنكي: +40,000</li>
                  <li>توزيعات أرباح: -15,000</li>
                  <li><strong>صافي: +25,000</strong></li>
                </ul>
              </div>
            </div>
            <div class="total-cf">
              <strong>صافي التغير في النقدية: +95,000 ريال</strong>
            </div>
          </div>`
      },
      {
        id: 'i5',
        title: 'المحاسبة عن المخزون',
        duration: '30 دقيقة',
        icon: 'fa-warehouse',
        videoId: 'PLv3eU6mpJLx4r-ZWwNmkqn_izIq5OQiVn',
        videoTitle: 'أساسيات المحاسبة - المخزون',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-boxes text-blue-500"></i> طرق تقييم المخزون</h3>
            <div class="info-box green">
              <p>يُقيّم المخزون بعدة طرق تؤثر على تكلفة البضاعة المباعة وصافي الربح. اختيار الطريقة يعتمد على طبيعة النشاط والمعايير المحاسبية المطبقة.</p>
            </div>
            <div class="grid-cards">
              <div class="mini-card">
                <i class="fas fa-sort-amount-down text-blue-500"></i>
                <strong>FIFO - الوارد أولاً صادر أولاً</strong>
                <p>أول بضاعة تم شراؤها هي أول بضاعة تُباع</p>
                <div class="example-small">المخزون المتبقي يُقيّم بأحدث الأسعار</div>
              </div>
              <div class="mini-card">
                <i class="fas fa-sort-amount-up text-red-500"></i>
                <strong>LIFO - الوارد أخيراً صادر أولاً</strong>
                <p>آخر بضاعة تم شراؤها هي أول بضاعة تُباع</p>
                <div class="example-small">غير مقبولة وفق IFRS</div>
              </div>
              <div class="mini-card">
                <i class="fas fa-calculator text-green-500"></i>
                <strong>المتوسط المرجح</strong>
                <p>حساب متوسط تكلفة الوحدة بعد كل عملية شراء</p>
                <div class="example-small">الأكثر شيوعاً في المنشآت التجارية</div>
              </div>
            </div>
            <h3><i class="fas fa-calculator text-orange-500"></i> مثال عملي</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>التاريخ</th><th>العملية</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
                <tbody>
                  <tr><td>1/1</td><td>رصيد أول المدة</td><td>100</td><td>10</td><td>1,000</td></tr>
                  <tr><td>10/1</td><td>مشتريات</td><td>200</td><td>12</td><td>2,400</td></tr>
                  <tr><td>20/1</td><td>مبيعات</td><td>150</td><td>-</td><td>-</td></tr>
                  <tr><td>25/1</td><td>مشتريات</td><td>100</td><td>14</td><td>1,400</td></tr>
                </tbody>
              </table>
            </div>
          </div>`
      }
    ]
  },
  // ==================== ADVANCED ====================
  {
    id: 'advanced',
    title: 'المستوى المتقدم',
    subtitle: 'التحليل المالي والمعايير الدولية',
    icon: 'fa-chart-bar',
    color: '#8b5cf6',
    colorLight: '#ede9fe',
    lessons: [
      {
        id: 'a1',
        title: 'تحليل النسب المالية',
        duration: '40 دقيقة',
        icon: 'fa-percentage',
        videoId: 'DKb3eDwp2bU',
        videoTitle: 'قراءة وتحليل القوائم المالية',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-chart-pie text-blue-500"></i> التحليل المالي بالنسب</h3>
            <div class="info-box purple">
              <p>التحليل المالي بالنسب هو أداة لتقييم أداء المنشأة المالي من خلال حساب نسب محددة من القوائم المالية ومقارنتها.</p>
            </div>
            <h3>نسب السيولة</h3>
            <div class="ratio-card">
              <div class="ratio-formula">النسبة الجارية = الأصول المتداولة ÷ الخصوم المتداولة</div>
              <div class="ratio-example">مثال: 130,000 ÷ 33,000 = <strong>3.94</strong> (ممتازة)</div>
            </div>
            <div class="ratio-card">
              <div class="ratio-formula">النسبة السريعة = (الأصول المتداولة - المخزون) ÷ الخصوم المتداولة</div>
              <div class="ratio-example">مثال: (130,000 - 45,000) ÷ 33,000 = <strong>2.58</strong></div>
            </div>
            <h3>نسب الربحية</h3>
            <div class="ratio-card">
              <div class="ratio-formula">هامش الربح الصافي = صافي الربح ÷ المبيعات × 100</div>
              <div class="ratio-example">مثال: 97,000 ÷ 500,000 × 100 = <strong>19.4%</strong></div>
            </div>
            <div class="ratio-card">
              <div class="ratio-formula">العائد على حقوق الملكية (ROE) = صافي الربح ÷ حقوق الملكية × 100</div>
              <div class="ratio-example">مثال: 97,000 ÷ 127,000 × 100 = <strong>76.4%</strong></div>
            </div>
            <h3>نسب النشاط</h3>
            <div class="ratio-card">
              <div class="ratio-formula">معدل دوران المخزون = تكلفة المبيعات ÷ متوسط المخزون</div>
            </div>
            <div class="ratio-card">
              <div class="ratio-formula">متوسط فترة التحصيل = المدينون ÷ المبيعات × 365</div>
            </div>
          </div>`
      },
      {
        id: 'a2',
        title: 'المعايير الدولية IFRS',
        duration: '45 دقيقة',
        icon: 'fa-globe',
        videoId: '9OrigJMgsw0',
        videoTitle: 'أهم المعايير المحاسبية الدولية IFRS',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-globe-americas text-blue-500"></i> المعايير الدولية لإعداد التقارير المالية</h3>
            <div class="info-box blue">
              <p><strong>IFRS</strong> (International Financial Reporting Standards) هي مجموعة من المعايير المحاسبية الدولية الصادرة عن مجلس معايير المحاسبة الدولية (IASB) وتُطبق في أكثر من 140 دولة.</p>
            </div>
            <h3><i class="fas fa-list text-green-500"></i> أهم المعايير</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>المعيار</th><th>الموضوع</th><th>الأهمية</th></tr></thead>
                <tbody>
                  <tr><td>IFRS 1</td><td>التطبيق الأول للمعايير الدولية</td><td>عند التحول لأول مرة</td></tr>
                  <tr><td>IFRS 9</td><td>الأدوات المالية</td><td>تصنيف وقياس الأصول المالية</td></tr>
                  <tr><td>IFRS 15</td><td>الإيراد من العقود مع العملاء</td><td>الاعتراف بالإيراد</td></tr>
                  <tr><td>IFRS 16</td><td>عقود الإيجار</td><td>معالجة عقود الإيجار</td></tr>
                  <tr><td>IAS 1</td><td>عرض القوائم المالية</td><td>شكل ومحتوى القوائم</td></tr>
                  <tr><td>IAS 2</td><td>المخزون</td><td>تقييم وعرض المخزون</td></tr>
                  <tr><td>IAS 16</td><td>الممتلكات والآلات والمعدات</td><td>الأصول الثابتة</td></tr>
                  <tr><td>IAS 36</td><td>انخفاض قيمة الأصول</td><td>اختبار الاضمحلال</td></tr>
                </tbody>
              </table>
            </div>
            <h3><i class="fas fa-check-circle text-green-500"></i> الإطار المفاهيمي</h3>
            <div class="grid-cards">
              <div class="mini-card"><i class="fas fa-eye text-blue-500"></i><strong>الملاءمة</strong><p>المعلومات يجب أن تكون مؤثرة في القرار</p></div>
              <div class="mini-card"><i class="fas fa-shield-alt text-green-500"></i><strong>الموثوقية</strong><p>يمكن الاعتماد عليها وخالية من التحيز</p></div>
              <div class="mini-card"><i class="fas fa-sync text-orange-500"></i><strong>القابلية للمقارنة</strong><p>يمكن المقارنة عبر الفترات والشركات</p></div>
              <div class="mini-card"><i class="fas fa-clock text-purple-500"></i><strong>التوقيت المناسب</strong><p>متاحة عند الحاجة لاتخاذ القرار</p></div>
            </div>
          </div>`
      },
      {
        id: 'a3',
        title: 'محاسبة الزكاة وضريبة القيمة المضافة',
        duration: '40 دقيقة',
        icon: 'fa-hand-holding-usd',
        videoId: 'O6DptItZRMY',
        videoTitle: 'محاسبة التكاليف والزكاة',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-mosque text-green-600"></i> محاسبة الزكاة</h3>
            <div class="info-box green">
              <p><strong>زكاة عروض التجارة:</strong> تُحسب الزكاة بنسبة 2.5% من الوعاء الزكوي في نهاية الحول.</p>
            </div>
            <div class="formula-box">
              <strong>الوعاء الزكوي = الأصول الزكوية - الخصوم المسموح بحسمها</strong>
              <br>الزكاة = الوعاء الزكوي × 2.5%
            </div>
            <div class="example-box">
              <p><strong>مثال:</strong> إذا كانت الأصول الزكوية = 400,000 والخصوم المسموح بحسمها = 100,000</p>
              <p>الوعاء الزكوي = 400,000 - 100,000 = 300,000</p>
              <p>الزكاة = 300,000 × 2.5% = <strong>7,500 ريال</strong></p>
            </div>
            <h3><i class="fas fa-percent text-red-500"></i> ضريبة القيمة المضافة (VAT)</h3>
            <div class="info-box red">
              <p>ضريبة القيمة المضافة هي ضريبة غير مباشرة تُفرض على السلع والخدمات بنسبة 15% في المملكة العربية السعودية.</p>
            </div>
            <div class="table-container">
              <table>
                <thead><tr><th>البيان</th><th>المبلغ</th><th>الضريبة 15%</th><th>الإجمالي</th></tr></thead>
                <tbody>
                  <tr><td>مبيعات</td><td>100,000</td><td>15,000</td><td>115,000</td></tr>
                  <tr><td>مشتريات</td><td>60,000</td><td>9,000</td><td>69,000</td></tr>
                  <tr class="total-row"><td><strong>الضريبة المستحقة</strong></td><td></td><td><strong>6,000</strong></td><td></td></tr>
                </tbody>
              </table>
            </div>
            <div class="journal-entry">
              <div class="je-header">قيد تسجيل المبيعات مع الضريبة</div>
              <div class="je-row"><span class="je-debit">115,000 من حـ/ النقدية</span></div>
              <div class="je-row"><span class="je-credit">100,000 إلى حـ/ المبيعات</span></div>
              <div class="je-row"><span class="je-credit">15,000 إلى حـ/ ضريبة القيمة المضافة المحصلة</span></div>
            </div>
          </div>`
      },
      {
        id: 'a4',
        title: 'القوائم المالية الموحدة',
        duration: '45 دقيقة',
        icon: 'fa-project-diagram',
        videoId: 'NHRk18rumz4',
        videoTitle: 'شرح المحاسبة المالية المتقدمة',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-network-wired text-blue-500"></i> القوائم المالية الموحدة</h3>
            <div class="info-box purple">
              <p>القوائم المالية الموحدة تعرض البيانات المالية لمجموعة شركات (شركة أم وشركاتها التابعة) كما لو كانت كياناً اقتصادياً واحداً.</p>
            </div>
            <h3><i class="fas fa-sitemap text-green-500"></i> متى تُعد القوائم الموحدة؟</h3>
            <ul class="styled-list">
              <li>عندما تملك الشركة الأم أكثر من <strong>50%</strong> من أسهم الشركة التابعة</li>
              <li>عندما تملك السيطرة الفعلية على السياسات المالية والتشغيلية</li>
              <li>وفقاً لمعيار IFRS 10 - القوائم المالية الموحدة</li>
            </ul>
            <h3><i class="fas fa-cogs text-orange-500"></i> خطوات إعداد القوائم الموحدة</h3>
            <div class="steps-list">
              <div class="step"><span class="step-num">1</span><p>جمع القوائم المالية للشركة الأم والتابعة</p></div>
              <div class="step"><span class="step-num">2</span><p>استبعاد المعاملات البينية (المبيعات والمشتريات بين الشركات)</p></div>
              <div class="step"><span class="step-num">3</span><p>استبعاد الاستثمار في الشركة التابعة مقابل حقوق الملكية</p></div>
              <div class="step"><span class="step-num">4</span><p>حساب حقوق الأقلية (إن وجدت)</p></div>
              <div class="step"><span class="step-num">5</span><p>حساب الشهرة (الفرق بين تكلفة الشراء وصافي الأصول)</p></div>
            </div>
          </div>`
      },
      {
        id: 'a5',
        title: 'محاسبة الأدوات المالية',
        duration: '40 دقيقة',
        icon: 'fa-chart-area',
        videoId: 'AToUj0DmerQ',
        videoTitle: 'المحاسبة المالية - الأدوات المالية',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-layer-group text-blue-500"></i> تصنيف الأدوات المالية (IFRS 9)</h3>
            <div class="info-box blue">
              <p>يُصنف معيار IFRS 9 الأصول المالية إلى ثلاث فئات رئيسية حسب نموذج الأعمال وخصائص التدفقات النقدية.</p>
            </div>
            <div class="grid-cards">
              <div class="mini-card">
                <i class="fas fa-dollar-sign text-green-500"></i>
                <strong>التكلفة المطفأة</strong>
                <p>الاحتفاظ لتحصيل التدفقات النقدية التعاقدية</p>
                <div class="example-small">مثال: السندات المحتفظ بها حتى الاستحقاق</div>
              </div>
              <div class="mini-card">
                <i class="fas fa-chart-line text-blue-500"></i>
                <strong>القيمة العادلة من خلال الدخل الشامل</strong>
                <p>الاحتفاظ للتحصيل والبيع</p>
                <div class="example-small">مثال: محفظة سندات متاحة للبيع</div>
              </div>
              <div class="mini-card">
                <i class="fas fa-exchange-alt text-red-500"></i>
                <strong>القيمة العادلة من خلال الربح أو الخسارة</strong>
                <p>المتاجرة وتحقيق أرباح رأسمالية</p>
                <div class="example-small">مثال: أسهم محتفظ بها للمتاجرة</div>
              </div>
            </div>
            <h3><i class="fas fa-shield-alt text-purple-500"></i> محاسبة التحوط</h3>
            <div class="info-box purple">
              <p>محاسبة التحوط تسمح للمنشآت بتقليل التقلبات في الأرباح الناتجة عن أدوات التحوط وتأثيرها على القوائم المالية.</p>
            </div>
          </div>`
      },
      {
        id: 'a6',
        title: 'الاعتراف بالإيراد (IFRS 15)',
        duration: '35 دقيقة',
        icon: 'fa-file-contract',
        videoId: '9OrigJMgsw0',
        videoTitle: 'معايير الإيراد الدولية',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-tasks text-blue-500"></i> نموذج الخطوات الخمس (IFRS 15)</h3>
            <div class="info-box green">
              <p>يحدد معيار IFRS 15 نموذجاً من خمس خطوات للاعتراف بالإيراد من العقود مع العملاء.</p>
            </div>
            <div class="steps-list">
              <div class="step"><span class="step-num">1</span><p><strong>تحديد العقد:</strong> الاتفاق بين طرفين أو أكثر ينشئ حقوقاً والتزامات قابلة للتنفيذ</p></div>
              <div class="step"><span class="step-num">2</span><p><strong>تحديد التزامات الأداء:</strong> تعهدات بنقل سلع أو خدمات مميزة للعميل</p></div>
              <div class="step"><span class="step-num">3</span><p><strong>تحديد سعر المعاملة:</strong> المقابل المتوقع مقابل نقل السلع أو الخدمات</p></div>
              <div class="step"><span class="step-num">4</span><p><strong>تخصيص سعر المعاملة:</strong> توزيع السعر على التزامات الأداء</p></div>
              <div class="step"><span class="step-num">5</span><p><strong>الاعتراف بالإيراد:</strong> عند الوفاء بالتزام الأداء</p></div>
            </div>
          </div>`
      }
    ]
  },
  // ==================== COST ACCOUNTING ====================
  {
    id: 'cost-accounting',
    title: 'محاسبة التكاليف',
    subtitle: 'تحديد وتحليل وإدارة التكاليف',
    icon: 'fa-cogs',
    color: '#f59e0b',
    colorLight: '#fef3c7',
    lessons: [
      {
        id: 'c1',
        title: 'مقدمة في محاسبة التكاليف',
        duration: '30 دقيقة',
        icon: 'fa-info-circle',
        videoId: 'O6DptItZRMY',
        videoTitle: 'سلسلة محاسبة التكاليف - مقدمة',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-cogs text-yellow-600"></i> ما هي محاسبة التكاليف؟</h3>
            <div class="info-box yellow">
              <p><strong>محاسبة التكاليف</strong> هي فرع من فروع المحاسبة يهتم بقياس وتسجيل وتحليل تكاليف الإنتاج والخدمات لمساعدة الإدارة في التخطيط والرقابة واتخاذ القرارات.</p>
            </div>
            <h3><i class="fas fa-bullseye text-red-500"></i> أهداف محاسبة التكاليف</h3>
            <ul class="styled-list">
              <li>تحديد تكلفة الوحدة المنتجة أو الخدمة المقدمة</li>
              <li>الرقابة على عناصر التكاليف وتحديد الانحرافات</li>
              <li>المساعدة في تسعير المنتجات والخدمات</li>
              <li>توفير بيانات لإعداد الموازنات التقديرية</li>
              <li>المساعدة في اتخاذ القرارات الإدارية</li>
            </ul>
            <h3><i class="fas fa-sitemap text-blue-500"></i> عناصر التكلفة</h3>
            <div class="cost-triangle">
              <div class="cost-element materials"><i class="fas fa-cubes"></i><strong>مواد مباشرة</strong><p>المواد الخام الداخلة في المنتج</p></div>
              <div class="cost-element labor"><i class="fas fa-users"></i><strong>أجور مباشرة</strong><p>أجور العمال المنتجين</p></div>
              <div class="cost-element overhead"><i class="fas fa-industry"></i><strong>تكاليف صناعية غير مباشرة</strong><p>إيجار المصنع، إهلاك الآلات، كهرباء</p></div>
            </div>
          </div>`
      },
      {
        id: 'c2',
        title: 'تصنيف التكاليف',
        duration: '35 دقيقة',
        icon: 'fa-tags',
        videoId: 'gmyvJk2nK9s',
        videoTitle: 'مقدمة في محاسبة التكاليف - المحاضرة الأولى',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-layer-group text-blue-500"></i> تصنيفات التكاليف</h3>
            <h4>1. حسب العلاقة بالمنتج</h4>
            <div class="table-container">
              <table>
                <thead><tr><th>النوع</th><th>التعريف</th><th>أمثلة</th></tr></thead>
                <tbody>
                  <tr><td><strong>تكاليف مباشرة</strong></td><td>يمكن تتبعها مباشرة للمنتج</td><td>مواد خام، أجور عمال إنتاج</td></tr>
                  <tr><td><strong>تكاليف غير مباشرة</strong></td><td>لا يمكن تتبعها مباشرة</td><td>إيجار المصنع، صيانة المعدات</td></tr>
                </tbody>
              </table>
            </div>
            <h4>2. حسب السلوك مع حجم النشاط</h4>
            <div class="grid-cards">
              <div class="mini-card">
                <i class="fas fa-arrows-alt-h text-blue-500"></i>
                <strong>تكاليف ثابتة</strong>
                <p>لا تتغير مع تغير حجم الإنتاج</p>
                <div class="example-small">مثال: إيجار المصنع = 10,000 شهرياً</div>
              </div>
              <div class="mini-card">
                <i class="fas fa-chart-line text-green-500"></i>
                <strong>تكاليف متغيرة</strong>
                <p>تتغير طردياً مع حجم الإنتاج</p>
                <div class="example-small">مثال: مواد خام = 5 ريال/وحدة</div>
              </div>
              <div class="mini-card">
                <i class="fas fa-random text-orange-500"></i>
                <strong>تكاليف مختلطة</strong>
                <p>تحتوي على جزء ثابت وجزء متغير</p>
                <div class="example-small">مثال: فاتورة الكهرباء (اشتراك + استهلاك)</div>
              </div>
            </div>
          </div>`
      },
      {
        id: 'c3',
        title: 'نظام تكاليف الأوامر الإنتاجية',
        duration: '40 دقيقة',
        icon: 'fa-clipboard-list',
        videoId: 'OP2Mc_dB0nI',
        videoTitle: 'محاسبة التكاليف - المحاضرة الثالثة',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-file-invoice text-blue-500"></i> نظام تكاليف الأوامر</h3>
            <div class="info-box blue">
              <p>يُستخدم عندما يكون الإنتاج حسب طلب العميل، حيث يتم تجميع التكاليف لكل أمر إنتاجي بشكل منفصل.</p>
            </div>
            <h3><i class="fas fa-calculator text-green-500"></i> مثال عملي</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>عنصر التكلفة</th><th>أمر إنتاج 101</th><th>أمر إنتاج 102</th></tr></thead>
                <tbody>
                  <tr><td>مواد مباشرة</td><td>12,000</td><td>8,000</td></tr>
                  <tr><td>أجور مباشرة</td><td>6,000</td><td>4,500</td></tr>
                  <tr><td>ت. صناعية غير مباشرة (150% من الأجور)</td><td>9,000</td><td>6,750</td></tr>
                  <tr class="total-row"><td><strong>إجمالي تكلفة الأمر</strong></td><td><strong>27,000</strong></td><td><strong>19,250</strong></td></tr>
                  <tr><td>عدد الوحدات</td><td>100</td><td>50</td></tr>
                  <tr><td><strong>تكلفة الوحدة</strong></td><td><strong>270</strong></td><td><strong>385</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>`
      },
      {
        id: 'c4',
        title: 'نظام تكاليف المراحل الإنتاجية',
        duration: '40 دقيقة',
        icon: 'fa-stream',
        videoId: 'w9hH516gua4',
        videoTitle: 'سلسلة محاسبة التكاليف - تكاليف العمليات',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-stream text-purple-500"></i> نظام تكاليف المراحل</h3>
            <div class="info-box purple">
              <p>يُستخدم في الصناعات ذات الإنتاج المستمر والمتماثل، حيث يمر المنتج بعدة مراحل إنتاجية متتالية.</p>
            </div>
            <h3><i class="fas fa-sort-amount-down text-blue-500"></i> الوحدات المعادلة</h3>
            <div class="info-box green">
              <p><strong>الوحدات المعادلة</strong> هي تحويل الوحدات غير المكتملة إلى ما يعادلها من وحدات مكتملة لتوزيع التكاليف بشكل عادل.</p>
            </div>
            <div class="example-box">
              <p><strong>مثال:</strong> إذا كان لدينا 200 وحدة تحت التشغيل مكتملة بنسبة 60%</p>
              <p>الوحدات المعادلة = 200 × 60% = <strong>120 وحدة معادلة</strong></p>
            </div>
            <h3><i class="fas fa-tasks text-orange-500"></i> خطوات حساب التكلفة</h3>
            <div class="steps-list">
              <div class="step"><span class="step-num">1</span><p>تحديد تدفق الوحدات (مدخلات ومخرجات كل مرحلة)</p></div>
              <div class="step"><span class="step-num">2</span><p>حساب الوحدات المعادلة للإنتاج</p></div>
              <div class="step"><span class="step-num">3</span><p>تحديد إجمالي التكاليف لكل مرحلة</p></div>
              <div class="step"><span class="step-num">4</span><p>حساب تكلفة الوحدة المعادلة</p></div>
              <div class="step"><span class="step-num">5</span><p>توزيع التكاليف على الإنتاج التام وتحت التشغيل</p></div>
            </div>
          </div>`
      },
      {
        id: 'c5',
        title: 'تحليل التعادل (Break-Even Analysis)',
        duration: '30 دقيقة',
        icon: 'fa-balance-scale',
        videoId: 'pmIxkbxGQ9E',
        videoTitle: 'الجانب التطبيقي لمحاسبة التكاليف',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-crosshairs text-red-500"></i> تحليل التعادل</h3>
            <div class="info-box red">
              <p><strong>نقطة التعادل</strong> هي النقطة التي تتساوى فيها الإيرادات الكلية مع التكاليف الكلية، أي لا ربح ولا خسارة.</p>
            </div>
            <div class="formula-box">
              <strong>نقطة التعادل بالوحدات = التكاليف الثابتة ÷ (سعر البيع - التكلفة المتغيرة للوحدة)</strong>
              <br><br>
              <strong>نقطة التعادل بالقيمة = التكاليف الثابتة ÷ نسبة هامش المساهمة</strong>
            </div>
            <div class="example-box">
              <p><strong>مثال:</strong></p>
              <ul>
                <li>التكاليف الثابتة = 100,000 ريال</li>
                <li>سعر بيع الوحدة = 50 ريال</li>
                <li>التكلفة المتغيرة للوحدة = 30 ريال</li>
              </ul>
              <p>هامش المساهمة = 50 - 30 = 20 ريال</p>
              <p>نقطة التعادل = 100,000 ÷ 20 = <strong>5,000 وحدة</strong></p>
              <p>نقطة التعادل بالقيمة = 5,000 × 50 = <strong>250,000 ريال</strong></p>
            </div>
          </div>`
      }
    ]
  },
  // ==================== MANAGERIAL ACCOUNTING ====================
  {
    id: 'managerial',
    title: 'المحاسبة الإدارية',
    subtitle: 'أدوات اتخاذ القرار والتخطيط',
    icon: 'fa-briefcase',
    color: '#ec4899',
    colorLight: '#fce7f3',
    lessons: [
      {
        id: 'm1',
        title: 'مقدمة في المحاسبة الإدارية',
        duration: '25 دقيقة',
        icon: 'fa-info-circle',
        videoId: 'bBExdVqgxl0',
        videoTitle: 'المحاسبة الإدارية - الفصل الأول',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-briefcase text-pink-500"></i> ما هي المحاسبة الإدارية؟</h3>
            <div class="info-box pink">
              <p><strong>المحاسبة الإدارية</strong> هي فرع من المحاسبة يهتم بتوفير المعلومات المالية وغير المالية للإدارة لمساعدتها في التخطيط والرقابة واتخاذ القرارات.</p>
            </div>
            <h3><i class="fas fa-exchange-alt text-blue-500"></i> الفرق بين المحاسبة المالية والإدارية</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>المعيار</th><th>المحاسبة المالية</th><th>المحاسبة الإدارية</th></tr></thead>
                <tbody>
                  <tr><td>المستخدمون</td><td>خارجيون (مستثمرون، دائنون)</td><td>داخليون (إدارة)</td></tr>
                  <tr><td>الإلزامية</td><td>إلزامية قانونياً</td><td>اختيارية</td></tr>
                  <tr><td>التوقيت</td><td>تاريخية (ماضي)</td><td>مستقبلية (تخطيطية)</td></tr>
                  <tr><td>المعايير</td><td>IFRS / GAAP</td><td>لا توجد معايير ملزمة</td></tr>
                  <tr><td>التقارير</td><td>قوائم مالية محددة</td><td>تقارير حسب الحاجة</td></tr>
                  <tr><td>التفصيل</td><td>إجمالية للمنشأة ككل</td><td>تفصيلية لكل قسم/منتج</td></tr>
                </tbody>
              </table>
            </div>
          </div>`
      },
      {
        id: 'm2',
        title: 'الموازنات التقديرية',
        duration: '40 دقيقة',
        icon: 'fa-file-alt',
        videoId: 'lciWn5Bh4Us',
        videoTitle: 'شرح مادة محاسبة إدارية - الموازنات',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-file-invoice text-blue-500"></i> الموازنات التقديرية (Budgets)</h3>
            <div class="info-box blue">
              <p>الموازنة هي خطة مالية تفصيلية تُعد لفترة مستقبلية وتُعبر بالأرقام عن أهداف وخطط المنشأة.</p>
            </div>
            <h3><i class="fas fa-sitemap text-green-500"></i> أنواع الموازنات</h3>
            <div class="grid-cards">
              <div class="mini-card"><i class="fas fa-shopping-cart text-blue-500"></i><strong>موازنة المبيعات</strong><p>نقطة البداية لإعداد الموازنة الشاملة</p></div>
              <div class="mini-card"><i class="fas fa-industry text-green-500"></i><strong>موازنة الإنتاج</strong><p>تحديد كمية الإنتاج المطلوبة</p></div>
              <div class="mini-card"><i class="fas fa-cubes text-orange-500"></i><strong>موازنة المشتريات</strong><p>تحديد المواد الخام المطلوبة</p></div>
              <div class="mini-card"><i class="fas fa-money-bill text-red-500"></i><strong>الموازنة النقدية</strong><p>التدفقات النقدية المتوقعة</p></div>
            </div>
            <h3><i class="fas fa-calculator text-orange-500"></i> مثال: موازنة المبيعات</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>الربع</th><th>الكمية المتوقعة</th><th>سعر البيع</th><th>إجمالي المبيعات</th></tr></thead>
                <tbody>
                  <tr><td>الأول</td><td>1,000</td><td>100</td><td>100,000</td></tr>
                  <tr><td>الثاني</td><td>1,200</td><td>100</td><td>120,000</td></tr>
                  <tr><td>الثالث</td><td>1,500</td><td>100</td><td>150,000</td></tr>
                  <tr><td>الرابع</td><td>1,300</td><td>100</td><td>130,000</td></tr>
                  <tr class="total-row"><td><strong>الإجمالي</strong></td><td><strong>5,000</strong></td><td></td><td><strong>500,000</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>`
      },
      {
        id: 'm3',
        title: 'تحليل الانحرافات',
        duration: '35 دقيقة',
        icon: 'fa-not-equal',
        videoId: '0qhnOTkJRSo',
        videoTitle: 'المحاسبة الإدارية - تحليل الانحرافات',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-not-equal text-red-500"></i> تحليل الانحرافات (Variance Analysis)</h3>
            <div class="info-box orange">
              <p>تحليل الانحرافات هو مقارنة الأداء الفعلي بالأداء المعياري (المخطط) لتحديد أسباب الاختلاف واتخاذ الإجراءات التصحيحية.</p>
            </div>
            <h3><i class="fas fa-chart-bar text-blue-500"></i> أنواع الانحرافات</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>نوع الانحراف</th><th>المعياري</th><th>الفعلي</th><th>الانحراف</th><th>النوع</th></tr></thead>
                <tbody>
                  <tr><td>انحراف المواد (سعر)</td><td>10 ر/كغ</td><td>11 ر/كغ</td><td>1 ر/كغ</td><td class="unfavorable">غير ملائم</td></tr>
                  <tr><td>انحراف المواد (كمية)</td><td>500 كغ</td><td>480 كغ</td><td>20 كغ</td><td class="favorable">ملائم</td></tr>
                  <tr><td>انحراف الأجور (معدل)</td><td>20 ر/ساعة</td><td>19 ر/ساعة</td><td>1 ر/ساعة</td><td class="favorable">ملائم</td></tr>
                  <tr><td>انحراف الأجور (كفاءة)</td><td>100 ساعة</td><td>110 ساعات</td><td>10 ساعات</td><td class="unfavorable">غير ملائم</td></tr>
                </tbody>
              </table>
            </div>
          </div>`
      },
      {
        id: 'm4',
        title: 'اتخاذ القرارات قصيرة الأجل',
        duration: '35 دقيقة',
        icon: 'fa-random',
        videoId: 'ZL1iWqr90PY',
        videoTitle: 'المحاسبة الإدارية - اتخاذ القرارات',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-random text-blue-500"></i> أنواع قرارات الإدارة قصيرة الأجل</h3>
            <div class="grid-cards">
              <div class="mini-card">
                <i class="fas fa-industry text-blue-500"></i>
                <strong>قرار الصنع أو الشراء</strong>
                <p>هل نصنع المكوّن داخلياً أم نشتريه من مورد خارجي؟</p>
              </div>
              <div class="mini-card">
                <i class="fas fa-tag text-green-500"></i>
                <strong>قرار قبول أو رفض طلبية خاصة</strong>
                <p>هل نقبل طلبية بسعر أقل من السعر المعتاد؟</p>
              </div>
              <div class="mini-card">
                <i class="fas fa-trash text-red-500"></i>
                <strong>قرار الاستمرار أو التوقف</strong>
                <p>هل نستمر في إنتاج منتج خاسر أم نوقفه؟</p>
              </div>
              <div class="mini-card">
                <i class="fas fa-tools text-orange-500"></i>
                <strong>قرار البيع أو التصنيع الإضافي</strong>
                <p>هل نبيع المنتج كما هو أم نضيف عمليات تصنيع إضافية؟</p>
              </div>
            </div>
            <h3><i class="fas fa-key text-purple-500"></i> المفهوم الأساسي: التكلفة ذات الصلة</h3>
            <div class="info-box purple">
              <p><strong>التكلفة ذات الصلة (Relevant Cost)</strong> هي التكلفة المستقبلية التي تختلف بين البدائل المتاحة. التكاليف الغارقة (التي حدثت بالفعل) لا تكون ذات صلة بالقرار.</p>
            </div>
          </div>`
      }
    ]
  },
  // ==================== AUDITING ====================
  {
    id: 'auditing',
    title: 'المراجعة والتدقيق',
    subtitle: 'أساسيات التدقيق المحاسبي والمراجعة',
    icon: 'fa-search-dollar',
    color: '#14b8a6',
    colorLight: '#ccfbf1',
    lessons: [
      {
        id: 'au1',
        title: 'مقدمة في المراجعة والتدقيق',
        duration: '30 دقيقة',
        icon: 'fa-search',
        videoId: '6sEAi4AQFAk',
        videoTitle: 'أهم خطوات التدقيق لكل مدقق حسابات',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-search-dollar text-teal-500"></i> ما هي المراجعة؟</h3>
            <div class="info-box teal">
              <p><strong>المراجعة (Auditing)</strong> هي فحص منهجي ومستقل للقوائم المالية والسجلات المحاسبية للتأكد من أنها تعبر بعدالة عن المركز المالي ونتائج الأعمال وفقاً للمعايير المحاسبية.</p>
            </div>
            <h3><i class="fas fa-sitemap text-blue-500"></i> أنواع المراجعة</h3>
            <div class="grid-cards">
              <div class="mini-card">
                <i class="fas fa-user-tie text-blue-500"></i>
                <strong>مراجعة خارجية</strong>
                <p>يقوم بها مراجع مستقل من خارج المنشأة</p>
              </div>
              <div class="mini-card">
                <i class="fas fa-users text-green-500"></i>
                <strong>مراجعة داخلية</strong>
                <p>يقوم بها قسم المراجعة الداخلية</p>
              </div>
              <div class="mini-card">
                <i class="fas fa-landmark text-red-500"></i>
                <strong>مراجعة حكومية</strong>
                <p>رقابة الأجهزة الحكومية</p>
              </div>
            </div>
            <h3><i class="fas fa-file-signature text-purple-500"></i> أنواع تقارير المراجع</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>نوع التقرير</th><th>الوصف</th></tr></thead>
                <tbody>
                  <tr><td><strong>رأي نظيف (غير متحفظ)</strong></td><td>القوائم المالية تعبر بعدالة عن المركز المالي</td></tr>
                  <tr><td><strong>رأي متحفظ</strong></td><td>القوائم عادلة ما عدا بعض الاستثناءات</td></tr>
                  <tr><td><strong>رأي عكسي (سلبي)</strong></td><td>القوائم لا تعبر بعدالة عن المركز المالي</td></tr>
                  <tr><td><strong>الامتناع عن إبداء الرأي</strong></td><td>عدم القدرة على تكوين رأي بسبب قيود</td></tr>
                </tbody>
              </table>
            </div>
          </div>`
      },
      {
        id: 'au2',
        title: 'إجراءات التدقيق والأدلة',
        duration: '35 دقيقة',
        icon: 'fa-clipboard-check',
        videoId: 'DLPy0hiFy4c',
        videoTitle: 'فحص القيود وإجراءات ختام عملية التدقيق',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-clipboard-check text-blue-500"></i> أدلة المراجعة</h3>
            <div class="info-box blue">
              <p>أدلة المراجعة هي المعلومات التي يحصل عليها المراجع لتكوين رأيه حول عدالة القوائم المالية.</p>
            </div>
            <h3><i class="fas fa-tools text-green-500"></i> إجراءات الحصول على الأدلة</h3>
            <div class="steps-list">
              <div class="step"><span class="step-num">1</span><p><strong>الفحص المستندي:</strong> فحص الفواتير والعقود والمستندات</p></div>
              <div class="step"><span class="step-num">2</span><p><strong>الملاحظة:</strong> مشاهدة العمليات والإجراءات مباشرة</p></div>
              <div class="step"><span class="step-num">3</span><p><strong>الاستفسار:</strong> طرح الأسئلة على الموظفين والإدارة</p></div>
              <div class="step"><span class="step-num">4</span><p><strong>المصادقات:</strong> التأكد من الأرصدة مع أطراف خارجية</p></div>
              <div class="step"><span class="step-num">5</span><p><strong>إعادة الحساب:</strong> التحقق من الدقة الحسابية</p></div>
              <div class="step"><span class="step-num">6</span><p><strong>الإجراءات التحليلية:</strong> تحليل النسب والعلاقات</p></div>
            </div>
            <h3><i class="fas fa-exclamation-triangle text-yellow-500"></i> مفهوم الأهمية النسبية</h3>
            <div class="info-box yellow">
              <p><strong>الأهمية النسبية (Materiality)</strong> هي المبلغ الذي يؤثر حذفه أو تحريفه على قرارات مستخدمي القوائم المالية. تُحدد عادة كنسبة مئوية من إجمالي الأصول أو الإيرادات.</p>
            </div>
          </div>`
      },
      {
        id: 'au3',
        title: 'تقييم المخاطر والرقابة الداخلية',
        duration: '40 دقيقة',
        icon: 'fa-shield-alt',
        videoId: 'ak6FoeWJKjg',
        videoTitle: 'إدارة عمليات المراجعة بشكل عملي',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-shield-alt text-blue-500"></i> نظام الرقابة الداخلية</h3>
            <div class="info-box green">
              <p>الرقابة الداخلية هي مجموعة السياسات والإجراءات التي تضعها الإدارة لحماية أصول المنشأة وضمان دقة التقارير المالية والالتزام بالقوانين.</p>
            </div>
            <h3><i class="fas fa-cubes text-purple-500"></i> مكونات الرقابة الداخلية (COSO)</h3>
            <div class="steps-list">
              <div class="step"><span class="step-num">1</span><p><strong>بيئة الرقابة:</strong> ثقافة المنشأة والتزام الإدارة بالنزاهة</p></div>
              <div class="step"><span class="step-num">2</span><p><strong>تقييم المخاطر:</strong> تحديد وتقييم المخاطر التي تهدد الأهداف</p></div>
              <div class="step"><span class="step-num">3</span><p><strong>أنشطة الرقابة:</strong> السياسات والإجراءات لمعالجة المخاطر</p></div>
              <div class="step"><span class="step-num">4</span><p><strong>المعلومات والاتصال:</strong> نظم المعلومات والتواصل الفعال</p></div>
              <div class="step"><span class="step-num">5</span><p><strong>المتابعة:</strong> مراقبة فعالية نظام الرقابة الداخلية</p></div>
            </div>
            <h3><i class="fas fa-exclamation-circle text-red-500"></i> مخاطر المراجعة</h3>
            <div class="formula-box">
              <strong>مخاطر المراجعة = مخاطر متأصلة × مخاطر الرقابة × مخاطر الاكتشاف</strong>
            </div>
          </div>`
      },
      {
        id: 'au4',
        title: 'الغش والأخطاء المحاسبية',
        duration: '30 دقيقة',
        icon: 'fa-user-secret',
        videoId: 'u-zAZQU1u8k',
        videoTitle: 'إجراءات المراجعة وتقييم المخاطر',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-user-secret text-red-500"></i> الغش مقابل الخطأ</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>المعيار</th><th>الغش (Fraud)</th><th>الخطأ (Error)</th></tr></thead>
                <tbody>
                  <tr><td>القصد</td><td>متعمد</td><td>غير متعمد</td></tr>
                  <tr><td>الطبيعة</td><td>تلاعب أو تزوير أو إخفاء</td><td>سهو أو إغفال أو سوء تطبيق</td></tr>
                  <tr><td>المسؤولية</td><td>قانونية وجنائية</td><td>مهنية فقط</td></tr>
                </tbody>
              </table>
            </div>
            <h3><i class="fas fa-triangle-exclamation text-yellow-500"></i> مثلث الغش</h3>
            <div class="grid-cards">
              <div class="mini-card">
                <i class="fas fa-compress-arrows-alt text-red-500"></i>
                <strong>الضغط/الدافع</strong>
                <p>ضغوط مالية أو شخصية تدفع للغش</p>
              </div>
              <div class="mini-card">
                <i class="fas fa-door-open text-yellow-500"></i>
                <strong>الفرصة</strong>
                <p>ضعف نظام الرقابة الداخلية</p>
              </div>
              <div class="mini-card">
                <i class="fas fa-brain text-purple-500"></i>
                <strong>التبرير</strong>
                <p>قدرة الشخص على تبرير فعله لنفسه</p>
              </div>
            </div>
          </div>`
      }
    ]
  },
  // ==================== TAX ACCOUNTING ====================
  {
    id: 'tax',
    title: 'المحاسبة الضريبية',
    subtitle: 'الضرائب والزكاة والامتثال الضريبي',
    icon: 'fa-file-invoice-dollar',
    color: '#ef4444',
    colorLight: '#fee2e2',
    lessons: [
      {
        id: 't1',
        title: 'مقدمة في النظام الضريبي',
        duration: '30 دقيقة',
        icon: 'fa-landmark',
        videoId: 'O6DptItZRMY',
        videoTitle: 'مقدمة في المحاسبة الضريبية',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-landmark text-red-500"></i> النظام الضريبي</h3>
            <div class="info-box red">
              <p>النظام الضريبي هو مجموعة القواعد والقوانين التي تنظم فرض وتحصيل الضرائب. تُعد الضرائب المصدر الرئيسي لإيرادات الدولة.</p>
            </div>
            <h3><i class="fas fa-list text-blue-500"></i> أنواع الضرائب</h3>
            <div class="grid-cards">
              <div class="mini-card"><i class="fas fa-building text-blue-500"></i><strong>ضريبة دخل الشركات</strong><p>20% على أرباح الشركات الأجنبية (السعودية)</p></div>
              <div class="mini-card"><i class="fas fa-percent text-green-500"></i><strong>ضريبة القيمة المضافة</strong><p>15% على السلع والخدمات</p></div>
              <div class="mini-card"><i class="fas fa-mosque text-yellow-600"></i><strong>الزكاة</strong><p>2.5% على الوعاء الزكوي للشركات السعودية</p></div>
              <div class="mini-card"><i class="fas fa-hand-holding-usd text-red-500"></i><strong>ضريبة الاستقطاع</strong><p>5-20% على مدفوعات لغير المقيمين</p></div>
            </div>
            <h3><i class="fas fa-calendar-check text-green-500"></i> المواعيد الضريبية المهمة</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>النوع</th><th>الموعد</th><th>الجهة</th></tr></thead>
                <tbody>
                  <tr><td>إقرار ضريبة الدخل/الزكاة</td><td>120 يوم من نهاية السنة المالية</td><td>هيئة الزكاة والضريبة والجمارك</td></tr>
                  <tr><td>إقرار ضريبة القيمة المضافة</td><td>نهاية الشهر التالي للفترة</td><td>هيئة الزكاة والضريبة والجمارك</td></tr>
                  <tr><td>ضريبة الاستقطاع</td><td>10 أيام من نهاية الشهر</td><td>هيئة الزكاة والضريبة والجمارك</td></tr>
                </tbody>
              </table>
            </div>
          </div>`
      },
      {
        id: 't2',
        title: 'ضريبة القيمة المضافة - تطبيق عملي',
        duration: '40 دقيقة',
        icon: 'fa-receipt',
        videoId: 'pmIxkbxGQ9E',
        videoTitle: 'الجانب التطبيقي لمحاسبة الضرائب',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-receipt text-green-500"></i> آلية عمل ضريبة القيمة المضافة</h3>
            <div class="info-box green">
              <p>ضريبة القيمة المضافة تُفرض في كل مرحلة من مراحل سلسلة التوريد، والمنشأة تدفع الفرق بين الضريبة المحصلة والضريبة المدفوعة.</p>
            </div>
            <h3><i class="fas fa-calculator text-blue-500"></i> حساب الضريبة المستحقة</h3>
            <div class="formula-box">
              <strong>الضريبة المستحقة = ضريبة المخرجات (المبيعات) - ضريبة المدخلات (المشتريات)</strong>
            </div>
            <div class="example-box">
              <p><strong>مثال شامل:</strong></p>
              <p>مبيعات الشهر: 200,000 ريال × 15% = ضريبة مخرجات 30,000</p>
              <p>مشتريات الشهر: 120,000 ريال × 15% = ضريبة مدخلات 18,000</p>
              <p>الضريبة المستحقة = 30,000 - 18,000 = <strong>12,000 ريال</strong></p>
            </div>
            <h3><i class="fas fa-file-invoice text-orange-500"></i> متطلبات الفاتورة الضريبية</h3>
            <ul class="styled-list">
              <li>اسم وعنوان المورد والرقم الضريبي</li>
              <li>اسم وعنوان المشتري والرقم الضريبي</li>
              <li>تاريخ الإصدار ورقم تسلسلي</li>
              <li>وصف السلع/الخدمات والكميات والأسعار</li>
              <li>نسبة ومبلغ الضريبة</li>
              <li>الإجمالي شاملاً الضريبة</li>
              <li>رمز QR Code (للفوترة الإلكترونية)</li>
            </ul>
          </div>`
      },
      {
        id: 't3',
        title: 'الفوترة الإلكترونية (فاتورة)',
        duration: '30 دقيقة',
        icon: 'fa-qrcode',
        videoId: '6nldIr3zW0g',
        videoTitle: 'الإجراءات الأولية للتدقيق الخارجي',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-qrcode text-blue-500"></i> نظام الفوترة الإلكترونية (فاتورة)</h3>
            <div class="info-box blue">
              <p>نظام الفوترة الإلكترونية هو إجراء يهدف إلى تحويل عملية إصدار الفواتير والإشعارات الورقية إلى عملية إلكترونية، وقد بدأ تطبيقه في المملكة العربية السعودية على مرحلتين.</p>
            </div>
            <h3><i class="fas fa-layer-group text-green-500"></i> مراحل التطبيق</h3>
            <div class="steps-list">
              <div class="step"><span class="step-num">1</span><p><strong>مرحلة الإصدار:</strong> إصدار الفواتير إلكترونياً عبر نظام متوافق</p></div>
              <div class="step"><span class="step-num">2</span><p><strong>مرحلة الربط والتكامل:</strong> ربط أنظمة الفوترة بمنصة هيئة الزكاة والضريبة</p></div>
            </div>
            <h3><i class="fas fa-check-circle text-green-500"></i> متطلبات الامتثال</h3>
            <ul class="styled-list">
              <li>استخدام نظام فوترة إلكتروني معتمد</li>
              <li>تضمين جميع الحقول الإلزامية</li>
              <li>التوقيع الإلكتروني للفواتير</li>
              <li>رمز الاستجابة السريعة QR</li>
              <li>الرقم التسلسلي الفريد لكل فاتورة</li>
            </ul>
          </div>`
      }
    ]
  },
  // ==================== PROFESSIONAL ====================
  {
    id: 'professional',
    title: 'المستوى الاحترافي',
    subtitle: 'الشهادات المهنية والبرامج المحاسبية',
    icon: 'fa-trophy',
    color: '#f97316',
    colorLight: '#ffedd5',
    lessons: [
      {
        id: 'p1',
        title: 'الشهادات المهنية في المحاسبة',
        duration: '30 دقيقة',
        icon: 'fa-certificate',
        videoId: '6IsANT01n7g',
        videoTitle: 'شهادة المدقق الداخلي المعتمد CIA',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-award text-yellow-500"></i> أهم الشهادات المهنية</h3>
            <div class="certs-grid">
              <div class="cert-card">
                <div class="cert-badge cpa">CPA</div>
                <h4>محاسب قانوني معتمد</h4>
                <p><strong>الجهة:</strong> AICPA (أمريكا)</p>
                <ul><li>4 أقسام اختبار</li><li>أكثر الشهادات اعترافاً عالمياً</li><li>متطلب: بكالوريوس + 150 ساعة أكاديمية</li></ul>
              </div>
              <div class="cert-card">
                <div class="cert-badge socpa">SOCPA</div>
                <h4>زمالة الهيئة السعودية</h4>
                <p><strong>الجهة:</strong> SOCPA (السعودية)</p>
                <ul><li>5 مواد اختبار</li><li>مطلوبة لممارسة المراجعة في السعودية</li><li>متطلب: بكالوريوس محاسبة</li></ul>
              </div>
              <div class="cert-card">
                <div class="cert-badge cma">CMA</div>
                <h4>محاسب إداري معتمد</h4>
                <p><strong>الجهة:</strong> IMA (أمريكا)</p>
                <ul><li>جزءان اختبار</li><li>التركيز على المحاسبة الإدارية</li><li>متطلب: بكالوريوس + خبرة سنتين</li></ul>
              </div>
              <div class="cert-card">
                <div class="cert-badge acca">ACCA</div>
                <h4>جمعية المحاسبين القانونيين</h4>
                <p><strong>الجهة:</strong> ACCA (بريطانيا)</p>
                <ul><li>13 مادة اختبار + خبرة عملية</li><li>معتمدة عالمياً</li><li>يمكن البدء بعد الثانوية</li></ul>
              </div>
              <div class="cert-card">
                <div class="cert-badge cia">CIA</div>
                <h4>مدقق داخلي معتمد</h4>
                <p><strong>الجهة:</strong> IIA (أمريكا)</p>
                <ul><li>3 أجزاء اختبار</li><li>الشهادة الأبرز في التدقيق الداخلي</li><li>متطلب: بكالوريوس</li></ul>
              </div>
              <div class="cert-card">
                <div class="cert-badge ifrs">DipIFRS</div>
                <h4>دبلومة المعايير الدولية</h4>
                <p><strong>الجهة:</strong> ACCA (بريطانيا)</p>
                <ul><li>اختبار واحد</li><li>متخصصة في IFRS</li><li>مناسبة لمن يعمل بالمعايير الدولية</li></ul>
              </div>
            </div>
          </div>`
      },
      {
        id: 'p2',
        title: 'البرامج المحاسبية',
        duration: '25 دقيقة',
        icon: 'fa-laptop-code',
        videoId: 'si-N7_ToXjw',
        videoTitle: 'إدارة محاسبة التكاليف في برنامج أودو',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-laptop-code text-blue-500"></i> أشهر البرامج المحاسبية</h3>
            <div class="grid-cards">
              <div class="mini-card"><i class="fas fa-calculator text-green-500"></i><strong>QuickBooks</strong><p>الأكثر استخداماً للشركات الصغيرة والمتوسطة</p></div>
              <div class="mini-card"><i class="fas fa-server text-blue-500"></i><strong>SAP</strong><p>نظام ERP شامل للشركات الكبرى</p></div>
              <div class="mini-card"><i class="fas fa-puzzle-piece text-purple-500"></i><strong>Odoo</strong><p>نظام مفتوح المصدر متكامل</p></div>
              <div class="mini-card"><i class="fas fa-table text-green-600"></i><strong>Microsoft Excel</strong><p>أداة أساسية لكل محاسب</p></div>
              <div class="mini-card"><i class="fas fa-cloud text-cyan-500"></i><strong>Xero</strong><p>محاسبة سحابية للشركات الصغيرة</p></div>
              <div class="mini-card"><i class="fas fa-file-invoice text-orange-500"></i><strong>قيود (Qoyod)</strong><p>برنامج محاسبة سحابي سعودي</p></div>
            </div>
            <h3><i class="fas fa-file-excel text-green-600"></i> أهم دوال Excel للمحاسبين</h3>
            <div class="table-container">
              <table>
                <thead><tr><th>الدالة</th><th>الاستخدام</th><th>المثال</th></tr></thead>
                <tbody>
                  <tr><td>SUM</td><td>جمع مجموعة أرقام</td><td>=SUM(A1:A10)</td></tr>
                  <tr><td>VLOOKUP</td><td>البحث في جدول</td><td>=VLOOKUP(A1,B:C,2,0)</td></tr>
                  <tr><td>IF</td><td>شرط منطقي</td><td>=IF(A1>0,"ربح","خسارة")</td></tr>
                  <tr><td>PMT</td><td>حساب القسط الدوري</td><td>=PMT(rate,nper,pv)</td></tr>
                  <tr><td>NPV</td><td>صافي القيمة الحالية</td><td>=NPV(rate,values)</td></tr>
                  <tr><td>IRR</td><td>معدل العائد الداخلي</td><td>=IRR(values)</td></tr>
                  <tr><td>SUMIF</td><td>جمع بشرط</td><td>=SUMIF(A:A,"مبيعات",B:B)</td></tr>
                  <tr><td>PIVOT TABLE</td><td>تلخيص البيانات</td><td>تحليل المبيعات حسب الفترة</td></tr>
                </tbody>
              </table>
            </div>
          </div>`
      },
      {
        id: 'p3',
        title: 'تمارين شاملة ومراجعة نهائية',
        duration: '45 دقيقة',
        icon: 'fa-tasks',
        videoId: 'mp69yYnmb_c',
        videoTitle: 'دورة محاسبة التكاليف المتقدمة',
        content: `
          <div class="content-section">
            <h3><i class="fas fa-dumbbell text-blue-500"></i> تمارين شاملة</h3>
            <div class="exercise-box">
              <h4>تمرين 1: إعداد قيود يومية</h4>
              <p>سجل القيود المحاسبية للعمليات التالية:</p>
              <ol>
                <li>بدأ أحمد مشروعه بإيداع 200,000 ريال في حساب المنشأة البنكي</li>
                <li>اشترى معدات بمبلغ 50,000 ريال، دفع نصف المبلغ نقداً والباقي على الحساب</li>
                <li>اشترى بضاعة بمبلغ 30,000 ريال نقداً</li>
                <li>باع بضاعة تكلفتها 20,000 ريال بمبلغ 35,000 ريال على الحساب</li>
                <li>دفع إيجار المحل 5,000 ريال نقداً</li>
              </ol>
            </div>
            <div class="exercise-box">
              <h4>تمرين 2: إعداد ميزان المراجعة</h4>
              <p>بعد ترحيل القيود السابقة إلى دفتر الأستاذ، أعد ميزان المراجعة.</p>
            </div>
            <div class="exercise-box">
              <h4>تمرين 3: تحليل نسب مالية</h4>
              <p>احسب النسب التالية من البيانات المعطاة:</p>
              <ul>
                <li>الأصول المتداولة: 150,000 | الخصوم المتداولة: 60,000</li>
                <li>المخزون: 40,000 | المبيعات: 500,000</li>
                <li>صافي الربح: 75,000 | حقوق الملكية: 300,000</li>
              </ul>
              <p>المطلوب: النسبة الجارية، النسبة السريعة، هامش الربح، العائد على حقوق الملكية</p>
            </div>
          </div>`
      }
    ]
  }
]

// ============================================================
// DATA: Glossary
// ============================================================
const glossary = [
  { term: 'الأصول', english: 'Assets', definition: 'الموارد الاقتصادية المملوكة للمنشأة والتي يُتوقع أن تحقق منافع اقتصادية مستقبلية' },
  { term: 'الخصوم', english: 'Liabilities', definition: 'الالتزامات المالية المستحقة على المنشأة تجاه الغير' },
  { term: 'حقوق الملكية', english: 'Owner\'s Equity', definition: 'حقوق أصحاب المنشأة في أصولها بعد خصم الخصوم' },
  { term: 'الإيرادات', english: 'Revenue', definition: 'الدخل المتحقق من ممارسة النشاط الرئيسي للمنشأة' },
  { term: 'المصروفات', english: 'Expenses', definition: 'التكاليف المتكبدة في سبيل تحقيق الإيرادات' },
  { term: 'القيد المزدوج', english: 'Double Entry', definition: 'نظام تسجيل يتطلب أن يكون لكل عملية طرفان: مدين ودائن متساويان' },
  { term: 'دفتر اليومية', english: 'Journal', definition: 'السجل الأول الذي تُقيد فيه العمليات المالية بترتيب زمني' },
  { term: 'دفتر الأستاذ', english: 'Ledger', definition: 'السجل الذي تُبوب فيه العمليات حسب الحسابات' },
  { term: 'ميزان المراجعة', english: 'Trial Balance', definition: 'كشف يحتوي على أرصدة جميع الحسابات للتأكد من تساوي المدين والدائن' },
  { term: 'قائمة الدخل', english: 'Income Statement', definition: 'تقرير مالي يُظهر إيرادات ومصروفات المنشأة وصافي الربح أو الخسارة' },
  { term: 'الميزانية العمومية', english: 'Balance Sheet', definition: 'قائمة تُظهر المركز المالي للمنشأة في لحظة معينة' },
  { term: 'التدفقات النقدية', english: 'Cash Flow', definition: 'حركة النقد الداخل والخارج من المنشأة' },
  { term: 'الإهلاك', english: 'Depreciation', definition: 'التوزيع المنتظم لتكلفة الأصل الثابت على عمره الإنتاجي' },
  { term: 'المدين', english: 'Debit', definition: 'الطرف الأيسر من الحساب، يمثل زيادة في الأصول والمصروفات' },
  { term: 'الدائن', english: 'Credit', definition: 'الطرف الأيمن من الحساب، يمثل زيادة في الخصوم والإيرادات وحقوق الملكية' },
  { term: 'رأس المال', english: 'Capital', definition: 'المبلغ الذي يستثمره صاحب المنشأة في بداية النشاط' },
  { term: 'المخزون', english: 'Inventory', definition: 'البضاعة المتاحة للبيع أو المواد الخام للتصنيع' },
  { term: 'الشهرة', english: 'Goodwill', definition: 'أصل غير ملموس يمثل الفرق بين سعر شراء المنشأة وصافي أصولها العادلة' },
  { term: 'نقطة التعادل', english: 'Break-Even Point', definition: 'حجم المبيعات الذي تتساوى عنده الإيرادات مع التكاليف' },
  { term: 'المعايير الدولية', english: 'IFRS', definition: 'المعايير الدولية لإعداد التقارير المالية الصادرة عن IASB' },
  { term: 'المبادئ المحاسبية', english: 'GAAP', definition: 'المبادئ المحاسبية المقبولة عموماً' },
  { term: 'العائد على حقوق الملكية', english: 'ROE', definition: 'نسبة صافي الربح إلى حقوق الملكية، تقيس كفاءة استخدام أموال المالكين' },
  { term: 'العائد على الأصول', english: 'ROA', definition: 'نسبة صافي الربح إلى إجمالي الأصول، تقيس كفاءة استخدام الأصول' },
  { term: 'التسويات الجردية', english: 'Adjusting Entries', definition: 'قيود نهاية الفترة لتحديث الحسابات وتطبيق مبدأ الاستحقاق' },
  { term: 'التكلفة المتغيرة', english: 'Variable Cost', definition: 'تكلفة تتغير طردياً مع تغير حجم الإنتاج أو النشاط' },
  { term: 'التكلفة الثابتة', english: 'Fixed Cost', definition: 'تكلفة لا تتغير مع تغير حجم الإنتاج ضمن المدى الملائم' },
  { term: 'الموازنة التقديرية', english: 'Budget', definition: 'خطة مالية مستقبلية تُعبر عن أهداف المنشأة بالأرقام' },
  { term: 'الأهمية النسبية', english: 'Materiality', definition: 'المبلغ الذي يؤثر حذفه أو تحريفه على قرارات مستخدمي القوائم المالية' },
  { term: 'هامش المساهمة', english: 'Contribution Margin', definition: 'الفرق بين سعر البيع والتكلفة المتغيرة للوحدة' },
  { term: 'محاسبة التحوط', english: 'Hedge Accounting', definition: 'معالجة محاسبية خاصة لتقليل تقلبات الأرباح من أدوات التحوط' },
]

// ============================================================
// DATA: Quizzes
// ============================================================
const quizzes = [
  {
    levelId: 'beginner',
    title: 'اختبار المستوى المبتدئ',
    questions: [
      { q: 'ما هي المعادلة المحاسبية الأساسية؟', options: ['الأصول = الخصوم + حقوق الملكية', 'الأصول = الإيرادات - المصروفات', 'الأصول + الخصوم = حقوق الملكية', 'الإيرادات = المصروفات + الربح'], correct: 0 },
      { q: 'أي من التالي يُعد أصلاً؟', options: ['القروض البنكية', 'رأس المال', 'النقدية', 'الإيرادات'], correct: 2 },
      { q: 'ما هي طبيعة حساب المصروفات؟', options: ['دائنة', 'مدينة', 'مختلطة', 'محايدة'], correct: 1 },
      { q: 'ما هو دفتر اليومية؟', options: ['كشف بأرصدة الحسابات', 'سجل القيود بترتيب زمني', 'تقرير مالي سنوي', 'قائمة الدخل'], correct: 1 },
      { q: 'عند شراء بضاعة نقداً، ما هو الطرف الدائن؟', options: ['المشتريات', 'النقدية', 'المبيعات', 'البضاعة'], correct: 1 },
      { q: 'ميزان المراجعة يُعد لغرض:', options: ['حساب الربح', 'التأكد من تساوي المدين والدائن', 'تحديد الضرائب', 'تسجيل القيود'], correct: 1 },
      { q: 'ما هو مبدأ القيد المزدوج؟', options: ['تسجيل العملية مرتين', 'لكل عملية طرف مدين ودائن متساويان', 'مراجعة القيود مرتين', 'تسجيل في دفترين مختلفين'], correct: 1 },
      { q: 'أي من التالي يُعد خصماً؟', options: ['المعدات', 'المدينون', 'الدائنون', 'المخزون'], correct: 2 },
      { q: 'ما هي طبيعة حساب الإيرادات؟', options: ['مدينة', 'دائنة', 'مختلطة', 'ثابتة'], correct: 1 },
      { q: 'عند زيادة رأس المال نقداً، ما الحساب المدين؟', options: ['رأس المال', 'النقدية', 'الإيرادات', 'حقوق الملكية'], correct: 1 },
    ]
  },
  {
    levelId: 'intermediate',
    title: 'اختبار المستوى المتوسط',
    questions: [
      { q: 'ما المقصود بمبدأ الاستحقاق؟', options: ['تسجيل العمليات عند الدفع النقدي', 'تسجيل الإيرادات والمصروفات عند تحققها بغض النظر عن النقد', 'تسجيل فقط العمليات النقدية', 'تأجيل تسجيل المصروفات'], correct: 1 },
      { q: 'أي قائمة تُظهر المركز المالي في لحظة معينة؟', options: ['قائمة الدخل', 'الميزانية العمومية', 'التدفقات النقدية', 'التغيرات في حقوق الملكية'], correct: 1 },
      { q: 'ما هي التسويات الجردية؟', options: ['قيود إغلاق الحسابات', 'قيود تحديث الحسابات نهاية الفترة', 'قيود افتتاح الحسابات', 'قيود التصحيح'], correct: 1 },
      { q: 'ما هو الإهلاك؟', options: ['نقص قيمة المخزون', 'توزيع تكلفة الأصل على عمره الإنتاجي', 'خسارة في قيمة الاستثمارات', 'نقص في النقدية'], correct: 1 },
      { q: 'أي طريقة لتقييم المخزون غير مقبولة وفق IFRS؟', options: ['FIFO', 'المتوسط المرجح', 'LIFO', 'التكلفة المحددة'], correct: 2 },
      { q: 'قائمة التدفقات النقدية تُقسم إلى:', options: ['تشغيلية واستثمارية فقط', 'تشغيلية واستثمارية وتمويلية', 'جارية وطويلة الأجل', 'إيرادات ومصروفات'], correct: 1 },
      { q: 'المصروف المقدم يُصنف كـ:', options: ['خصم متداول', 'أصل متداول', 'مصروف في قائمة الدخل', 'حقوق ملكية'], correct: 1 },
      { q: 'الإيراد المستحق يُصنف كـ:', options: ['إيراد في قائمة الدخل', 'خصم متداول', 'أصل متداول', 'حقوق ملكية'], correct: 2 },
    ]
  },
  {
    levelId: 'advanced',
    title: 'اختبار المستوى المتقدم',
    questions: [
      { q: 'ما هي النسبة الجارية إذا كانت الأصول المتداولة 200,000 والخصوم المتداولة 80,000؟', options: ['1.5', '2.0', '2.5', '3.0'], correct: 2 },
      { q: 'ما هو معيار IFRS 15؟', options: ['عقود الإيجار', 'الإيراد من العقود مع العملاء', 'الأدوات المالية', 'القوائم الموحدة'], correct: 1 },
      { q: 'نسبة الزكاة على عروض التجارة هي:', options: ['5%', '2.5%', '10%', '15%'], correct: 1 },
      { q: 'متى تُعد القوائم المالية الموحدة؟', options: ['عند امتلاك 25% من الأسهم', 'عند امتلاك أكثر من 50% أو السيطرة', 'لكل الشركات', 'عند الطلب فقط'], correct: 1 },
      { q: 'ما هو العائد على حقوق الملكية (ROE) إذا كان صافي الربح 50,000 وحقوق الملكية 200,000؟', options: ['20%', '25%', '30%', '40%'], correct: 1 },
      { q: 'وفقاً لـ IFRS 9، كم فئة لتصنيف الأصول المالية؟', options: ['2', '3', '4', '5'], correct: 1 },
      { q: 'نسبة ضريبة القيمة المضافة في السعودية هي:', options: ['5%', '10%', '15%', '20%'], correct: 2 },
      { q: 'ما هو الإطار المفاهيمي لـ IFRS؟', options: ['معيار محاسبي', 'أساس نظري للمعايير', 'تقرير مالي', 'قائمة مالية'], correct: 1 },
    ]
  },
  {
    levelId: 'cost-accounting',
    title: 'اختبار محاسبة التكاليف',
    questions: [
      { q: 'ما هي عناصر تكلفة الإنتاج؟', options: ['مواد + أجور + مصروفات بيعية', 'مواد مباشرة + أجور مباشرة + ت. صناعية غير مباشرة', 'مواد + إيجار + كهرباء', 'أجور + إهلاك'], correct: 1 },
      { q: 'التكلفة الثابتة هي:', options: ['تتغير مع حجم الإنتاج', 'لا تتغير ضمن المدى الملائم', 'تتغير عكسياً مع الإنتاج', 'ليس لها علاقة بالإنتاج'], correct: 1 },
      { q: 'نقطة التعادل تعني:', options: ['أقصى ربح', 'لا ربح ولا خسارة', 'أقل خسارة', 'أعلى مبيعات'], correct: 1 },
      { q: 'نظام تكاليف الأوامر يُستخدم في:', options: ['الإنتاج المستمر', 'الإنتاج حسب الطلب', 'كل أنواع الإنتاج', 'الخدمات فقط'], correct: 1 },
      { q: 'إذا كانت التكاليف الثابتة 60,000 وهامش المساهمة 20 ريال/وحدة، كم نقطة التعادل؟', options: ['2,000 وحدة', '3,000 وحدة', '4,000 وحدة', '5,000 وحدة'], correct: 1 },
      { q: 'الوحدات المعادلة تُستخدم في:', options: ['نظام الأوامر', 'نظام المراحل', 'كلا النظامين', 'لا تُستخدم'], correct: 1 },
    ]
  },
  {
    levelId: 'managerial',
    title: 'اختبار المحاسبة الإدارية',
    questions: [
      { q: 'المحاسبة الإدارية تخدم بشكل رئيسي:', options: ['المستثمرين', 'الإدارة الداخلية', 'الدائنين', 'الجهات الحكومية'], correct: 1 },
      { q: 'الموازنة التقديرية هي:', options: ['تقرير عن الأداء السابق', 'خطة مالية مستقبلية', 'قائمة مالية رسمية', 'تقرير ضريبي'], correct: 1 },
      { q: 'تحليل الانحرافات يقارن بين:', options: ['السنة الحالية والسابقة', 'الأداء الفعلي والمعياري', 'الإيرادات والمصروفات', 'الأصول والخصوم'], correct: 1 },
      { q: 'التكلفة ذات الصلة بالقرار هي:', options: ['التكلفة الغارقة', 'التكلفة المستقبلية المختلفة بين البدائل', 'التكلفة الثابتة', 'التكلفة التاريخية'], correct: 1 },
      { q: 'انحراف ملائم يعني:', options: ['الفعلي أكبر من المعياري', 'الفعلي أقل من المعياري', 'لا فرق', 'الأداء أفضل من المخطط'], correct: 3 },
    ]
  },
  {
    levelId: 'auditing',
    title: 'اختبار المراجعة والتدقيق',
    questions: [
      { q: 'الهدف الرئيسي من المراجعة الخارجية:', options: ['اكتشاف الغش', 'إبداء رأي حول عدالة القوائم المالية', 'حساب الضرائب', 'تحسين الأداء'], correct: 1 },
      { q: 'مكونات COSO للرقابة الداخلية عددها:', options: ['3', '4', '5', '6'], correct: 2 },
      { q: 'مثلث الغش يتكون من:', options: ['ضغط + فرصة + تبرير', 'نية + فعل + نتيجة', 'سرقة + تزوير + إخفاء', 'ضعف + جهل + إهمال'], correct: 0 },
      { q: 'الأهمية النسبية (Materiality) تعني:', options: ['أهمية المراجع', 'المبلغ المؤثر على قرارات المستخدمين', 'حجم الشركة', 'عدد المعاملات'], correct: 1 },
      { q: 'الرأي النظيف يعني:', options: ['الشركة لا تغش', 'القوائم تعبر بعدالة عن المركز المالي', 'لا توجد أخطاء إطلاقاً', 'المراجع راضٍ تماماً'], correct: 1 },
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
  return c.json({ ...lesson, levelTitle: level.title, levelColor: level.color })
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
// MAIN HTML
// ============================================================
const mainHTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>أكاديمية المحاسبة المالية | من الصفر إلى الاحتراف</title>
  <meta name="description" content="تعلم المحاسبة المالية من الصفر إلى الاحتراف - دروس شاملة ومساقات متنوعة مع فيديوهات تعليمية واختبارات تفاعلية ومعجم محاسبي وآلة حاسبة محاسبية">
  <meta name="keywords" content="محاسبة, محاسبة مالية, تعلم المحاسبة, قوائم مالية, IFRS, CPA, SOCPA, محاسبة تكاليف, محاسبة إدارية, مراجعة وتدقيق, محاسبة ضريبية">
  <meta property="og:title" content="أكاديمية المحاسبة المالية">
  <meta property="og:description" content="تعلم المحاسبة من الصفر إلى الاحتراف مع 8 مساقات و30+ درس وفيديوهات تعليمية">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧮</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: { fontFamily: { sans: ['Tajawal', 'sans-serif'] } } }
    }
  </script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/style.css">
</head>
<body class="bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-300">
  <!-- Top Navigation -->
  <nav class="sticky top-0 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-sm border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3 cursor-pointer" onclick="showHome()">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg shadow-lg">
          <i class="fas fa-graduation-cap"></i>
        </div>
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-white leading-tight">أكاديمية المحاسبة</h1>
          <p class="text-xs text-gray-500 dark:text-gray-400">من الصفر إلى الاحتراف</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="showSection('search')" class="nav-btn" title="بحث"><i class="fas fa-search"></i></button>
        <button onclick="showSection('glossary')" class="nav-btn" title="المعجم"><i class="fas fa-book"></i></button>
        <button onclick="showSection('calculator')" class="nav-btn" title="الآلة الحاسبة"><i class="fas fa-calculator"></i></button>
        <button onclick="toggleProgress()" class="nav-btn" title="تقدمي"><i class="fas fa-chart-pie"></i></button>
        <button onclick="toggleDarkMode()" class="nav-btn" title="الوضع الداكن"><i class="fas fa-moon" id="darkModeIcon"></i></button>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main id="mainContent" class="max-w-7xl mx-auto px-4 py-6"></main>

  <!-- Progress Modal -->
  <div id="progressModal" class="modal-overlay hidden">
    <div class="modal-content">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold dark:text-white"><i class="fas fa-chart-pie text-emerald-500 ml-2"></i>تقدمي</h3>
        <button onclick="toggleProgress()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
      </div>
      <div id="progressContent"></div>
      <div class="mt-4 flex gap-2">
        <button onclick="exportProgress()" class="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition text-sm"><i class="fas fa-download ml-1"></i>تصدير</button>
        <button onclick="resetProgress()" class="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition text-sm"><i class="fas fa-trash ml-1"></i>إعادة تعيين</button>
      </div>
    </div>
  </div>

  <script src="/static/app.js"></script>
</body>
</html>`

// ============================================================
// Routes
// ============================================================
app.get('/', (c) => c.html(mainHTML))
app.get('/*', (c) => c.html(mainHTML))

export default app
