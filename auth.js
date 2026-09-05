/* ------------------------------------------------------------------
   auth.js — cliente Supabase + tela de login (M4 Solar)
   Requer config.js carregado ANTES deste arquivo.

   Expõe:
     window.sb          -> cliente Supabase
     window.currentUser -> { id, email }
     window.me          -> linha de public.consultants do usuário logado
     window.signOut()
     window.onAuthReady(cb)
------------------------------------------------------------------- */
(function () {
  const CDN = "https://esm.sh/@supabase/supabase-js@2";
  const readyCbs = [];
  window.onAuthReady = (cb) => {
    if (window.me) cb(window.me);
    else readyCbs.push(cb);
  };

  const BRAND = window.APP_NAME || "M4 Solar";

  /* ------------------------------------------------------------- estilos */
  const css = `
  #auth-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
    padding:24px;background:#0E0E0E;font-family:'Inter Tight',system-ui,sans-serif;color:#F2F2F0;
    -webkit-font-smoothing:antialiased;overflow:auto}
  #auth-overlay::before{content:"";position:absolute;inset:0;
    background:radial-gradient(900px 500px at 18% 42%,rgba(245,147,0,.16),transparent 62%);pointer-events:none}

  #auth-card{position:relative;width:min(940px,100%);display:grid;grid-template-columns:1fr 1fr;
    background:#1A1A1A;border:1px solid #2C2C2C;border-radius:18px;overflow:hidden;
    box-shadow:0 30px 80px rgba(0,0,0,.55)}

  #auth-brand{position:relative;padding:44px 42px;display:flex;flex-direction:column;gap:28px;
    background:linear-gradient(150deg,#241800 0%,#191308 46%,#161616 100%);border-right:1px solid #2C2C2C}
  #auth-brand .logo{display:flex;align-items:center;gap:13px}
  #auth-brand .mark{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(140deg,#F59300,#FF6A00);box-shadow:0 0 30px rgba(255,140,0,.35)}
  #auth-brand .mark svg{width:24px;height:24px;stroke:#1A1206;fill:none;stroke-width:2;
    stroke-linecap:round;stroke-linejoin:round}
  #auth-brand .name{font-size:20px;font-weight:600;letter-spacing:-.4px;line-height:1.1}
  #auth-brand .sub{font-size:10px;letter-spacing:1.6px;color:#8A8A86;margin-top:2px}
  #auth-brand h1{margin:0;font-size:29px;font-weight:700;letter-spacing:-.9px;line-height:1.22}
  #auth-brand h1 em{font-style:normal;
    background:linear-gradient(120deg,#FFB300,#FF7A18);-webkit-background-clip:text;background-clip:text;color:transparent}
  #auth-brand p{margin:0;font-size:13px;line-height:1.6;color:#9C9C98;max-width:330px}
  #auth-brand ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px}
  #auth-brand li{display:flex;align-items:center;gap:11px;font-size:12.5px;color:#C6C6C2}
  #auth-brand li svg{width:15px;height:15px;flex:0 0 auto;stroke:#FFB300;fill:none;stroke-width:2;
    stroke-linecap:round;stroke-linejoin:round}
  #auth-brand .foot{margin-top:auto;font-size:11px;color:#5A5A57}

  #auth-form{padding:50px 46px;display:flex;flex-direction:column;justify-content:center;gap:0}
  #auth-form h2{margin:0;font-size:25px;font-weight:600;letter-spacing:-.7px}
  #auth-form .hint{font-size:12.5px;color:#8A8A86;margin:6px 0 24px}
  #auth-form label{display:block;font-size:10px;font-weight:500;letter-spacing:1.1px;
    color:#8A8A86;margin:0 0 7px}
  .auth-field{margin-bottom:16px;position:relative}
  #auth-form input{width:100%;border:1px solid #2C2C2C;background:#131313;border-radius:9px;
    padding:12px 14px;font-size:13.5px;font-family:inherit;color:#F2F2F0;outline:none;transition:.15s}
  #auth-form input:focus{border-color:#F59300;box-shadow:0 0 0 3px rgba(245,147,0,.14)}
  #auth-form input::placeholder{color:#5A5A57}
  #auth-eye{position:absolute;right:6px;bottom:5px;width:32px;height:32px;border:0;background:none;
    cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
  #auth-eye svg{width:16px;height:16px;stroke:#757571;fill:none;stroke-width:2;
    stroke-linecap:round;stroke-linejoin:round}
  #auth-eye:hover svg{stroke:#C6C6C2}

  #auth-go{width:100%;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:9px;
    background:linear-gradient(140deg,#F59300,#FF6A00);border:0;color:#1A1206;font-weight:600;
    font-size:13.5px;padding:13px;border-radius:9px;font-family:inherit;cursor:pointer;transition:.15s}
  #auth-go:hover{filter:brightness(1.08)}
  #auth-go:disabled{opacity:.55;cursor:default;filter:none}
  #auth-go svg{width:16px;height:16px;stroke:#1A1206;fill:none;stroke-width:2;
    stroke-linecap:round;stroke-linejoin:round}

  #auth-msg{font-size:12.5px;line-height:1.45;min-height:18px;margin:14px 0 0;text-align:center}
  #auth-msg.err{color:#FF8A7A}
  #auth-msg.ok{color:#57D68C}

  #auth-links{display:flex;justify-content:center;gap:18px;margin-top:14px}
  #auth-links button{background:none;border:0;font-family:inherit;font-size:12px;color:#8A8A86;
    cursor:pointer;padding:0}
  #auth-links button:hover{color:#FFB300}
  #auth-admin-note{text-align:center;font-size:11.5px;color:#5A5A57;margin-top:14px}

  @media (max-width:820px){
    #auth-card{grid-template-columns:1fr}
    #auth-brand{display:none}
    #auth-form{padding:38px 28px}
  }`;

  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap";
  document.head.appendChild(font);

  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  const SVG = {
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    funnel: '<path d="M3 4h18l-7 8.2V19l-4 2v-8.8z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
    percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    shield: '<path d="M12 3l8 3v6c0 4.4-3.2 7.9-8 9-4.8-1.1-8-4.6-8-9V6z"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M9.9 5.2A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.3 6.4A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4-.8"/><line x1="3" y1="3" x2="21" y2="21"/>',
  };
  const svg = (p) => '<svg viewBox="0 0 24 24">' + p + "</svg>";

  /* --------------------------------------------------------------- markup */
  function overlay() {
    const el = document.createElement("div");
    el.id = "auth-overlay";
    el.innerHTML = `
      <div id="auth-card">
        <div id="auth-brand">
          <div class="logo">
            <div class="mark">${svg(SVG.sun)}</div>
            <div>
              <div class="name">${BRAND}</div>
              <div class="sub">ENERGIA SOLAR</div>
            </div>
          </div>
          <h1>Gerencie seus projetos<br><em>solares</em> com eficiência</h1>
          <p>Clientes, leads, funil de projetos, reciclagem e comissões em um só lugar.</p>
          <ul>
            <li>${svg(SVG.users)}Gestão de clientes e leads</li>
            <li>${svg(SVG.funnel)}Funil da proposta à homologação</li>
            <li>${svg(SVG.percent)}Comissão de 5% por projeto fechado</li>
            <li>${svg(SVG.shield)}Controle de acesso por perfil</li>
          </ul>
          <div class="foot">© ${new Date().getFullYear()} ${BRAND}</div>
        </div>

        <div id="auth-form">
          <h2 id="auth-title">Bem-vindo de volta</h2>
          <div class="hint" id="auth-hint">Entre com suas credenciais para acessar o sistema</div>

          <div class="auth-field">
            <label for="auth-email">E-MAIL</label>
            <input id="auth-email" type="email" autocomplete="email" placeholder="voce@m4solar.com.br" />
          </div>

          <div class="auth-field">
            <label for="auth-pass">SENHA</label>
            <input id="auth-pass" type="password" autocomplete="current-password" placeholder="••••••••" />
            <button id="auth-eye" type="button" title="Mostrar senha">${svg(SVG.eye)}</button>
          </div>

          <button id="auth-go">${svg(SVG.login)}<span>Entrar</span></button>
          <div id="auth-msg"></div>
          <div id="auth-links">
            <button id="auth-reset">Esqueci a senha</button>
          </div>
          <div id="auth-admin-note">Não tem acesso? Fale com o administrador do sistema.</div>
        </div>
      </div>`;
    document.body.appendChild(el);
    return el;
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
    const say = (t, cls) => { msg.textContent = t; msg.className = cls || ""; };

    $("#auth-eye").onclick = function toggleEye() {
      const i = $("#auth-pass");
      const show = i.type === "password";
      i.type = show ? "text" : "password";
      const b = $("#auth-eye");
      b.innerHTML = svg(show ? SVG.eyeOff : SVG.eye);
      b.title = show ? "Ocultar senha" : "Mostrar senha";
      b.onclick = toggleEye;
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
    box.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    async function submit() {
      const email = $("#auth-email").value.trim();
      const password = $("#auth-pass").value;
      if (!email || !password) return say("Preencha e-mail e senha.", "err");
      $("#auth-go").disabled = true;
      say("Aguarde…");
      try {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
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
      if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail antes de entrar.";
      return m;
    }

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
        if (ins.error) {
          say(
            "Não foi possível preparar seu cadastro (" + ins.error.message +
            "). Peça ao administrador para rodar auth_policies.sql no Supabase.",
            "err"
          );
          $("#auth-go").disabled = false;
          return;
        }
        row = ins.data;
      }

      window.me = row || { auth_user_id: user.id, email: user.email, role: "consultor" };
      box.remove();
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
