import React, { useState } from "react";
import { Button, Layout, Menu, message } from "antd";
import type { MenuProps } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
  RobotOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import configureStorage from "@src/shared/storages/gluonConfig";
import "./index.css";
import intl from "react-intl-universal";
import _, { isEqual } from "lodash";
import useStorage from "@src/shared/hooks/useStorage";
import ModelSettings from "@pages/options/preference/components/ModelSettings";
import FeatureToggles from "@pages/options/preference/components/FeatureToggles";
import SystemSettings from "@pages/options/preference/components/SystemSettings";

const { Sider } = Layout;

const PREFERENCE_MENU_KEYS = {
  MODEL_SETTINGS: "model_settings",
  FEATURE_TOGGLES: "feature_toggles",
  SYSTEM: "system",
};

const PreferenceApp: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>(
    PREFERENCE_MENU_KEYS.MODEL_SETTINGS,
  );
  const initData = useStorage(configureStorage);

  const menuItems: MenuProps["items"] = [
    {
      key: PREFERENCE_MENU_KEYS.MODEL_SETTINGS,
      icon: <RobotOutlined />,
      label: intl.get("models").d("Models"),
    },
    {
      key: PREFERENCE_MENU_KEYS.FEATURE_TOGGLES,
      icon: <ProfileOutlined />,
      label: intl.get("feature_toggles").d("Features"),
    },
    {
      key: PREFERENCE_MENU_KEYS.SYSTEM,
      icon: <ToolOutlined />,
      label: intl.get("system").d("System"),
    },
  ];

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    setSelectedKey(e.key);
  };

  const onSaveSettings = (values: any) => {
    const cloneConfigure = _.clone(initData);
    for (const key in values) {
      cloneConfigure[key] = values[key];
    }
    if (cloneConfigure.enableSearch === false) {
      cloneConfigure.enableOptionsAppSearch = false;
    }

    if (!isEqual(cloneConfigure, initData)) {
      configureStorage.set(cloneConfigure).then(() => {
        message.success(
          intl
            .get("options_app_preference_saved")
            .d("Configuration saved, it will take effect next time!"),
        );
      });
    } else {
      message.info(
        intl
          .get("options_app_preference_is_save")
          .d("Same preference, nothing has changed!"),
      );
    }
  };

  return (
    <Layout>
      <Sider
        id="preference-left-sider"
        width={300}
        collapsedWidth={64}
        style={{ height: "auto" }}
        trigger={null}
        collapsible
        collapsed={collapsed}
      >
        <div className="left-sider-title">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: "16px",
              width: 64,
              height: 64,
            }}
          />
        </div>
        <Menu
          theme="light"
          mode="inline"
          defaultSelectedKeys={[PREFERENCE_MENU_KEYS.MODEL_SETTINGS]}
          defaultOpenKeys={[PREFERENCE_MENU_KEYS.MODEL_SETTINGS]}
          items={menuItems}
          style={{ borderRight: 0 }}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout className="preference-content-layout">
        {selectedKey === PREFERENCE_MENU_KEYS.MODEL_SETTINGS && (
          <ModelSettings
            config={initData}
            onSaveSettings={onSaveSettings}
          />
        )}
        {selectedKey === PREFERENCE_MENU_KEYS.FEATURE_TOGGLES && (
          <FeatureToggles
            config={initData}
            onSaveSettings={onSaveSettings}
          ></FeatureToggles>
        )}
        {selectedKey === PREFERENCE_MENU_KEYS.SYSTEM && (
          <SystemSettings
            config={initData}
            onSaveSettings={onSaveSettings}
          ></SystemSettings>
        )}
      </Layout>
    </Layout>
  );
};

export default PreferenceApp;
