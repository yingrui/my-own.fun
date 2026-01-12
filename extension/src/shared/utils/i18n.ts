import intl from "react-intl-universal";

export function locale(language: string): string {
  return language === "en" ? "en" : "zh";
}

export async function initI18n(language: string) {
  const locales = {
    en: await import("@src/locales/en-US.json"),
    zh: await import("@src/locales/zh-CN.json"),
  };

  await intl.init({ currentLocale: locale(language), locales });
}
