// ============================================================
// NUTRIHEALTH REALCLIN - SCRIPT COMPLETO
// ============================================================

// ===== 1. CONFIGURAÇÕES INICIAIS =====
let historico = JSON.parse(localStorage.getItem('historicoNutri')) || [];
let metas = JSON.parse(localStorage.getItem('metasNutri')) || [];
let receitas = JSON.parse(localStorage.getItem('receitasNutri')) || [];
let diario = JSON.parse(localStorage.getItem('diarioNutri')) || [];
let listaCompras = JSON.parse(localStorage.getItem('listaComprasNutri')) || [];
let agenda = JSON.parse(localStorage.getItem('agendaNutri')) || [];
let prontuario = JSON.parse(localStorage.getItem('prontuarioNutri')) || {};
let anamneses = JSON.parse(localStorage.getItem('anamnesesNutri')) || [];
let pontos = parseInt(localStorage.getItem('pontosNutri')) || 0;
let ultimoRegistro = null;
let chartInstances = {};
let avaliacoes = JSON.parse(localStorage.getItem('avaliacoesNutri')) || [];

// ===== 2. FUNÇÕES DE DATA =====
function atualizarData() {
    const now = new Date();
    const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('pt-BR', options);
    
    const hoje = now.toISOString().split('T')[0];
    const diarioData = document.getElementById('diarioData');
    if (diarioData) diarioData.value = hoje;
}
atualizarData();

// ===== 3. FUNÇÕES DE CÁLCULO =====
function calcularIMC(peso, altura) {
    const alturaMetros = altura / 100;
    return peso / (alturaMetros * alturaMetros);
}

function classificarIMC(imc) {
    if (imc < 16) return { classificacao: 'Magreza Grau III', tipo: 'danger' };
    if (imc < 17) return { classificacao: 'Magreza Grau II', tipo: 'danger' };
    if (imc < 18.5) return { classificacao: 'Magreza Grau I', tipo: 'warning' };
    if (imc < 25) return { classificacao: 'Eutrofia', tipo: 'good' };
    if (imc < 30) return { classificacao: 'Sobrepeso', tipo: 'warning' };
    if (imc < 35) return { classificacao: 'Obesidade Grau I', tipo: 'danger' };
    if (imc < 40) return { classificacao: 'Obesidade Grau II', tipo: 'danger' };
    return { classificacao: 'Obesidade Grau III', tipo: 'danger' };
}

function calcularPesoIdeal(sexo, altura) {
    const alturaMetros = altura / 100;
    if (sexo === 'masculino') {
        return 50 + 2.3 * ((alturaMetros * 100 - 152.4) / 2.54);
    } else {
        return 45.5 + 2.3 * ((alturaMetros * 100 - 152.4) / 2.54);
    }
}

function calcularGorduraCorporal(sexo, peso, altura, idade) {
    const imc = calcularIMC(peso, altura);
    let gordura;
    if (sexo === 'feminino') {
        gordura = 1.2 * imc + 0.23 * idade - 5.4 - 10.8 * 1;
    } else {
        gordura = 1.2 * imc + 0.23 * idade - 16.2;
    }
    return Math.max(gordura, 3);
}

function calcularRCQ(cintura, quadril) {
    if (!cintura || !quadril || cintura <= 0 || quadril <= 0) return null;
    return cintura / quadril;
}

function calcularTMB(sexo, peso, altura, idade, formula = 'dri') {
    const alturaMetros = altura / 100;
    
    if (formula === 'harris') {
        if (sexo === 'masculino') {
            return 66.47 + (13.75 * peso) + (5 * altura) - (6.76 * idade);
        } else {
            return 655 + (9.6 * peso) + (1.7 * altura) - (4.7 * idade);
        }
    } else if (formula === 'mifflin') {
        if (sexo === 'masculino') {
            return (10 * peso) + (6.25 * altura) - (5 * idade) + 5;
        } else {
            return (10 * peso) + (6.25 * altura) - (5 * idade) - 161;
        }
    } else if (formula === 'oms') {
        if (sexo === 'masculino') {
            return 17.5 * peso + 651;
        } else {
            return 12.2 * peso + 746;
        }
    } else {
        // DRI/IOM 2002
        if (sexo === 'masculino') {
            return 662 - (9.53 * idade) + (15.91 * peso) + (540 * alturaMetros);
        } else {
            return 354 - (6.91 * idade) + (9.36 * peso) + (726 * alturaMetros);
        }
    }
}

function calcularGET(tmb, fatorAtividade) {
    return tmb * fatorAtividade;
}

function calcularCaloriasRecomendadas(get, objetivo) {
    if (objetivo === 'perder') return get - 500;
    if (objetivo === 'ganhar') return get + 500;
    return get;
}

function calcularAgua(peso) {
    return peso * 35;
}

function calcularMacros(calorias, estrategia) {
    const porcentagens = {
        padrao: { carb: 0.50, prot: 0.20, gord: 0.30 },
        lowcarb: { carb: 0.40, prot: 0.20, gord: 0.40 },
        highprotein: { carb: 0.40, prot: 0.30, gord: 0.30 },
        keto: { carb: 0.10, prot: 0.15, gord: 0.75 }
    };
    const p = porcentagens[estrategia] || porcentagens.padrao;
    return {
        carb: (calorias * p.carb) / 4,
        prot: (calorias * p.prot) / 4,
        gord: (calorias * p.gord) / 9
    };
}

// ===== 4. FUNÇÕES DE EXIBIÇÃO =====
function exibirAvaliacao(dados) {
    const box = document.getElementById('resultAvaliacao');
    if (box) box.classList.add('show');
    document.getElementById('imcResult').textContent = dados.imc.toFixed(1) + ' kg/m²';
    document.getElementById('classificacaoResult').textContent = dados.classificacao;
    document.getElementById('pesoIdealResult').textContent = dados.pesoIdeal.toFixed(1) + ' kg';
    document.getElementById('gorduraResult').textContent = dados.gordura.toFixed(1) + '%';
    document.getElementById('rcqResult').textContent = dados.rcq ? dados.rcq.toFixed(2) : 'Não informado';
    document.getElementById('cbResult').textContent = dados.cb ? dados.cb.toFixed(1) + '%' : '-';
    const badge = document.getElementById('classificationBadge');
    if (badge) {
        badge.className = 'classification ' + dados.tipo;
        badge.textContent = '📌 ' + dados.classificacao;
    }
}

function exibirEnergetico(dados) {
    const box = document.getElementById('resultEnergetico');
    if (box) box.classList.add('show');
    document.getElementById('tmbResult').textContent = dados.tmb.toFixed(0) + ' kcal';
    document.getElementById('getResult').textContent = dados.get.toFixed(0) + ' kcal';
    document.getElementById('aguaResult').textContent = dados.agua.toFixed(0) + ' ml';
    document.getElementById('caloriasRecomendadasResult').textContent = dados.caloriasRecomendadas.toFixed(0) + ' kcal';
}

