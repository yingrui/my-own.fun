import React from "react";
import { Layout } from "antd";

import "./index.css";
import { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";

interface DatasetsManagementProps {
  config: GluonConfigure;
}

const DatasetsManagement: React.FC<DatasetsManagementProps> = ({ config }) => {
  return (
    <Layout className={"more-coming-soon"}>
      <div className={"more-coming-soon-icon-area"}>
        <div className={"more-coming-soon-logo"}>
          <img src={"/icons/logo.svg"} />
          <h6>
            {intl
              .get("options_app_history_more_header")
              .d("Datasets Mgmt. is Coming")}
          </h6>
        </div>
      </div>
      <div className={"more-coming-soon-list"}>
        <a>{intl.get("options_app_history_more_corner_case").d("Bad cases")}</a>
        <a>
          {intl
            .get("options_app_history_more_intent")
            .d("Intent Recognition dataset")}
        </a>
        <a>
          {intl
            .get("options_app_history_more_summary")
            .d("Summarization dataset")}
        </a>
        <a>{intl.get("options_app_history_more_plan").d("Planning dataset")}</a>
        <a>...</a>
      </div>
    </Layout>
  );
};

export default DatasetsManagement;
