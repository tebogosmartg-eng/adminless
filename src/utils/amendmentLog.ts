export function logAmendmentEvent(event: {
  type: string;
  classId: string;
  userId?: string;
  payload?: any;
}) {
  console.info("[Amendment]", {
    ...event,
    timestamp: new Date().toISOString(),
  });
}
