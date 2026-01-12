export async function withTimeout<T>(
  promise: Promise<T>,
  errorMsg?: string,
  timeoutMs?: number,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(errorMsg ?? "Operation timed out")),
      timeoutMs ?? 30000,
    ),
  );
  return Promise.race([promise, timeout]);
}
