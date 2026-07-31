const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={me:null,page:null,patients:[],selectedPatient:null};

async function api(url,options={}){
  const res=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},credentials:'same-origin',...options});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'Não foi possível concluir a operação.');
  return data;
}
function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function br(v=''){return escapeHtml(v).replace(/\n/g,'<br>')}
function fmtDate(v){if(!v)return'—';return new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(`${String(v).slice(0,10)}T12:00:00Z`))}
function fmtDateTime(v){if(!v)return'—';return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}
function toast(message,error=false){const t=$('#toast');t.textContent=message;t.className=`toast show${error?' error':''}`;clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.className='toast',3200)}
function openModal(html){$('#modalContent').innerHTML=html;$('#modal').classList.remove('hidden')}
function closeModal(){$('#modal').classList.add('hidden');$('#modalContent').innerHTML=''}
function value(id){return $(id)?.value??''}
function formJson(form){return Object.fromEntries(new FormData(form).entries())}
function setHeader(kicker,title){$('#pageKicker').textContent=kicker;$('#pageTitle').textContent=title}
function status(active,labelActive='Ativo',labelOff='Inativo'){return `<span class="status ${active?'ok':'off'}">${active?labelActive:labelOff}</span>`}
function stats(items){return `<div class="stats-grid">${items.map(i=>`<article class="stat-card"><span class="stat-label">${escapeHtml(i.label)}</span><strong class="stat-number">${escapeHtml(i.value)}</strong><small class="stat-help">${escapeHtml(i.help||'')}</small></article>`).join('')}</div>`}
function empty(text){return `<div class="empty">${escapeHtml(text)}</div>`}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-close-modal]'))closeModal();
  if(e.target.matches('[data-nav]'))navigate(e.target.dataset.nav);
});
$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#logoutBtn').addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST'});}catch{}location.reload()});
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=e.submitter;btn.disabled=true;btn.textContent='Entrando...';
  try{
    await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:value('#loginEmail'),password:value('#loginPassword')})});
    await boot();
  }catch(err){toast(err.message,true)}finally{btn.disabled=false;btn.textContent='Entrar'}
});

async function boot(){
  try{
    state.me=await api('/api/auth/me');
    $('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');
    renderShell();
    const first=state.me.user.role==='admin'?'admin-dashboard':state.me.user.role==='nutritionist'?'nutri-dashboard':'patient-dashboard';
    navigate(first);
  }catch{$('#loginView').classList.remove('hidden');$('#appView').classList.add('hidden')}
}
function renderShell(){
  const role=state.me.user.role;
  const menus={
    admin:[['admin-dashboard','Visão geral'],['admin-nutritionists','Nutricionistas']],
    nutritionist:[['nutri-dashboard','Visão geral'],['nutri-patients','Pacientes'],['nutri-calculator','Calculadora']],
    patient:[['patient-dashboard','Meu acompanhamento'],['patient-diary','Diário alimentar']]
  };
  $('#navMenu').innerHTML=menus[role].map(([id,label])=>`<button class="nav-btn" data-nav="${id}">${label}</button>`).join('');
  $('#userMini').innerHTML=`<strong>${escapeHtml(state.me.user.name)}</strong><span>${escapeHtml(state.me.user.email)}</span>`;
  $('#planBadge').innerHTML=role==='admin'?'Administrador':state.me.plan?.active?`${state.me.plan.daysRemaining} dias de licença`:role==='patient'?'Paciente':'Licença inativa';
}
async function navigate(page){
  state.page=page;$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.nav===page));$('#sidebar').classList.remove('open');$('#content').innerHTML='<div class="empty">Carregando...</div>';
  const routes={
    'admin-dashboard':renderAdminDashboard,'admin-nutritionists':renderAdminNutritionists,
    'nutri-dashboard':renderNutriDashboard,'nutri-patients':renderPatients,'nutri-calculator':renderCalculator,
    'patient-dashboard':renderPatientDashboard,'patient-diary':renderPatientDiary
  };
  try{await routes[page]()}catch(err){$('#content').innerHTML=`<div class="notice warning">${escapeHtml(err.message)}</div>`}
}

