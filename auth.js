/* ------------------------------------------------------------------
   auth.js — cliente Supabase + tela de login
   Requer config.js carregado ANTES deste arquivo.

   Expõe:
     window.sb          -> cliente Supabase (após init)
     window.currentUser -> { id, email }
     window.me          -> linha de public.consultants do usuário logado
     window.signOut()   -> encerra sessão
     window.onAuthReady(cb) -> chama cb(me) quando a sessão estiver ok
------------------------------------------------------------------- */
(function () {
  const CDN = "https://esm.sh/@supabase/supabase-js@2";
  const readyCbs = [];
  window.onAuthReady = (cb) => {
    if (window.me) cb(window.me);
    else readyCbs.push(cb);
  };

  /* ------------------------------------------------------------- estilos */
  const css = `
  #auth-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
    background:var(--bg,#FAFAF8);font-family:'Inter Tight',system-ui,sans-serif;color:var(--text,#16181A)}
  #auth-card{width:340px;display:flex;flex-direction:column;gap:18px;padding:30px 28px;
    background:var(--surface,#fff);border:1px solid var(--line,#E8E8E4);border-radius:14px}
  #auth-card h2{margin:0;font-size:17px;font-weight:600;letter-spacing:-.3px}
  #auth-card .dot{width:9px;height:9px;border-radius:99px;
    background:linear-gradient(140deg,var(--accent,#F59300),var(--accent2,#FF6A00))}
  #auth-card label{font-size:11.5px;color:var(--muted,#86898E);display:block;margin-bottom:5px}
  #auth-card input{width:100%;border:1px solid var(--line,#E8E8E4);background:var(--bg,#FAFAF8);
    border-radius:8px;padding:10px 12px;font-size:13px;font-family:inherit;color:inherit;outline:none}
  #auth-card input:focus{border-color:var(--accent,#F59300)}
  #auth-card button.primary{background:linear-gradient(140deg,var(--accent,#F59300),var(--accent2,#FF6A00));
    border:0;color:#1A1206;font-weight:600;font-size:13px;padding:11px;border-radius:8px;
    font-family:inherit;cursor:pointer}
  #auth-card button.primary:disabled{opacity:.6;cursor:default}
  #auth-card .link{background:none;border:0;font-family:inherit;font-size:12px;
    color:var(--muted,#86898E);cursor:pointer;text-decoration:underline}
  #auth-msg{font-size:12px;line-height:1.4;min-height:16px}
  #auth-msg.err{color:#A63A31}#auth-msg.ok{color:#28794A}
  #auth-user{position:fixed;top:14px;right:18px;z-index:50;display:flex;align-items:center;gap:10px;
    font-family:'Inter Tight',system-ui,sans-serif;font-size:11.5px;color:var(--muted,#86898E)}
  #auth-user button{font-family:inherit;font-size:11.5px;padding:5px 10px;border-radius:7px;
    border:1px solid var(--line,#E8E8E4);background:var(--surface,#fff);color:var(--text3,#5C5F64);cursor:pointer}
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  /* --------------------------------------------------------------- markup */
  function overlay() {
    const el = document.createElement("div");
    el.id = "auth-overlay";
    el.innerHTML = `
      <div id="auth-card">
        <div style="display:flex;align-items:center;gap:9px">
          <div class="dot"></div>
          <h2>${window.APP_NAME || "CRM"}</h2>
        </div>
        <div>
          <label>E-mail</label>
          <input id="auth-email" type="email" autocomplete="email" placeholder="voce@empresa.com.br" />
        </div>
        <div>
          <label>Senha</label>
          <input id="auth-pass" type="password" autocomplete="current-password" placeholder="••••••••" />
        </div>
        <div id="auth-msg"></div>
        <button class="primary" id="auth-go">Entrar</button>
        <div style="display:flex;justify-content:space-between">
          <button class="link" id="auth-toggle">Criar conta</button>
          <button class="link" id="auth-reset">Esqueci a senha</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  function userBar(email) {
    const el = document.createElement("div");
    el.id = "auth-user";
    el.innerHTML = `<span>${email}</span><button id="auth-out">Sair</button>`;
    document.body.appendChild(el);
    el.querySelector("#auth-out").onclick = () => window.signOut();
  }

  /* ----------------------------------------------------------------- init */
  async function init() {
    const { createClient } = await import(CDN);
    const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    window.sb = sb;
    window.signOut = async () => {
      await sb.auth.signOut();
      location.reload();
    };

    const box = overlay();
    const $ = (id) => box.querySelector(id);
    const msg = $("#auth-msg");
    const say = (t, cls) => {
      msg.textContent = t;
      msg.className = cls || "";
    };
    let mode = "login";

    $("#auth-toggle").onclick = () => {
      mode = mode === "login" ? "signup" : "login";
      $("#auth-go").textContent = mode === "login" ? "Entrar" : "Criar conta";
      $("#auth-toggle").textContent = mode === "login" ? "Criar conta" : "Já tenho conta";
      say("");
    };

    $("#auth-reset").onclick = async () => {
      const email = $("#auth-email").value.trim();
      if (!email) return say("Informe o e-mail primeiro.", "err");
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname,
      });
      say(error ? error.message : "Enviamos um link de redefinição para seu e-mail.", error ? "err" : "ok");
    };

    $("#auth-go").onclick = submit;
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });

    async function submit() {
      const email = $("#auth-email").value.trim();
      const password = $("#auth-pass").value;
      if (!email || !password) return say("Preencha e-mail e senha.", "err");
      $("#auth-go").disabled = true;
      say("Aguarde…");
      try {
        if (mode === "login") {
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } else {
          const { data, error } = await sb.auth.signUp({ email, password });
          if (error) throw error;
          if (!data.session) {
            $("#auth-go").disabled = false;
            return say("Conta criada. Confirme o e-mail e depois faça login.", "ok");
          }
        }
        await enter();
      } catch (e) {
        $("#auth-go").disabled = false;
        say(traduz(e.message), "err");
      }
    }

    function traduz(m) {
      if (/Invalid login credentials/i.test(m)) return "E-mail ou senha inválidos.";
      if (/User already registered/i.test(m)) return "Este e-mail já tem conta. Faça login.";
      if (/Password should be/i.test(m)) return "A senha precisa ter ao menos 6 caracteres.";
      return m;
    }

    /* garante a linha em public.consultants e libera o app */
    async function enter() {
      const { data: { user } } = await sb.auth.getUser();
      window.currentUser = { id: user.id, email: user.email };

      let { data: row } = await sb
        .from("consultants")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!row) {
        const ins = await sb
          .from("consultants")
          .insert({
            auth_user_id: user.id,
            name: (user.email || "").split("@")[0],
            email: user.email,
          })
          .select()
          .single();
        row = ins.data;
      }

      window.me = row || { auth_user_id: user.id, email: user.email, role: "consultor" };
      box.remove();
      userBar(user.email);
      readyCbs.splice(0).forEach((cb) => cb(window.me));
      document.dispatchEvent(new CustomEvent("auth:ready", { detail: window.me }));
    }

    const { data: { session } } = await sb.auth.getSession();
    if (session) await enter();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
