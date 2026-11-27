(() => {
  const STORAGE_KEY = 'sitepro_briefing_draft_v1';
  const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/1b48b570aacae35a6aa375e741964f04';
  const WHATSAPP_NUMBER = '5549998339734';
  const TOTAL_STEPS = 6;

  const form = document.getElementById('briefingForm');
  const panels = Array.from(document.querySelectorAll('.step-panel'));
  const tabs = Array.from(document.querySelectorAll('.step-tab'));
  const progressFill = document.getElementById('progressFill');
  const stepCounter = document.getElementById('stepCounter');
  const saveStatusText = document.getElementById('saveStatusText');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const reviewBox = document.getElementById('reviewBox');
  const submitError = document.getElementById('submitError');
  const fallbackWaBtn = document.getElementById('fallbackWaBtn');
  const successSection = document.getElementById('successSection');
  const successReviewBox = document.getElementById('successReviewBox');
  const successWaBtn = document.getElementById('successWaBtn');
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  const printPdfBtn = document.getElementById('printPdfBtn');
  const newBriefingBtn = document.getElementById('newBriefingBtn');
  const heroSection = document.getElementById('heroSection');
  const stepperNav = document.getElementById('stepperNav');
  const copyWhatsBtn = document.getElementById('copyWhatsBtn');

  let currentStep = 1;
  let saveTimer = null;

  // ---------- Modelos do portfólio (siteprobrasil.com.br) ----------
  const MODELS = [
    { id: 'vellura', name: 'Vellura', seg: 'Psicologia e bem-estar' },
    { id: 'advocacia', name: 'Martins & Rocha', seg: 'Advocacia' },
    { id: 'steepl', name: 'Steepl', seg: 'Engenharia' },
    { id: 'sushi', name: 'Sushi Today', seg: 'Restaurante japonês' },
    { id: 'sonder', name: 'Sonder House', seg: 'Imobiliária' },
    { id: 'contabilidade', name: 'Contabilidade Mais', seg: 'Contabilidade' },
    { id: 'saborearte', name: 'Sabor & Arte', seg: 'Gastronomia' },
    { id: 'dentora', name: 'Dentora', seg: 'Odontologia' },
    { id: 'nutrisavvy', name: 'NutriSavvy', seg: 'Nutrição' },
    { id: 'crust', name: 'Crust Pizza Co.', seg: 'Pizzaria' },
  ];
  const modelGrid = document.getElementById('modelGrid');
  if (modelGrid) {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    modelGrid.innerHTML =
      MODELS.map((m, i) => {
        const value = `${String(i + 1).padStart(2, '0')} · ${m.name} (${m.seg})`;
        return `<label class="model-card">
          <input type="radio" name="modelo_referencia" value="${esc(value)}" />
          <span class="model-shot"><img src="/assets/modelos/${m.id}.webp" alt="Modelo ${esc(m.name)}" loading="lazy" width="640" height="1936" /></span>
          <span class="model-info">
            <span class="model-num">${String(i + 1).padStart(2, '0')}</span>
            <span class="model-txt"><strong>${esc(m.name)}</strong><small>${esc(m.seg)}</small></span>
            <span class="model-check ms fill">check_circle</span>
          </span>
          <a class="model-link" href="https://www.siteprobrasil.com.br/demo?m=${m.id}" target="_blank" rel="noopener">Ver modelo<span class="ms">open_in_new</span></a>
        </label>`;
      }).join('') +
      `<label class="model-card model-none">
        <input type="radio" name="modelo_referencia" value="Nenhum, prefiro um visual diferente" />
        <span class="model-none-body"><span class="ms">edit_square</span><strong>Prefiro algo diferente</strong><small>Vou explicar nas referências abaixo</small></span>
        <span class="model-check ms fill">check_circle</span>
      </label>`;
    modelGrid.querySelectorAll('.model-link').forEach((a) => a.addEventListener('click', (e) => e.stopPropagation()));
  }
  // ---------- Progresso do briefing ----------
  const STEPS = [
    { icon: 'storefront', name: 'Empresa e domínio' },
    { icon: 'work', name: 'Negócio e serviços' },
    { icon: 'palette', name: 'Identidade visual' },
    { icon: 'dashboard', name: 'Estrutura e materiais' },
    { icon: 'forum', name: 'Canais e redes' },
    { icon: 'send', name: 'Revisão e envio' },
  ];
  let doneMissions = new Set();

  const xpText = document.getElementById('xpText');
  const xpMaxEl = document.getElementById('xpMax');
  const xpFill = document.getElementById('xpFill');
  const pctValue = document.getElementById('pctValue');
  const pcRing = document.getElementById('pcRing');
  const levelName = document.getElementById('levelName');
  const nextGoal = document.getElementById('nextGoal');
  const toast = document.getElementById('toast');
  let toastTimer = null;

  // Itens que contam no progresso (selects não contam: já vêm preenchidos)
  function trackedItems(panel) {
    const items = [];
    const seenGroups = new Set();
    panel.querySelectorAll('input, textarea').forEach((el) => {
      if (el.classList.contains('hp-field') || el.id === 'lgpd') return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (seenGroups.has(el.name)) return;
        seenGroups.add(el.name);
        items.push(() => panel.querySelectorAll(`input[name="${el.name}"]:checked`).length > 0);
      } else {
        items.push(() => el.value.trim().length > 0);
      }
    });
    if (panel.querySelector('#lgpd')) items.push(() => document.getElementById('lgpd').checked);
    return items;
  }
  const panelItems = panels.map(trackedItems);
  const TOTAL_ITEMS = panelItems.reduce((s, it) => s + it.length, 0);

  // Medidor de respostas dentro de cada etapa
  panels.forEach((panel) => {
    const head = panel.querySelector('.panel-head');
    const meter = document.createElement('div');
    meter.className = 'mission-meter';
    meter.innerHTML = `<div class="mm-track"><div class="mm-fill"></div></div><span class="mm-text"></span>`;
    head.appendChild(meter);
    panel._meter = meter;
  });

  function updateGame() {
    let filledTotal = 0;
    panels.forEach((panel, idx) => {
      const items = panelItems[idx];
      const filled = items.filter((fn) => fn()).length;
      filledTotal += filled;
      const pct = items.length ? Math.round((filled / items.length) * 100) : 0;
      panel._meter.querySelector('.mm-fill').style.width = pct + '%';
      panel._meter.querySelector('.mm-text').textContent = `${filled} de ${items.length} respondidas`;
    });
    // 70% pelo preenchimento + 30% pelas etapas concluídas
    const pct = Math.min(100, Math.round((filledTotal / TOTAL_ITEMS) * 70 + (doneMissions.size / STEPS.length) * 30));
    const finalPct = doneMissions.size === STEPS.length ? 100 : pct;
    xpText.textContent = filledTotal;
    xpMaxEl.textContent = TOTAL_ITEMS;
    xpFill.style.width = finalPct + '%';
    pctValue.textContent = finalPct + '%';
    pcRing.style.setProperty('--p', finalPct);
    pcRing.classList.toggle('done', finalPct === 100);
    levelName.textContent = doneMissions.size === STEPS.length ? 'Briefing enviado' : `Etapa ${currentStep} de ${STEPS.length}`;
    const next = STEPS.findIndex((_, i) => !doneMissions.has(i + 1));
    nextGoal.textContent = next === -1 ? 'Todas as etapas concluídas' : `Agora: ${STEPS[next].name}`;
  }

  function showToast(stepNum) {
    const s = STEPS[stepNum - 1];
    document.getElementById('toastKicker').textContent = `ETAPA 0${stepNum} CONCLUÍDA`;
    document.getElementById('toastTitle').textContent = `${s.name}: respostas salvas`;
    document.getElementById('toastSub').textContent = stepNum < STEPS.length ? `Próxima: ${STEPS[stepNum].name}` : 'Briefing enviado para a equipe';
    toast.hidden = false;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => (toast.hidden = true), 300);
    }, 2600);
  }

  function completeMission(step) {
    if (doneMissions.has(step)) return;
    doneMissions.add(step);
    updateGame();
    if (step < STEPS.length) showToast(step);
  }

  // ---------- Comemoração final (confetes) ----------
  function launchConfetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const colors = ['#D5F65A', '#D5F65A', '#0B0B0C', '#FFFFFF', '#C2E544'];
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const pieces = [];
    const burst = (x, dir, n) => {
      for (let i = 0; i < n; i++) {
        const angle = (-Math.PI / 2) + dir * (Math.random() * 0.9 + 0.15);
        const speed = 9 + Math.random() * 10;
        pieces.push({
          x, y: H() + 10,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 4,
          w: 6 + Math.random() * 7, h: 9 + Math.random() * 9,
          r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
          tilt: Math.random() * Math.PI, vt: 0.08 + Math.random() * 0.12,
          color: colors[(Math.random() * colors.length) | 0],
          round: Math.random() < 0.25,
        });
      }
    };
    burst(W() * 0.08, 1, 110);
    burst(W() * 0.92, -1, 110);
    setTimeout(() => { burst(W() * 0.3, 1, 60); burst(W() * 0.7, -1, 60); }, 450);
    const start = performance.now();
    const frame = (now) => {
      ctx.clearRect(0, 0, W(), H());
      const t = now - start;
      pieces.forEach((p) => {
        p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.r += p.vr; p.tilt += p.vt;
        const sy = Math.abs(Math.cos(p.tilt));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = t > 3800 ? Math.max(0, 1 - (t - 3800) / 900) : 1;
        ctx.fillStyle = p.color;
        if (p.color === '#FFFFFF') { ctx.strokeStyle = 'rgba(11,11,12,.25)'; ctx.lineWidth = 1; }
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); if (p.color === '#FFFFFF') ctx.stroke(); }
        else { ctx.fillRect(-p.w / 2, (-p.h / 2) * sy, p.w, p.h * sy); if (p.color === '#FFFFFF') ctx.strokeRect(-p.w / 2, (-p.h / 2) * sy, p.w, p.h * sy); }
        ctx.restore();
      });
      if (t < 4700) requestAnimationFrame(frame);
      else { window.removeEventListener('resize', resize); canvas.remove(); }
    };
    requestAnimationFrame(frame);
  }

  function celebrate() {
    document.getElementById('toastIcon').textContent = 'check_circle';
    document.getElementById('toastKicker').textContent = '6 DE 6 ETAPAS CONCLUÍDAS';
    document.getElementById('toastTitle').textContent = 'Parabéns! Você completou todo o briefing';
    document.getElementById('toastSub').textContent = 'Nossa equipe já recebeu suas respostas';
    toast.classList.add('toast-final');
    toast.hidden = false;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.hidden = true; toast.classList.remove('toast-final'); }, 300);
    }, 5200);
    launchConfetti();
  }

  // Phone mask (Brazil)
  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  document.querySelectorAll('[data-phone]').forEach((input) => {
    input.addEventListener('input', (e) => {
      e.target.value = formatPhone(e.target.value);
    });
  });

  // ---------- Seletor de cores da marca (até 4) ----------
  const MAX_COLORS = 4;
  const COLOR_ROLES = ['Principal', 'Secundária', 'Destaque', 'Apoio'];
  const DEFAULT_COLORS = ['#1F3A5F', '#F2F2F2', '#E0A526', '#2E2E2E'];
  const paletteSlots = document.getElementById('paletteSlots');
  const paletteAdd = document.getElementById('paletteAdd');
  const paletaInput = document.getElementById('paleta');
  let palette = [];

  const normHex = (v) => {
    let h = String(v || '').trim().replace(/^#?/, '#').toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(h)) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
    return /^#[0-9A-F]{6}$/.test(h) ? h : null;
  };

  function syncPalette() {
    paletaInput.value = palette.map((c, i) => `${COLOR_ROLES[i]} ${c}`).join(', ');
    scheduleSave();
  }

  function renderPalette() {
    paletteSlots.innerHTML = palette.map((c, i) => `
      <div class="palette-slot" data-i="${i}">
        <label class="palette-swatch" style="--c:${c}" title="Escolher cor ${COLOR_ROLES[i].toLowerCase()}">
          <input type="color" value="${c.toLowerCase()}" data-i="${i}" aria-label="Cor ${COLOR_ROLES[i]}" />
        </label>
        <div class="palette-meta">
          <small>${COLOR_ROLES[i]}</small>
          <input type="text" class="palette-hex" value="${c}" maxlength="7" spellcheck="false" data-i="${i}" aria-label="Código HEX da cor ${COLOR_ROLES[i]}" />
        </div>
        <button type="button" class="palette-remove" data-i="${i}" aria-label="Remover cor ${COLOR_ROLES[i]}"><span class="ms">close</span></button>
      </div>`).join('');
    paletteAdd.hidden = palette.length >= MAX_COLORS;
    paletteAdd.querySelector('.ms').nextSibling.textContent = palette.length ? `Adicionar cor (${palette.length}/${MAX_COLORS})` : 'Adicionar cor';
  }

  paletteSlots.addEventListener('input', (e) => {
    const i = Number(e.target.dataset.i);
    if (e.target.type === 'color') {
      palette[i] = e.target.value.toUpperCase();
      const slot = e.target.closest('.palette-slot');
      slot.querySelector('.palette-swatch').style.setProperty('--c', palette[i]);
      slot.querySelector('.palette-hex').value = palette[i];
      syncPalette();
    } else if (e.target.classList.contains('palette-hex')) {
      const h = normHex(e.target.value);
      e.target.classList.toggle('invalid', !h && e.target.value.length > 0);
      if (h) {
        palette[i] = h;
        const slot = e.target.closest('.palette-slot');
        slot.querySelector('.palette-swatch').style.setProperty('--c', h);
        slot.querySelector('input[type="color"]').value = h.toLowerCase();
        syncPalette();
      }
    }
    e.stopPropagation();
  });
  paletteSlots.addEventListener('change', (e) => e.stopPropagation());
  paletteSlots.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('palette-hex')) {
      e.target.value = palette[Number(e.target.dataset.i)];
      e.target.classList.remove('invalid');
    }
  });
  paletteSlots.addEventListener('click', (e) => {
    const btn = e.target.closest('.palette-remove');
    if (!btn) return;
    palette.splice(Number(btn.dataset.i), 1);
    renderPalette();
    syncPalette();
  });
  paletteAdd.addEventListener('click', () => {
    if (palette.length >= MAX_COLORS) return;
    const used = new Set(palette);
    palette.push(DEFAULT_COLORS.find((c) => !used.has(c)) || '#888888');
    renderPalette();
    syncPalette();
    const last = paletteSlots.querySelector('.palette-slot:last-child input[type="color"]');
    if (last) { try { last.showPicker ? last.showPicker() : last.click(); } catch (_) { last.click(); } }
  });

  document.querySelectorAll('.swatch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      palette = btn.dataset.hex.split(',').map(normHex).filter(Boolean).slice(0, MAX_COLORS);
      const coresInput = document.getElementById('cores');
      if (!coresInput.value.trim()) coresInput.value = btn.dataset.palette;
      renderPalette();
      syncPalette();
    });
  });

  function restorePalette() {
    palette = (paletaInput.value.match(/#[0-9A-Fa-f]{6}/g) || []).map(normHex).slice(0, MAX_COLORS);
    renderPalette();
  }
  renderPalette();

  // Copy WhatsApp from Step 1
  if (copyWhatsBtn) {
    copyWhatsBtn.addEventListener('click', () => {
      const w1 = document.getElementById('whatsapp').value;
      const w2 = document.getElementById('whats_site');
      if (w1) {
        w2.value = w1;
        scheduleSave();
      }
    });
  }

  // Collect structured form data
  function getData() {
    const getVal = (id) => (document.getElementById(id)?.value || '').trim();
    const getChecked = (name) =>
      Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
    const getRadio = (name) =>
      form.querySelector(`input[name="${name}"]:checked`)?.value || '';

    return {
      responsavel: getVal('responsavel'),
      empresa: getVal('empresa'),
      whatsapp: getVal('whatsapp'),
      email: getVal('email'),
      segmento: getVal('segmento'),
      cidade: getVal('cidade'),
      endereco: getVal('endereco'),
      horario: getVal('horario'),
      dominio_status: getVal('dominio_status'),
      dominio_desejado: getVal('dominio_desejado'),
      email_profissional: getVal('email_profissional'),

      sobre_empresa: getVal('sobre_empresa'),
      servicos: getVal('servicos'),
      publico: getVal('publico'),
      diferenciais: getVal('diferenciais'),
      objetivo: getChecked('objetivo'),
      cta_principal: getVal('cta_principal'),

      modelo_referencia: getRadio('modelo_referencia'),
      logo_status: getVal('logo_status'),
      logo_link: getVal('logo_link'),
      manual_marca: getVal('manual_marca'),
      tema_fundo: getVal('tema_fundo'),
      paleta: getVal('paleta'),
      cores: getVal('cores'),
      estilo: getRadio('estilo'),
      referencias: getVal('referencias'),
      nao_gosta: getVal('nao_gosta'),

      secoes: getChecked('secoes'),
      fotos_status: getVal('fotos_status'),
      link_arquivos: getVal('link_arquivos'),

      whats_site: getVal('whats_site') || getVal('whatsapp'),
      msg_whats: getVal('msg_whats'),
      instagram: getVal('instagram'),
      facebook: getVal('facebook'),
      linkedin: getVal('linkedin'),
      google_perfil: getVal('google_perfil'),
      rastreamento: getVal('rastreamento'),

      observacoes: getVal('observacoes'),
      lgpd: document.getElementById('lgpd').checked,
    };
  }

  // Save / Restore draft
  function saveDraft() {
    try {
      const data = getData();
      data._step = currentStep;
      data._done = Array.from(doneMissions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (saveStatusText) saveStatusText.textContent = 'Progresso salvo';
    } catch (_) {}
  }

  function scheduleSave() {
    if (saveStatusText) saveStatusText.textContent = 'Salvando...';
    updateGame();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 350);
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      Object.entries(data).forEach(([key, val]) => {
        if (key.startsWith('_') || key === 'lgpd') return;
        if (Array.isArray(val)) {
          form.querySelectorAll(`input[name="${key}"]`).forEach((cb) => {
            cb.checked = val.includes(cb.value);
          });
        } else if (key === 'estilo' || key === 'modelo_referencia') {
          const radio = form.querySelector(`input[name="${key}"][value="${CSS.escape(val)}"]`);
          if (radio) radio.checked = true;
        } else {
          const el = document.getElementById(key);
          if (el && typeof val === 'string') el.value = val;
        }
      });

      if (Array.isArray(data._done)) doneMissions = new Set(data._done.filter((n) => n >= 1 && n <= TOTAL_STEPS));
      if (data._step && data._step >= 1 && data._step <= TOTAL_STEPS) {
        goToStep(data._step, false);
      }
      if (saveStatusText) saveStatusText.textContent = 'Progresso recuperado';
    } catch (_) {}
  }

  form.addEventListener('input', scheduleSave);
  form.addEventListener('change', scheduleSave);

  // Validation
  function setErr(name, msg) {
    const errEl = form.querySelector(`[data-err-for="${name}"]`);
    const fieldEl = document.getElementById(name);
    if (errEl) errEl.textContent = msg || '';
    if (fieldEl) fieldEl.classList.toggle('invalid', Boolean(msg));
  }

  function validateStep(step) {
    let ok = true;
    const panel = panels[step - 1];
    panel.querySelectorAll('.err').forEach((e) => (e.textContent = ''));
    panel.querySelectorAll('.invalid').forEach((e) => e.classList.remove('invalid'));

    if (step === 1) {
      const reqFields = [
        ['responsavel', 'Informe seu nome completo.'],
        ['empresa', 'Informe o nome da sua empresa ou marca.'],
        ['whatsapp', 'Informe um WhatsApp válido com DDD.'],
        ['email', 'Informe um e-mail válido.'],
        ['segmento', 'Informe o segmento de atuação.'],
        ['cidade', 'Informe sua cidade/estado ou área de atendimento.'],
      ];
      reqFields.forEach(([id, msg]) => {
        const val = (document.getElementById(id).value || '').trim();
        if (!val) {
          setErr(id, msg);
          ok = false;
        } else if (id === 'whatsapp' && val.replace(/\D/g, '').length < 10) {
          setErr(id, 'Digite o DDD + número completo.');
          ok = false;
        } else if (id === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          setErr(id, 'Verifique o formato do e-mail.');
          ok = false;
        }
      });
    }

    if (step === 2) {
      if (!(document.getElementById('sobre_empresa').value || '').trim()) {
        setErr('sobre_empresa', 'Conte em poucas palavras o que sua empresa faz.');
        ok = false;
      }
      if (!(document.getElementById('servicos').value || '').trim()) {
        setErr('servicos', 'Liste ao menos os principais serviços ou produtos.');
        ok = false;
      }
      const checkedObj = form.querySelectorAll('input[name="objetivo"]:checked').length;
      if (!checkedObj) {
        setErr('objetivo', 'Selecione pelo menos um objetivo principal.');
        ok = false;
      }
    }

    if (step === 3) {
      ['logo_link', 'manual_marca'].forEach((id) => {
        const val = (document.getElementById(id).value || '').trim();
        if (val && !/^https?:\/\/\S+\.\S+/i.test(val)) {
          setErr(id, 'Cole o link completo, começando com https://');
          ok = false;
        }
      });
    }

    if (step === 6) {
      if (!document.getElementById('lgpd').checked) {
        setErr('lgpd', 'Confirme a autorização acima para enviar o briefing.');
        ok = false;
      }
    }

    if (!ok) {
      const firstInvalid = panel.querySelector('.invalid, .err:not(:empty)');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return ok;
  }

  // Build Review HTML
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderReview(targetEl, editable = true) {
    const d = getData();
    const groups = [
      {
        title: '01 · Empresa e Domínio',
        step: 1,
        items: [
          ['Responsável', d.responsavel],
          ['Empresa / Marca', d.empresa],
          ['WhatsApp', d.whatsapp],
          ['E-mail', d.email],
          ['Segmento', d.segmento],
          ['Cidade / Atendimento', d.cidade],
          ['Endereço', d.endereco],
          ['Horário', d.horario],
          ['Domínio (.com.br)', `${d.dominio_status}${d.dominio_desejado ? ' — ' + d.dominio_desejado : ''}`],
          ['E-mail profissional', d.email_profissional],
        ],
      },
      {
        title: '02 · Negócio e Serviços',
        step: 2,
        items: [
          ['Sobre a empresa', d.sobre_empresa, true],
          ['Principais serviços', d.servicos, true],
          ['Público-alvo', d.publico],
          ['Diferenciais', d.diferenciais],
          ['Objetivos do site', d.objetivo.join(', '), true],
          ['Botão principal (CTA)', d.cta_principal],
        ],
      },
      {
        title: '03 · Identidade Visual',
        step: 3,
        items: [
          ['Modelo de referência', d.modelo_referencia, true],
          ['Logotipo', d.logo_status],
          ['Link da logo', d.logo_link, true],
          ['PDF / manual da marca', d.manual_marca, true],
          ['Estilo visual', d.estilo],
          ['Tema de fundo', d.tema_fundo],
          ['Paleta da marca', d.paleta, true],
          ['Cores preferidas', d.cores],
          ['Referências visuais', d.referencias, true],
          ['Evitar no site', d.nao_gosta, true],
        ],
      },
      {
        title: '04 · Estrutura e Materiais',
        step: 4,
        items: [
          ['Seções escolhidas', d.secoes.join(', '), true],
          ['Fotos', d.fotos_status],
          ['Link da pasta de arquivos', d.link_arquivos],
        ],
      },
      {
        title: '05 · Canais e Redes',
        step: 5,
        items: [
          ['WhatsApp do site', d.whats_site],
          ['Mensagem pronta', d.msg_whats],
          ['Instagram', d.instagram],
          ['Facebook', d.facebook],
          ['LinkedIn / YouTube', d.linkedin],
          ['Google Meu Negócio', d.google_perfil],
          ['Rastreamento / Pixel', d.rastreamento],
        ],
      },
    ];

    if (!editable && d.observacoes) {
      groups.push({
        title: '06 · Observações Finais',
        step: 6,
        items: [['Observações', d.observacoes, true]],
      });
    }

    targetEl.innerHTML = groups
      .map((g) => {
        const filled = g.items.filter(([, val]) => val && String(val).trim() !== '');
        if (!filled.length) return '';
        return `
          <div class="review-group">
            <div class="review-group-head">
              <h3>${g.title}</h3>
              ${editable ? `<button type="button" class="edit-step-btn" data-jump="${g.step}">Editar</button>` : ''}
            </div>
            <div class="review-list">
              ${filled
                .map(
                  ([label, val, full]) => `
                <div class="review-item ${full ? 'full' : ''}">
                  <strong>${escapeHtml(label)}</strong>
                  <span>${escapeHtml(val)}</span>
                </div>`
                )
                .join('')}
            </div>
          </div>
        `;
      })
      .join('');

    if (editable) {
      targetEl.querySelectorAll('[data-jump]').forEach((btn) => {
        btn.addEventListener('click', () => goToStep(Number(btn.dataset.jump)));
      });
    }
  }

  // Plain-text summary for WhatsApp / Copy
  function buildPlainSummary() {
    const d = getData();
    const lines = [
      `*BRIEFING OFICIAL — SITEPRO BRASIL*`,
      ``,
      `*01. EMPRESA E DOMÍNIO*`,
      `• Responsável: ${d.responsavel}`,
      `• Empresa: ${d.empresa}`,
      `• WhatsApp: ${d.whatsapp}`,
      `• E-mail: ${d.email}`,
      `• Segmento: ${d.segmento}`,
      `• Cidade/Atendimento: ${d.cidade}`,
      d.endereco ? `• Endereço: ${d.endereco}` : null,
      d.horario ? `• Horário: ${d.horario}` : null,
      `• Domínio: ${d.dominio_status}${d.dominio_desejado ? ' (' + d.dominio_desejado + ')' : ''}`,
      d.email_profissional ? `• E-mail profissional: ${d.email_profissional}` : null,
      ``,
      `*02. NEGÓCIO E SERVIÇOS*`,
      `• Sobre: ${d.sobre_empresa}`,
      `• Serviços: ${d.servicos}`,
      d.publico ? `• Público-alvo: ${d.publico}` : null,
      d.diferenciais ? `• Diferenciais: ${d.diferenciais}` : null,
      `• Objetivos: ${d.objetivo.join(', ')}`,
      d.cta_principal ? `• CTA principal: ${d.cta_principal}` : null,
      ``,
      `*03. IDENTIDADE VISUAL*`,
      d.modelo_referencia ? `• Modelo de referência: ${d.modelo_referencia}` : null,
      `• Logo: ${d.logo_status}`,
      d.logo_link ? `• Link da logo: ${d.logo_link}` : null,
      d.manual_marca ? `• PDF/manual da marca: ${d.manual_marca}` : null,
      `• Estilo: ${d.estilo}`,
      `• Fundo: ${d.tema_fundo}`,
      d.paleta ? `• Paleta: ${d.paleta}` : null,
      d.cores ? `• Cores: ${d.cores}` : null,
      d.referencias ? `• Referências: ${d.referencias}` : null,
      d.nao_gosta ? `• Evitar: ${d.nao_gosta}` : null,
      ``,
      `*04. ESTRUTURA E MATERIAIS*`,
      `• Seções: ${d.secoes.join(', ')}`,
      `• Fotos: ${d.fotos_status}`,
      d.link_arquivos ? `• Pasta de arquivos: ${d.link_arquivos}` : null,
      ``,
      `*05. CANAIS E REDES*`,
      `• WhatsApp do site: ${d.whats_site}`,
      d.msg_whats ? `• Mensagem pronta: ${d.msg_whats}` : null,
      d.instagram ? `• Instagram: ${d.instagram}` : null,
      d.facebook ? `• Facebook: ${d.facebook}` : null,
      d.linkedin ? `• LinkedIn/YouTube: ${d.linkedin}` : null,
      d.google_perfil ? `• Google Meu Negócio: ${d.google_perfil}` : null,
      d.rastreamento ? `• Rastreamento: ${d.rastreamento}` : null,
      d.observacoes ? `\n*06. OBSERVAÇÕES*\n${d.observacoes}` : null,
    ];
    return lines.filter((l) => l !== null).join('\n');
  }

  function buildWhatsAppUrl(shortVersion = false) {
    const d = getData();
    const text = shortVersion
      ? `Olá, equipe SitePro Brasil! Acabei de enviar o briefing oficial da empresa *${d.empresa}* (${d.responsavel}). Segue aqui o contato para envio da logo/fotos e acompanhamento.`
      : buildPlainSummary();
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  // Navigation
  function goToStep(step, scroll = true) {
    currentStep = Math.max(1, Math.min(TOTAL_STEPS, step));
    panels.forEach((p, idx) => p.classList.toggle('active', idx + 1 === currentStep));
    tabs.forEach((t, idx) => {
      const s = idx + 1;
      t.classList.toggle('active', s === currentStep);
      t.classList.toggle('completed', doneMissions.has(s));
    });

    stepCounter.textContent = `Etapa ${currentStep} de ${TOTAL_STEPS}`;
    updateGame();
    progressFill.style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;

    prevBtn.hidden = currentStep === 1;
    nextBtn.hidden = currentStep === TOTAL_STEPS;
    submitBtn.hidden = currentStep !== TOTAL_STEPS;

    if (currentStep === TOTAL_STEPS) {
      renderReview(reviewBox, true);
      fallbackWaBtn.href = buildWhatsAppUrl(false);
    }

    saveDraft();
    if (scroll) {
      window.scrollTo({ top: Math.max(0, stepperNav.offsetTop - 88), behavior: 'smooth' });
    }
  }

  prevBtn.addEventListener('click', () => goToStep(currentStep - 1));
  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      completeMission(currentStep);
      goToStep(currentStep + 1);
    }
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = Number(tab.dataset.step);
      if (target <= currentStep || validateStep(currentStep)) {
        goToStep(target);
      }
    });
  });

  // Submit via FormSubmit AJAX
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(1)) { goToStep(1); return; }
    if (!validateStep(2)) { goToStep(2); return; }
    if (!validateStep(6)) return;

    submitError.hidden = true;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.querySelector('.btn-label').textContent = 'Lançando briefing...';

    const d = getData();
    const payload = {
      _subject: `[BRIEFING SITEPRO] ${d.empresa} — ${d.responsavel}`,
      _template: 'table',
      _captcha: 'false',
      '01_Responsavel': d.responsavel,
      '02_Empresa': d.empresa,
      '03_WhatsApp': d.whatsapp,
      '04_Email': d.email,
      '05_Segmento': d.segmento,
      '06_Cidade_Atendimento': d.cidade,
      '07_Endereco': d.endereco || '-',
      '08_Horario': d.horario || '-',
      '09_Dominio': `${d.dominio_status}${d.dominio_desejado ? ' | ' + d.dominio_desejado : ''}`,
      '10_Email_Profissional': d.email_profissional || '-',
      '11_Sobre_Empresa': d.sobre_empresa,
      '12_Servicos': d.servicos,
      '13_Publico_Alvo': d.publico || '-',
      '14_Diferenciais': d.diferenciais || '-',
      '15_Objetivos': d.objetivo.join(', '),
      '16_CTA_Principal': d.cta_principal || '-',
      '16b_Modelo_Referencia': d.modelo_referencia || '-',
      '17_Logotipo': d.logo_status,
      '17a_Link_Logo': d.logo_link || '-',
      '17b_PDF_Manual_Marca': d.manual_marca || '-',
      '18_Estilo_Visual': d.estilo,
      '19_Tema_Fundo': d.tema_fundo,
      '20_Paleta_HEX': d.paleta || '-',
      '20a_Cores_Descricao': d.cores || '-',
      '21_Referencias': d.referencias || '-',
      '22_Evitar': d.nao_gosta || '-',
      '23_Secoes': d.secoes.join(', '),
      '24_Fotos': d.fotos_status,
      '25_Link_Arquivos': d.link_arquivos || '-',
      '26_WhatsApp_Site': d.whats_site,
      '27_Msg_WhatsApp': d.msg_whats || '-',
      '28_Instagram': d.instagram || '-',
      '29_Facebook': d.facebook || '-',
      '30_LinkedIn_YouTube': d.linkedin || '-',
      '31_Google_Meu_Negocio': d.google_perfil || '-',
      '32_Rastreamento': d.rastreamento || '-',
      '33_Observacoes': d.observacoes || '-',
    };

    try {
      const resp = await fetch(FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const result = await resp.json().catch(() => ({}));
      if (String(result.success) !== 'true') throw new Error(result.message || 'Envio não confirmado');

      // Show success state
      completeMission(6);
      renderReview(successReviewBox, false);
      successWaBtn.href = buildWhatsAppUrl(true);
      form.hidden = true;
      heroSection.hidden = true;
      stepperNav.hidden = true;
      successSection.hidden = false;
      progressFill.style.width = '100%';
      stepCounter.textContent = 'Briefing enviado';
      if (saveStatusText) saveStatusText.textContent = 'Briefing enviado';
      goToStepTabsDone();
      localStorage.removeItem(STORAGE_KEY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      celebrate();
    } catch (_) {
      fallbackWaBtn.href = buildWhatsAppUrl(false);
      submitError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitBtn.querySelector('.btn-label').textContent = 'Tentar enviar novamente';
    }
  });

  // Success buttons
  copySummaryBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(buildPlainSummary());
      const lbl = copySummaryBtn.querySelector('.btn-txt');
      lbl.textContent = 'Resumo copiado';
      setTimeout(() => (lbl.textContent = 'Copiar resumo do briefing'), 2500);
    } catch (_) {}
  });

  printPdfBtn.addEventListener('click', () => window.print());

  newBriefingBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });

  function goToStepTabsDone() {
    tabs.forEach((t, idx) => t.classList.toggle('completed', doneMissions.has(idx + 1)));
  }

  // Init
  restoreDraft();
  restorePalette();
  goToStep(currentStep, false);
  updateGame();
})();