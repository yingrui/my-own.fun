import React from "react";
import "./index.css";
import { Layout } from "antd";
import intl from "react-intl-universal";

const MoreComing = () => {
  return (
    <Layout className={"more-coming-soon"}>
      <div className={"more-coming-soon-icon-area"}>
        <div className={"more-coming-soon-logo"}>
          <img src={"/icons/logo.svg"} />
          <h6>{intl.get("options_app_more").d("Coming Soon")}</h6>
        </div>
      </div>
      <div className={"more-coming-soon-list"}>
        <a>
          {intl
            .get("options_app_more_elevator_pitch")
            .d("Product Elevator Pitch")}
        </a>
        <a>{intl.get("options_app_more_tech_strategy").d("Tech Strategy")}</a>
        <a>{intl.get("options_app_more_brainstorming").d("Brainstorming")}</a>
        <a>{intl.get("options_app_more_writing").d("Writing Tools")}</a>
        <a>...</a>
      </div>
    </Layout>
  );
};

export default MoreComing;
