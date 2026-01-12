import React from "react";
import { Layout } from "antd";

import "./index.css";
import intl from "react-intl-universal";
import ElevatorPitchContext from "@pages/options/architect/context/ElevatorPitchContext";

interface ElevatorPitchPreviewProps {
  context: ElevatorPitchContext;
}

const ElevatorPitchPreview: React.FC<ElevatorPitchPreviewProps> = ({
  context,
}) => {
  const elevatorPitch = context.getElevatorPitchRecord();

  return (
    <Layout className={"elevator-pitch-preview"}>
      <h2>
        {intl
          .get("options_app_architect_items_elevator_pitch")
          .d("Elevator Pitch")}
      </h2>

      <div className={"elevator-pitch-preview-field"}>
        <span className={"paragraph"}>
          <span className={"label"}>
            {intl.get("elevator_pitch_customer").d("FOR")}
          </span>
          {elevatorPitch?.customer ??
            intl
              .get("elevator_pitch_customer_placeholder")
              .d("target customer")}
        </span>
      </div>
      <div className={"elevator-pitch-preview-field"}>
        <span className={"paragraph"}>
          <span className={"label"}>
            {intl.get("elevator_pitch_problem").d("WHO")}
          </span>
          {elevatorPitch?.problem ??
            intl
              .get("elevator_pitch_problem_placeholder")
              .d("statement of the need or opportunity")}
        </span>
      </div>
      <div className={"elevator-pitch-preview-field"}>
        <span className={"paragraph"}>
          <span className={"label"}>
            {intl.get("elevator_pitch_product").d("THE")}
          </span>
          {elevatorPitch?.productName ??
            intl.get("elevator_pitch_product_placeholder").d("product name")}
        </span>
      </div>
      <div className={"elevator-pitch-preview-field"}>
        <span className={"paragraph"}>
          <span className={"label"}>
            {intl.get("elevator_pitch_product_type").d("IS A")}
          </span>
          {elevatorPitch?.productType ??
            intl
              .get("elevator_pitch_product_type_placeholder")
              .d("product type")}
        </span>
      </div>
      <div className={"elevator-pitch-preview-field"}>
        <span className={"paragraph"}>
          <span className={"label"}>
            {intl.get("elevator_pitch_functionality").d("THAT")}
          </span>
          {elevatorPitch?.functionality ??
            intl
              .get("elevator_pitch_functionality_placeholder")
              .d("key benefit, compelling reason to use")}
        </span>
      </div>
      <div className={"elevator-pitch-preview-field"}>
        <span className={"paragraph"}>
          <span className={"label"}>
            {intl.get("elevator_pitch_competitors").d("UNLIKE")}
          </span>
          {elevatorPitch?.competitors ??
            intl
              .get("elevator_pitch_competitors_placeholder")
              .d("primary competitive alternative")}
        </span>
      </div>
      <div className={"elevator-pitch-preview-field"}>
        <span className={"paragraph"}>
          <span className={"label"}>
            {intl.get("elevator_pitch_differentiation").d("OUR PRODUCT")}
          </span>
          {elevatorPitch?.differentiation ??
            intl
              .get("elevator_pitch_differentiation_placeholder")
              .d("statement of primary differentiation")}
        </span>
      </div>
    </Layout>
  );
};

export default ElevatorPitchPreview;
