import { supabase } from "@/lib/supabaseClient";

export type WorkspaceProfile = {
  workspace_id?: string | null;
  business_name?: string;
  business_type?: string;
  currency?: string;
  default_low_stock_threshold?: number | string;
  onboarded?: boolean;
  role?: "owner" | "admin" | "staff";
  permissions?: Record<string, boolean>;
};

export type WorkspaceScope = {
  userId: string | null;
  workspaceId: string | null;
  profile: WorkspaceProfile | null;
};

export async function getWorkspaceScope(): Promise<WorkspaceScope> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id ?? null;

  if (!userId) {
    return { userId: null, workspaceId: null, profile: null };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      "workspace_id,business_name,business_type,currency,default_low_stock_threshold,onboarded,role,permissions"
    )
    .eq("user_id", userId)
    .single();

  const profile = profileData ?? null;
  const workspaceId = profile?.workspace_id ?? userId;

  return { userId, workspaceId, profile };
}

export async function ensureWorkspaceForCurrentUser({
  business_name,
  business_type,
  currency,
  default_low_stock_threshold,
}: {
  business_name: string;
  business_type: string;
  currency: string;
  default_low_stock_threshold: number;
}) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) {
    return { error: new Error("Unable to determine current user.") };
  }

  const workspaceId = userId;

  const { error } = await supabase.auth.updateUser({
    data: {
      workspace_id: workspaceId,
      business_name,
      business_type,
      currency,
      default_low_stock_threshold,
      onboarded: true,
    },
  });

  if (error) {
    return { error };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      user_id: userId,
      workspace_id: workspaceId,
      business_name,
      business_type,
      currency,
      default_low_stock_threshold,
      onboarded: true,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return { error: profileError };
  }

  const [{ error: productsError }, { error: movementsError }] = await Promise.all([
    supabase.from("products").update({ workspace_id: workspaceId }).eq("user_id", userId),
    supabase.from("stock_movements").update({ workspace_id: workspaceId }).eq("user_id", userId),
  ]);

  if (productsError || movementsError) {
    return { error: productsError || movementsError };
  }

  return { error: null };
}
