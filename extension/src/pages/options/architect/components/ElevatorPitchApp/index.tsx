import React, { useEffect, useRef, useState } from "react";
import { Layout } from "antd";
import "./index.css";
import ElevatorPitchContext, {
  ElevatorPitchRecord,
} from "@pages/options/architect/context/ElevatorPitchContext";
import ElevatorPitchDetails from "@pages/options/architect/components/ElevatorPitchDetails";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import ElevatorPitchPreview from "@pages/options/architect/components/ElevatorPitchPreview";

interface ElevatorPitchProps {
  config: GluonConfigure;
}

const ElevatorPitchApp: React.FC<ElevatorPitchProps> = ({ config }) => {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const contextRef = useRef(new ElevatorPitchContext(config));
  const [elevatorPitch, setElevatorPitch] = useState<ElevatorPitchRecord>(null);

  useEffect(() => {
    // Load the elevator pitch context from local storage
    // Once loaded, this component will rerender.
    // That's why we need to set the context in the state
    contextRef.current.load().then(() => {
      setLoading(false);
      setElevatorPitch(contextRef.current.getElevatorPitchRecord());
    });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  async function onElevatorPitchChanged() {
    const context = contextRef.current;
    setElevatorPitch(context.getElevatorPitchRecord());
    setEditing(false);
    await context.save();
  }

  return (
    <Layout style={{ padding: "24px" }} className={"elevator-pitch-app"}>
      <ElevatorPitchDetails
        context={contextRef.current}
        onElevatorPitchChanged={onElevatorPitchChanged}
      />
      <ElevatorPitchPreview context={contextRef.current} />
    </Layout>
  );
};

export default ElevatorPitchApp;
