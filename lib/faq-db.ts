import type { Locale } from "./i18n";
import { getAdminClient } from "./supabase";

export type FaqEntryStatut = "soumission" | "publie" | "archive";

export interface FaqEntryRow {
  id: string;
  created_at: string;
  updated_at: string;
  statut: FaqEntryStatut;
  question_fr: string;
  answer_fr: string | null;
  question_en: string | null;
  answer_en: string | null;
  sender_email: string | null;
  sort_order: number | null;
  published_at: string | null;
}

export interface FaqPublishedView {
  id: string;
  question: string;
  answer: string;
}

const MIN_QUESTION_LEN = 10;
const MIN_ANSWER_LEN = 10;

export function validateFaqQuestion(question: string): string | null {
  const q = question.trim();
  if (q.length < MIN_QUESTION_LEN) {
    return `La question doit contenir au moins ${MIN_QUESTION_LEN} caractères.`;
  }
  if (q.length > 2000) return "La question est trop longue (2000 caractères max).";
  return null;
}

export function validateFaqAnswer(answer: string): string | null {
  const a = answer.trim();
  if (a.length < MIN_ANSWER_LEN) {
    return `La réponse doit contenir au moins ${MIN_ANSWER_LEN} caractères.`;
  }
  if (a.length > 8000) return "La réponse est trop longue (8000 caractères max).";
  return null;
}

function mapPublishedRow(row: FaqEntryRow, locale: Locale): FaqPublishedView | null {
  const question =
    locale === "en" && row.question_en?.trim()
      ? row.question_en.trim()
      : row.question_fr.trim();
  const answer =
    locale === "en" && row.answer_en?.trim()
      ? row.answer_en.trim()
      : row.answer_fr?.trim();
  if (!question || !answer) return null;
  return { id: row.id, question, answer };
}

export async function queryPublishedFaqEntries(locale: Locale): Promise<FaqPublishedView[]> {
  const { data, error } = await getAdminClient()
    .from("faq_entries")
    .select("*")
    .eq("statut", "publie")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("published_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as FaqEntryRow[])
    .map((row) => mapPublishedRow(row, locale))
    .filter((item): item is FaqPublishedView => item != null);
}

export async function queryPublishedFaqEntriesAdmin(): Promise<FaqEntryRow[]> {
  const { data, error } = await getAdminClient()
    .from("faq_entries")
    .select("*")
    .eq("statut", "publie")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("published_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FaqEntryRow[];
}

export async function queryFaqSubmissionQueue(): Promise<FaqEntryRow[]> {
  const { data, error } = await getAdminClient()
    .from("faq_entries")
    .select("*")
    .eq("statut", "soumission")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FaqEntryRow[];
}

export async function createFaqSubmission(input: {
  question: string;
  senderEmail?: string | null;
}): Promise<FaqEntryRow> {
  const questionErr = validateFaqQuestion(input.question);
  if (questionErr) throw new Error(questionErr);

  const email = input.senderEmail?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Adresse email invalide.");
  }

  const { data, error } = await getAdminClient()
    .from("faq_entries")
    .insert({
      statut: "soumission",
      question_fr: input.question.trim(),
      sender_email: email,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as FaqEntryRow;
}

async function nextPublishedSortOrder(): Promise<number> {
  const { data, error } = await getAdminClient()
    .from("faq_entries")
    .select("sort_order")
    .eq("statut", "publie")
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.sort_order ?? 0) + 1;
}

export async function publishFaqEntry(
  id: string,
  input: { answerFr: string; answerEn?: string | null; questionEn?: string | null },
): Promise<FaqEntryRow> {
  const answerErr = validateFaqAnswer(input.answerFr);
  if (answerErr) throw new Error(answerErr);

  const answerEn = input.answerEn?.trim() || null;
  if (answerEn) {
    const enErr = validateFaqAnswer(answerEn);
    if (enErr) throw new Error(enErr);
  }

  const questionEn = input.questionEn?.trim() || null;
  if (questionEn && questionEn.length < MIN_QUESTION_LEN) {
    throw new Error(`La question EN doit contenir au moins ${MIN_QUESTION_LEN} caractères.`);
  }

  const sortOrder = await nextPublishedSortOrder();
  const now = new Date().toISOString();

  const { data, error } = await getAdminClient()
    .from("faq_entries")
    .update({
      statut: "publie",
      answer_fr: input.answerFr.trim(),
      answer_en: answerEn,
      question_en: questionEn,
      sort_order: sortOrder,
      published_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .eq("statut", "soumission")
    .select("*")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Question introuvable ou déjà traitée.");
  return data as FaqEntryRow;
}

export async function archiveFaqEntry(id: string): Promise<FaqEntryRow> {
  const now = new Date().toISOString();
  const { data, error } = await getAdminClient()
    .from("faq_entries")
    .update({
      statut: "archive",
      updated_at: now,
    })
    .eq("id", id)
    .in("statut", ["soumission", "publie"])
    .select("*")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Question introuvable ou déjà traitée.");
  return data as FaqEntryRow;
}

export async function deleteFaqEntry(id: string): Promise<void> {
  const { error } = await getAdminClient().from("faq_entries").delete().eq("id", id);
  if (error) throw error;
}