function exibirPlano(dados) {
    const box = document.getElementById('resultPlano');
    if (box) box.classList.add('show');
    document.getElementById('carbResult').textContent = dados.carb.toFixed(1) + ' g';
    document.getElementById('protResult').textContent = dados.prot.toFixed(1) + ' g';
    document.getElementById('gordResult').textContent = dados.gord.toFixed(1) + ' g';
}

// ===== 5. FUNÇÕES DE PONTOS =====
function adicionarPontos(quantidade) {
    pontos += quantidade;
    localStorage.setItem('pontosNutri', pontos);
    document.getElementById('pontuacaoDash').textContent = pontos;
}

// ===== 6. NAVEGAÇÃO POR TABS =====
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const tabId = this.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`tab-${tabId}`);
        if (target) target.classList.add('active');
    });
});

// ===== 7. MODO ESCURO =====
let darkMode = localStorage.getItem('darkMode') === 'true';
function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    document.body.classList.toggle('dark-mode', darkMode);
    const btn = document.getElementById('toggleDarkMode');
    if (btn) btn.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}
const darkBtn = document.getElementById('toggleDarkMode');
if (darkBtn) darkBtn.addEventListener('click', toggleDarkMode);
if (darkMode) {
    document.body.classList.add('dark-mode');
    if (darkBtn) darkBtn.innerHTML = '<i class="fas fa-sun"></i>';
}

// ===== 8. FORMULÁRIO DE ANAMNESE =====
document.getElementById('formAnamnese').addEventListener('submit', function(e) {
    e.preventDefault();
    salvarAnamnese();
});

function salvarAnamnese() {
    const anamnese = {
        nome: document.getElementById('anamneseNome').value,
        nascimento: document.getElementById('anamneseNascimento').value,
        sexo: document.getElementById('anamneseSexo').value,
        telefone: document.getElementById('anamneseTelefone').value,
        profissao: document.getElementById('anamneseProfissao').value,
        escolaridade: document.getElementById('anamneseEscolaridade').value,
        motivo: document.getElementById('anamneseMotivo').value,
        diagnostico: document.getElementById('anamneseDiagnostico').value,
        medicamentos: document.getElementById('anamneseMedicamentos').value,
        antecedentes: Array.from(document.querySelectorAll('.antecedente:checked')).map(el => el.value),
        tabagismo: document.getElementById('anamneseTabagismo').value,
        etilismo: document.getElementById('anamneseEtilismo').value,
        atividade: document.getElementById('anamneseAtividade').value,
        agua: document.getElementById('anamneseAgua').value,
        intestino: document.getElementById('anamneseIntestino').value,
        sintomas: Array.from(document.querySelectorAll('.sintoma:checked')).map(el => el.value),
        recordatorio: document.getElementById('anamneseRecordatorio').value,
        refeicoes: document.getElementById('anamneseRefeicoes').value,
        tv: document.getElementById('anamneseTv').value,
        tempoRefeicao: document.getElementById('anamneseTempoRefeicao').value,
        data: new Date().toLocaleDateString('pt-BR')
    };
    
    anamneses.push(anamnese);
    localStorage.setItem('anamnesesNutri', JSON.stringify(anamneses));
    alert('✅ Anamnese salva com sucesso!');
    adicionarPontos(5);
}

// ===== 9. FORMULÁRIO DE AVALIAÇÃO =====
document.getElementById('formAvaliacao').addEventListener('submit', function(e) {
    e.preventDefault();
    calcularAvaliacao();
});

function calcularAvaliacao() {
    const peso = parseFloat(document.getElementById('peso').value);
    const altura = parseFloat(document.getElementById('altura').value);
    const cintura = parseFloat(document.getElementById('cintura').value);
    const quadril = parseFloat(document.getElementById('quadril').value);
    const cb = parseFloat(document.getElementById('cb').value);
    const cp = parseFloat(document.getElementById('cp').value);
    const pct = parseFloat(document.getElementById('pct').value);
    const pcse = parseFloat(document.getElementById('pcse').value);
    const sexo = document.getElementById('anamneseSexo').value;
    const idade = 30; // Valor padrão, pode ser ajustado

    if (!peso || !altura) {
        alert('Preencha peso e altura!');
        return;
    }

    const imc = calcularIMC(peso, altura);
    const classif = classificarIMC(imc);
    const pesoIdeal = calcularPesoIdeal(sexo, altura);
    const gordura = calcularGorduraCorporal(sexo, peso, altura, idade);
    const rcq = calcularRCQ(cintura, quadril);
    const adequacaoCB = cb ? (cb / 30 * 100) : null;

    exibirAvaliacao({
        imc: imc,
        classificacao: classif.classificacao,
        tipo: classif.tipo,
        pesoIdeal: pesoIdeal,
        gordura: gordura,
        rcq: rcq,
        cb: adequacaoCB
    });

    // Salvar avaliação
    const registro = {
        data: new Date().toLocaleDateString('pt-BR'),
        peso: peso,
        altura: altura,
        imc: imc,
        classificacao: classif.classificacao,
        gordura: gordura,
        cintura: cintura,
        quadril: quadril,
        cb: cb,
        cp: cp,
        pct: pct,
        pcse: pcse
    };
    
    avaliacoes.push(registro);
    localStorage.setItem('avaliacoesNutri', JSON.stringify(avaliacoes));
    adicionarPontos(2);
    atualizarDashboard();
}

// ===== 10. CÁLCULO ENERGÉTICO =====
function calcularEnergetico() {
    const sexo = document.getElementById('anamneseSexo').value;
    const peso = parseFloat(document.getElementById('peso').value);
    const altura = parseFloat(document.getElementById('altura').value);
    const idade = 30;
    const formula = document.getElementById('formulaTMB').value;
    const fatorAtividade = parseFloat(document.getElementById('atividade').value);
    const objetivo = document.getElementById('objetivo').value;

    if (!peso || !altura) {
        alert('Preencha peso e altura na avaliação!');
        return;
    }

    const tmb = calcularTMB(sexo, peso, altura, idade, formula);
    const get = calcularGET(tmb, fatorAtividade);
    const caloriasRecomendadas = calcularCaloriasRecomendadas(get, objetivo);
    const agua = calcularAgua(peso);

    exibirEnergetico({
        tmb: tmb,
        get: get,
        caloriasRecomendadas: caloriasRecomendadas,
        agua: agua
    });

    document.getElementById('caloriasPlano').value = Math.round(caloriasRecomendadas);
    document.getElementById('cardapioCalorias').value = Math.round(caloriasRecomendadas);
    adicionarPontos(2);
}

