type AssessmentOrderInput = {
  id: string;
  position?: number | null;
  created_at?: string | null;
  title?: string | null;
  date?: string | null;
};

const getPositionKey = (value?: number | null): number => {
  if (value === null || value === undefined) return Number.POSITIVE_INFINITY;
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
};

const getDateKey = (value?: string | null): number => {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

export const compareAssessmentsDeterministically = (
  a: AssessmentOrderInput,
  b: AssessmentOrderInput
): number => {
  const positionDiff = getPositionKey(a.position) - getPositionKey(b.position);
  if (positionDiff !== 0) return positionDiff;

  const createdAtDiff = getDateKey(a.created_at) - getDateKey(b.created_at);
  if (createdAtDiff !== 0) return createdAtDiff;

  const idDiff = (a.id || "").localeCompare(b.id || "", undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (idDiff !== 0) return idDiff;

  // Legacy safeguard for malformed duplicate ids or missing metadata.
  const dateDiff = getDateKey(a.date) - getDateKey(b.date);
  if (dateDiff !== 0) return dateDiff;

  return (a.title || "").trim().localeCompare((b.title || "").trim(), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

export const sortAssessmentsDeterministically = <T extends AssessmentOrderInput>(
  assessments: T[]
): T[] => {
  return [...assessments].sort(compareAssessmentsDeterministically);
};

export const applySupabaseAssessmentOrder = (query: any) => {
  return query
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
};
