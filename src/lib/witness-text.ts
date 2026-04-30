function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function readNestedString(
  payload: Record<string, unknown>,
  keys: string[],
): string | undefined {
  let current: unknown = payload;

  for (const key of keys) {
    current = asRecord(current)[key];
  }

  return typeof current === "string" && current.trim().length > 0
    ? current
    : undefined;
}

function selectWitnessTextFromRecord(
  payload: Record<string, unknown>,
): string | undefined {
  return (
    readString(payload, "response") ??
    readString(payload, "synthesis") ??
    readNestedString(payload, ["pichet", "perspective"]) ??
    readNestedString(payload, ["aletheios", "perspective"]) ??
    readString(payload, "summary") ??
    readString(payload, "witness_prompt") ??
    readString(payload, "witness_question") ??
    readString(payload, "headline")
  );
}

export function getWitnessLayer(
  value: unknown,
): Record<string, unknown> | undefined {
  const witnessLayer = asRecord(asRecord(value).witness_layer);
  return Object.keys(witnessLayer).length > 0 ? witnessLayer : undefined;
}

export function selectWitnessText(value: unknown): string | undefined {
  const payload = asRecord(value);
  const witnessLayer = getWitnessLayer(payload);

  return (
    (witnessLayer ? selectWitnessTextFromRecord(witnessLayer) : undefined) ??
    selectWitnessTextFromRecord(payload)
  );
}