async function renderAdminDashboard(){
  setHeader('Administração','Visão geral');
  const d=await api('/api/admin/dashboard');
  $('#content').innerHTML=stats([
    {label:'Nutricionistas',value:d.totals.nutritionists,help:'Contas cadastradas'},
    {label:'Licenças ativas',value:d.totals.activeLicenses,help:'Com acesso liberado'},
    {label:'Licenças inativas',value:d.totals.expiredLicenses,help:'Vencidas ou pausadas'},
    {label:'Pacientes',value:d.totals.patients,help:'Em toda a plataforma'}
  ])+`<section class="panel"><div class="panel-head"><h3>Licenças recentes</h3><button class="btn primary small" id="quickNewNutri">Cadastrar nutricionista</button></div>${adminTable(d.nutritionists.slice(0,8))}</section>`;
  $('#quickNewNutri').onclick=openNewNutritionist;
  bindAdminActions();
}
async function renderAdminNutritionists(){
  setHeader('Administração','Nutricionistas e licenças');
  const d=await api('/api/admin/dashboard');
  $('#content').innerHTML=`<div class="page-actions"><button class="btn primary" id="newNutritionist">+ Cadastrar nutricionista</button></div><section class="panel"><div class="panel-head"><h3>Contas cadastradas</h3><span>${d.nutritionists.length} registros</span></div>${adminTable(d.nutritionists)}</section>`;
  $('#newNutritionist').onclick=openNewNutritionist;bindAdminActions();
}
function adminTable(list){
  if(!list.length)return empty('Nenhuma nutricionista cadastrada.');
  return `<div class="table-wrap"><table><thead><tr><th>Nutricionista</th><th>Clínica / CRN</th><th>Pacientes</th><th>Plano</th><th>Vencimento</th><th>Ações</th></tr></thead><tbody>${list.map(n=>`<tr>
    <td><strong>${escapeHtml(n.name)}</strong><br><small>${escapeHtml(n.email)}</small></td>
    <td>${escapeHtml(n.clinicName||'—')}<br><small>${escapeHtml(n.crn||'CRN não informado')}</small></td>
    <td>${n.patientsCount}</td>
    <td>${status(n.plan.active,n.plan.daysRemaining+' dias','Inativo')}</td>
    <td>${n.plan.expiresAt?fmtDate(n.plan.expiresAt):'—'}</td>
    <td><div class="table-actions"><button class="btn secondary small" data-license="${n.id}">Liberar dias</button><button class="btn danger small" data-deactivate="${n.id}">Pausar</button></div></td>
  </tr>`).join('')}</tbody></table></div>`;
}
function bindAdminActions(){
  $$('[data-license]').forEach(b=>b.onclick=()=>openLicense(b.dataset.license));
  $$('[data-deactivate]').forEach(b=>b.onclick=async()=>{if(!confirm('Pausar esta licença agora?'))return;try{await api(`/api/admin/nutritionists/${b.dataset.deactivate}/license`,{method:'PATCH',body:JSON.stringify({action:'deactivate'})});toast('Licença pausada.');navigate(state.page)}catch(e){toast(e.message,true)}});
}
function openNewNutritionist(){
  openModal(`<h2>Cadastrar nutricionista</h2><p>O administrador define quantos dias de acesso serão liberados.</p>
  <form id="nutritionistForm" class="form-grid">
    <label>Nome completo<input name="name" required></label><label>E-mail de acesso<input name="email" type="email" required></label>
    <label>Senha inicial<input name="password" type="password" minlength="8" required></label><label>Dias do plano<input name="days" type="number" min="0" max="3650" value="30"></label>
    <label>CRN<input name="crn"></label><label>Telefone<input name="phone"></label>
    <label>Nome da clínica<input name="clinicName"></label><label>Especialidade<input name="specialty"></label>
    <button class="btn primary wide" type="submit">Criar conta e ativar</button>
  </form>`);
  $('#nutritionistForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/nutritionists',{method:'POST',body:JSON.stringify(formJson(e.currentTarget))});closeModal();toast('Nutricionista cadastrada.');navigate(state.page)}catch(err){toast(err.message,true)}};
}
function openLicense(id){
  openModal(`<h2>Liberar dias de plano</h2><p><strong>Adicionar</strong> soma dias ao vencimento atual. <strong>Redefinir</strong> inicia um novo período a partir de hoje.</p>
  <form id="licenseForm" class="form-stack"><label>Dias<input name="days" type="number" min="1" max="3650" value="30" required></label>
  <div class="grid-2"><button class="btn secondary" name="action" value="activate" type="submit">Adicionar dias</button><button class="btn primary" name="action" value="set" type="submit">Redefinir período</button></div></form>`);
  $('#licenseForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const action=e.submitter.value;try{await api(`/api/admin/nutritionists/${id}/license`,{method:'PATCH',body:JSON.stringify({days:fd.get('days'),action})});closeModal();toast('Licença atualizada.');navigate(state.page)}catch(err){toast(err.message,true)}};
}

async function renderNutriDashboard(){
  setHeader('Nutricionista','Visão geral');
  const d=await api('/api/nutritionist/dashboard');
  $('#content').innerHTML=stats([
    {label:'Pacientes ativos',value:d.totals.patients,help:'Acessos vinculados'},
    {label:'Avaliações',value:d.totals.assessments,help:'Registros clínicos'},
    {label:'Planos alimentares',value:d.totals.mealPlans,help:'Planos elaborados'},
    {label:'Consultas hoje',value:d.totals.appointmentsToday,help:'Agenda do dia'}
  ])+`<div class="grid-2">
    <section class="panel"><div class="panel-head"><h3>Pacientes recentes</h3><button class="btn secondary small" data-nav="nutri-patients">Ver todos</button></div><div class="panel-body">${d.recentPatients.length?d.recentPatients.map(p=>`<div class="patient-row"><div><strong>${escapeHtml(p.name)}</strong><p>${escapeHtml(p.goal||'Objetivo não informado')}</p></div></div>`).join(''):empty('Nenhum paciente.')}</div></section>
    <section class="panel"><div class="panel-head"><h3>Próximas consultas</h3></div><div class="panel-body">${d.upcomingAppointments.length?d.upcomingAppointments.map(a=>`<div class="patient-row"><div><strong>${escapeHtml(a.patientName)}</strong><p>${fmtDate(a.date)} às ${escapeHtml(a.time||'—')} · ${escapeHtml(a.type)}</p></div></div>`).join(''):empty('Nenhuma consulta agendada.')}</div></section>
  </div>`;
}
async function loadPatients(){const d=await api('/api/nutritionist/patients');state.patients=d.patients;return d.patients}
async function renderPatients(){
  setHeader('Nutricionista','Pacientes');
  const patients=await loadPatients();
  $('#content').innerHTML=`<div class="page-actions"><button class="btn primary" id="newPatient">+ Novo paciente</button></div>
  <section class="panel"><div class="panel-head"><h3>Pacientes cadastrados</h3><span>${patients.length} registros</span></div><div class="panel-body">
  ${patients.length?`<div class="patient-list">${patients.map(p=>`<article class="patient-row"><div><strong>${escapeHtml(p.name)}</strong><p>${escapeHtml(p.loginEmail)} · ${p.lastAssessment?`IMC ${p.lastAssessment.result.bmi}`:'Sem avaliação'}</p></div><div class="table-actions">${status(p.active)}<button class="btn secondary small" data-patient="${p.id}">Abrir prontuário</button></div></article>`).join('')}</div>`:empty('Cadastre o primeiro paciente para começar.')}</div></section>`;
  $('#newPatient').onclick=openNewPatient;
  $$('[data-patient]').forEach(b=>b.onclick=()=>renderPatientDetail(b.dataset.patient));
}
function openNewPatient(){
  openModal(`<h2>Novo paciente</h2><p>O paciente receberá e-mail e senha para acessar o próprio painel.</p>
  <form id="patientForm" class="form-grid">
    <label>Nome completo<input name="name" required></label><label>E-mail de acesso<input name="email" type="email" required></label>
    <label>Senha inicial<input name="password" type="password" minlength="8" required></label><label>Data de nascimento<input name="birthDate" type="date"></label>
    <label>Sexo<select name="sex"><option value="F">Feminino</option><option value="M">Masculino</option><option value="O">Outro / não informar</option></select></label><label>Telefone<input name="phone"></label>
    <label class="wide">Objetivo<textarea name="goal"></textarea></label><label>Alergias / intolerâncias<textarea name="allergies"></textarea></label><label>Condições clínicas<textarea name="conditions"></textarea></label>
    <button class="btn primary wide" type="submit">Criar paciente</button>
  </form>`);
  $('#patientForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/nutritionist/patients',{method:'POST',body:JSON.stringify(formJson(e.currentTarget))});closeModal();toast('Paciente criado.');navigate('nutri-patients')}catch(err){toast(err.message,true)}};
}

