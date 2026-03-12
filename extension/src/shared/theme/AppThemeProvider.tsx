import React from "react";
import { ConfigProvider } from "antd";

interface AppThemeProviderProps {
  children: React.ReactNode;
}

const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          colorBgLayout: "#f6f8fb",
          colorBgContainer: "#ffffff",
          colorBorder: "#e5e7eb",
          borderRadius: 10,
          borderRadiusSM: 6,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

export default AppThemeProvider;
