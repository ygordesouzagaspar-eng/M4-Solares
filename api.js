// Camada de dados do CRM. Sem chaves configuradas, o app roda com os dados
// de demonstração embutidos em index.html. Com chaves, lê/escreve no Supabase.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ready =
  window.SUPABASE_URL && !window.SUPABASE_URL.includes("SEU-PROJETO");
export const sb = ready
  ? createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

export const isLive = () => !!sb;

export async function listProjects() {
  const { data, error } = await sb
    .from("projects")
    .select(
      "id,title,stage,value_brl,city,uf,recycle_at,lost_at,recycled_count," +
        "clients(name,kind),consultants(name),loss_reasons(label)"
    )
    .order("value_brl", { ascending: false });
  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    name: p.clients?.name || p.title,
    type: p.clients?.kind ?? "Residencial",
    city: [p.city, p.uf].filter(Boolean).join(" / "),
    value: Number(p.value_brl),
    stage: p.stage,
    owner: p.consultants?.name ?? "—",
    reason: p.loss_reasons?.label ?? null,
    recycleAt: p.recycle_at,
    lostAt: p.lost_at,
  }));
}

// O trigger do banco consolida o cliente e gera a comissão de 5%.
export async function moveStage(id, stage, lossReasonId = null) {
  const patch = { stage };
  if (stage === "Perdido" && lossReasonId) patch.loss_reason_id = lossReasonId;
  const { error } = await sb.from("projects").update(patch).eq("id", id);
  if (error) throw error;
}

export async function recycle(id) {
  const { error } = await sb.rpc("recycle_project", { p_id: id });
  if (error) throw error;
}

export async function commissions(period) {
  const q = sb.from("v_commissions_by_consultant").select("*");
  const { data, error } = period ? await q.eq("period", period) : await q;
  if (error) throw error;
  return data;
}

export async function clientPortfolio() {
  const { data, error } = await sb
    .from("v_client_portfolio")
    .select("*")
    .order("contracted_brl", { ascending: false });
  if (error) throw error;
  return data;
}

export async function funnelSummary() {
  const { data, error } = await sb.from("v_funnel").select("*");
  if (error) throw error;
  return data;
}