async function renderPatientDetail(id,tab='summary'){
  setHeader('Prontuário','Paciente');
  const d=await api(`/api/nutritionist/patients/${id}`);state.selectedPatient=d;
  const p=d.patient;
  $('#content').innerHTML=`<div class="page-actions"><button class="btn ghost" id="backPatients">← Voltar</button></div>
  <section class="panel"><div class="panel-body"><div class="grid-3">
    <div><p class="eyebrow">Paciente</p><h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.loginEmail)}</p></div>
    <div class="info-card"><small>Objetivo</small><strong>${escapeHtml(p.goal||'Não informado')}</strong></div>
    <div class="info-card"><small>Nascimento</small><strong>${fmtDate(p.birthDate)}</strong></div>
  </div></div></section>
  <div class="tabs">
    <button class="tab ${tab==='summary'?'active':''}" data-tab="summary">Resumo</button>
    <button class="tab ${tab==='assessment'?'active':''}" data-tab="assessment">Nova avaliação</button>
    <button class="tab ${tab==='mealplan'?'active':''}" data-tab="mealplan">Plano alimentar</button>
    <button class="tab ${tab==='appointment'?'active':''}" data-tab="appointment">Agendar consulta</button>
    <button class="tab ${tab==='diary'?'active':''}" data-tab="diary">Diário do paciente</button>
  </div><div id="patientTab"></div>`;
  $('#backPatients').onclick=()=>navigate('nutri-patients');
  $$('[data-tab]').forEach(b=>b.onclick=()=>renderPatientDetail(id,b.dataset.tab));
  renderPatientTab(d,tab);
}
function renderPatientTab(d,tab){
  const box=$('#patientTab');
  if(tab==='summary'){
    const last=d.assessments[0];
    box.innerHTML=`${last?`<section class="panel"><div class="panel-head"><h3>Última avaliação · ${fmtDate(last.date)}</h3></div><div class="panel-body">${metricResult(last.result)}</div></section>`:'<div class="notice">O paciente ainda não possui avaliação.</div>'}
    <div class="grid-2"><section class="panel"><div class="panel-head"><h3>Histórico de avaliações</h3></div><div class="panel-body">${d.assessments.length?d.assessments.map(a=>`<div class="patient-row"><div><strong>${fmtDate(a.date)}</strong><p>Peso ${a.weight} kg · IMC ${a.result.bmi} · GET ${a.result.get||'—'} kcal</p></div></div>`).join(''):empty('Sem histórico.')}</div></section>
    <section class="panel"><div class="panel-head"><h3>Planos alimentares</h3></div><div class="panel-body">${d.mealPlans.length?d.mealPlans.map(p=>`<div class="patient-row"><div><strong>${escapeHtml(p.title)}</strong><p>${fmtDateTime(p.createdAt)} · ${p.totalCalories||'—'} kcal</p></div></div>`).join(''):empty('Nenhum plano.')}</div></section></div>`;
  }
  if(tab==='assessment'){
    box.innerHTML=`<section class="panel"><div class="panel-head"><h3>Nova avaliação antropométrica</h3></div><div class="panel-body"><form id="assessmentForm" class="form-grid">
      <label>Data<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Peso atual (kg)<input name="weight" type="number" step="0.01" required></label>
      <label>Estatura (m)<input name="height" type="number" step="0.001" required></label><label>Peso habitual (kg)<input name="usualWeight" type="number" step="0.01"></label>
      <label>Cintura (cm)<input name="waist" type="number" step="0.1"></label><label>Braço (cm)<input name="arm" type="number" step="0.1"></label>
      <label>Panturrilha (cm)<input name="calf" type="number" step="0.1"></label><label>Gordura corporal (%)<input name="bodyFat" type="number" step="0.1"></label>
      <label>Atividade<select name="activityLevel"><option value="sedentary">Sedentário</option><option value="light">Leve</option><option value="moderate">Moderada</option><option value="intense">Intensa</option></select></label><label>Pressão arterial<input name="bloodPressure"></label>
      <label class="wide">Observações<textarea name="notes"></textarea></label><button class="btn primary wide" type="submit">Calcular e salvar</button>
    </form><div id="assessmentResult"></div></div></section>`;
    $('#assessmentForm').onsubmit=async e=>{e.preventDefault();try{const out=await api(`/api/nutritionist/patients/${d.patient.id}/assessments`,{method:'POST',body:JSON.stringify(formJson(e.currentTarget))});$('#assessmentResult').innerHTML=`<hr>${metricResult(out.assessment.result)}`;toast('Avaliação salva.')}catch(err){toast(err.message,true)}};
  }
  if(tab==='mealplan'){
    box.innerHTML=`<section class="panel"><div class="panel-head"><h3>Novo plano alimentar</h3></div><div class="panel-body"><form id="mealPlanForm" class="form-stack">
      <div class="form-grid"><label>Título<input name="title" value="Plano alimentar"></label><label>Objetivo<input name="objective"></label><label>Energia (kcal)<input name="totalCalories" type="number"></label><label>Hidratação (ml)<input name="hydrationMl" type="number"></label><label>Proteínas (g)<input name="proteinGrams" type="number"></label><label>Carboidratos (g)<input name="carbohydrateGrams" type="number"></label><label>Gorduras (g)<input name="fatGrams" type="number"></label></div>
      <div class="panel-head"><h3>Refeições</h3><button class="btn secondary small" type="button" id="addMeal">+ Refeição</button></div><div id="mealEditor" class="meal-editor"></div>
      <label>Orientações gerais<textarea name="guidance"></textarea></label><button class="btn primary" type="submit">Salvar e liberar ao paciente</button>
    </form></div></section>`;
    const editor=$('#mealEditor');
    const add=()=>{const row=document.createElement('div');row.className='meal-editor-row';row.innerHTML=`<label>Refeição<input class="meal-name" placeholder="Café da manhã"></label><label>Horário<input class="meal-time" type="time"></label><label>Alimentos<textarea class="meal-items"></textarea></label><label>Substituições<textarea class="meal-subs"></textarea></label><button class="btn danger small" type="button">×</button>`;row.querySelector('button').onclick=()=>row.remove();editor.append(row)};
    add();add();$('#addMeal').onclick=add;
    $('#mealPlanForm').onsubmit=async e=>{e.preventDefault();const data=formJson(e.currentTarget);data.meals=$$('.meal-editor-row',editor).map(r=>({name:$('.meal-name',r).value,time:$('.meal-time',r).value,items:$('.meal-items',r).value,substitutions:$('.meal-subs',r).value}));try{await api(`/api/nutritionist/patients/${d.patient.id}/meal-plans`,{method:'POST',body:JSON.stringify(data)});toast('Plano alimentar liberado.');renderPatientDetail(d.patient.id,'summary')}catch(err){toast(err.message,true)}};
  }
  if(tab==='appointment'){
    box.innerHTML=`<section class="panel"><div class="panel-head"><h3>Agendar consulta</h3></div><div class="panel-body"><form id="appointmentForm" class="form-grid">
      <input type="hidden" name="patientId" value="${d.patient.id}"><label>Data<input name="date" type="date" required></label><label>Horário<input name="time" type="time" required></label><label>Tipo<input name="type" value="Retorno"></label><label class="wide">Observações<textarea name="notes"></textarea></label><button class="btn primary wide" type="submit">Agendar</button>
    </form></div></section>`;
    $('#appointmentForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/nutritionist/appointments',{method:'POST',body:JSON.stringify(formJson(e.currentTarget))});toast('Consulta agendada.');renderPatientDetail(d.patient.id,'summary')}catch(err){toast(err.message,true)}};
  }
  if(tab==='diary'){
    box.innerHTML=`<section class="panel"><div class="panel-head"><h3>Registros enviados pelo paciente</h3></div><div class="panel-body">${d.foodDiaries.length?d.foodDiaries.map(x=>`<article class="meal"><h4><span>${escapeHtml(x.meal)}</span><span>${fmtDate(x.date)} ${escapeHtml(x.time||'')}</span></h4><p>${br(x.description)}</p><small>Fome: ${x.hunger}/10 · Água: ${x.waterMl} ml${x.notes?`<br>${br(x.notes)}`:''}</small></article>`).join(''):empty('Nenhum registro alimentar.')}</div></section>`;
  }
}
function metricResult(r){
  return `<div class="metric-grid">
    <div class="metric"><span>IMC</span><strong>${r.bmi}</strong><small>${escapeHtml(r.bmiClassification)}</small></div>
    <div class="metric"><span>Peso ideal</span><strong>${r.idealWeight} kg</strong><small>IMC de referência ${r.idealBmi}</small></div>
    <div class="metric"><span>Peso ajustado</span><strong>${r.adjustedWeight} kg</strong><small>${escapeHtml(r.adequacyClassification)}</small></div>
    <div class="metric"><span>Adequação</span><strong>${r.adequacyPercent}%</strong><small>${escapeHtml(r.waistRisk)}</small></div>
    <div class="metric"><span>TMB</span><strong>${r.tmb||'—'} kcal</strong><small>Taxa metabólica basal</small></div>
    <div class="metric"><span>GET</span><strong>${r.get||'—'} kcal</strong><small>${escapeHtml(r.energyFormula||'')}</small></div>
    <div class="metric"><span>Perda de peso</span><strong>${r.weightLossPercent??'—'}%</strong><small>Quando informado peso habitual</small></div>
    <div class="metric"><span>Fator atividade</span><strong>${r.activityFactor||'—'}</strong><small>Selecionado no cálculo</small></div>
  </div><div class="notice warning" style="margin-top:1rem">Ferramenta de apoio. A classificação, conduta e prescrição devem ser validadas pela nutricionista.</div>`;
}
async function renderCalculator(){
  setHeader('Nutricionista','Calculadora nutricional');
  $('#content').innerHTML=`<section class="panel"><div class="panel-head"><h3>Prévia de cálculos</h3></div><div class="panel-body"><form id="calculatorForm" class="form-grid">
    <label>Sexo<select name="sex"><option value="F">Feminino</option><option value="M">Masculino</option></select></label><label>Idade<input name="age" type="number" min="18" required></label>
    <label>Peso atual (kg)<input name="weight" type="number" step="0.01" required></label><label>Estatura (m)<input name="height" type="number" step="0.001" required></label>
    <label>Peso habitual (kg)<input name="usualWeight" type="number" step="0.01"></label><label>Cintura (cm)<input name="waist" type="number" step="0.1"></label>
    <label>Atividade<select name="activityLevel"><option value="sedentary">Sedentário</option><option value="light">Leve</option><option value="moderate">Moderada</option><option value="intense">Intensa</option></select></label>
    <button class="btn primary wide" type="submit">Calcular</button></form><div id="calculatorResult"></div></div></section>`;
  $('#calculatorForm').onsubmit=async e=>{e.preventDefault();try{const d=await api('/api/nutritionist/calculations/preview',{method:'POST',body:JSON.stringify(formJson(e.currentTarget))});$('#calculatorResult').innerHTML=`<hr>${metricResult(d.result)}`}catch(err){toast(err.message,true)}};
}

