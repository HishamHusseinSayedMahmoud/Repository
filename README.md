# RealWorld-X: خطوات التشغيل من الموبايل

## الملفات
- `index.html`: اللعبة نفسها.
- `world.json`: حالة الواقع (بيتحدث تلقائيا كل ساعة).
- `config/egypt.json`: الإجازات المتغيرة والأحداث اللي تضيفها بنفسك.
- `scripts/fetch-world.mjs`: سكربت جلب البيانات.
- `.github/workflows/update-world.yml`: الجدولة التلقائية.

## الخطوات

1. افتح github.com واضغط **New repository**. الاسم: `realworld-x`. اخترها **Public**. فعّل **Add a README** ثم **Create**.
2. ادخل المستودع واضغط **Add file** ثم **Upload files**، وارفع `index.html` و`world.json`، ثم **Commit changes**.
3. لإنشاء الملفات اللي جوه مجلدات: **Add file** ثم **Create new file**. في خانة الاسم اكتب المسار كامل (الشرطة المائلة بتعمل المجلد تلقائيا)، والصق المحتوى، ثم **Commit**:
   - `config/egypt.json`
   - `scripts/fetch-world.mjs`
   - `.github/workflows/update-world.yml`
4. **Settings** ثم **Pages**. في Source اختر **Deploy from a branch**، الفرع `main` والمجلد `/ (root)`، ثم **Save**. بعد دقيقتين تقريبا هيظهر رابط اللعبة: `https://اسمك.github.io/realworld-x/`
5. **Actions**: لو طلب تفعيل، فعّله. اختر **update-world** ثم **Run workflow** لأول تشغيل يدوي. بعد ما يخلص افتح `world.json` وتأكد إن فيه سعر الدولار والطقس.
6. افتح رابط اللعبة. في تبويب **المدينة** هتلاقي بطاقة **الواقع الحي**: لو كلمة «متصل» ظهرت يبقى الربط شغال.

## لو حاجة ما اشتغلتش
- **Actions مش بتكتب الملف:** من Settings ثم Actions ثم General، في Workflow permissions اختر **Read and write permissions**.
- **اللعبة بتقول غير متصل:** تأكد إن المستودع Public وإن اسمه `realworld-x` أو أي اسم، وإن الفرع `main`.
- **مصدر وقف:** كل مصدر ليه حالة في `world.json` تحت `sources`. لو `ok: false` شوف `error`.

## إضافة حاجة بنفسك
في `config/egypt.json`:
- إجازة متغيرة: `"movableHolidays": [{ "date": "2026-12-01", "name": "اسم الإجازة" }]`
- حدث حقيقي: `"events": [{ "id": "fuel-1", "text": "رفع أسعار الوقود", "from": "2026-12-01", "to": "2026-12-03", "effects": { "costIdx": 0.05 }, "days": 3 }]`
  - `costIdx` يرفع تكلفة الإنتاج، و`wage` يغيّر الأجور، و`cust` يغيّر إقبال الزبائن. كل رقم له حد أقصى عشان حدث واحد ما يكسرش الاقتصاد.
  - لازم `id` مختلف لكل حدث.

## تنبيهات
- جدولة GitHub بتتأخر أحيانا بضع دقائق، وفي المستودعات العامة بتوقف لو ما فيش أي نشاط 60 يوم. لو وقفت افتح Actions وفعّلها تاني.
- الأعياد الثابتة بس هي المسجلة. الأعياد الدينية بتضيفها بنفسك عند إعلانها رسميا.
- الدولار بيتقارن بسعره **يوم أول تشغيل** (الملف `config/baseline.json` بيتعمل تلقائيا).
