interface ElevatorPitchRecord {
  customer: string;
  problem: string;
  productName: string;
  productType: string;
  functionality: string;
  competitors: string;
  differentiation: string;
}

interface ElevatorPitchWithDetails {
  record: ElevatorPitchRecord;
  details: string;
  boardUrl: string;
  feedback: string;
  generatedElevatorPitch: string;
}

export type { ElevatorPitchRecord, ElevatorPitchWithDetails };
