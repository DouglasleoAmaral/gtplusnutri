// ============================================================
// TABELA TACO - Brasil (Versão Completa)
// ============================================================

const tabelaTACO = {
    // ========== CEREAIS E DERIVADOS ==========
    'arroz branco cozido': { calorias: 130, proteinas: 2.5, carboidratos: 28.1, gorduras: 0.3, fibra: 0.6, categoria: 'cereais' },
    'arroz integral cozido': { calorias: 124, proteinas: 2.6, carboidratos: 25.8, gorduras: 0.9, fibra: 2.7, categoria: 'cereais' },
    'feijão preto cozido': { calorias: 77, proteinas: 4.8, carboidratos: 14.0, gorduras: 0.5, fibra: 8.4, categoria: 'leguminosas' },
    'feijão carioca cozido': { calorias: 76, proteinas: 4.5, carboidratos: 13.6, gorduras: 0.5, fibra: 7.8, categoria: 'leguminosas' },
    'lentilha cozida': { calorias: 93, proteinas: 6.3, carboidratos: 16.4, gorduras: 0.4, fibra: 7.9, categoria: 'leguminosas' },
    'grão de bico cozido': { calorias: 139, proteinas: 8.9, carboidratos: 20.8, gorduras: 2.6, fibra: 7.6, categoria: 'leguminosas' },
    'aveia em flocos': { calorias: 389, proteinas: 16.9, carboidratos: 66.6, gorduras: 6.9, fibra: 10.6, categoria: 'cereais' },
    'macarrão cozido': { calorias: 131, proteinas: 4.8, carboidratos: 26.5, gorduras: 0.7, fibra: 1.8, categoria: 'cereais' },
    'pão francês': { calorias: 300, proteinas: 8.0, carboidratos: 58.0, gorduras: 3.0, fibra: 2.3, categoria: 'cereais' },
    'pão integral': { calorias: 265, proteinas: 9.5, carboidratos: 48.0, gorduras: 3.0, fibra: 6.5, categoria: 'cereais' },
    'batata doce cozida': { calorias: 86, proteinas: 1.6, carboidratos: 20.0, gorduras: 0.1, fibra: 2.4, categoria: 'tubérculos' },
    'batata inglesa cozida': { calorias: 87, proteinas: 2.0, carboidratos: 20.0, gorduras: 0.1, fibra: 1.8, categoria: 'tubérculos' },
    'mandioca cozida': { calorias: 125, proteinas: 1.1, carboidratos: 30.0, gorduras: 0.3, fibra: 1.6, categoria: 'tubérculos' },

    // ========== CARNES E OVOS ==========
    'frango grelhado': { calorias: 165, proteinas: 31.0, carboidratos: 0.0, gorduras: 3.6, fibra: 0, categoria: 'carnes' },
    'frango cozido': { calorias: 160, proteinas: 30.0, carboidratos: 0.0, gorduras: 3.5, fibra: 0, categoria: 'carnes' },
    'carne bovina grelhada': { calorias: 250, proteinas: 26.0, carboidratos: 0.0, gorduras: 15.0, fibra: 0, categoria: 'carnes' },
    'carne bovina magra': { calorias: 150, proteinas: 28.0, carboidratos: 0.0, gorduras: 4.0, fibra: 0, categoria: 'carnes' },
    'filé mignon': { calorias: 200, proteinas: 27.0, carboidratos: 0.0, gorduras: 9.0, fibra: 0, categoria: 'carnes' },
    'salmão grelhado': { calorias: 208, proteinas: 22.0, carboidratos: 0.0, gorduras: 13.0, fibra: 0, categoria: 'peixes' },
    'tilápia grelhada': { calorias: 128, proteinas: 24.0, carboidratos: 0.0, gorduras: 2.9, fibra: 0, categoria: 'peixes' },
    'atum em lata': { calorias: 140, proteinas: 25.0, carboidratos: 0.0, gorduras: 3.0, fibra: 0, categoria: 'peixes' },
    'ovo cozido': { calorias: 155, proteinas: 13.0, carboidratos: 1.1, gorduras: 11.0, fibra: 0, categoria: 'ovos' },

    // ========== LEGUMES E VERDURAS ==========
    'alface': { calorias: 15, proteinas: 1.2, carboidratos: 2.9, gorduras: 0.2, fibra: 1.3, categoria: 'verduras' },
    'rúcula': { calorias: 25, proteinas: 2.6, carboidratos: 3.7, gorduras: 0.7, fibra: 1.6, categoria: 'verduras' },
    'espinafre': { calorias: 23, proteinas: 2.9, carboidratos: 3.6, gorduras: 0.4, fibra: 2.2, categoria: 'verduras' },
    'brócolis cozido': { calorias: 34, proteinas: 2.8, carboidratos: 6.6, gorduras: 0.4, fibra: 2.6, categoria: 'legumes' },
    'couve-flor cozida': { calorias: 25, proteinas: 1.9, carboidratos: 5.0, gorduras: 0.3, fibra: 2.0, categoria: 'legumes' },
    'cenoura cozida': { calorias: 32, proteinas: 0.8, carboidratos: 7.5, gorduras: 0.1, fibra: 2.1, categoria: 'legumes' },
    'abobrinha': { calorias: 19, proteinas: 1.2, carboidratos: 4.1, gorduras: 0.2, fibra: 1.2, categoria: 'legumes' },
    'pepino': { calorias: 15, proteinas: 0.7, carboidratos: 3.6, gorduras: 0.1, fibra: 0.5, categoria: 'legumes' },
    'tomate': { calorias: 18, proteinas: 0.9, carboidratos: 3.9, gorduras: 0.2, fibra: 1.2, categoria: 'legumes' },
    'abóbora cozida': { calorias: 26, proteinas: 0.8, carboidratos: 6.5, gorduras: 0.1, fibra: 1.0, categoria: 'legumes' },
    'beterraba cozida': { calorias: 43, proteinas: 1.6, carboidratos: 9.6, gorduras: 0.1, fibra: 2.0, categoria: 'legumes' },

    // ========== FRUTAS ==========
    'banana': { calorias: 89, proteinas: 1.1, carboidratos: 22.8, gorduras: 0.3, fibra: 2.6, categoria: 'frutas' },
    'maçã': { calorias: 52, proteinas: 0.3, carboidratos: 13.8, gorduras: 0.2, fibra: 2.4, categoria: 'frutas' },
    'laranja': { calorias: 47, proteinas: 0.9, carboidratos: 11.7, gorduras: 0.1, fibra: 2.4, categoria: 'frutas' },
    'mamão': { calorias: 43, proteinas: 0.5, carboidratos: 10.8, gorduras: 0.1, fibra: 1.7, categoria: 'frutas' },
    'abacaxi': { calorias: 50, proteinas: 0.5, carboidratos: 12.9, gorduras: 0.1, fibra: 1.4, categoria: 'frutas' },
    'melancia': { calorias: 30, proteinas: 0.6, carboidratos: 7.6, gorduras: 0.2, fibra: 0.4, categoria: 'frutas' },
    'morango': { calorias: 32, proteinas: 0.7, carboidratos: 7.7, gorduras: 0.3, fibra: 2.0, categoria: 'frutas' },
    'kiwi': { calorias: 61, proteinas: 1.1, carboidratos: 14.7, gorduras: 0.5, fibra: 3.0, categoria: 'frutas' },
    'abacate': { calorias: 160, proteinas: 2.0, carboidratos: 8.5, gorduras: 14.7, fibra: 6.7, categoria: 'frutas' },

    // ========== LATICÍNIOS ==========
    'leite integral': { calorias: 61, proteinas: 3.3, carboidratos: 4.7, gorduras: 3.3, fibra: 0, categoria: 'laticinios' },
    'leite desnatado': { calorias: 35, proteinas: 3.4, carboidratos: 4.9, gorduras: 0.2, fibra: 0, categoria: 'laticinios' },
    'iogurte natural': { calorias: 61, proteinas: 3.5, carboidratos: 4.7, gorduras: 3.3, fibra: 0, categoria: 'laticinios' },
    'iogurte grego': { calorias: 97, proteinas: 10.0, carboidratos: 4.0, gorduras: 5.0, fibra: 0, categoria: 'laticinios' },
    'queijo minas frescal': { calorias: 260, proteinas: 18.0, carboidratos: 2.0, gorduras: 20.0, fibra: 0, categoria: 'laticinios' },
    'queijo mussarela': { calorias: 280, proteinas: 22.0, carboidratos: 2.0, gorduras: 20.0, fibra: 0, categoria: 'laticinios' },
    'requeijão': { calorias: 130, proteinas: 5.0, carboidratos: 4.0, gorduras: 10.0, fibra: 0, categoria: 'laticinios' },

    // ========== OLEAGINOSAS ==========
    'amendoim': { calorias: 567, proteinas: 25.8, carboidratos: 16.1, gorduras: 49.2, fibra: 8.5, categoria: 'oleaginosas' },
    'castanha do pará': { calorias: 659, proteinas: 14.3, carboidratos: 11.7, gorduras: 66.4, fibra: 7.5, categoria: 'oleaginosas' },
    'nozes': { calorias: 607, proteinas: 15.0, carboidratos: 13.7, gorduras: 60.0, fibra: 6.7, categoria: 'oleaginosas' },
    'amêndoas': { calorias: 579, proteinas: 21.0, carboidratos: 21.7, gorduras: 49.9, fibra: 12.5, categoria: 'oleaginosas' },

    // ========== ÓLEOS ==========
    'azeite de oliva': { calorias: 884, proteinas: 0.0, carboidratos: 0.0, gorduras: 100.0, fibra: 0, categoria: 'oleos' },
    'óleo de coco': { calorias: 862, proteinas: 0.0, carboidratos: 0.0, gorduras: 100.0, fibra: 0, categoria: 'oleos' },
    'manteiga': { calorias: 717, proteinas: 0.9, carboidratos: 0.1, gorduras: 81.0, fibra: 0, categoria: 'oleos' },

    // ========== BEBIDAS ==========
    'água': { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibra: 0, categoria: 'bebidas' },
    'café sem açúcar': { calorias: 2, proteinas: 0.1, carboidratos: 0.1, gorduras: 0, fibra: 0, categoria: 'bebidas' },
    'chá sem açúcar': { calorias: 1, proteinas: 0, carboidratos: 0.1, gorduras: 0, fibra: 0, categoria: 'bebidas' },
    'suco de laranja natural': { calorias: 45, proteinas: 0.7, carboidratos: 10.4, gorduras: 0.2, fibra: 0.2, categoria: 'bebidas' }
};

// ===== FUNÇÕES DE BUSCA =====
function buscarAlimentoTACO(nome) {
    const nomeLower = nome.toLowerCase().trim();
    const resultados = [];
    for (const [key, value] of Object.entries(tabelaTACO)) {
        if (key.includes(nomeLower)) {
            resultados.push({ nome: key, ...value });
        }
    }
    return resultados;
}

function getAlimentoPorCategoria(categoria) {
    const resultados = [];
    for (const [key, value] of Object.entries(tabelaTACO)) {
        if (value.categoria === categoria) {
            resultados.push({ nome: key, ...value });
        }
    }
    return resultados;
}

function calcularNutrientesPorcao(alimento, quantidadeG) {
    const fator = quantidadeG / 100;
    return {
        calorias: alimento.calorias * fator,
        proteinas: alimento.proteinas * fator,
        carboidratos: alimento.carboidratos * fator,
        gorduras: alimento.gorduras * fator,
        fibra: alimento.fibra * fator
    };
}