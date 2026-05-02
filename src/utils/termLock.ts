export function isLocked(activeYear: any, activeTerm: any) {
  const termLocked = Boolean(activeTerm?.closed || activeTerm?.is_finalised || activeTerm?.isFinalized);
  const yearLocked = Boolean(activeYear?.closed || activeYear?.is_finalised || activeYear?.isFinalized);
  return termLocked || yearLocked;
}
