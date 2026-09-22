import { supabase } from "@/integrations/supabase/client";

export type ShareKind = "profile" | "activity";

export interface ShareLink {
  id: string;
  token: string;
  kind: ShareKind;
  activity_id: string | null;
  include_biometrics: boolean;
  view_count: number;
  created_at: string;
  revoked_at: string | null;
}

/** Random, hard-to-guess token for public share URLs. */
export const generateShareToken = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 24);
};

export const getSharePath = (token: string) => `/s/${token}`;
export const getShareUrl = (token: string) =>
  `${window.location.origin}${getSharePath(token)}`;

export const findShareLink = async (
  ownerId: string,
  kind: ShareKind,
  activityId?: string | null
): Promise<ShareLink | null> => {
  let query = supabase
    .from("share_links")
    .select("id, token, kind, activity_id, include_biometrics, view_count, created_at, revoked_at")
    .eq("owner_id", ownerId)
    .eq("kind", kind)
    .is("revoked_at", null);

  query = kind === "activity" ? query.eq("activity_id", activityId!) : query.is("activity_id", null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data as ShareLink) ?? null;
};

export const createShareLink = async (
  ownerId: string,
  kind: ShareKind,
  activityId: string | null,
  includeBiometrics = true
): Promise<ShareLink> => {
  const { data, error } = await supabase
    .from("share_links")
    .insert({
      owner_id: ownerId,
      kind,
      activity_id: kind === "activity" ? activityId : null,
      include_biometrics: includeBiometrics,
      token: generateShareToken(),
    })
    .select("id, token, kind, activity_id, include_biometrics, view_count, created_at, revoked_at")
    .single();
  if (error) throw error;
  return data as ShareLink;
};

export const listShareLinks = async (ownerId: string): Promise<ShareLink[]> => {
  const { data, error } = await supabase
    .from("share_links")
    .select("id, token, kind, activity_id, include_biometrics, view_count, created_at, revoked_at")
    .eq("owner_id", ownerId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShareLink[];
};

export const revokeShareLink = async (id: string) => {
  const { error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const setShareBiometrics = async (id: string, include: boolean) => {
  const { error } = await supabase
    .from("share_links")
    .update({ include_biometrics: include })
    .eq("id", id);
  if (error) throw error;
};