async function renderPatientDashboard(){
  setHeader('Paciente','Meu acompanhamento');
  const d=await api('/api/patient/dashboard');
  const a=d.latestAssessment,p=d.currentMealPlan;
  $('#content').innerHTML=`<section class="panel"><div class="panel-body"><p class="eyebrow">Acompanhamento com</p><h2>${escapeHtml(d.nutritionist?.name||'Nutricionista')}</h2><p>${escapeHtml(d.nutritionist?.clinicName||'')} ${escapeHtml(d.nutritionist?.crn||'')}</p></div></section>
  ${a?`<section class="panel"><div class="panel-head"><h3>Minha última evolução · ${fmtDate(a.date)}</h3></div><div class="panel-body">${metricResult(a.result)}</div></section>`:'<div class="notice">Sua nutricionista ainda não liberou uma avaliação.</div>'}
  <section class="panel"><div class="panel-head"><h3>Meu plano alimentar</h3></div><div class="panel-body">${p?renderMealPlan(p):empty('Nenhum plano alimentar liberado.')}</div></section>
  <section class="panel"><div class="panel-head"><h3>Próximas consultas</h3></div><div class="panel-body">${d.appointments.length?d.appointments.map(x=>`<div class="patient-row"><div><strong>${fmtDate(x.date)} às ${escapeHtml(x.time||'—')}</strong><p>${escapeHtml(x.type)}</p></div></div>`).join(''):empty('Nenhuma consulta agendada.')}</div></section>`;
}
function renderMealPlan(p){
  return `<div class="grid-3"><div class="info-card"><small>Objetivo</small><strong>${escapeHtml(p.objective||'Plano personalizado')}</strong></div><div class="info-card"><small>Energia</small><strong>${p.totalCalories||'—'} kcal</strong></div><div class="info-card"><small>Hidratação</small><strong>${p.hydrationMl||'—'} ml</strong></div></div><div style="margin-top:1rem">${p.meals.map(m=>`<article class="meal"><h4><span>${escapeHtml(m.name)}</span><span>${escapeHtml(m.time||'')}</span></h4><p>${br(m.items)}</p>${m.substitutions?`<small><strong>Substituições:</strong><br>${br(m.substitutions)}</small>`:''}</article>`).join('')}</div>${p.guidance?`<div class="notice">${br(p.guidance)}</div>`:''}`;
}
async function renderPatientDiary(){
  setHeader('Paciente','Diário alimentar');
  const d=await api('/api/patient/dashboard');
  $('#content').innerHTML=`<div class="grid-2"><section class="panel"><div class="panel-head"><h3>Novo registro</h3></div><div class="panel-body"><form id="diaryForm" class="form-grid">
    <label>Data<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Horário<input name="time" type="time"></label>
    <label>Refeição<input name="meal" placeholder="Almoço" required></label><label>Fome de 0 a 10<input name="hunger" type="number" min="0" max="10" value="5"></label>
    <label>Água (ml)<input name="waterMl" type="number" min="0"></label><label class="wide">O que consumiu?<textarea name="description" required></textarea></label>
    <label class="wide">Observações<textarea name="notes"></textarea></label><button class="btn primary wide" type="submit">Enviar à nutricionista</button>
  </form></div></section><section class="panel"><div class="panel-head"><h3>Meus registros</h3></div><div class="panel-body">${d.foodDiaries.length?d.foodDiaries.map(x=>`<article class="meal"><h4><span>${escapeHtml(x.meal)}</span><span>${fmtDate(x.date)}</span></h4><p>${br(x.description)}</p><small>Fome ${x.hunger}/10 · Água ${x.waterMl} ml</small></article>`).join(''):empty('Nenhum registro enviado.')}</div></section></div>`;
  $('#diaryForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/patient/food-diary',{method:'POST',body:JSON.stringify(formJson(e.currentTarget))});toast('Registro enviado.');renderPatientDiary()}catch(err){toast(err.message,true)}};
}

boot();