// ===== 11. PLANO ALIMENTAR =====
document.getElementById('formPlano').addEventListener('submit', function(e) {
    e.preventDefault();
    const calorias = parseFloat(document.getElementById('caloriasPlano').value);
    const estrategia = document.getElementById('estrategia').value;
    
    if (!calorias || calorias < 500) {
        alert('Insira um valor válido de calorias!');
        return;
    }
    
    const macros = calcularMacros(calorias, estrategia);
    exibirPlano({
        carb: macros.carb,
        prot: macros.prot,
        gord: macros.gord
    });
    adicionarPontos(2);
});

// ===== 12. CARDÁPIO =====
document.getElementById('formCardapio').addEventListener('submit', function(e) {
    e.preventDefault();
    gerarCardapio();
});

function gerarCardapio() {
    const paciente = document.getElementById('cardapioPaciente').value || 'Paciente';
    const calorias = parseFloat(document.getElementById('cardapioCalorias').value) || 1800;
    const proteinaKg = parseFloat(document.getElementById('cardapioProteina').value) || 1.8;
    const numRefeicoes = parseInt(document.getElementById('cardapioRefeicoes').value) || 5;
    const restricoes = Array.from(document.querySelectorAll('.restricao:checked')).map(el => el.value);
    
    const peso = parseFloat(document.getElementById('peso').value) || 65;
    const proteinasTotal = proteinaKg * peso;
    const gordurasTotal = calorias * 0.3 / 9;
    const carboidratosTotal = (calorias - (proteinasTotal * 4) - (gordurasTotal * 9)) / 4;
    
    const distribuicao = {
        3: { cafe: 0.25, almoco: 0.40, jantar: 0.35 },
        5: { cafe: 0.20, lanche_manha: 0.15, almoco: 0.30, lanche_tarde: 0.15, jantar: 0.20 },
        6: { cafe: 0.18, lanche_manha: 0.12, almoco: 0.28, lanche_tarde: 0.12, jantar: 0.18, ceia: 0.12 }
    };
    
    const dist = distribuicao[numRefeicoes] || distribuicao[5];
    
    const categorias = {
        cafe: ['cereais', 'frutas', 'laticinios'],
        lanche_manha: ['frutas', 'oleaginosas'],
        almoco: ['carnes', 'leguminosas', 'legumes', 'cereais'],
        lanche_tarde: ['frutas', 'laticinios', 'oleaginosas'],
        jantar: ['carnes', 'leguminosas', 'legumes', 'cereais'],
        ceia: ['laticinios', 'frutas']
    };
    
    const refeicoesNomes = {
        cafe: '☀️ Café da Manhã',
        lanche_manha: '🍎 Lanche da Manhã',
        almoco: '🍽️ Almoço',
        lanche_tarde: '🍪 Lanche da Tarde',
        jantar: '🌙 Jantar',
        ceia: '🌃 Ceia'
    };
    
    let html = '';
    let totalCalorias = 0;
    
    for (const [refeicao, percentual] of Object.entries(dist)) {
        const calRefeicao = calorias * percentual;
        const cats = categorias[refeicao] || ['cereais'];
        let alimentosDisponiveis = [];
        
        cats.forEach(cat => {
            const alim = getAlimentoPorCategoria(cat);
            const filtrados = alim.filter(a => {
                if (restricoes.includes('lactose') && a.categoria === 'laticinios') return false;
                if (restricoes.includes('gluten') && ['cereais'].includes(a.categoria) && a.nome.includes('trigo')) return false;
                if (restricoes.includes('carne') && a.categoria === 'carnes') return false;
                return true;
            });
            alimentosDisponiveis = alimentosDisponiveis.concat(filtrados);
        });
        
        if (alimentosDisponiveis.length === 0) alimentosDisponiveis = getAlimentoPorCategoria('frutas');
        
        const shuffled = alimentosDisponiveis.sort(() => 0.5 - Math.random());
        const selecionados = shuffled.slice(0, Math.min(3, shuffled.length));
        
        html += `<div style="margin-bottom:15px;padding:12px;background:#f8f9fa;border-radius:10px;border-left:4px solid #764ba2;">`;
        html += `<h4 style="color:#764ba2;margin-bottom:8px;">${refeicoesNomes[refeicao] || refeicao}</h4>`;
        html += `<div style="display:grid;gap:8px;">`;
        
        let subtotal = 0;
        selecionados.forEach(alimento => {
            const porcao = Math.round((calRefeicao / selecionados.length) / (alimento.calorias / 100));
            const quant = Math.min(Math.max(porcao, 50), 300);
            const nutri = calcularNutrientesPorcao(alimento, quant);
            
            html += `
                <div style="display:flex;justify-content:space-between;padding:5px 8px;background:white;border-radius:6px;">
                    <span><strong>${alimento.nome}</strong> <span style="color:#999;">${quant}g</span></span>
                    <span>🔥 ${Math.round(nutri.calorias)} kcal</span>
                </div>
            `;
            subtotal += nutri.calorias;
        });
        
        html += `</div>`;
        html += `<div style="text-align:right;font-size:13px;color:#666;margin-top:5px;">Subtotal: ~${Math.round(subtotal)} kcal</div>`;
        html += `</div>`;
        totalCalorias += subtotal;
    }
    
    html += `
        <div style="margin-top:15px;padding:15px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:10px;color:white;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;text-align:center;">
                <div><strong>Total</strong><br>${Math.round(totalCalorias)} kcal</div>
                <div><strong>Proteínas</strong><br>${Math.round(proteinasTotal)}g</div>
                <div><strong>Carboidratos</strong><br>${Math.round(carboidratosTotal)}g</div>
                <div><strong>Gorduras</strong><br>${Math.round(gordurasTotal)}g</div>
            </div>
        </div>
    `;
    
    document.getElementById('cardapioConteudo').innerHTML = html;
    document.getElementById('cardapioNomePaciente').textContent = paciente;
    document.getElementById('cardapioResultado').style.display = 'block';
    adicionarPontos(5);
}

