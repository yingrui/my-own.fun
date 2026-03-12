import React, { useEffect, useMemo, useState } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";

interface AppThemeProviderProps {
  children: React.ReactNode;
}

const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setIsDark(event.matches);

    setIsDark(media.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const themeConfig = useMemo(
    () => ({
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: "#1677ff",
        colorBgLayout: isDark ? "#0f172a" : "#f6f8fb",
        colorBgContainer: isDark ? "#111827" : "#ffffff",
        colorBorder: isDark ? "#374151" : "#e5e7eb",
        borderRadius: 10,
        borderRadiusSM: 6,
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
    }),
    [isDark],
  );

  return (
    <ConfigProvider theme={themeConfig}>
      {children}
    </ConfigProvider>
  );
};

export default AppThemeProvider;
