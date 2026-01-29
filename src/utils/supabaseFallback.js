import { supabase } from "../lib/supabaseClient";

export const EMAIL_COLS = [
  "email_convidado",
];

export function isMissingColumnError(err, col) {
  return (
    String(err?.message || err).includes("column") &&
    String(err?.message || err).includes(col) &&
    String(err?.message || err).includes("does not exist")
  );
}

export async function selectByEmailWithFallback({ table, select, email, extraFilters }) {
  let lastError;

  for (const col of EMAIL_COLS) {
    const selectWithEmail = select?.includes(col)
      ? select
      : select
        ? `${select}, ${col}`
        : `${col}`;
    let query = supabase.from(table).select(selectWithEmail).eq(col, email);

    if (typeof extraFilters === "function") {
      query = extraFilters(query);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingColumnError(error, col)) {
        lastError = error;
        continue;
      }
      return { data: null, error, emailColumn: col };
    }

    return { data: data ?? [], error: null, emailColumn: col };
  }

  return { data: null, error: lastError, emailColumn: null };
}

export async function insertWithEmailFallback({ table, payloadBase, email }) {
  let lastError;

  for (const col of EMAIL_COLS) {
    const payload = { ...payloadBase, [col]: email };
    const { data, error } = await supabase.from(table).insert(payload);

    if (error) {
      if (isMissingColumnError(error, col)) {
        lastError = error;
        continue;
      }
      return { data: null, error, emailColumn: col };
    }

    return { data, error: null, emailColumn: col };
  }

  return { data: null, error: lastError, emailColumn: null };
}
