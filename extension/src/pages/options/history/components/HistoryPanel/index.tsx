import React from "react";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import "./index.css";
import ConversationsManagement from "@pages/options/history/components/ConversationsManagement";
import DatasetsManagement from "@pages/options/history/components/DatasetsManagement";
import type { HistoryType } from "@pages/options/history/components/HistoryApp";

interface HistoryPanelProps {
  config: GluonConfigure;
  historyType: HistoryType;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ config, historyType }) => {
  return (
    <div className={"history-table"}>
      {historyType === "Conversations" && (
        <ConversationsManagement config={config}></ConversationsManagement>
      )}
      {historyType === "Datasets" && (
        <DatasetsManagement config={config}></DatasetsManagement>
      )}
    </div>
  );
};

export default HistoryPanel;
