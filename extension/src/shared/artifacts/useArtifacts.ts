import { useMemo } from "react";
import type { SessionMessage } from "@src/shared/langgraph/runtime/types";
import type { Artifact } from "./types";
import { extractArtifacts, extractPartialArtifact } from "./artifactExtractor";

export interface UseArtifactsResult {
  artifacts: Artifact[];
  partialArtifact: Artifact | null;
  hasArtifactContent: boolean;
  artifactsByMessageId: Record<string, Artifact[]>;
}

/**
 * Centralizes artifact extraction and derived state for ChatbotApp and ArtifactPanel.
 */
export function useArtifacts(messages: SessionMessage[]): UseArtifactsResult {
  const artifacts = useMemo(() => extractArtifacts(messages), [messages]);
  const partialArtifact = useMemo(() => extractPartialArtifact(messages), [messages]);
  const hasArtifactContent = artifacts.length > 0 || partialArtifact != null;
  const artifactsByMessageId = useMemo(() => {
    const map: Record<string, Artifact[]> = {};
    for (const a of artifacts) {
      if (!map[a.messageId]) map[a.messageId] = [];
      map[a.messageId].push(a);
    }
    return map;
  }, [artifacts]);

  return { artifacts, partialArtifact, hasArtifactContent, artifactsByMessageId };
}
