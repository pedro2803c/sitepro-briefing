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

  // Color palette presets
  document.querySelectorAll('.swatch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const coresInput = document.getElementById('cores');
      coresInput.value = btn.dataset.palette;
      coresInput.focus();
      scheduleSave();
    });
  });

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

      logo_status: getVal('logo_status'),
      tema_fundo: getVal('tema_fundo'),
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (saveStatusText) saveStatusText.textContent = 'Rascunho salvo';
    } catch (_) {}
  }

  function scheduleSave() {
    if (saveStatusText) saveStatusText.textContent = 'Salvando...';
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
        } else if (key === 'estilo') {
          const radio = form.querySelector(`input[name="estilo"][value="${CSS.escape(val)}"]`);
          if (radio) radio.checked = true;
        } else {
          const el = document.getElementById(key);
          if (el && typeof val === 'string') el.value = val;
        }
      });

      if (data._step && data._step >= 1 && data._step <= TOTAL_STEPS) {
        goToStep(data._step, false);
      }
      if (saveStatusText) saveStatusText.textContent = 'Rascunho recuperado';
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
          ['Logotipo', d.logo_status],
          ['Estilo visual', d.estilo],
          ['Tema de fundo', d.tema_fundo],
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
      `• Logo: ${d.logo_status}`,
      `• Estilo: ${d.estilo}`,
      `• Fundo: ${d.tema_fundo}`,
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
      t.classList.toggle('completed', s < currentStep);
    });

    stepCounter.textContent = `Etapa ${currentStep} de ${TOTAL_STEPS}`;
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
    if (validateStep(currentStep)) goToStep(currentStep + 1);
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
    submitBtn.querySelector('.btn-label').textContent = 'Enviando briefing...';

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
      '17_Logotipo': d.logo_status,
      '18_Estilo_Visual': d.estilo,
      '19_Tema_Fundo': d.tema_fundo,
      '20_Cores': d.cores || '-',
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

      // Show success state
      renderReview(successReviewBox, false);
      successWaBtn.href = buildWhatsAppUrl(true);
      form.hidden = true;
      heroSection.hidden = true;
      stepperNav.hidden = true;
      successSection.hidden = false;
      progressFill.style.width = '100%';
      stepCounter.textContent = 'Concluído ✓';
      if (saveStatusText) saveStatusText.textContent = 'Briefing enviado';
      localStorage.removeItem(STORAGE_KEY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) {
      fallbackWaBtn.href = buildWhatsAppUrl(false);
      submitError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitBtn.querySelector('.btn-label').textContent = 'Tentar enviar novamente →';
    }
  });

  // Success buttons
  copySummaryBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(buildPlainSummary());
      copySummaryBtn.textContent = 'Resumo copiado ✓';
      setTimeout(() => (copySummaryBtn.textContent = 'Copiar resumo do briefing'), 2500);
    } catch (_) {}
  });

  printPdfBtn.addEventListener('click', () => window.print());

  newBriefingBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });

  // Init
  restoreDraft();
})();
