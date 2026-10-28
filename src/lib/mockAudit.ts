import type { Audit } from "./types";

// Day 1 visual target for /r/[id]. Fictional business, fictional domain.
// Score = sum of weights of passed checks: https 10 + meta_tags 10 + mobile_usability 10 = 30.
export const mockAudit: Audit = {
  id: "demo",
  url: "https://lavandula-plovdiv.example",
  finalUrl: "https://lavandula-plovdiv.example/",
  businessName: "Салон „Лавандула“",
  createdAt: "2026-10-29T09:00:00.000Z",
  score: 30,
  findings: [
    {
      id: "mobile_speed",
      pass: false,
      severity: "high",
      evidence: "Оценка за скорост на телефон 34 от 100",
      value: 34,
      fallbackTextBg: "Сайтът се зарежда бавно на телефон.",
    },
    {
      id: "lcp",
      pass: false,
      severity: "high",
      evidence: "Основното съдържание се показва след 6.2 секунди",
      value: 6.2,
      fallbackTextBg: "Основното съдържание се показва твърде бавно.",
    },
    {
      id: "https",
      pass: true,
      severity: "medium",
      evidence: "Сайтът е на защитена връзка (https)",
      fallbackTextBg: "Сайтът използва защитена връзка.",
    },
    {
      id: "click_to_call",
      pass: false,
      severity: "high",
      evidence: "Няма бутон за директно обаждане на началната страница",
      fallbackTextBg: "Клиентите не могат да се обадят с едно докосване.",
    },
    {
      id: "contact_cta",
      pass: false,
      severity: "high",
      evidence: "Няма форма, връзка за резервация или бутон за контакт",
      fallbackTextBg: "Няма ясен начин за връзка или резервация.",
    },
    {
      id: "meta_tags",
      pass: true,
      severity: "medium",
      evidence: "Има заглавие и описание за търсачките",
      fallbackTextBg: "Страницата има заглавие и описание в Google.",
    },
    {
      id: "mobile_usability",
      pass: true,
      severity: "medium",
      evidence: "Страницата се наглася към екрана на телефона",
      fallbackTextBg: "Страницата е пригодена за телефон.",
    },
    {
      id: "local_signals",
      pass: false,
      severity: "low",
      evidence: "Няма адрес, карта или данни за местен бизнес",
      fallbackTextBg: "Не личи къде се намирате.",
    },
  ],
  explanation: {
    headline:
      "Клиентите, които ви търсят от телефон, чакат дълго и не намират лесен начин да ви се обадят.",
    problems: [
      {
        findingId: "mobile_speed",
        title: "Сайтът се отваря бавно на телефон",
        impact:
          "Оценката ви за скорост е 34 от 100, а част от посетителите си тръгват, преди страницата да се покаже.",
        fix: "Намалете размера на снимките и махнете ненужните добавки, за да се отваря по-бързо.",
      },
      {
        findingId: "click_to_call",
        title: "Няма бутон за обаждане",
        impact:
          "Клиентите от телефон трябва да препишат номера ръчно и често се отказват.",
        fix: "Добавете бутон „Обадете се“, който набира номера с едно докосване.",
      },
      {
        findingId: "contact_cta",
        title: "Няма лесен начин да запазят час",
        impact:
          "Който иска да резервира вечерта или в почивен ден, няма къде да остави заявка и избира друг салон.",
        fix: "Сложете на видно място бутон за резервация или кратка форма с име и телефон.",
      },
    ],
    summary:
      "Салонът ви има добра основа: сайтът е защитен и се вижда добре на телефон. Три малки промени ще направят връзката с вас много по-лесна.",
  },
};
