import React from "react";
import { Button, Layout } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import "./index.css";

const { Sider } = Layout;

interface AppShellProps {
  siderId?: string;
  sider?: React.ReactNode;
  content: React.ReactNode;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  siderWidth?: number;
  collapsedWidth?: number;
}

const AppShell: React.FC<AppShellProps> = ({
  siderId,
  sider,
  content,
  collapsed,
  onToggleCollapsed,
  siderWidth = 280,
  collapsedWidth = 64,
}) => {
  return (
    <Layout className="app-shell">
      <Sider
        id={siderId}
        className="app-shell-sider"
        width={siderWidth}
        collapsedWidth={collapsedWidth}
        trigger={null}
        collapsible
        collapsed={collapsed}
      >
        <div className="app-shell-sider-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={onToggleCollapsed}
            className="app-shell-toggle"
          />
        </div>
        {sider}
      </Sider>
      <Layout className="app-shell-main">{content}</Layout>
    </Layout>
  );
};

export default AppShell;
