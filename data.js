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
          opportunity_type, first_contact_at, avg_bill_brl, has_solar, deadline, need_detail,
          last_contact_at, last_contact_channel, last_contact_note, next_action, next_action_at,
          clients ( id, name, kind, doc, contact_name, contact_role, whatsapp, phone, segment ),
          consultants ( id, name ),
          loss_reasons ( label )
        `)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : null;
      const fmtFull = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : null);

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
        contactName: p.clients?.contact_name || "",
        contactRole: p.clients?.contact_role || "",
        whatsapp: p.clients?.whatsapp || p.clients?.phone || "",
        segment: p.clients?.segment || "",
        opportunityType: p.opportunity_type || "Cliente",
        firstContact: fmtFull(p.first_contact_at),
        avgBill: p.avg_bill_brl,
        hasSolar: p.has_solar,
        deadline: p.deadline,
        needDetail: p.need_detail,
        nextAction: p.next_action || "",
        nextActionAt: fmtFull(p.next_action_at),
        lastContactNote: p.last_contact_note || "",
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
    /* form: ver EMPTY_FORM em index.html — segue o checklist do guia
       comercial de cadastro de leads (empresa, contato, origem, tipo de
       oportunidade, qualificação e próxima ação) */
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
            contact_name: form.contactName || null,
            contact_role: form.contactRole || null,
            whatsapp: form.whatsapp || null,
            phone: form.whatsapp || null,
            segment: form.segment || null,
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
          opportunity_type: form.opportunityType || "Cliente",
          first_contact_at: form.firstContact || new Date().toISOString().slice(0, 10),
          avg_bill_brl: form.avgBill ? Number(String(form.avgBill).replace(/\./g, "").replace(",", ".")) : null,
          has_solar: form.hasSolar === "Sim" ? true : form.hasSolar === "Não" ? false : null,
          deadline: form.deadline || null,
          need_detail: form.needDetail || null,
          last_contact_at: new Date().toISOString(),
          last_contact_channel: form.channel || null,
          last_contact_note: form.contactNote || null,
          next_action: form.nextAction || null,
          next_action_at: form.nextActionAt || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
  };

  window.CRM = CRM;
})();
