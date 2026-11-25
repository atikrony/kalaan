// Unwrap a server action result ({ data } | { error }) — throws a normal Error with the real message
export async function act(promise) {
  const r = await promise;
  if (r && r.error) throw new Error(r.error);
  return r?.data;
}
