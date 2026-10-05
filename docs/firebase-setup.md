# ربط منصتي بـFirebase ضمن الخدمات المجانية

المشروع المستهدف: `sgyqkl`. الخطوات هنا تستخدم **Firestore Standard / Native mode** على **Spark** لقاعدة البيانات، و**Render Free Web Service** لخادم Next.js. لا تستخدم App Hosting أو Functions أو Storage ولا تتطلب منا تفعيل فوترة Google. إنشاء إعدادات الويب في Firebase لا يعني أن قاعدة البيانات أُنشئت أو أن الموقع نُشر.

## 1. إنشاء Firestore

1. افتح [قاعدة بيانات مشروعك](https://console.firebase.google.com/project/sgyqkl/firestore).
2. اختر Create database، ثم Standard edition / Native mode وقاعدة `(default)`.
3. اختر الموقع الجغرافي المناسب لبياناتك، ووضع **Production mode**. لا تستخدم Test mode المفتوح.
4. أبقِ خطة المشروع **Spark**. إذا طلبت خطوة تفعيل Blaze أو بطاقة دفع، توقف ولا تنفّذها ضمن هذا المسار.

من Rules، انشر محتوى `firestore.rules`. تمنع هذه القواعد القراءة والكتابة من جميع عملاء المتصفح، حتى إذا عرف أحدهم apiKey أو سجّل الدخول عبر Firebase Authentication. الخادم وحده يدخل باستخدام Admin SDK وIAM، وتبقى صلاحيات الإدارة والتحقق من النموذج وحدود المحاولات في الخادم.

## 2. صلاحية الخادم

معلومات `firebaseConfig` مثل `apiKey` و`authDomain` و`appId` مخصصة لتعريف تطبيق الويب وليست كلمة مرور الإدارة أو مفتاح وصول للخادم. لا نحتاج Analytics لجمع الطلبات، لذلك لم نضف تتبعاً للزوار.

استخدم حساب خدمة لهذا المشروع يملك صلاحيات Firestore اللازمة، مثل **Cloud Datastore User**؛ لا يحتاج التطبيق صلاحية Owner. لإدارة مفاتيح الحسابات، افتح Project settings → Service accounts في Firebase أو صفحة Service Accounts في Google Cloud. خزّن ملف المفتاح JSON محلياً داخل:

```text
.secrets/firebase-service-account.json
```

لا تلصق المفتاح في المحادثات أو المستودع أو كود المتصفح. مجلد `.secrets` وأنماط ملفات مفاتيح Firebase مستثناة من Git. إعداد `.env.local` للتشغيل المحلي:

```dotenv
DATABASE_PROVIDER=firestore
FIREBASE_PROJECT_ID=sgyqkl
GOOGLE_APPLICATION_CREDENTIALS=./.secrets/firebase-service-account.json
APP_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
TRUST_PROXY=false
```

بديل المفتاح المحلي: Application Default Credentials من Google Cloud CLI، مع حساب يملك صلاحيات المشروع:

```bash
gcloud auth application-default login
```

لا تضع `FIRESTORE_EMULATOR_HOST` عند الاتصال بقاعدة حقيقية. ثم تحقّق باتصال للقراءة فقط:

```bash
npm run firebase:check
```

الأمر لا ينشئ طلبات ولا يعرض معلومات متقدمين أو أسراراً. لا تعتبر الربط مكتملاً حتى ينجح فعلياً.

## 3. حساب الإدارة والفهارس

ضع اسم المستخدم وكلمة المرور مؤقتاً في `.env.local` كما في README ثم:

```bash
npm run admin:create
```

ينشئ الحساب في **مصدر البيانات المحدد حالياً**. لا يوجد حساب عام تلقائي ولا حساب اختبار في قاعدة `sgyqkl`. يمكنك اختيار نفس اسم المستخدم المحلي. أزل كلمة المرور من البيئة بعد الإنشاء. تغيير كلمة المرور يبطل الجلسات السابقة، بما فيها جلسة دخول متزامنة باستخدام كلمة المرور القديمة.

لنشر قواعد الحماية والفهارس باستخدام حساب مالك المشروع:

```bash
npx firebase login
npm run firebase:rules
```

الأمر ينشر **Firestore فقط**؛ لا ينشر استضافة ولا يغيّر خطة الفوترة. راجع القواعد الموجودة قبل استبدالها إن كان المشروع يحتوي تطبيقات أخرى. حساب الخدمة المستخدم للتطبيق ليس بالضرورة مخولاً بنشر الفهارس؛ استخدم حسابك الإداري لهذا الأمر.

انتظر وصول الفهارس في Firestore → Indexes إلى حالة Enabled، ثم جرّب الفلاتر والبحث. تعتمد الفلاتر المركبة على index merging الموثق في Firestore. المحاكي لا يتحقق من وجود الفهارس المركبة، ولذلك يبقى التحقق على القاعدة الحقيقية ضرورياً.

## 4. نشر خادم الموقع مجاناً

1. سجّل في Render واربط GitHub.
2. استخدم New → Blueprint واختر `smacskoaw/my-project`. الملف `render.yaml` يحدد **plan: free** صراحة.
3. في الحقل السري `FIREBASE_SERVICE_ACCOUNT_JSON`، ضع محتوى ملف حساب الخدمة عبر لوحة Render فقط. لا تضعه في `render.yaml`.
4. أبقِ بقية القيم كما هي: `DATABASE_PROVIDER=firestore`، `FIREBASE_PROJECT_ID=sgyqkl`، و`COOKIE_SECURE=true`. يُولّد `RATE_LIMIT_SECRET` آلياً داخل الاستضافة.
5. يقرأ الخادم رابط Render من `RENDER_EXTERNAL_URL` ويتحقق من Origin بناءً عليه. عند إضافة دومين خاص عيّن `APP_ORIGIN` إلى رابط HTTPS لذلك الدومين.
6. بعد نجاح البناء والنشر، افتح الموقع وأرسل طلباً تجريبياً، ثم ادخل الإدارة وتأكد من ظهور الطلب وحالته والبحث عنه. احذف الطلب التجريبي بعد التحقق.

بدلاً من JSON في متغير بيئة، يمكن رفع ملف Secret File في Render وتعيين `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-service-account.json`؛ استخدم طريقة واحدة فقط. اسم المستخدم وكلمة مرور الإدارة لا يلزم وضعهما في الاستضافة بعد إنشاء حساب Firestore من جهازك.

لا تُنشئ PostgreSQL على Render، ولا Disk ولا Cron في هذا الإعداد. التخزين المحلي على الاستضافة المجانية غير دائم، ولهذا تحفظ جميع الطلبات والجلسات وحدود المحاولات في Firestore.

## حدود المجاني وسلوك البحث

- Spark له حصص للقراءة والكتابة والتخزين، وليس استخداماً غير محدود. معاملات الحفظ والإحصاءات والجلسات تستهلك عمليات أيضاً.
- خدمة Render المجانية تتوقف مؤقتاً عند الخمول وقد تتأخر أول زيارة بعدها. لا يعني ذلك فقدان الطلبات المحفوظة في Firestore.
- البحث في Firestore يدعم بداية الاسم الكامل وبداية أي كلمة فيه؛ والبحث بالهاتف يدعم الصيغة المحلية والأرقام العربية وأجزاء الرقم. يختلف بحث الاسم عن بحث substring الكامل في PostgreSQL.
- تعرض الصفحة 12 طلباً. تستخدم الصفحات الرقمية offset؛ الانتقال إلى صفحات متقدمة يستهلك قراءات للعناصر المتخطاة أيضاً. الإحصاءات الأساسية تُحدّث داخل معاملات الحفظ والحذف لتجنب تحميل جميع الطلبات.
- تعديل الوثائق يدوياً أو حذفها من Console يتجاوز تحديث العدادات والفهارس النصية. استخدم لوحة الإدارة للعمليات المعتادة.
- بيانات الطلبات الخاصة ليست متاحة في Firestore للمتصفح. كل استدعاءات الإدارة تتطلب جلسة الخادم.

يمكن تنظيف السجلات المنتهية للجلسات وحدود المحاولات يدوياً، دون تفعيل TTL مدفوع أو Cron مدفوع:

```bash
npm run firebase:cleanup
```

يحذف الأمر حتى 400 سجل منتهٍ منذ أكثر من يوم من كل نوع، ولا يحذف المتقدمين. راقب الحصص من Firebase Console قبل التوسع.

## الاختبارات المحلية

ثبّت Java 21 لتشغيل محاكي Firestore. لا تستخدم اختبارات Firebase مشروعك الحقيقي:

```bash
npm test
npm run test:firestore
npm run test:e2e:firestore
npm run build
```

الاختبارات تستخدم مشروعاً وهمياً `demo-minassati` ومحاكياً على `127.0.0.1:8080`. ترفض أدوات البذر أي عنوان بعيد أو مشروع حقيقي. أوقف خادمك على المنفذ 3000 قبل اختبارات المتصفح. `npm run test:e2e` يختبر مصدر PostgreSQL المحلي بصورة منفصلة. لا يُحذف أي شيء من `data/minassati`.

## مصادر رسمية

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [حصص Firestore وتكاليفه](https://firebase.google.com/docs/firestore/pricing)
- [فهارس Firestore ودمجها](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [App Hosting يتطلب Blaze](https://firebase.google.com/docs/app-hosting/costs)
- [حدود Render المجاني](https://render.com/docs/free)
- [متغيرات Render والملفات السرية](https://render.com/docs/configure-environment-variables)
