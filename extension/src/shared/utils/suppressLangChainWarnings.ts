/**
 * Suppress LangChain streaming merge warnings (e.g. "field[created] already exists
 * in this message chunk and value has unsupported type"). These occur when merging
 * AIMessageChunks during streaming and don't affect functionality.
 */
export function suppressLangChainMergeWarnings(): void {
  const orig = console.warn;
  console.warn = (...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    if (msg.includes("already exists in this message chunk") && msg.includes("unsupported type")) {
      return;
    }
    orig.apply(console, args);
  };
}