function imprimirCardapio() {
    const conteudo = document.getElementById('cardapioConteudo').innerHTML;
    const paciente = document.getElementById('cardapioNomePaciente').textContent;
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Cardápio - ${paciente}</title>
        <style>body{font-family:Arial;padding:40px;max-width:800px;margin:0 auto;}
        h1{color:#764ba2;text-align:center;}
        .item{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;}
        .total{background:#764ba2;color:white;padding:15px;border-radius:10px;margin-top:20px;}</style>
        </head><body>
        <h1>🍽️ Cardápio - ${paciente}</h1>
        <p style="text-align:center;color:#999;">${new Date().toLocaleDateString('pt-BR')}</p><hr>
        ${conteudo}
        <p style="text-align:center;color:#999;margin-top:30px;">Gerado pelo NutriHealth RealClin</p>
        </body></html>
    `);
    win.document.close();
    win.print();
}

function gerarListaComprasCardapio() {
    const items = document.querySelectorAll('#cardapioConteudo .item');
    const lista = [];
    items.forEach(item => {
        const text = item.textContent.trim();
        const parts = text.split('|');
        if (parts.length >= 2) {
            const nome = parts[0].trim().replace(/\d+g$/, '').trim();
            const quant = parts[0].match(/\d+g/);
            lista.push({ nome, quantidade: quant ? quant[0] : '100g' });
        }
    });
    if (lista.length > 0) {
        listaCompras = lista;
        localStorage.setItem('listaComprasNutri', JSON.stringify(listaCompras));
        renderizarListaCompras();
        document.querySelector('[data-tab="compras"]').click();
    }
}

function salvarCardapio() {
    alert('✅ Cardápio salvo com sucesso!');
    adicionarPontos(3);
}

// ===== 13. DIÁRIO ALIMENTAR =====
document.getElementById('diarioAlimento').addEventListener('input', function() {
    const busca = this.value.toLowerCase().trim();
    const datalist = document.getElementById('sugestoesAlimentos');
    if (!datalist) return;
    datalist.innerHTML = '';
    if (busca.length < 2) return;
    const resultados = buscarAlimentoTACO(busca);
    resultados.slice(0, 10).forEach(alimento => {
        const option = document.createElement('option');
        option.value = alimento.nome;
        datalist.appendChild(option);
    });
});

document.getElementById('formDiario').addEventListener('submit', function(e) {
    e.preventDefault();
    registrarRefeicao();
});

function registrarRefeicao() {
    const data = document.getElementById('diarioData').value;
    const refeicao = document.getElementById('diarioRefeicao').value;
    const alimento = document.getElementById('diarioAlimento').value.trim();
    const quantidade = parseFloat(document.getElementById('diarioQuantidade').value);
    
    if (!alimento || !quantidade) {
        alert('Preencha todos os campos!');
        return;
    }
    
    const dadosAlimento = buscarAlimentoTACO(alimento);
    if (dadosAlimento.length === 0) {
        alert('Alimento não encontrado na Tabela TACO.');
        return;
    }
    
    const nutri = calcularNutrientesPorcao(dadosAlimento[0], quantidade);
    const registro = {
        data, refeicao, alimento: dadosAlimento[0].nome,
        quantidade, calorias: nutri.calorias,
        proteinas: nutri.proteinas, carboidratos: nutri.carboidratos,
        gorduras: nutri.gorduras, fibra: nutri.fibra
    };
    
    diario.push(registro);
    localStorage.setItem('diarioNutri', JSON.stringify(diario));
    renderizarDiario();
    adicionarPontos(2);
    document.getElementById('diarioAlimento').value = '';
    document.getElementById('diarioQuantidade').value = '';
}

function renderizarDiario() {
    const container = document.getElementById('resumoDiario');
    if (!container) return;
    const hoje = new Date().toISOString().split('T')[0];
    const registrosHoje = diario.filter(r => r.data === hoje);
    
    if (registrosHoje.length === 0) {
        container.innerHTML = '<div class="empty-history">Nenhum registro hoje.</div>';
        return;
    }
    
    let totalCal = 0, html = '';
    const refeicoesMap = {
        cafe: '☀️ Café da Manhã',
        lanche_manha: '🍎 Lanche Manhã',
        almoco: '🍽️ Almoço',
        lanche_tarde: '🍪 Lanche Tarde',
        jantar: '🌙 Jantar',
        ceia: '🌃 Ceia'
    };
    
    registrosHoje.forEach(r => {
        totalCal += r.calorias;
        html += `
            <div class="refeicao-item">
                <div class="info">
                    <strong>${refeicoesMap[r.refeicao] || r.refeicao}</strong>
                    <small>${r.alimento} - ${r.quantidade}g</small>
                </div>
                <span>🔥 ${Math.round(r.calorias)} kcal</span>
            </div>
        `;
    });
    
    html += `
        <div style="margin-top:12px;padding:12px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:10px;color:white;text-align:center;">
            <strong>Total: ${Math.round(totalCal)} kcal</strong>
        </div>
    `;
    container.innerHTML = html;
}

// ===== 14. LISTA DE COMPRAS =====
function renderizarListaCompras() {
    const container = document.getElementById('listaComprasContent');
    if (!container) return;
    if (listaCompras.length === 0) {
        container.innerHTML = '<div class="empty-history">Nenhum item na lista.</div>';
        return;
    }
    let html = '';
    listaCompras.forEach((item, index) => {
        html += `
            <div class="compra-item">
                <span class="nome">${item.nome}</span>
                <span class="quantidade">${item.quantidade || '100g'}</span>
                <button onclick="removerItemCompra(${index})" style="background:#ff6b6b;color:white;border:none;border-radius:5px;padding:2px 10px;cursor:pointer;">✕</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function adicionarItemCompra() {
    const nome = prompt('Digite o nome do item:');
    if (!nome) return;
    const quantidade = prompt('Digite a quantidade:') || '100g';
    listaCompras.push({ nome, quantidade });
    localStorage.setItem('listaComprasNutri', JSON.stringify(listaCompras));
    renderizarListaCompras();
    adicionarPontos(1);
}

function removerItemCompra(index) {
    listaCompras.splice(index, 1);
    localStorage.setItem('listaComprasNutri', JSON.stringify(listaCompras));
    renderizarListaCompras();
}

function imprimirListaCompras() {
    const conteudo = document.getElementById('listaComprasContent').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Lista de Compras</title>
        <style>body{font-family:Arial;padding:40px;max-width:600px;margin:0 auto;}
        h1{color:#764ba2;text-align:center;}
        .item{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;}</style>
        </head><body>
        <h1>🛒 Lista de Compras</h1>
        <p style="text-align:center;color:#999;">${new Date().toLocaleDateString('pt-BR')}</p><hr>
        ${conteudo.replace(/<button[^>]*>.*<\/button>/g, '')}
        </body></html>
    `);
    win.document.close();
    win.print();
}

function limparListaCompras() {
    if (confirm('Limpar lista?')) {
        listaCompras = [];
        localStorage.setItem('listaComprasNutri', JSON.stringify(listaCompras));
        renderizarListaCompras();
    }
}

function gerarListaCompras() {
    const calorias = parseFloat(document.getElementById('caloriasPlano').value);
    const estrategia = document.getElementById('estrategia').value;
    const macros = calcularMacros(calorias, estrategia);
    
    const sugestoes = [
        { nome: 'Arroz Integral', quantidade: (macros.carb * 0.3 / 28).toFixed(1) + 'g' },
        { nome: 'Frango', quantidade: (macros.prot * 0.4 / 31).toFixed(1) + 'g' },
        { nome: 'Azeite', quantidade: (macros.gord * 0.3 / 9).toFixed(1) + 'ml' },
        { nome: 'Ovos', quantidade: Math.round(macros.prot * 0.2 / 6) + ' unidades' },
        { nome: 'Batata Doce', quantidade: (macros.carb * 0.3 / 20).toFixed(1) + 'g' },
        { nome: 'Salada', quantidade: 'À vontade' },
        { nome: 'Frutas', quantidade: '3 porções' },
    ];
    
    listaCompras = sugestoes;
    localStorage.setItem('listaComprasNutri', JSON.stringify(listaCompras));
    renderizarListaCompras();
    document.querySelector('[data-tab="compras"]').click();
    alert('✅ Lista de compras gerada!');
}

// ===== 15. RECEITAS =====
function renderizarReceitas(filtro = '') {
    const container = document.getElementById('listaReceitas');
    if (!container) return;
    let lista = receitas;
    if (filtro) {
        lista = receitas.filter(r => r.nome.toLowerCase().includes(filtro.toLowerCase()) || r.ingredientes.toLowerCase().includes(filtro.toLowerCase()));
    }
    if (lista.length === 0) {
        container.innerHTML = '<div class="empty-history">Nenhuma receita encontrada.</div>';
        return;
    }
    const categorias = { cafe: '☕ Café', almoco: '🍽️ Almoço', jantar: '🌙 Jantar', lanche: '🍪 Lanche', sobremesa: '🍰 Sobremesa' };
    let html = '';
    lista.forEach(receita => {
        html += `
            <div class="receita-card">
                <span class="categoria-tag">${categorias[receita.categoria] || receita.categoria}</span>
                <h4>${receita.nome}</h4>
                <p style="color:#666;font-size:13px;margin:8px 0;"><strong>Ingredientes:</strong><br>${receita.ingredientes}</p>
                <p style="color:#666;font-size:13px;margin:8px 0;"><strong>Preparo:</strong><br>${receita.preparo}</p>
                <p class="calorias">🔥 ${receita.calorias} kcal</p>
                <button onclick="deletarReceita(${receita.id})" style="margin-top:8px;background:#ff6b6b;color:white;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;">🗑️ Remover</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function filtrarReceitas() {
    const busca = document.getElementById('buscaReceita').value.trim();
    renderizarReceitas(busca);
}

function deletarReceita(id) {
    if (confirm('Remover esta receita?')) {
        receitas = receitas.filter(r => r.id !== id);
        localStorage.setItem('receitasNutri', JSON.stringify(receitas));
        renderizarReceitas();
        adicionarPontos(1);
    }
}

function abrirModalReceita() {
    document.getElementById('modalReceita').classList.add('show');
}

function fecharModalReceita() {
    document.getElementById('modalReceita').classList.remove('show');
    document.getElementById('formReceita').reset();
}

document.getElementById('formReceita').addEventListener('submit', function(e) {
    e.preventDefault();
    const nome = document.getElementById('nomeReceita').value.trim();
    const categoria = document.getElementById('categoriaReceita').value;
    const ingredientes = document.getElementById('ingredientesReceita').value.trim();
    const preparo = document.getElementById('preparoReceita').value.trim();
    const calorias = document.getElementById('caloriasReceita').value;
    if (!nome || !ingredientes || !preparo || !calorias) {
        alert('Preencha todos os campos!');
        return;
    }
    receitas.push({ id: Date.now(), nome, categoria, ingredientes, preparo, calorias: parseFloat(calorias) });
    localStorage.setItem('receitasNutri', JSON.stringify(receitas));
    renderizarReceitas();
    fecharModalReceita();
    adicionarPontos(3);
    alert('✅ Receita salva!');
});

// ===== 16. METAS =====
document.getElementById('formMeta').addEventListener('submit', function(e) {
    e.preventDefault();
    const texto = document.getElementById('textoMeta').value.trim();
    const data = document.getElementById('dataMeta').value;
    const categoria = document.getElementById('categoriaMeta').value;
    if (!texto || !data) {
        alert('Preencha todos os campos!');
        return;
    }
    metas.push({ id: Date.now(), texto, data, categoria, completa: false, criadoEm: new Date().toLocaleDateString('pt-BR') });
    localStorage.setItem('metasNutri', JSON.stringify(metas));
    renderizarMetas();
    adicionarPontos(5);
    document.getElementById('textoMeta').value = '';
    document.getElementById('dataMeta').value = '';
});

function renderizarMetas() {
    const container = document.getElementById('listaMetas');
    if (!container) return;
    if (metas.length === 0) {
        container.innerHTML = '<div class="empty-history">Nenhuma meta definida.</div>';
        return;
    }
    const categoriaEmoji = { peso: '⚖️', alimentacao: '🥗', exercicio: '🏃', agua: '💧', sono: '😴' };
    let html = '';
    metas.forEach(meta => {
        html += `
            <div class="meta-card" style="background:#f8f9fa;border-radius:10px;padding:12px;border-left:4px solid ${meta.completa ? '#4caf50' : '#764ba2'};display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h4>${categoriaEmoji[meta.categoria] || '🎯'} ${meta.texto}</h4>
                    <p style="color:#666;font-size:13px;">📅 ${meta.data} ${meta.completa ? '✅ Concluída' : '⏳ Pendente'}</p>
                </div>
                <div style="display:flex;gap:5px;">
                    ${!meta.completa ? `<button onclick="concluirMeta(${meta.id})" style="background:#4caf50;color:white;border:none;border-radius:5px;padding:4px 10px;cursor:pointer;">✅</button>` : ''}
                    <button onclick="deletarMeta(${meta.id})" style="background:#ff6b6b;color:white;border:none;border-radius:5px;padding:4px 10px;cursor:pointer;">🗑️</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function concluirMeta(id) {
    const meta = metas.find(m => m.id === id);
    if (meta) {
        meta.completa = true;
        localStorage.setItem('metasNutri', JSON.stringify(metas));
        renderizarMetas();
        adicionarPontos(10);
    }
}

function deletarMeta(id) {
    if (confirm('Remover esta meta?')) {
        metas = metas.filter(m => m.id !== id);
        localStorage.setItem('metasNutri', JSON.stringify(metas));
        renderizarMetas();
    }
}

// ===== 17. PRONTUÁRIO =====
function salvarProntuario() {
    prontuario = {
        nome: document.getElementById('prontuarioNome').value,
        nascimento: document.getElementById('prontuarioNascimento').value,
        peso: document.getElementById('prontuarioPeso').value,
        altura: document.getElementById('prontuarioAltura').value,
        historico: document.getElementById('prontuarioHistorico').value,
        observacoes: document.getElementById('prontuarioObservacoes').value,
        dataAtualizacao: new Date().toLocaleDateString('pt-BR')
    };
    localStorage.setItem('prontuarioNutri', JSON.stringify(prontuario));
    renderizarProntuario();
    alert('✅ Prontuário salvo!');
    adicionarPontos(3);
}

function renderizarProntuario() {
    const container = document.getElementById('historicoProntuario');
    if (!container) return;
    if (!prontuario.nome) {
        container.innerHTML = '<div class="empty-history">Nenhum prontuário salvo.</div>';
        return;
    }
    const peso = parseFloat(prontuario.peso) || 0;
    const altura = parseFloat(prontuario.altura) || 0;
    let imc = 0, classif = { classificacao: 'N/A' };
    if (peso > 0 && altura > 0) {
        imc = calcularIMC(peso, altura);
        classif = classificarIMC(imc);
    }
    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <div><strong>👤 Nome:</strong> ${prontuario.nome}</div>
            <div><strong>📅 Nascimento:</strong> ${prontuario.nascimento || 'Não informado'}</div>
            <div><strong>⚖️ Peso:</strong> ${prontuario.peso} kg</div>
            <div><strong>📏 Altura:</strong> ${prontuario.altura} cm</div>
            <div><strong>📊 IMC:</strong> ${imc > 0 ? imc.toFixed(1) + ' - ' + classif.classificacao : 'N/A'}</div>
            <div><strong>🔄 Atualizado:</strong> ${prontuario.dataAtualizacao || 'Nunca'}</div>
            <div style="grid-column:1/-1;"><strong>📋 Histórico:</strong> ${prontuario.historico || 'Não informado'}</div>
            <div style="grid-column:1/-1;"><strong>📝 Observações:</strong> ${prontuario.observacoes || 'Não informado'}</div>
        </div>
    `;
}

// ===== 18. AGENDA =====
document.getElementById('formAgenda').addEventListener('submit', function(e) {
    e.preventDefault();
    const data = document.getElementById('agendaData').value;
    const horario = document.getElementById('agendaHorario').value;
    const paciente = document.getElementById('agendaPaciente').value || 'Paciente';
    const tipo = document.getElementById('agendaTipo').value;
    const obs = document.getElementById('agendaObs').value;
    if (!data || !horario) {
        alert('Preencha data e horário!');
        return;
    }
    agenda.push({ id: Date.now(), data, horario, paciente, tipo, obs, status: 'pendente' });
    localStorage.setItem('agendaNutri', JSON.stringify(agenda));
    renderizarAgenda();
    adicionarPontos(2);
    alert('✅ Consulta agendada!');
    document.getElementById('formAgenda').reset();
});

function renderizarAgenda() {
    const container = document.getElementById('listaAgenda');
    if (!container) return;
    if (agenda.length === 0) {
        container.innerHTML = '<div class="empty-history">Nenhuma consulta agendada.</div>';
        return;
    }
    const tipos = { presencial: '🏢', online: '💻', retorno: '🔄' };
    let html = '';
    agenda.slice().reverse().forEach(c => {
        html += `
            <div class="agenda-item" style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #eee;align-items:center;">
                <div>
                    <span style="font-weight:600;">📅 ${c.data} às ${c.horario}</span>
                    <span style="color:#666;margin-left:10px;">${tipos[c.tipo] || '📌'} ${c.paciente}</span>
                    ${c.obs ? `<small style="color:#999;display:block;">${c.obs}</small>` : ''}
                </div>
                <div>
                    <span class="status ${c.status}">${c.status}</span>
                    <button onclick="alterarStatusAgenda(${c.id})" style="background:#4facfe;color:white;border:none;border-radius:5px;padding:2px 8px;cursor:pointer;margin-left:5px;">✓</button>
                    <button onclick="removerAgenda(${c.id})" style="background:#ff6b6b;color:white;border:none;border-radius:5px;padding:2px 8px;cursor:pointer;margin-left:2px;">✕</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function alterarStatusAgenda(id) {
    const consulta = agenda.find(c => c.id === id);
    if (consulta) {
        const statuses = ['pendente', 'confirmado', 'cancelado'];
        const idx = statuses.indexOf(consulta.status);
        consulta.status = statuses[(idx + 1) % statuses.length];
        localStorage.setItem('agendaNutri', JSON.stringify(agenda));
        renderizarAgenda();
        adicionarPontos(1);
    }
}

function removerAgenda(id) {
    if (confirm('Remover esta consulta?')) {
        agenda = agenda.filter(c => c.id !== id);
        localStorage.setItem('agendaNutri', JSON.stringify(agenda));
        renderizarAgenda();
    }
}

// ===== 19. CHAT =====
function enviarMensagem() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    const container = document.getElementById('chatMensagens');
    if (!container) return;
    container.innerHTML += `<div class="chat-message user"><p>${msg}</p></div>`;
    input.value = '';
    container.scrollTop = container.scrollHeight;
    setTimeout(() => {
        const respostas = [
            'Obrigado pela mensagem! Vou analisar e retornar em breve.',
            'Entendi! Pode me contar mais sobre isso?',
            'Ótima pergunta! Vou consultar as informações e te aviso.',
            'Isso é muito importante! Vamos conversar sobre isso na consulta.',
            'Anotei aqui! Pode ficar tranquilo que vou verificar.'
        ];
        const resposta = respostas[Math.floor(Math.random() * respostas.length)];
        container.innerHTML += `<div class="chat-message nutri"><p>👩‍⚕️ ${resposta}</p></div>`;
        container.scrollTop = container.scrollHeight;
        adicionarPontos(1);
    }, 800);
}

document.getElementById('chatInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') enviarMensagem();
});

// ===== 20. HISTÓRICO =====
function renderizarHistorico() {
    const tbody = document.getElementById('historyBody');
    if (!tbody) return;
    if (historico.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-history">Nenhum registro encontrado.</td></tr>';
        return;
    }
    const historicoOrdenado = [...historico].reverse();
    tbody.innerHTML = historicoOrdenado.map((item, index) => {
        const originalIndex = historico.length - 1 - index;
        return `
            <tr>
                <td>${item.data}</td>
                <td><strong>${item.paciente || 'Paciente'}</strong></td>
                <td>${item.imc ? item.imc.toFixed(1) : '-'}</td>
                <td>${item.classificacao || '-'}</td>
                <td>${item.gordura ? item.gordura.toFixed(1) + '%' : '-'}</td>
                <td>${item.tmb ? item.tmb.toFixed(0) : '-'}</td>
                <td>${item.get ? item.get.toFixed(0) : '-'}</td>
                <td>
                    <button onclick="removerHistorico(${originalIndex})" style="background:#ff6b6b;color:white;border:none;border-radius:5px;padding:2px 10px;cursor:pointer;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function removerHistorico(index) {
    if (confirm('Remover este registro?')) {
        historico.splice(index, 1);
        localStorage.setItem('historicoNutri', JSON.stringify(historico));
        renderizarHistorico();
    }
}

function limparHistoricoCompleto() {
    if (confirm('Limpar todo o histórico?')) {
        historico = [];
        localStorage.setItem('historicoNutri', JSON.stringify(historico));
        renderizarHistorico();
    }
}

function exportarPDF() {
    alert('📄 Função de PDF em desenvolvimento. Use Ctrl+P para imprimir.');
}

function exportarExcel() {
    if (historico.length === 0) {
        alert('Nenhum registro para exportar.');
        return;
    }
    let csv = 'Data,Paciente,IMC,Classificação,%Gordura,TMB,GET\n';
    historico.forEach(item => {
        csv += `${item.data},${item.paciente || 'Paciente'},${item.imc ? item.imc.toFixed(1) : '-'},${item.classificacao || '-'},${item.gordura ? item.gordura.toFixed(1) : '-'},${item.tmb ? item.tmb.toFixed(0) : '-'},${item.get ? item.get.toFixed(0) : '-'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'historico_nutrihealth.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

// ===== 21. DASHBOARD =====
function atualizarDashboard() {
    document.getElementById('totalPacientes').textContent = historico.length || 0;
    const hoje = new Date().toISOString().split('T')[0];
    const consultasHoje = agenda.filter(c => c.data === hoje).length;
    document.getElementById('consultasHoje').textContent = consultasHoje || 0;
    
    // Calcular IMC médio
    let totalIMC = 0, countIMC = 0;
    historico.forEach(item => {
        if (item.imc) { totalIMC += item.imc; countIMC++; }
    });
    document.getElementById('imcMedio').textContent = countIMC > 0 ? (totalIMC / countIMC).toFixed(1) : '-';
    document.getElementById('pontuacaoDash').textContent = pontos;
    
    // Gráfico
    const ctx = document.getElementById('graficoDashboard');
    if (ctx && historico.length > 0) {
        const labels = historico.slice(-7).map(item => item.data);
        const data = historico.slice(-7).map(item => item.imc || 0);
        if (chartInstances.dashboard) chartInstances.dashboard.destroy();
        chartInstances.dashboard = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Evolução do IMC',
                    data: data,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118,75,162,0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { size: 14, weight: 'bold' } } } },
                scales: { y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' } } }
            }
        });
    }
}

// ===== 22. PROTOCOLOS =====
function abrirProtocolo(tipo) {
    const modal = document.getElementById('modalProtocolo');
    const titulo = document.getElementById('protocoloTitulo');
    const conteudo = document.getElementById('protocoloConteudo');
    
    const protocolos = {
        anamnese: `
            <h3>📋 Protocolo de Anamnese Nutricional</h3>
            <ul>
                <li><strong>Dados Pessoais:</strong> Nome, Data Nascimento, Sexo, Telefone, Profissão, Escolaridade</li>
                <li><strong>Motivo da Consulta:</strong> Principal queixa do paciente</li>
                <li><strong>Diagnóstico Clínico:</strong> Doenças diagnosticadas</li>
                <li><strong>Medicamentos:</strong> Lista de medicamentos em uso</li>
                <li><strong>Antecedentes Familiares:</strong> Diabetes, HAS, Colesterol, Obesidade, Câncer, DVC</li>
                <li><strong>História Alimentar:</strong> Recordatório 24h, hábitos alimentares</li>
                <li><strong>Sinais e Sintomas:</strong> Tabagismo, Etilismo, Atividade Física, Função Intestinal</li>
            </ul>
            <hr>
            <h4>🔍 Exame Físico - Sinais de Deficiência</h4>
            <ul>
                <li><strong>Cabelos:</strong> Quebradiços, sem brilho → Kwashiorkor</li>
                <li><strong>Olhos:</strong> Manchas de Bitot → Vitamina A</li>
                <li><strong>Boca:</strong> Queilite angular → Riboflavina</li>
                <li><strong>Pele:</strong> Xerose → Vitamina A, Petéquias → Vitamina C</li>
                <li><strong>Unhas:</strong> Coiloníquia → Ferro</li>
            </ul>
        `,
        avaliacao: `
            <h3>⚖️ Protocolo de Avaliação Nutricional</h3>
            <h4>📏 Medidas Antropométricas</h4>
            <ul>
                <li><strong>Peso (kg):</strong> Atual, Habitual, Ideal</li>
                <li><strong>Altura (cm):</strong> Estimada por altura do joelho se necessário</li>
                <li><strong>IMC:</strong> Peso/Altura² (kg/m²)</li>
                <li><strong>Classificação IMC:</strong> Magreza, Eutrofia, Sobrepeso, Obesidade</li>
                <li><strong>Circunferência Cintura:</strong> Risco cardiovascular</li>
                <li><strong>Relação Cintura/Quadril:</strong> RCQ</li>
            </ul>
            <h4>📊 Pregas Cutâneas</h4>
            <ul>
                <li><strong>PCT:</strong> Prega Cutânea Tricipital</li>
                <li><strong>PCSe:</strong> Prega Cutânea Subescapular</li>
                <li><strong>PCB:</strong> Prega Cutânea Bicipital</li>
                <li><strong>PCSI:</strong> Prega Cutânea Supra-Ilíaca</li>
            </ul>
            <h4>📌 Interpretação</h4>
            <ul>
                <li><strong>Adequação PCT:</strong> &lt;70% Desnutrição grave, 70-80% Moderada, 80-90% Leve, 90-110% Eutrofia</li>
                <li><strong>Adequação CB:</strong> Mesma classificação da PCT</li>
                <li><strong>% Gordura:</strong> &lt;6% Homens / &lt;8% Mulheres = Desnutrição, &gt;25% Homens / &gt;32% Mulheres = Obesidade</li>
            </ul>
        `,
        energetico: `
            <h3>🔥 Protocolo de Cálculo Energético</h3>
            <h4>📐 Fórmulas Disponíveis</h4>
            <ul>
                <li><strong>Harris-Benedict (1919):</strong> Homens: 66 + (13.7×P) + (5×A) - (6.8×I) | Mulheres: 655 + (9.6×P) + (1.8×A) - (4.7×I)</li>
                <li><strong>Mifflin-St Jeor (1990):</strong> Homens: (10×P) + (6.25×A) - (5×I) + 5 | Mulheres: (10×P) + (6.25×A) - (5×I) - 161</li>
                <li><strong>DRI/IOM (2002):</strong> Homens: 662 - (9.53×I) + (15.91×P) + (540×E) | Mulheres: 354 - (6.91×I) + (9.36×P) + (726×E)</li>
                <li><strong>FAO/OMS (1985):</strong> Homens: 17.5×P + 651 | Mulheres: 12.2×P + 746</li>
            </ul>
            <p><small>P = peso (kg), A = altura (cm), I = idade (anos), E = altura (metros)</small></p>
            <hr>
            <h4>🏃 Fatores de Atividade</h4>
            <ul>
                <li><strong>Sedentário:</strong> 1.2</li>
                <li><strong>Leve (1-3x/semana):</strong> 1.375</li>
                <li><strong>Moderado (3-5x/semana):</strong> 1.55</li>
                <li><strong>Intenso (6-7x/semana):</strong> 1.725</li>
                <li><strong>Muito Intenso:</strong> 1.9</li>
            </ul>
            <hr>
            <h4>💧 Cálculo de Água</h4>
            <p>Água (ml) = Peso (kg) × 35</p>
            <hr>
            <h4>🎯 Calorias Recomendadas</h4>
            <ul>
                <li><strong>Manter peso:</strong> GET</li>
                <li><strong>Perder peso:</strong> GET - 500 kcal</li>
                <li><strong>Ganhar peso:</strong> GET + 500 kcal</li>
            </ul>
        `,
        cardapio: `
            <h3>📋 Protocolo de Cardápio</h3>
            <h4>🍽️ Estrutura do Cardápio</h4>
            <ul>
                <li><strong>Refeições:</strong> Café da Manhã, Lanche Manhã, Almoço, Lanche Tarde, Jantar, Ceia</li>
                <li><strong>Ordem no Almoço/Jantar:</strong> Prato Proteico → Base (arroz/feijão) → Guarnição → Salada → Suco → Sobremesa</li>
                <li><strong>Distribuição:</strong> 3 refeições (25%/40%/35%), 5 refeições (20%/15%/30%/15%/20%), 6 refeições (18%/12%/28%/12%/18%/12%)</li>
            </ul>
            <h4>🥗 Grupos Alimentares</h4>
            <ul>
                <li><strong>Cereais:</strong> Arroz, pão, macarrão, batata</li>
                <li><strong>Leguminosas:</strong> Feijão, lentilha, grão de bico</li>
                <li><strong>Carnes:</strong> Frango, carne bovina, peixe, ovos</li>
                <li><strong>Legumes/Verduras:</strong> Alface, rúcula, brócolis, cenoura</li>
                <li><strong>Frutas:</strong> Banana, maçã, laranja, mamão</li>
                <li><strong>Laticínios:</strong> Leite, iogurte, queijos</li>
                <li><strong>Oleaginosas:</strong> Amendoim, castanhas, nozes</li>
            </ul>
            <h4>⚠️ Orientações</h4>
            <ul>
                <li>Evitar frituras e sucos artificiais</li>
                <li>Incluir fonte de Vitamina A e C em cada refeição</li>
                <li>Não usar dois recheios no pão</li>
                <li>Evitar alimentos muito elaborados (lasanha, empadão)</li>
                <li>Água não aparece no cardápio, apenas nas recomendações</li>
            </ul>
        `,
        desportista: `
            <h3>🏋️ Protocolo para Desportistas</h3>
            <h4>📊 Avaliação</h4>
            <ul>
                <li><strong>IMC:</strong> Não é indicado como única forma de avaliação em atletas</li>
                <li><strong>Dobras Cutâneas:</strong> Tricipital, Bicipital, Peitoral, Subescapular, Axilar, Supra-ilíaca, Abdominal, Coxa</li>
                <li><strong>Circunferências:</strong> Punho, Braço, Antebraço, Peitoral, Cintura, Quadril, Coxa, Panturrilha</li>
            </ul>
            <h4>🍽️ Nutrição</h4>
            <ul>
                <li><strong>Carboidratos:</strong> 50-60% do VET, preferir complexos</li>
                <li><strong>Proteínas:</strong> 1.2-1.8 g/kg/dia</li>
                <li><strong>Gorduras:</strong> 20-25% do VET</li>
                <li><strong>Índice Glicêmico:</strong> Alto (pré-treino 3-4h), Médio (1h antes), Baixo (pós-treino)</li>
            </ul>
            <h4>⏱️ Antes, Durante e Depois</h4>
            <ul>
                <li><strong>Antes (3-4h):</strong> 3-4g carboidratos/kg</li>
                <li><strong>Durante:</strong> 25-30g carboidratos a cada 30 min + hidratação</li>
                <li><strong>Depois:</strong> 100g carboidratos + 5-9g proteínas até 30 min após</li>
            </ul>
        `,
        exames: `
            <h3>🔬 Exames Laboratoriais - Valores de Referência</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr style="background:#f0f0f0;"><th>Exame</th><th>Valor de Referência</th></tr>
                <tr><td>Glicemia Jejum</td><td>70-99 mg/dL</td></tr>
                <tr><td>Glicemia Pós-prandial</td><td>&lt;140 mg/dL</td></tr>
                <tr><td>Hemoglobina Glicada</td><td>4-6%</td></tr>
                <tr><td>Colesterol Total</td><td>&lt;200 mg/dL</td></tr>
                <tr><td>LDL-c</td><td>&lt;130 mg/dL</td></tr>
                <tr><td>HDL-c</td><td>&gt;40 mg/dL</td></tr>
                <tr><td>Triglicerídeos</td><td>&lt;150 mg/dL</td></tr>
                <tr><td>Albumina</td><td>3.5-5.0 g/dL</td></tr>
                <tr><td>Ferritina (H/M)</td><td>36-262 / 24-155 mcg/dL</td></tr>
                <tr><td>Vitamina B12</td><td>147-616 pmol/L</td></tr>
                <tr><td>Ácido Fólico</td><td>7-45 nmol/L</td></tr>
                <tr style="background:#f0f0f0;"><td colspan="2" style="text-align:center;"><strong>Albumina - Classificação Nutricional</strong></td></tr>
                <tr><td>&gt;3.5 g/dL</td><td>Normal</td></tr>
                <tr><td>3.0-3.5 g/dL</td><td>Depleção Leve</td></tr>
                <tr><td>2.4-2.9 g/dL</td><td>Depleção Moderada</td></tr>
                <tr><td>&lt;2.4 g/dL</td><td>Depleção Grave</td></tr>
            </table>
        `
    };
    
    if (protocolos[tipo]) {
        titulo.textContent = '📚 Protocolo de ' + titulo.textContent.replace('Protocolo de ', '');
        conteudo.innerHTML = protocolos[tipo];
        modal.classList.add('show');
    }
}

function fecharModalProtocolo() {
    document.getElementById('modalProtocolo').classList.remove('show');
}

// ===== 23. INICIALIZAÇÃO =====
function init() {
    renderizarHistorico();
    renderizarListaCompras();
    renderizarReceitas();
    renderizarAgenda();
    renderizarProntuario();
    renderizarDiario();
    renderizarMetas();
    atualizarDashboard();
    document.getElementById('pontuacaoDash').textContent = pontos;
    
    // Pré-calcular
    setTimeout(() => {
        document.getElementById('formAvaliacao').dispatchEvent(new Event('submit'));
        calcularEnergetico();
        document.getElementById('formPlano').dispatchEvent(new Event('submit'));
    }, 500);
    
    console.log('🍏 NutriHealth RealClin carregado com sucesso!');
    console.log('📊 Histórico:', historico.length, 'registros');
    console.log('📋 Anamneses:', anamneses.length);
    console.log('🍽️ Diário:', diario.length, 'registros');
    console.log('🛒 Compras:', listaCompras.length, 'itens');
    console.log('👨‍🍳 Receitas:', receitas.length);
    console.log('📅 Agenda:', agenda.length, 'consultas');
    console.log('🎯 Metas:', metas.length);
}

document.addEventListener('DOMContentLoaded', init);