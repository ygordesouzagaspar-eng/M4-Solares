/* ------------------------------------------------------------------
   data.js — acesso aos dados do CRM (Supabase)
   Carregar DEPOIS de config.js e auth.js.
   Expõe window.CRM
------------------------------------------------------------------- */
(function () {
  const abbr = (full) => {
    if (!full) return "—";
    const p = full.trim().split(/\s+/);
    return p.length === 1 ? p[0] : `${p[0]} ${p[1][0]}.`;
  };

  const CRM = {
    /* ---------------------------------------------------- listar projetos */
    async listProjects() {
      const { data, error } = await window.sb
        .from("projects")
        .select(`
          id, title, stage, value_brl, city, uf, source,
          lost_at, recycle_at, loss_reason_id,
          clients ( id, name, kind, doc ),
          consultants ( id, name ),
          loss_reasons ( label )
        `)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : null;

      return (data || []).map((p) => ({
        id: p.id,
        name: p.title,
        type: p.clients
          ? `${p.clients.kind} · ${/^\d{14}$/.test((p.clients.doc || "").replace(/\D/g, "")) ? "CNPJ" : "CPF"}`
          : "—",
        city: [p.city, p.uf].filter(Boolean).join(" / "),
        value: Number(p.value_brl) || 0,
        stage: p.stage,
        owner: abbr(p.consultants?.name),
        source: p.source,
        reason: p.loss_reasons?.label || null,
        date: fmtDate(p.lost_at),
        recall: p.recycle_at
          ? new Date(p.recycle_at + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
          : null,
      }));
    },

    /* ------------------------------------------------------ mudar de etapa */
    async setStage(id, stage, lossReasonId) {
      const patch = { stage };
      if (stage === "Perdido" && lossReasonId) patch.loss_reason_id = lossReasonId;
      const { error } = await window.sb.from("projects").update(patch).eq("id", id);
      if (error) throw error;
    },

    /* ---------------------------------------------------------- motivos */
    async lossReasons() {
      const { data } = await window.sb.from("loss_reasons").select("id,label").order("id");
      return data || [];
    },

    /* ------------------------------------------------------- novo projeto */
    /* form: { title, clientName, kind, doc, email, phone, city, uf, value, source } */
    async createProject(form) {
      const ownerId = window.me?.id || null;
      let clientId = null;

      if (form.clientName?.trim()) {
        const { data: cli, error: e1 } = await window.sb
          .from("clients")
          .insert({
            name: form.clientName.trim(),
            kind: form.kind || "Residencial",
            doc: form.doc || null,
            email: form.email || null,
            phone: form.phone || null,
            city: form.city || null,
            uf: (form.uf || "").toUpperCase().slice(0, 2) || null,
            owner_id: ownerId,
          })
          .select("id")
          .single();
        if (e1) throw e1;
        clientId = cli.id;
      }

      const { data, error } = await window.sb
        .from("projects")
        .insert({
          title: form.title.trim(),
          client_id: clientId,
          owner_id: ownerId,
          stage: form.stage || "Lead",
          value_brl: Number(String(form.value).replace(/\./g, "").replace(",", ".")) || 0,
          source: form.source || null,
          city: form.city || null,
          uf: (form.uf || "").toUpperCase().slice(0, 2) || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
  };

  window.CRM = CRM;
})();
