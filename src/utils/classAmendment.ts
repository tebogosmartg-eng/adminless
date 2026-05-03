/** Class-level finalisation (classes.is_finalised). Term/year locks stay separate. */

export function isClassFinalisationLocking(
  classInfo: { is_finalised?: boolean | null } | null | undefined,
  isAmendmentMode: boolean,
): boolean {
  return !!classInfo?.is_finalised && !isAmendmentMode;
}

export function isClassContentEditable(
  isFinalised: boolean,
  isAmendmentMode: boolean,
): boolean {
  return !isFinalised || isAmendmentMode;
}
