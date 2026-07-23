"use client";

import { useCallback, useEffect, useState } from "react";
import AppNav from "@/app/components/AppNav";
import AuthGuard from "@/app/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { getWorkspaceScope } from "@/lib/workspace";
import type { UserRole } from "@/lib/types";

type Member = {
  user_id: string; email: string | null; full_name: string | null;
  role: UserRole; permissions: Record<string, boolean>;
};
type Invitation = {
  id: string; token: string; email: string; role: "admin"|"staff";
  permissions: Record<string, boolean>; expires_at: string; accepted_at: string | null;
};
const permissionOptions = [
  ["manage_products", "Manage products", "Create, edit, and delete products"],
  ["view_financials", "View financials", "See costs, profit, margins, and exports"],
  ["export_reports", "Export reports", "Download business performance data"],
] as const;

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [actorRole, setActorRole] = useState<UserRole>("staff");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin"|"staff">("staff");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const scope = await getWorkspaceScope();
    setActorRole(scope.profile?.role ?? "staff");
    const [memberResult, inviteResult] = await Promise.all([
      supabase.from("profiles").select("user_id,email,full_name,role,permissions").eq("workspace_id", scope.workspaceId).order("role"),
      supabase.from("workspace_invitations").select("id,token,email,role,permissions,expires_at,accepted_at").order("created_at", { ascending: false }),
    ]);
    setMembers((memberResult.data ?? []) as Member[]);
    setInvites((inviteResult.data ?? []) as Invitation[]);
    setMessage(memberResult.error?.message ?? inviteResult.error?.message ?? "");
    setLoading(false);
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const invite = async () => {
    setMessage("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMessage("Enter a valid email address.");
    const scope = await getWorkspaceScope();
    if (!scope.userId || !scope.workspaceId) return setMessage("Please sign in again.");
    const { error } = await supabase.from("workspace_invitations").insert({
      email: email.trim().toLowerCase(), role, permissions,
      workspace_id: scope.workspaceId, created_by: scope.userId,
    });
    if (error) return setMessage(error.message);
    setEmail(""); setRole("staff"); setPermissions({}); setMessage("Invitation created. Copy its secure link below.");
    await load();
  };
  const updateMember = async (member: Member, nextRole: "admin"|"staff", nextPermissions: Record<string, boolean>) => {
    const { error } = await supabase.rpc("update_workspace_member", { p_user_id: member.user_id, p_role: nextRole, p_permissions: nextPermissions });
    setMessage(error?.message ?? "Team member updated.");
    if (!error) await load();
  };
  const removeMember = async (member: Member) => {
    if (!window.confirm(`Remove ${member.full_name || member.email || "this member"} from the workspace?`)) return;
    const { error } = await supabase.rpc("remove_workspace_member", { p_user_id: member.user_id });
    setMessage(error?.message ?? "Team member removed.");
    if (!error) await load();
  };
  const cancelInvite = async (id: string) => {
    const { error } = await supabase.from("workspace_invitations").delete().eq("id", id);
    setMessage(error?.message ?? "Invitation cancelled.");
    if (!error) await load();
  };
  const copyInvite = async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/invite?token=${token}`);
    setMessage("Invitation link copied.");
  };
  const manager = actorRole === "owner" || actorRole === "admin";

  return <AuthGuard><main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 sm:px-12"><div className="mx-auto max-w-7xl space-y-8"><AppNav/>
    <header className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8"><p className="text-sm uppercase tracking-[.3em] text-emerald-300">Workspace access</p><h1 className="mt-3 text-3xl font-semibold">Team and permissions</h1><p className="mt-2 text-slate-400">Invite staff, assign responsibilities, and keep sensitive business controls with the right people.</p></header>
    {message && <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">{message}</div>}
    {manager && <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8"><h2 className="text-xl font-semibold">Invite a team member</h2><div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_.7fr_auto]"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="member@business.com" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"/><select value={role} onChange={e=>setRole(e.target.value as "admin"|"staff")} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"><option value="staff">Staff</option>{actorRole==="owner"&&<option value="admin">Administrator</option>}</select><button onClick={invite} className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-slate-950">Create invitation</button></div>
      {role==="staff"&&<PermissionChecks value={permissions} onChange={setPermissions}/>}
    </section>}
    <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8"><h2 className="text-xl font-semibold">Current team</h2>{loading?<p className="mt-6 text-slate-400">Loading team…</p>:<div className="mt-6 space-y-4">{members.map(member=><MemberCard key={member.user_id} member={member} actorRole={actorRole} onSave={updateMember} onRemove={removeMember}/>)}</div>}</section>
    {manager&&<section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8"><h2 className="text-xl font-semibold">Invitations</h2><div className="mt-6 space-y-3">{invites.filter(i=>!i.accepted_at).length===0?<p className="text-slate-400">No pending invitations.</p>:invites.filter(i=>!i.accepted_at).map(invite=><div key={invite.id} className="flex flex-col gap-3 rounded-2xl bg-slate-950/80 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{invite.email}</p><p className="text-sm capitalize text-slate-400">{invite.role} · expires {new Date(invite.expires_at).toLocaleDateString()}</p></div><div className="flex gap-2"><button onClick={()=>copyInvite(invite.token)} className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm text-emerald-300">Copy link</button><button onClick={()=>cancelInvite(invite.id)} className="rounded-full bg-rose-500/15 px-4 py-2 text-sm text-rose-300">Cancel</button></div></div>)}</div></section>}
  </div></main></AuthGuard>;
}

function PermissionChecks({ value, onChange }: { value: Record<string,boolean>; onChange: (value: Record<string,boolean>)=>void }) {
  return <div className="mt-6 grid gap-3 md:grid-cols-3">{permissionOptions.map(([key,label,description])=><label key={key} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4"><input type="checkbox" checked={Boolean(value[key])} onChange={e=>onChange({...value,[key]:e.target.checked})} className="mt-1 accent-emerald-400"/><span><span className="block font-medium">{label}</span><span className="text-xs text-slate-400">{description}</span></span></label>)}</div>;
}

function MemberCard({ member, actorRole, onSave, onRemove }: { member: Member; actorRole: UserRole; onSave: (member:Member,role:"admin"|"staff",permissions:Record<string,boolean>)=>void; onRemove:(member:Member)=>void }) {
  const [role,setRole]=useState<"admin"|"staff">(member.role==="owner"?"admin":member.role);
  const [permissions,setPermissions]=useState(member.permissions??{});
  const editable=member.role!=="owner"&&(actorRole==="owner"||(actorRole==="admin"&&member.role==="staff"));
  return <div className="rounded-2xl bg-slate-950/80 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{member.full_name||member.email||"Team member"}</p><p className="text-sm text-slate-400">{member.email} · <span className="capitalize">{member.role}</span></p></div>{editable&&<div className="flex flex-wrap gap-2"><select value={role} onChange={e=>setRole(e.target.value as "admin"|"staff")} className="rounded-full bg-slate-800 px-4 py-2 text-sm"><option value="staff">Staff</option>{actorRole==="owner"&&<option value="admin">Administrator</option>}</select><button onClick={()=>onSave(member,role,permissions)} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Save</button><button onClick={()=>onRemove(member)} className="rounded-full bg-rose-500/15 px-4 py-2 text-sm text-rose-300">Remove</button></div>}</div>{editable&&role==="staff"&&<PermissionChecks value={permissions} onChange={setPermissions}/>}</div>;
}
