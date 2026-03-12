import React, { useEffect, useMemo, useState } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import configureStorage from "@src/shared/storages/gluonConfig";
import useStorage from "@src/shared/hooks/useStorage";

interface AppThemeProviderProps {
  children: React.ReactNode;
}

const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  const config = useStorage(configureStorage);
  const themeMode = config.themeMode ?? "auto";
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

  const resolvedDark = themeMode === "dark" ? true : themeMode === "light" ? false : isDark;

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "auto") {
      delete root.dataset.themeMode;
    } else {
      root.dataset.themeMode = themeMode;
    }
  }, [themeMode]);

  const themeConfig = useMemo(
    () => ({
      algorithm: resolvedDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: "#1677ff",
        colorBgLayout: resolvedDark ? "#0f172a" : "#f6f8fb",
        colorBgContainer: resolvedDark ? "#111827" : "#ffffff",
        colorBorder: resolvedDark ? "#374151" : "#e5e7eb",
        borderRadius: 10,
        borderRadiusSM: 6,
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
    }),
    [resolvedDark],
  );

  return (
    <ConfigProvider theme={themeConfig}>
      {children}
    </ConfigProvider>
  );
};

export default AppThemeProvider;
