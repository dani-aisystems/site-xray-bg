import type { Metadata } from "next";
import { Suspense } from "react";
import { mockAudit } from "@/lib/mockAudit";
import type { Audit, CheckId, Finding } from "@/lib/types";

export const metadata: Metadata = {
  title: "Доклад за сайта · Site X-ray",
};

const CHECK_LABEL_BG: Record<CheckId, string> = {
  mobile_speed: "Бързина на телефон",
  lcp: "Колко бързо се показва съдържанието",
  https: "Защитена връзка",
  click_to_call: "Бутон за обаждане",
  contact_cta: "Контакт и резервация",
  meta_tags: "Как изглежда в Google",
  mobile_usability: "Удобство на телефон",
  local_signals: "Адрес и карта",
};

// Placeholders until Daniel sets the real CTA values in Vercel env.
const CTA_PHONE = process.env.NEXT_PUBLIC_CTA_PHONE || "+359880000000";
const CTA_VIBER = process.env.NEXT_PUBLIC_CTA_VIBER || "viber://chat?number=%2B359880000000";

function scoreTone(score: number) {
  if (score < 40) return { label: "Има сериозен напредък за правене", text: "text-red-700", ring: "border-red-200 bg-red-50" };
  if (score < 70) return { label: "Добра основа, има какво да се подобри", text: "text-amber-700", ring: "border-amber-200 bg-amber-50" };
  return { label: "Сайтът е в добра форма", text: "text-emerald-800", ring: "border-emerald-200 bg-emerald-50" };
}

function StatusIcon({ pass }: { pass: boolean | null }) {
  if (pass === null) {
    return <span aria-label="не може да се измери" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-sm font-bold text-stone-600">?</span>;
  }
  return pass ? (
    <span aria-label="в ред" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">✓</span>
  ) : (
    <span aria-label="има проблем" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">✕</span>
  );
}

function CheckRow({ finding }: { finding: Finding }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <StatusIcon pass={finding.pass} />
      <div className="min-w-0">
        <p className="font-medium">{CHECK_LABEL_BG[finding.id]}</p>
        <p className="text-sm text-stone-600">
          {finding.pass === null ? "Не можахме да измерим това." : finding.evidence}
        </p>
      </div>
    </li>
  );
}

export default function ReportPage({ params }: PageProps<"/r/[id]">) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <Report params={params} />
    </Suspense>
  );
}

function ReportSkeleton() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <p className="text-stone-500">Зареждаме доклада…</p>
    </main>
  );
}

async function Report({ params }: { params: PageProps<"/r/[id]">["params"] }) {
  // Day 1: every id renders the mock. Real lookup + 404 arrive Day 4.
  await params;
  const audit: Audit = mockAudit;
  const tone = scoreTone(audit.score);
  const explanation = audit.explanation;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">Доклад за сайта</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">{audit.businessName}</h1>
        <p className="mt-1 break-all text-sm text-stone-500">{audit.url}</p>
      </header>

      <section className={`mt-6 rounded-2xl border p-5 ${tone.ring}`}>
        <div className="flex items-baseline gap-2">
          <span className={`text-6xl font-bold tabular-nums ${tone.text}`}>{audit.score}</span>
          <span className="text-xl text-stone-500">/ 100</span>
        </div>
        <p className={`mt-1 font-medium ${tone.text}`}>{tone.label}</p>
        {explanation && <p className="mt-4 text-lg leading-snug">{explanation.headline}</p>}
      </section>

      {explanation && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Какво ви струва клиенти</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {explanation.problems.map((p, i) => (
              <li key={p.findingId} className="rounded-2xl border border-stone-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white">{i + 1}</span>
                  <h3 className="text-lg font-semibold leading-snug">{p.title}</h3>
                </div>
                <p className="mt-3 text-stone-700">{p.impact}</p>
                <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
                  <span className="font-semibold">Как да го поправите: </span>
                  {p.fix}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-stone-700">{explanation.summary}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Пълна проверка</h2>
        <ul className="mt-2 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white px-5">
          {audit.findings.map((f) => (
            <CheckRow key={f.id} finding={f} />
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl bg-stone-900 p-5 text-white">
        <h2 className="text-xl font-bold">Искате ли да го поправим вместе?</h2>
        <p className="mt-2 text-stone-300">Пишете ни или се обадете — ще разгледаме сайта ви заедно.</p>
        <div className="mt-4 flex flex-col gap-3">
          <a href={CTA_VIBER} className="flex h-14 items-center justify-center rounded-xl bg-emerald-500 text-lg font-semibold text-stone-950">
            Пишете ни във Viber
          </a>
          <a href={`tel:${CTA_PHONE}`} className="flex h-14 items-center justify-center rounded-xl border border-stone-600 text-lg font-semibold">
            Обадете се
          </a>
        </div>
      </section>

      <footer className="mt-8 text-center text-xs text-stone-500">Site X-ray · DM Digital Partners, Пловдив</footer>
    </main>
  );
}
