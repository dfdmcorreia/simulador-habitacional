// Registra o Service Worker para tornar a aplicação um PWA (Progressive Web App)
// Isso permite que a aplicação funcione offline e seja instalável.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // O caminho do Service Worker é relativo ao diretório raiz da aplicação.
        navigator.serviceWorker.register('service-worker.js').then(function(registration) {
            // Registro bem-sucedido do Service Worker
            console.log('Service Worker registrado com sucesso:', registration.scope);
        }, function(err) {
            // Falha no registro do Service Worker
            console.log('Falha no registro do Service Worker:', err);
        });
    });
}

// Aguarda o carregamento completo do DOM (Document Object Model) antes de executar o script
document.addEventListener('DOMContentLoaded', function() {
    'use strict'; // Ativa o modo estrito para um código mais seguro e com menos erros silenciosos

    console.log('DOM completamente carregado. Iniciando script do simulador.');

    // --- Cache de Seletores DOM ---
    // Obtém referências para os elementos HTML principais do formulário
    const valorImovelInput = document.getElementById('valorImovel');
    const valorEntradaInput = document.getElementById('valorEntrada');
    const rendaMensalInput = document.getElementById('rendaMensal');
    const prazoAnosInput = document.getElementById('prazoAnos');
    const taxaJurosAnualInput = document.getElementById('taxaJurosAnual');

    // Elementos relacionados ao programa Minha Casa Minha Vida (MCMV)
    const includeMCMVCheckbox = document.getElementById('includeMCMV');
    const mcmvOptionsGroup = document.querySelector('.mcmv-options-group'); // A div que agrupa as opções MCMV
    const mcmvFaixaSelect = document.getElementById('mcmvFaixa');
    const mcmvRegiaoSelect = document.getElementById('mcmvRegiao');
    const mcmvTipoParticipanteSelect = document.getElementById('mcmvTipoParticipante');

    // Campos de input para custos adicionais (seguros e taxa administrativa)
    const seguroMIPInput = document.getElementById('seguroMIP');
    const seguroDFIInput = document.getElementById('seguroDFI');
    const taxaAdministrativaInput = document.getElementById('taxaAdministrativa');

    // Checkboxes para incluir/excluir os custos adicionais na simulação
    const includeMIPCheckbox = document.getElementById('includeMIP');
    const includeDFICheckbox = document.getElementById('includeDFI');
    const includeTaxaAdminCheckbox = document.getElementById('includeTaxaAdmin');

    // Botões de ação
    const simulateBtn = document.getElementById('simulateBtn');
    const copyResultsBtn = document.getElementById('copyResultsBtn');
    const whatsappShareBtn = document.getElementById('whatsappShareBtn');
    const clearInputButtons = document.querySelectorAll('.clear-input'); // Botões "Limpar" individuais
    const clearAllBtn = document.getElementById('clearAllBtn'); // Botão "Limpar Todos os Dados"

    // Divs de saída de resultados e validação
    const simulationMainResultsDiv = document.getElementById('results-output'); 
    const validationTextDiv = document.querySelector('#results-output .validation-text'); 

    // --- Constantes da Aplicação ---
    const INCOME_COMMITMENT_RATIO = 0.30; // Limite de 30% da renda para a parcela do financiamento

    // --- Estado da Aplicação ---
    let textSummaryForSharing = ''; // Variável para armazenar o resumo da simulação para compartilhamento

    // --- Taxas de Juros de Exemplo por Faixa, Região e Tipo de Participante MCMV (Ilustrativas) ---
    // ATENÇÃO: Estas taxas são apenas exemplos e podem não refletir as taxas reais do programa.
    // As taxas reais dependem de diversos fatores e podem mudar.
    // Sempre consulte fontes oficiais (Caixa/Ministério das Cidades) para as taxas atuais.
    const mcmvTaxasExemplo = {
        faixa1: { // Corresponde ao 'value="faixa1"' no HTML
            'norte-nordeste': { 'cotista': 4.00, 'nao-cotista': 4.25 },
            'outras': { 'cotista': 4.25, 'nao-cotista': 4.50 }
        },
        faixa2: { // Corresponde ao 'value="faixa2"' no HTML
            'norte-nordeste': { 'cotista': 4.60, 'nao-cotista': 4.85 },
            'outras': { 'cotista': 4.85, 'nao-cotista': 5.10 }
        },
        faixa3: { // Corresponde ao 'value="faixa3"' no HTML
            'norte-nordeste': { 'cotista': 7.66, 'nao-cotista': 8.16 },
            'outras': { 'cotista': 8.16, 'nao-cotista': 8.66 }
        },
         faixa4: { // Corresponde ao 'value="faixa4"' no HTML
            'norte-nordeste': { 'cotista': 9.16, 'nao-cotista': 9.16 },
            'outras': { 'cotista': 9.16, 'nao-cotista': 9.16 }
        }
    };

    // --- Porcentagens de Entrada Mínima para MCMV (Ilustrativas) ---
    // ATENÇÃO: Estes são exemplos e podem não refletir as regras reais do MCMV.
    // O valor da entrada mínima pode variar por diversos fatores, incluindo subsídios,
    // limites de valor do imóvel e políticas de cada banco.
    const mcmvMinEntradaPorcentagem = {
        faixa1: 10, // 10%
        faixa2: 15, // 15%
        faixa3: 20, // 20%
        faixa4: 25  // 25%
    };
    const defaultMinEntradaPorcentagem = 20; // Porcentagem de entrada padrão para financiamentos fora do MCMV


    // --- Funções Auxiliares de Formatação Numérica ---

    /**
     * Remove a formatação de moeda (pontos de milhar e vírgula decimal) de uma string.
     * Converte "300.000,00" para "300000.00".
     * @param {string} formattedString - A string formatada.
     * @returns {string} A string sem formatação, pronta para ser convertida em número.
     */
    function unformatNumberString(formattedString) {
        if (typeof formattedString !== 'string' || !formattedString) return '';
        // Remove todos os pontos de milhar e substitui a vírgula decimal por ponto.
        return formattedString.replace(/\./g, '').replace(/,/g, '.');
    }

    /**
     * Formata um número para uma string no padrão monetário brasileiro (pt-BR).
     * Ex: 300000.00 para "300.000,00".
     * @param {number} number - O número a ser formatado.
     * @returns {string} A string formatada.
     */
    function formatNumberString(number) {
        if (isNaN(number)) return '';
        // Formata com duas casas decimais para manter a consistência de moeda.
        return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Lida com o evento 'blur' (quando o campo perde o foco) para formatar o valor do input.
     * Esta é a versão robusta que lida com o problema dos dígitos.
     * @param {Event} event - O objeto do evento.
     */
    function handleBlurFormatting(event) {
        const input = event.target;
        let valueToParse = input.value;

        // Se o valor no input já está no formato "numero.decimal" (ex: "300000.00", vindo do onfocus)
        // e não contém vírgulas, então parseFloat pode lidar com ele diretamente.
        // Não precisamos do unformatNumberString completo que remove TODOS os pontos.
        if (valueToParse.includes('.') && !valueToParse.includes(',')) {
            // O valor já está como "300000.00". parseFloat lida com isso.
            // valueToParse permanece como está para o parseFloat.
        } else {
            // Se o valor está no formato "300.000,00" ou o usuário digitou "150,50",
            // usamos unformatNumberString para converter para "numero.decimal".
            valueToParse = unformatNumberString(input.value); // Ex: "300.000,00" -> "300000.00"; "150,50" -> "150.50"
        }

        const number = parseFloat(valueToParse); // Ex: parseFloat("300000.00") -> 300000.00

        if (!isNaN(number)) {
            input.value = formatNumberString(number); // Ex: formatNumberString(300000.00) -> "300.000,00"
        } else {
            input.value = ''; // Limpa o campo se o valor não for um número válido após o parse
        }

        // Se o input que perdeu o foco for o valor do imóvel, recalcula a entrada mínima
        if (input.id === 'valorImovel') {
            calculateAndSetMinEntrada();
        }
    }

    /**
     * Lida com o evento 'focus' (quando o campo ganha o foco) para remover a formatação do input.
     * Isso facilita a edição do número pelo usuário.
     * @param {Event} event - O objeto do evento.
     */
    function handleFocusUnformatting(event) {
        const input = event.target;
        // Ao focar, remove a formatação de milhar e troca vírgula por ponto.
        input.value = unformatNumberString(input.value);
    }

    /**
     * Formata um número como moeda BRL para exibição nos resultados.
     * Ex: 1234.56 para "R$ 1.234,56".
     * @param {number} number - O número a ser formatado.
     * @returns {string} A string formatada como moeda.
     */
    function formatCurrency(number) {
        if (isNaN(number)) return 'N/A';
        // Formata com estilo de moeda BRL.
        return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    /**
     * Formata um número como porcentagem para exibição nos resultados.
     * Opcionalmente, multiplica por 100 se o número for uma fração (ex: 0.05 para 5%).
     * @param {number} number - O número a ser formatado.
     * @param {boolean} [multiplyBy100=false] - Se true, multiplica o número por 100 antes de formatar.
     * @returns {string} A string formatada como porcentagem.
     */
    function formatPercentage(number, multiplyBy100 = false) {
        if (isNaN(number)) return 'N/A';
        const valueToFormat = multiplyBy100 ? number * 100 : number;
        // Formata com duas casas decimais e adiciona o símbolo de porcentagem.
        return valueToFormat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    }

    /**
     * Retorna o texto descritivo para uma faixa MCMV específica.
     * @param {string} faixaValue - O valor da faixa (ex: 'faixa1').
     * @returns {string} O texto descritivo da faixa.
     */
    function getMCMVFaixaText(faixaValue) {
        const faixas = {
            faixa1: 'Faixa 1 (Renda até R$ 2.640)',
            faixa2: 'Faixa 2 (Renda de R$ 2.640,01 a R$ 4.400)',
            faixa3: 'Faixa 3 (Renda de R$ 4.400,01 a R$ 8.000)',
            faixa4: 'Faixa 4 (Renda de R$ 8.000,01 a R$ 12.000)'
        };
        return faixas[faixaValue] || 'Não especificada';
    }

    /**
     * Retorna o texto descritivo para uma região MCMV específica.
     * @param {string} regiaoValue - O valor da região (ex: 'norte-nordeste').
     * @returns {string} O texto descritivo da região.
     */
    function getMCMVRegiaoText(regiaoValue) {
        const regioes = {
            'norte-nordeste': 'Norte e Nordeste',
            'outras': 'Sul, Sudeste e Centro-Oeste'
        };
        return regioes[regiaoValue] || 'Não especificada';
    }

    /**
     * Retorna o texto descritivo para um tipo de participante MCMV específico.
     * @param {string} tipoValue - O valor do tipo (ex: 'cotista').
     * @returns {string} O texto descritivo do tipo de participante.
     */
    function getMCMVTipoParticipanteText(tipoValue) {
        const tipos = {
            'cotista': 'Cotista do FGTS',
            'nao-cotista': 'Não Cotista do FGTS'
        };
        return tipos[tipoValue] || 'Não especificado';
    }

    /**
     * Atualiza o campo de taxa de juros anual com base nas seleções de Faixa, Região e Tipo de Participante do MCMV.
     */
    function updateTaxaJurosMCMV() {
        // Só atualiza se o checkbox MCMV estiver marcado e todos os selects existirem
        if (!includeMCMVCheckbox.checked || !mcmvFaixaSelect || !mcmvRegiaoSelect || !mcmvTipoParticipanteSelect) {
            return;
        }
        const selectedFaixa = mcmvFaixaSelect.value;
        const selectedRegiao = mcmvRegiaoSelect.value;
        const selectedTipo = mcmvTipoParticipanteSelect.value;

        // Tenta encontrar a taxa correspondente no objeto de taxas de exemplo
        const taxaCorrespondente = mcmvTaxasExemplo[selectedFaixa]?.[selectedRegiao]?.[selectedTipo];

        if (taxaCorrespondente !== undefined) {
            // Se a taxa for encontrada, atualiza o input de taxa de juros
            taxaJurosAnualInput.value = formatNumberString(taxaCorrespondente);
        } else {
            console.warn('Taxa MCMV não encontrada para a combinação selecionada. Manter taxa atual.');
        }
    }

    /**
     * Calcula e preenche o valor da entrada mínima com base no valor do imóvel e nas regras do MCMV (se aplicável).
     */
    function calculateAndSetMinEntrada() {
        const valorImovelStr = unformatNumberString(valorImovelInput.value);
        const valorImovel = parseFloat(valorImovelStr);

        // Se o valor do imóvel for inválido ou zero, define a entrada como 0 e sai
        if (isNaN(valorImovel) || valorImovel <= 0) {
            valorEntradaInput.value = formatNumberString(0);
            return;
        }

        let porcentagemEntrada = defaultMinEntradaPorcentagem; // Começa com a porcentagem padrão

        // Se MCMV estiver checado e a faixa selecionada for válida, usa a porcentagem da faixa MCMV
        if (includeMCMVCheckbox.checked && mcmvFaixaSelect) {
            const selectedFaixa = mcmvFaixaSelect.value;
            // Usa o operador nullish coalescing (??) para garantir um fallback se a faixa não for encontrada
            porcentagemEntrada = mcmvMinEntradaPorcentagem[selectedFaixa] ?? defaultMinEntradaPorcentagem;
        }

        const minEntradaCalculada = valorImovel * (porcentagemEntrada / 100);
        // Atualiza o campo de entrada com o valor calculado e formatado
        valorEntradaInput.value = formatNumberString(minEntradaCalculada);
    }

    /**
     * Lida com o evento de clique no botão de simulação.
     * Realiza validações, cálculos SAC e PRICE, e exibe os resultados na tela.
     */
    function handleSimulation() {
        console.log('Botão Simular clicado. Iniciando simulação...');

        // Obtém e desformata os valores dos inputs
        const valorImovel = parseFloat(unformatNumberString(valorImovelInput.value));
        const valorEntrada = parseFloat(unformatNumberString(valorEntradaInput.value));
        const rendaMensal = parseFloat(unformatNumberString(rendaMensalInput.value));
        const prazoAnos = parseInt(prazoAnosInput.value, 10); // Base 10 para garantir parsing correto
        const taxaJurosAnual = parseFloat(unformatNumberString(taxaJurosAnualInput.value));

        // Obtém os valores dos seguros e taxa administrativa, considerando se os checkboxes estão marcados
        const seguroMIP = includeMIPCheckbox.checked ? (parseFloat(unformatNumberString(seguroMIPInput.value)) || 0) : 0;
        const seguroDFI = includeDFICheckbox.checked ? (parseFloat(unformatNumberString(seguroDFIInput.value)) || 0) : 0;
        const taxaAdministrativa = includeTaxaAdminCheckbox.checked ? (parseFloat(unformatNumberString(taxaAdministrativaInput.value)) || 0) : 0;

        // --- Validação dos inputs ---
        let errors = [];
        if (isNaN(valorImovel) || valorImovel <= 0) errors.push("Valor do Imóvel deve ser positivo.");
        if (isNaN(valorEntrada) || valorEntrada < 0) errors.push("Valor da Entrada deve ser positivo ou zero.");
        if (isNaN(rendaMensal) || rendaMensal <= 0) errors.push("Renda Mensal deve ser positiva.");
        if (isNaN(prazoAnos) || prazoAnos <= 0) errors.push("Prazo em anos deve ser positivo.");
        if (isNaN(taxaJurosAnual) || taxaJurosAnual < 0) errors.push("Taxa de Juros Anual deve ser positiva ou zero.");
        if (!isNaN(valorEntrada) && !isNaN(valorImovel) && valorEntrada > valorImovel) errors.push("Valor da Entrada não pode ser maior que o Valor do Imóvel.");

        // Se houver erros de validação, exibe-os e desabilita botões de compartilhamento
        if (errors.length > 0) {
            if (simulationMainResultsDiv) simulationMainResultsDiv.innerHTML = `<p style="color: red;">Por favor, corrija os seguintes erros:<br>${errors.join("<br>")}</p>`;
            if (validationTextDiv) validationTextDiv.innerHTML = ''; // Limpa a div de validação para exibir apenas os erros
            textSummaryForSharing = '';
            if (copyResultsBtn) copyResultsBtn.disabled = true;
            if (whatsappShareBtn) whatsappShareBtn.disabled = true;
            return; // Sai da função se houver erros
        }

        const valorFinanciado = valorImovel - valorEntrada;
        // Validação adicional para valor financiado
        if (valorFinanciado <= 0) {
            if (simulationMainResultsDiv) simulationMainResultsDiv.innerHTML = `<p style="color: orange;">O valor a ser financiado é zero ou negativo. Verifique o valor do imóvel e da entrada.</p>`;
            if (validationTextDiv) validationTextDiv.innerHTML = '';
            textSummaryForSharing = '';
            if (copyResultsBtn) copyResultsBtn.disabled = true;
            if (whatsappShareBtn) whatsappShareBtn.disabled = true;
            return;
        }

        // Calcula a taxa de juros mensal e o prazo em meses
        const taxaJurosMensal = (taxaJurosAnual / 100) / 12;
        const prazoMeses = prazoAnos * 12;

        // --- Cálculo da Parcela (Método SAC - Sistema de Amortização Constante) ---
        let saldoDevedorSAC = valorFinanciado;
        let totalJurosSAC = 0;
        let totalPagoSAC = 0;
        let primeiraParcelaSAC_semTaxas = 0;
        let ultimaParcelaSAC_semTaxas = 0;
        const amortizacaoMensalSAC = valorFinanciado / prazoMeses;

        for (let i = 1; i <= prazoMeses; i++) {
            const jurosDoMes = saldoDevedorSAC * taxaJurosMensal;
            const parcelaSemTaxas = jurosDoMes + amortizacaoMensalSAC;
            
            // Captura a primeira e a última parcela sem taxas
            if (i === 1) primeiraParcelaSAC_semTaxas = parcelaSemTaxas;
            if (i === prazoMeses) ultimaParcelaSAC_semTaxas = parcelaSemTaxas;
            
            totalJurosSAC += jurosDoMes;
            // O total pago no SAC inclui os custos adicionais em cada parcela
            totalPagoSAC += parcelaSemTaxas + seguroMIP + seguroDFI + taxaAdministrativa;
            saldoDevedorSAC -= amortizacaoMensalSAC; // Reduz o saldo devedor pela amortização
        }
        // Calcula a primeira e a última parcela COM taxas
        const primeiraParcelaSAC_comTaxas = primeiraParcelaSAC_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;
        const ultimaParcelaSAC_comTaxas = ultimaParcelaSAC_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;

        // --- Cálculo da Parcela (Método PRICE - Sistema Francês de Amortização) ---
        let parcelaPRICE_semTaxas = 0;
        if (taxaJurosMensal > 0) {
            // Fórmula da Parcela PRICE
            parcelaPRICE_semTaxas = valorFinanciado * (taxaJurosMensal / (1 - Math.pow(1 + taxaJurosMensal, -prazoMeses)));
        } else {
            // Caso a taxa de juros seja zero, a parcela é apenas o valor financiado dividido pelo prazo
            parcelaPRICE_semTaxas = valorFinanciado / prazoMeses;
        }
        // Calcula a parcela PRICE COM taxas
        const parcelaPRICE_comTaxas = parcelaPRICE_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;
        // Calcula o total pago e o total de juros para o sistema PRICE
        const totalPagoPRICE = parcelaPRICE_comTaxas * prazoMeses;
        const totalJurosPRICE = (parcelaPRICE_semTaxas * prazoMeses) - valorFinanciado;

        // Informações do MCMV para exibição (se aplicável)
        const isMCMV = includeMCMVCheckbox.checked;
        const mcmvInfo = isMCMV ?
            `<p>Simulação MCMV: ${getMCMVFaixaText(mcmvFaixaSelect.value)}, ${getMCMVRegiaoText(mcmvRegiaoSelect.value)}, ${getMCMVTipoParticipanteText(mcmvTipoParticipanteSelect.value)}</p>` : '';

        // Informações dos custos adicionais para exibição (se incluídos)
        const custosAdicionaisInfo = (includeMIPCheckbox.checked ? `<p>Seguro MIP Mensal (estimado): ${formatCurrency(seguroMIP)}</p>` : '') +
                                     (includeDFICheckbox.checked ? `<p>Seguro DFI Mensal (estimado): ${formatCurrency(seguroDFI)}</p>` : '') +
                                     (includeTaxaAdminCheckbox.checked ? `<p>Taxa Administrativa Mensal (estimado): ${formatCurrency(taxaAdministrativa)}</p>` : '');

        // --- Construção do HTML dos Resultados ---
        const mainResultsHTML = `
            <h3>Resumo da Simulação</h3>
            <p>Valor do Imóvel: ${formatCurrency(valorImovel)}</p>
            <p>Valor da Entrada: ${formatCurrency(valorEntrada)}</p>
            <p>Valor Financiado: ${formatCurrency(valorFinanciado)}</p>
            <p>Prazo: ${prazoAnos} anos (${prazoMeses} meses)</p>
            <p>Taxa de Juros Anual: ${formatPercentage(taxaJurosAnual)}%</p>
            <p>Taxa de Juros Mensal: ${formatPercentage(taxaJurosMensal * 100)}%</p>
            ${mcmvInfo}
            ${custosAdicionaisInfo}

            <h4>Simulação pelo Sistema SAC (Sistema de Amortização Constante)</h4>
            <p>Primeira Parcela (sem taxas): ${formatCurrency(primeiraParcelaSAC_semTaxas)}</p>
            <p>Última Parcela (sem taxas): ${formatCurrency(ultimaParcelaSAC_semTaxas)}</p>
            <p><strong>Primeira Parcela (COM taxas): ${formatCurrency(primeiraParcelaSAC_comTaxas)}</strong></p>
            <p><strong>Última Parcela (COM taxas): ${formatCurrency(ultimaParcelaSAC_comTaxas)}</strong></p>
            <p>Total de Juros Pagos (estimado): ${formatCurrency(totalJurosSAC)}</p>
            <p>Total Pago ao Final (COM taxas, estimado): ${formatCurrency(totalPagoSAC)}</p>
            <p><em>No sistema SAC, o valor da parcela diminui ao longo do tempo.</em></p>

            <h4>Simulação pelo Sistema PRICE (Sistema Francês de Amortização)</h4>
            <p>Valor da Parcela Fixa (sem taxas): ${formatCurrency(parcelaPRICE_semTaxas)}</p>
            <p><strong>Valor da Parcela Fixa (COM taxas): ${formatCurrency(parcelaPRICE_comTaxas)}</strong></p>
            <p>Total de Juros Pagos (estimado): ${formatCurrency(totalJurosPRICE)}</p>
            <p>Total Pago ao Final (COM taxas, estimado): ${formatCurrency(totalPagoPRICE)}</p>
            <p><em>No sistema PRICE, o valor da parcela é constante (sem considerar seguros e taxas).</em></p>
        `;
        
        // Garante que a div de resultados exista antes de tentar manipular seu conteúdo
        if (simulationMainResultsDiv) {
            // Preserva o disclaimer e o texto de validação se existirem
            const disclaimerDiv = simulationMainResultsDiv.querySelector('.disclaimer-text');
            const validationDiv = simulationMainResultsDiv.querySelector('.validation-text');

            simulationMainResultsDiv.innerHTML = mainResultsHTML; // Define o novo HTML de resultados

            // Re-adiciona o disclaimer e o texto de validação
            if (disclaimerDiv) simulationMainResultsDiv.appendChild(disclaimerDiv);
            if (validationDiv) simulationMainResultsDiv.appendChild(validationDiv);
        } else {
             console.error('Div de resultados principal (simulationMainResultsDiv) não encontrada no DOM.');
        }

        console.log('Resultados na página atualizados.');

        // --- Formatação do Resumo para Compartilhamento (Texto Puro) ---
        // Cria uma versão em texto puro dos resultados para ser copiada ou compartilhada.
        textSummaryForSharing = `*Resumo da Simulação Habitacional*\n\n` +
                                `Valor do Imóvel: ${formatCurrency(valorImovel)}\n` +
                                `Valor da Entrada: ${formatCurrency(valorEntrada)}\n` +
                                `Valor Financiado: ${formatCurrency(valorFinanciado)}\n` +
                                `Prazo: ${prazoAnos} anos (${prazoMeses} meses)\n` +
                                `Taxa de Juros Anual: ${formatPercentage(taxaJurosAnual)}%\n` +
                                `Taxa de Juros Mensal: ${formatPercentage(taxaJurosMensal * 100)}%\n` +
                                (isMCMV ? `Simulação MCMV: ${getMCMVFaixaText(mcmvFaixaSelect.value)}, ${getMCMVRegiaoText(mcmvRegiaoSelect.value)}, ${getMCMVTipoParticipanteText(mcmvTipoParticipanteSelect.value)}\n` : '') +
                                (includeMIPCheckbox.checked ? `Seguro MIP Mensal (estimado): ${formatCurrency(seguroMIP)}\n` : '') +
                                (includeDFIChebox.checked ? `Seguro DFI Mensal (estimado): ${formatCurrency(seguroDFI)}\n` : '') +
                                (includeTaxaAdminCheckbox.checked ? `Taxa Administrativa Mensal (estimado): ${formatCurrency(taxaAdministrativa)}\n` : '') +
                                `\n*Simulação SAC*\n` +
                                `Primeira Parcela (COM taxas): ${formatCurrency(primeiraParcelaSAC_comTaxas)}\n` +
                                `Última Parcela (COM taxas): ${formatCurrency(ultimaParcelaSAC_comTaxas)}\n` +
                                `Total Pago (estimado): ${formatCurrency(totalPagoSAC)}\n` +
                                `\n*Simulação PRICE*\n` +
                                `Parcela Fixa (COM taxas): ${formatCurrency(parcelaPRICE_comTaxas)}\n` +
                                `Total Pago (estimado): ${formatCurrency(totalPagoPRICE)}\n\n` +
                                `_Estes são cálculos estimados e podem variar._`;

        // --- Validação da Parcela vs Renda (Adicional) ---
        // Verifica se a parcela estimada ultrapassa 30% da renda mensal.
        const limiteParcela = rendaMensal * INCOME_COMMITMENT_RATIO;
        let validationMessageHTML = '';
        let validationMessageText = '';
        // Pega a maior parcela inicial entre SAC e PRICE para a validação.
        const parcelaMaisAlta = Math.max(primeiraParcelaSAC_comTaxas, parcelaPRICE_comTaxas);

        if (parcelaMaisAlta > limiteParcela) {
            validationMessageHTML = `<p style="color: orange; font-weight: bold;">
                Atenção: O valor estimado da maior parcela inicial (SAC: ${formatCurrency(primeiraParcelaSAC_comTaxas)}, PRICE: ${formatCurrency(parcelaPRICE_comTaxas)})
                pode ultrapassar o limite de ${formatPercentage(INCOME_COMMITMENT_RATIO, true)} da sua renda mensal (${formatCurrency(limiteParcela)}).
                Isso pode dificultar a aprovação do financiamento.
            </p>`;
            validationMessageText = `\nAtenção: O valor estimado da maior parcela inicial pode ultrapassar ${formatPercentage(INCOME_COMMITMENT_RATIO, true)} da sua renda mensal (R$ ${formatCurrency(limiteParcela)}). Isso pode dificultar a aprovação.`;
        } else {
            validationMessageHTML = `<p style="color: green; font-weight: bold;">
                Com base na sua renda, o valor estimado das parcelas (SAC: ${formatCurrency(primeiraParcelaSAC_comTaxas)}, PRICE: ${formatCurrency(parcelaPRICE_comTaxas)}) parece estar dentro do limite de ${formatPercentage(INCOME_COMMITMENT_RATIO, true)} (${formatCurrency(limiteParcela)}).
            </p>`;
            validationMessageText = `\nCom base na sua renda, o valor estimado das parcelas parece estar dentro do limite de ${formatPercentage(INCOME_COMMITMENT_RATIO, true)} (${formatCurrency(limiteParcela)}).`;
        }

        // Exibe a mensagem de validação na div específica
        if (validationTextDiv) validationTextDiv.innerHTML = validationMessageHTML;
        textSummaryForSharing += validationMessageText; // Adiciona ao resumo para compartilhamento

        // Habilita os botões de compartilhamento após a simulação
        if (copyResultsBtn) copyResultsBtn.disabled = false;
        if (whatsappShareBtn) whatsappShareBtn.disabled = false;
        console.log('Simulação concluída.');
    }

    /**
     * Copia o resumo da simulação para a área de transferência do usuário.
     */
    function copyResults() {
        if (!textSummaryForSharing) {
            alert('Não há resultados para copiar. Realize uma simulação primeiro.');
            return;
        }
        navigator.clipboard.writeText(textSummaryForSharing).then(() => {
            alert('Resultados copiados para a área de transferência! Cole em um aplicativo de mensagens ou editor de texto para ver a formatação.');
        }).catch(err => {
            console.error('Erro ao copiar resultados: ', err);
            alert('Erro ao copiar resultados. Por favor, tente copiar manualmente.');
        });
    }

    /**
     * Abre uma nova janela para compartilhar o resumo da simulação via WhatsApp.
     */
    function shareViaWhatsApp() {
        if (!textSummaryForSharing) {
            alert('Não há resultados para compartilhar. Realize uma simulação primeiro.');
            return;
        }
        // Codifica o texto para ser seguro em URLs
        const whatsappMessage = encodeURIComponent(textSummaryForSharing);
        const whatsappLink = `https://wa.me/?text=${whatsappMessage}`;
        window.open(whatsappLink, '_blank'); // Abre em uma nova aba
    }

    /**
     * Lida com o evento de clique nos botões individuais de "Limpar" para cada input.
     * Limpa o campo específico e recalcula a entrada mínima se for o valor do imóvel.
     * @param {Event} event - O objeto do evento.
     */
    function handleClearInput(event) {
        const targetInputId = event.target.dataset.target; // Obtém o ID do input alvo do botão
        const targetInput = document.getElementById(targetInputId);
        if (targetInput) {
            targetInput.value = ''; // Limpa o valor do input
            // Se o input limpo for o valor do imóvel ou da entrada, recalcula a entrada mínima
            if (targetInput.id === 'valorImovel' || targetInput.id === 'valorEntrada') {
                calculateAndSetMinEntrada();
            }
            // Se for a taxa de juros e o MCMV estiver ativo, atualiza a taxa MCMV
            if (targetInput.id === 'taxaJurosAnual' && includeMCMVCheckbox.checked) {
                updateTaxaJurosMCMV();
            }
        }
    }

    /**
     * Lida com o evento de clique no botão "Limpar Todos os Dados".
     * Limpa todos os campos do formulário e redefine a área de resultados.
     */
    function handleClearAll() {
        console.log('Limpando todos os dados...');
        // Limpa todos os inputs de texto e número
        // Itera sobre a lista de inputs que precisam de formatação ou são numéricos
        inputsForFormatting.forEach(input => {
            if (input) input.value = '';
        });
        if (prazoAnosInput) prazoAnosInput.value = ''; // Limpa o input de prazo (tipo number)

        // Reseta o checkbox e esconde as opções MCMV
        if (includeMCMVCheckbox) includeMCMVCheckbox.checked = false;
        if (mcmvOptionsGroup) mcmvOptionsGroup.classList.add('hidden');
        // Reseta os selects MCMV para seus valores padrão
        if (mcmvFaixaSelect) mcmvFaixaSelect.value = 'faixa1'; // Valor padrão do HTML
        if (mcmvRegiaoSelect) mcmvRegiaoSelect.value = 'outras'; // Valor padrão do HTML
        if (mcmvTipoParticipanteSelect) mcmvTipoParticipanteSelect.value = 'nao-cotista'; // Valor padrão do HTML

        // Reseta os checkboxes de seguros/taxa para o estado inicial (marcados)
        if (includeMIPCheckbox) includeMIPCheckbox.checked = true;
        if (includeDFICheckbox) includeDFICheckbox.checked = true;
        if (includeTaxaAdminCheckbox) includeTaxaAdminCheckbox.checked = true;
        console.log('Checkboxes de seguros/taxa resetados.');

        // Limpa a área de resultados e restaura a mensagem inicial e o disclaimer
        if (simulationMainResultsDiv) {
            simulationMainResultsDiv.innerHTML = `
                <p>Preencha os dados e clique em "Simular" para ver os resultados.</p>
                <div class="disclaimer-text">
                    <p>* Estes são cálculos estimados e podem não refletir o valor exacto das parcelas e do total pago, que podem variar entre as instituições financeiras e incluir outros encargos não considerados aqui.</p>
                </div>
                <div class="validation-text"></div>
            `;
        }
        console.log('Área de resultados limpa.');

        textSummaryForSharing = ''; // Limpa o resumo de texto para compartilhamento
        console.log('Resumo de texto para compartilhamento limpo.');

        // Desabilita os botões de compartilhamento
        if (copyResultsBtn) copyResultsBtn.disabled = true;
        if (whatsappShareBtn) whatsappShareBtn.disabled = true;
        console.log('Botões de compartilhamento desabilitados.');

        // Chama a função de cálculo de entrada mínima para redefinir o valor padrão após limpar tudo.
        calculateAndSetMinEntrada(); 
    }


    // --- Configuração de Event Listeners ---
    // Adiciona ouvintes de clique aos botões principais
    if (simulateBtn) simulateBtn.addEventListener('click', handleSimulation);
    if (copyResultsBtn) copyResultsBtn.addEventListener('click', copyResults);
    if (whatsappShareBtn) whatsappShareBtn.addEventListener('click', shareViaWhatsApp);
    if (clearAllBtn) clearAllBtn.addEventListener('click', handleClearAll);

    // Adiciona ouvintes de clique aos botões "Limpar" individuais
    clearInputButtons.forEach(button => button.addEventListener('click', handleClearInput));

    // Declaração ÚNICA de inputsForFormatting no escopo principal do DOMContentLoaded
    // Esta lista inclui todos os inputs que precisam de formatação monetária/taxa
    const inputsForFormatting = [ 
        valorImovelInput, valorEntradaInput, rendaMensalInput,
        taxaJurosAnualInput, seguroMIPInput, seguroDFIInput, taxaAdministrativaInput
    ];
    // Adiciona ouvintes de 'blur' e 'focus' para formatação em todos os inputs de texto
    inputsForFormatting.forEach(input => {
        if (input) { // Garante que o input existe antes de adicionar o ouvinte
            input.addEventListener('blur', handleBlurFormatting);
            input.addEventListener('focus', handleFocusUnformatting);
        }
    });
    
    // Adiciona ouvinte de evento 'input' para o campo Valor do Imóvel
    // Isso fará com que a entrada mínima seja atualizada dinamicamente ao digitar.
    if (valorImovelInput) {
        valorImovelInput.addEventListener('input', calculateAndSetMinEntrada);
        console.log('Ouvinte de "input" adicionado ao valorImovelInput para atualização dinâmica da entrada.');
    }

    // Ouvinte de evento para o checkbox MCMV
    // Controla a visibilidade das opções MCMV e atualiza taxas/entrada quando o checkbox muda.
    if (includeMCMVCheckbox && mcmvOptionsGroup && mcmvFaixaSelect && mcmvRegiaoSelect && mcmvTipoParticipanteSelect) {
        includeMCMVCheckbox.addEventListener('change', function() {
            // Alterna a classe 'hidden' no grupo de opções MCMV
            if (mcmvOptionsGroup) mcmvOptionsGroup.classList.toggle('hidden', !this.checked);
            if (this.checked) {
                updateTaxaJurosMCMV(); // Atualiza a taxa de juros ao ativar MCMV
            } else {
                // Opcional: Se MCMV for desativado, você pode resetar a taxa de juros para um valor padrão
                // ou deixar o valor que o usuário digitou. Por enquanto, não há reset explícito aqui.
            }
            calculateAndSetMinEntrada(); // Recalcula a entrada mínima com base no estado do MCMV
        });
    } else {
         console.warn('Alguns elementos MCMV não encontrados no DOM. Funcionalidade MCMV pode não operar completamente.');
    }

    // Ouvintes de evento para os selects MCMV (faixa, região, tipo de participante)
    // Atualizam a taxa de juros e a entrada mínima sempre que uma seleção MCMV muda.
    [mcmvFaixaSelect, mcmvRegiaoSelect, mcmvTipoParticipanteSelect].forEach(select => {
        if (select) { // Verifica se o select existe
            select.addEventListener('change', () => {
                if (includeMCMVCheckbox.checked) { // Só atualiza se o MCMV estiver ativo
                    updateTaxaJurosMCMV();
                }
                calculateAndSetMinEntrada();
            });
        }
    });

    // --- Inicialização da Aplicação ---
    /**
     * Função de inicialização que aplica a formatação inicial aos campos
     * e define o estado inicial dos botões e da entrada mínima.
     */
    function initializeForm() {
        // Aplica formatação inicial aos campos que têm valor padrão no HTML
        inputsForFormatting.forEach(input => {
            if (input && input.value) { // Verifica se o input existe e tem valor
                const value = unformatNumberString(input.value);
                const number = parseFloat(value);
                if (!isNaN(number)) {
                    input.value = formatNumberString(number);
                }
            }
        });

        // Calcula e define a entrada mínima inicial
        calculateAndSetMinEntrada();
        // Desabilita os botões de compartilhamento no carregamento inicial
        if (copyResultsBtn) copyResultsBtn.disabled = true;
        if (whatsappShareBtn) whatsappShareBtn.disabled = true;
    }

    initializeForm(); // Chama a função de inicialização quando o DOM estiver pronto.
    console.log('Simulador Habitacional inicializado e pronto para uso.');
});
