import {
  ArrowUpLeft,
  ArrowDown,
  Check,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
  ClipboardCheck,
  MessagesSquare,
  BriefcaseBusiness,
  CodeXml,
  Stethoscope,
  HardHat,
  Palette,
} from 'lucide-react';
import { Header, Footer } from '@/components/site-shell';
import { ApplicationForm } from '@/components/application-form';
import { assetPath } from '@/lib/asset-path';
export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="hero container">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> بوابتك المهنية في العراق وسوريا
            </div>
            <h1>
              طموحك يستحق
              <br />
              فرصة{' '}
              <span className="accent-word">
                أفضل
                <svg viewBox="0 0 210 20" aria-hidden="true">
                  <path d="M4 14Q95 -3 204 9" />
                </svg>
              </span>
              <span className="green">.</span>
            </h1>
            <p className="hero-description">
              ابدأ فرصتك المهنية معنا. عرّفنا بمهاراتك وخبراتك، ودعنا نساعدك على الوصول إلى الفرصة
              التي تناسبك.
            </p>
            <div className="hero-actions">
              <a className="button" href="#apply">
                قدّم طلبك الآن <ArrowUpLeft size={20} />
              </a>
              <a className="text-link" href="#about">
                تعرّف على منصتي <ArrowDown size={17} />
              </a>
            </div>
            <div className="hero-assurance">
              <span>
                <Check size={16} /> تقديم مجاني
              </span>
              <span>
                <Check size={16} /> لجميع التخصصات
              </span>
              <span>
                <Check size={16} /> بياناتك بأمان
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-grid" />
            <div className="image-frame">
              <img
                src={assetPath('/images/team.svg')}
                alt="رسم لفريق مهني يتعاون حول مكتب في بيئة عمل حديثة"
                width="620"
                height="540"
                fetchPriority="high"
              />
              <div className="image-caption">
                <span className="caption-dot" /> لكل طموح، بداية جديدة.
              </div>
            </div>
            <div className="floating-card opportunity">
              <span className="floating-icon">
                <BriefcaseBusiness size={23} />
              </span>
              <div>
                <strong>فرص تبدأ من هنا</strong>
                <span>مهاراتك تصنع الفرق</span>
              </div>
              <span className="small-check">
                <Check size={13} />
              </span>
            </div>
            <div className="floating-card location">
              <MapPin size={20} />
              <div>
                <strong>أقرب إلى مستقبلك</strong>
                <span>
                  العراق <span className="green">•</span> سوريا
                </span>
              </div>
            </div>
            <div className="art-spark">
              <Sparkles size={29} />
            </div>
            <div className="art-note">YOUR NEXT CHAPTER</div>
          </div>
        </section>
        <section className="professions">
          <div className="container profession-inner">
            <span>مساحة لكل موهبة</span>
            <div>
              <CodeXml /> التقنية والبرمجة
            </div>
            <div>
              <Stethoscope /> القطاع الصحي
            </div>
            <div>
              <HardHat /> الهندسة والمهن
            </div>
            <div>
              <Palette /> التصميم والإبداع
            </div>
            <div>
              <BriefcaseBusiness /> الإدارة والأعمال
            </div>
          </div>
        </section>
        <section id="about" className="container about-section">
          <div className="about-visual">
            <img
              src={assetPath('/images/growth.svg')}
              alt="رسم يرمز إلى نمو المهارات والوصول إلى فرصة مهنية"
              width="420"
              height="340"
              loading="lazy"
            />
            <div className="about-tag">
              <ShieldCheck size={19} /> مهارات حقيقية. بدايات واعدة.
            </div>
          </div>
          <div className="about-copy">
            <span className="section-kicker">من نحن</span>
            <h2>
              نقرّب المسافة بينك
              <br />
              وبين خطوتك القادمة.
            </h2>
            <p>
              نؤمن أن لكل شخص مهارة تستحق أن تُكتشف. تستقبل منصتي بيانات الباحثين عن العمل في العراق
              وسوريا، لتسهيل التواصل معهم عند توفر فرص تناسب خبراتهم وتخصصاتهم ومكان إقامتهم.
            </p>
            <p>سواء كنت في بداية مسيرتك أو تبحث عن فصل جديد، تبدأ رحلتك معنا بخطوة بسيطة.</p>
            <a className="text-link green" href="#apply">
              دعنا نتعرّف عليك <ArrowUpLeft size={18} />
            </a>
          </div>
        </section>
        <section className="journey container">
          <div className="section-heading">
            <div>
              <span className="section-kicker">رحلتك معنا</span>
              <h2>ثلاث خطوات. بداية جديدة.</h2>
            </div>
            <p>تقديم واضح وبسيط، من أول خطوة.</p>
          </div>
          <div className="journey-grid">
            {[
              {
                icon: UserRound,
                title: 'عرّفنا بنفسك',
                text: 'أضف بياناتك الأساسية وخبراتك ومهاراتك.',
              },
              {
                icon: ClipboardCheck,
                title: 'راجع بياناتك',
                text: 'تأكد من صحة معلوماتك قبل إرسال الطلب.',
              },
              {
                icon: MessagesSquare,
                title: 'كن على تواصل',
                text: 'نتواصل معك عند توفر فرصة تناسب ملفك.',
              },
            ].map((s, i) => (
              <div className="journey-item" key={s.title}>
                <span className="step-icon">
                  <s.icon size={23} />
                </span>
                <span className="step-number">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="apply" className="apply-section">
          <div className="container">
            <div className="section-heading centered">
              <span className="section-kicker">مستقبلك يبدأ بخطوة</span>
              <h2>لنبدأ بالتعرّف عليك.</h2>
              <p>املأ بياناتك بدقة، لنتمكن من التواصل معك عند توفر فرصة مناسبة.</p>
            </div>
            <ApplicationForm />
          </div>
        </section>
        <section className="container closing">
          <Sparkles size={27} />
          <h2>لكل مهارة مكان. ولكل طموح فرصة.</h2>
          <p>نحن هنا لنساعدك على اتخاذ خطوتك الأولى.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
