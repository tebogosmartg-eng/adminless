/** Class-level finalisation (classes.is_finalised). Term/year locks stay separate. */

export function isClassFinalisationLocking(
  isFinalised: boolean,
  isAmendmentMode: boolean,
): boolean {
  return !!isFinalised && !isAmendmentMode;
}

export function isClassContentEditable(
  isFinalised: boolean,
  isAmendmentMode: boolean,
): boolean {
  return !isFinalised || isAmendmentMode;
}
