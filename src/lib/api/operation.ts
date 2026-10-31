export interface MutationOperation {
  id: string;
  body: string;
}
export function createOperation(input: unknown): MutationOperation {
  return { id: crypto.randomUUID(), body: JSON.stringify(input) };
}
export function sameOperation(
  current: MutationOperation | null,
  input: unknown,
): MutationOperation {
  const body = JSON.stringify(input);
  return current?.body === body ? current : createOperation(input);
}
