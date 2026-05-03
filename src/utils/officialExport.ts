import type { Term } from "@/lib/types";

/**
 * True when exports should be treated as official (not draft):
 * either the academic term is closed in Settings, or this class is finalised for the term.
 */
export function isOfficialTermOrClassExport(
  termClosed: boolean | undefined,
  classFinalised: boolean | undefined,
): boolean {
  return !!termClosed || !!classFinalised;
}

export function isOfficialRecordForClassExport(
  activeTerm: Pick<Term, "closed"> | null | undefined,
  classInfo: { is_finalised?: boolean } | null | undefined,
): boolean {
  return isOfficialTermOrClassExport(activeTerm?.closed, classInfo?.is_finalised);
}
