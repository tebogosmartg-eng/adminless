import { supabase } from "@/lib/supabaseClient";
import { logAdminLessError } from "@/utils/logAdminLessError";

const activeSessionByClassId = new Map<string, string>();

const MISSING_AMENDMENT_RPC_MESSAGE =
  "Amendment sessions are not available on this database yet. Apply pending Supabase migrations (including begin_amendment_session), then try again.";

const mentionsMissingFunction = (s: unknown): boolean =>
  typeof s === "string" && s.includes("Could not find the function");

const isMissingAmendmentRpcError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string; details?: string };
  if (e.code === "PGRST202") return true;
  if (mentionsMissingFunction(e.message) || mentionsMissingFunction(e.details)) return true;
  return false;
};

export const beginAmendmentSession = async (
  classId: string,
  reason?: string
): Promise<{ success: true; sessionId: string } | { success: false; message: string }> => {
  if (!classId) {
    return { success: false, message: "classId is required to begin an amendment session." };
  }

  try {
    const { data, error } = await supabase.rpc("begin_amendment_session", {
      p_class_id: classId,
      p_reason: reason ?? null,
    });

    if (error) throw error;
    const sessionId = typeof data === "string" ? data : (data as { id?: string } | null)?.id;
    if (!sessionId) {
      throw new Error("begin_amendment_session returned no session id.");
    }

    activeSessionByClassId.set(classId, sessionId);
    return { success: true, sessionId };
  } catch (err) {
    logAdminLessError("amendment_session_begin_failed", err, { classId });
    if (isMissingAmendmentRpcError(err)) {
      return { success: false, message: MISSING_AMENDMENT_RPC_MESSAGE };
    }
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Failed to start amendment session.",
    };
  }
};

export const endAmendmentSession = async (
  sessionId: string | null | undefined,
  classId?: string
): Promise<{ success: boolean; message?: string }> => {
  const id = sessionId || (classId ? activeSessionByClassId.get(classId) : undefined);
  if (!id) {
    if (classId) activeSessionByClassId.delete(classId);
    return { success: true };
  }

  try {
    const { error } = await supabase.rpc("end_amendment_session", { p_session_id: id });
    if (error) throw error;
    if (classId) {
      activeSessionByClassId.delete(classId);
    } else {
      for (const [key, value] of activeSessionByClassId.entries()) {
        if (value === id) activeSessionByClassId.delete(key);
      }
    }
    return { success: true };
  } catch (err) {
    logAdminLessError("amendment_session_end_failed", err, { sessionId: id, classId });
    if (isMissingAmendmentRpcError(err)) {
      return { success: false, message: MISSING_AMENDMENT_RPC_MESSAGE };
    }
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to end amendment session.",
    };
  }
};

export const getActiveAmendmentSessionId = (classId: string): string | undefined => {
  return activeSessionByClassId.get(classId);
};
