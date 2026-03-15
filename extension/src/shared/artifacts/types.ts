export type ArtifactType = "html" | "svg" | "combined";

export interface Artifact {
  id: string;
  messageId: string;
  type: ArtifactType;
  content: string;
  createdAt: number;
  /** True when extracted from streaming (incomplete) content. */
  isPartial?: boolean;
}
