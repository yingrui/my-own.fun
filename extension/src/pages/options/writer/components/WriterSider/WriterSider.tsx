import React, { useEffect, useState } from "react";
import type { TreeDataNode } from "antd";
import { Button, Layout, Radio, Tree } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";

import "./WriterSider.css";
import WriterContext from "@pages/options/writer/context/WriterContext";
import intl from "react-intl-universal";

const { Sider } = Layout;

interface WriterSiderProps {
  context: WriterContext;
}

const WriterSider: React.FC<WriterSiderProps> = ({ context }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState("Outline");
  const [tabsTree, setTabsTree] = useState<TreeDataNode[]>([]);
  const [outlineTree, setOutlineTree] = useState<TreeDataNode[]>(
    context.getOutline(),
  );

  context.onOutlineChange((outline) => {
    setOutlineTree(outline);
  });

  function getTabsTree(): Promise<TreeDataNode[]> {
    return new Promise((resolve) => {
      chrome.tabs.query({ currentWindow: true, active: false }, (tabs) => {
        const tree = tabs
          .map((tab) => {
            return {
              key: tab.id,
              title: tab.title,
              children: [],
            };
          })
          .filter((tab) => tab.title);
        resolve(tree);
      });
    });
  }

  const updateTabsTree = async () => {
    setTabsTree(await getTabsTree());
  };

  const switchPanel = async (panel: string) => {
    setSelectedPanel(panel);
    if (panel === "Reference") {
      await updateTabsTree();
    }
  };

  useEffect(() => {
    const events = [
      chrome.tabs.onUpdated,
      chrome.tabs.onAttached,
      chrome.tabs.onDetached,
      chrome.tabs.onRemoved,
      chrome.tabs.onCreated,
    ];
    for (const event of events) {
      if (event.hasListener(updateTabsTree)) {
        event.removeListener(updateTabsTree);
      }
      event.addListener(updateTabsTree);
    }
  }, []);

  return (
    <Sider
      id="writer-left-sider"
      width={300}
      collapsedWidth={64}
      style={{ height: "auto" }}
      trigger={null}
      collapsible
      collapsed={collapsed}
    >
      <div className="outline-and-reference">
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
        {collapsed ? null : (
          <Radio.Group value={selectedPanel}>
            <Radio.Button
              value="Outline"
              onClick={() => switchPanel("Outline")}
            >
              {intl.get("options_app_writer_outline").d("Outline")}
            </Radio.Button>
            <Radio.Button
              value="Reference"
              onClick={() => switchPanel("Reference")}
            >
              {intl.get("options_app_writer_reference").d("Reference")}
            </Radio.Button>
          </Radio.Group>
        )}
      </div>
      <div
        className={"writer-menu"}
        style={{ display: collapsed ? "none" : "block" }}
      >
        {selectedPanel === "Outline" && (
          <Tree
            className={"outline-tree"}
            treeData={outlineTree}
            defaultExpandAll={true}
          />
        )}
        {selectedPanel === "Reference" && (
          <Tree className={"tabs-tree"} treeData={tabsTree} checkable={true} />
        )}
      </div>
    </Sider>
  );
};

export default WriterSider;
