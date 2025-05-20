// Registra o Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('service-worker.js').then(function(registration) {
            console.log('Service Worker registrado com sucesso:', registration.scope);
        }, function(err) {
            console.log('Falha no registro do Service Worker:', err);
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    'use strict'; // Using strict mode for better error handling and practices

    console.log('DOM completamente carregado.');

    // --- Cache de Seletores DOM ---
    const valorImovelInput = document.getElementById('valorImovel');
    const valorEntradaInput = document.getElementById('valorEntrada');
    const rendaMensalInput = document.getElementById('rendaMensal');
    const prazoAnosInput = document.getElementById('prazoAnos');
    const taxaJurosAnualInput = document.getElementById('taxaJurosAnual');

    const includeMCMVCheckbox = document.getElementById('includeMCMV');
    const mcmvOptionsGroup = document.querySelector('.mcmv-options-group');
    const mcmvFaixaSelect = document.getElementById('mcmvFaixa');
    const mcmvRegiaoSelect = document.getElementById('mcmvRegiao');
    const mcmvTipoParticipanteSelect = document.getElementById('mcmvTipoParticipante');

    const seguroMIPInput = document.getElementById('seguroMIP');
    const seguroDFIInput = document.getElementById('seguroDFI');
    const taxaAdministrativaInput = document.getElementById('taxaAdministrativa');

    const includeMIPCheckbox = document.getElementById('includeMIP');
    const includeDFICheckbox = document.getElementById('includeDFI'); // Corrigido na v1
    const includeTaxaAdminCheckbox = document.getElementById('includeTaxaAdmin');

    const simulateBtn = document.getElementById('simulateBtn');
    const simulationMainResultsDiv = document.getElementById('simulation-main-results'); // Assumindo HTML ajustado
    const validationTextDiv = document.querySelector('results-output .validation-text'); // Assumindo HTML ajustado

    const copyResultsBtn = document.getElementById('copyResultsBtn');
    const whatsappShareBtn = document.getElementById('whatsappShareBtn');
    const clearInputButtons = document.querySelectorAll('.clear-input');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // --- Constantes ---
    const INCOME_COMMITMENT_RATIO = 0.30;

    // --- Estado da Aplicação ---
    let textSummaryForSharing = '';

    // --- Taxas de Juros de Exemplo por Faixa, Região e Tipo de Participante MCMV (Ilustrativas) ---
    const mcmvTaxasExemplo = {
        faixa1: {
            'norte-nordeste': { 'cotista': 4.00, 'nao-cotista': 4.25 },
            'outras': { 'cotista': 4.25, 'nao-cotista': 4.50 }
        },
        faixa2: {
            'norte-nordeste': { 'cotista': 4.60, 'nao-cotista': 4.85 },
            'outras': { 'cotista': 4.85, 'nao-cotista': 5.10 }
        },
        faixa3: {
            'norte-nordeste': { 'cotista': 7.66, 'nao-cotista': 8.16 },
            'outras': { 'cotista': 8.16, 'nao-cotista': 8.66 }
        },
         faixa4: {
            'norte-nordeste': { 'cotista': 9.16, 'nao-cotista': 9.16 },
            'outras': { 'cotista': 9.16, 'nao-cotista': 9.16 }
        }
    };

    const mcmvMinEntradaPorcentagem = {
        faixa1: 10, faixa2: 15, faixa3: 20, faixa4: 25
    };
    const defaultMinEntradaPorcentagem = 20;

    // --- Funções Auxiliares de Formatação Numérica ---
    function unformatNumberString(formattedString) {
        if (typeof formattedString !== 'string' || !formattedString) return '';
        // Remove pontos de milhar (todos) e substitui a vírgula decimal por ponto.
        return formattedString.replace(/\./g, '').replace(/,/g, '.');
    }

    function formatNumberString(number) {
        if (isNaN(number)) return '';
        // Formata para o padrão pt-BR com duas casas decimais.
        return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ##########################################################################
    // ## Função handleBlurFormatting CORRIGIDA para o problema dos 30 milhões ##
    // ##########################################################################
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
    // ##########################################################################

    function handleFocusUnformatting(event) {
        const input = event.target;
        // Ao focar, remove a formatação de milhar e troca vírgula por ponto para facilitar a edição.
        // Ex: "300.000,00" -> "300000.00"
        input.value = unformatNumberString(input.value);
    }

    function formatCurrency(number) {
        if (isNaN(number)) return 'N/A';
        return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatPercentage(number, multiplyBy100 = false) {
        if (isNaN(number)) return 'N/A';
        const valueToFormat = multiplyBy100 ? number * 100 : number;
        return valueToFormat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    }

    function getMCMVFaixaText(faixaValue) {
        const faixas = {
            faixa1: 'Faixa 1 (Renda até R$ 2.640)',
            faixa2: 'Faixa 2 (Renda de R$ 2.640,01 a R$ 4.400)',
            faixa3: 'Faixa 3 (Renda de R$ 4.400,01 a R$ 8.000)',
            faixa4: 'Faixa 4 (Renda de R$ 8.000,01 a R$ 12.000)'
        };
        return faixas[faixaValue] || 'Não especificada';
    }

    function getMCMVRegiaoText(regiaoValue) {
        const regioes = {
            'norte-nordeste': 'Norte e Nordeste',
            'outras': 'Sul, Sudeste e Centro-Oeste'
        };
        return regioes[regiaoValue] || 'Não especificada';
    }

    function getMCMVTipoParticipanteText(tipoValue) {
        const tipos = {
            'cotista': 'Cotista do FGTS',
            'nao-cotista': 'Não Cotista do FGTS'
        };
        return tipos[tipoValue] || 'Não especificado';
    }

    function updateTaxaJurosMCMV() {
        if (!includeMCMVCheckbox.checked || !mcmvFaixaSelect || !mcmvRegiaoSelect || !mcmvTipoParticipanteSelect) {
            return;
        }
        const selectedFaixa = mcmvFaixaSelect.value;
        const selectedRegiao = mcmvRegiaoSelect.value;
        const selectedTipo = mcmvTipoParticipanteSelect.value;

        const taxaCorrespondente = mcmvTaxasExemplo[selectedFaixa]?.[selectedRegiao]?.[selectedTipo];

        if (taxaCorrespondente !== undefined) {
            taxaJurosAnualInput.value = formatNumberString(taxaCorrespondente);
        } else {
            console.warn('Taxa MCMV não encontrada para a combinação selecionada. Manter taxa atual.');
        }
    }

    function calculateAndSetMinEntrada() {
        const valorImovelStr = unformatNumberString(valorImovelInput.value);
        const valorImovel = parseFloat(valorImovelStr);

        if (isNaN(valorImovel) || valorImovel <= 0) {
            valorEntradaInput.value = formatNumberString(0); // Ou '' se preferir campo vazio
            return;
        }

        let porcentagemEntrada = defaultMinEntradaPorcentagem;
        if (includeMCMVCheckbox.checked && mcmvFaixaSelect) {
            const selectedFaixa = mcmvFaixaSelect.value;
            porcentagemEntrada = mcmvMinEntradaPorcentagem[selectedFaixa] ?? defaultMinEntradaPorcentagem;
        }

        const minEntradaCalculada = valorImovel * (porcentagemEntrada / 100);
        valorEntradaInput.value = formatNumberString(minEntradaCalculada);
    }

    function handleSimulation() {
        console.log('Botão Simular clicado. Iniciando simulação...');

        const valorImovel = parseFloat(unformatNumberString(valorImovelInput.value));
        const valorEntrada = parseFloat(unformatNumberString(valorEntradaInput.value));
        const rendaMensal = parseFloat(unformatNumberString(rendaMensalInput.value));
        const prazoAnos = parseInt(prazoAnosInput.value, 10);
        const taxaJurosAnual = parseFloat(unformatNumberString(taxaJurosAnualInput.value));

        const seguroMIP = includeMIPCheckbox.checked ? (parseFloat(unformatNumberString(seguroMIPInput.value)) || 0) : 0;
        const seguroDFI = includeDFICheckbox.checked ? (parseFloat(unformatNumberString(seguroDFIInput.value)) || 0) : 0;
        const taxaAdministrativa = includeTaxaAdminCheckbox.checked ? (parseFloat(unformatNumberString(taxaAdministrativaInput.value)) || 0) : 0;

        let errors = [];
        if (isNaN(valorImovel) || valorImovel <= 0) errors.push("Valor do Imóvel deve ser positivo.");
        if (isNaN(valorEntrada) || valorEntrada < 0) errors.push("Valor da Entrada deve ser positivo ou zero.");
        if (isNaN(rendaMensal) || rendaMensal <= 0) errors.push("Renda Mensal deve ser positiva.");
        if (isNaN(prazoAnos) || prazoAnos <= 0) errors.push("Prazo em anos deve ser positivo.");
        if (isNaN(taxaJurosAnual) || taxaJurosAnual < 0) errors.push("Taxa de Juros Anual deve ser positiva ou zero.");
        if (!isNaN(valorEntrada) && !isNaN(valorImovel) && valorEntrada > valorImovel) errors.push("Valor da Entrada não pode ser maior que o Valor do Imóvel.");

        if (errors.length > 0) {
            if (simulationMainResultsDiv) simulationMainResultsDiv.innerHTML = `<p style="color: red;">Por favor, corrija os seguintes erros:<br>${errors.join("<br>")}</p>`;
            if (validationTextDiv) validationTextDiv.innerHTML = '';
            textSummaryForSharing = '';
            if (copyResultsBtn) copyResultsBtn.disabled = true;
            if (whatsappShareBtn) whatsappShareBtn.disabled = true;
            return;
        }

        const valorFinanciado = valorImovel - valorEntrada;
        if (valorFinanciado <=0) {
            if (simulationMainResultsDiv) simulationMainResultsDiv.innerHTML = `<p style="color: orange;">O valor a ser financiado é zero ou negativo. Verifique o valor do imóvel e da entrada.</p>`;
            if (validationTextDiv) validationTextDiv.innerHTML = '';
            textSummaryForSharing = '';
            if (copyResultsBtn) copyResultsBtn.disabled = true;
            if (whatsappShareBtn) whatsappShareBtn.disabled = true;
            return;
        }
        const taxaJurosMensal = (taxaJurosAnual / 100) / 12;
        const prazoMeses = prazoAnos * 12;

        let saldoDevedorSAC = valorFinanciado;
        let totalJurosSAC = 0;
        let totalPagoSAC = 0;
        let primeiraParcelaSAC_semTaxas = 0;
        let ultimaParcelaSAC_semTaxas = 0;
        const amortizacaoMensalSAC = valorFinanciado / prazoMeses;

        for (let i = 1; i <= prazoMeses; i++) {
            const jurosDoMes = saldoDevedorSAC * taxaJurosMensal;
            const parcelaSemTaxas = jurosDoMes + amortizacaoMensalSAC;
            if (i === 1) primeiraParcelaSAC_semTaxas = parcelaSemTaxas;
            if (i === prazoMeses) ultimaParcelaSAC_semTaxas = parcelaSemTaxas;
            totalJurosSAC += jurosDoMes;
            totalPagoSAC += parcelaSemTaxas + seguroMIP + seguroDFI + taxaAdministrativa;
            saldoDevedorSAC -= amortizacaoMensalSAC;
        }
        const primeiraParcelaSAC_comTaxas = primeiraParcelaSAC_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;
        const ultimaParcelaSAC_comTaxas = ultimaParcelaSAC_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;

        let parcelaPRICE_semTaxas = 0;
        if (taxaJurosMensal > 0) {
            parcelaPRICE_semTaxas = valorFinanciado * (taxaJurosMensal / (1 - Math.pow(1 + taxaJurosMensal, -prazoMeses)));
        } else {
            parcelaPRICE_semTaxas = valorFinanciado / prazoMeses;
        }
        const parcelaPRICE_comTaxas = parcelaPRICE_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;
        const totalPagoPRICE = parcelaPRICE_comTaxas * prazoMeses;
        const totalJurosPRICE = (parcelaPRICE_semTaxas * prazoMeses) - valorFinanciado;

        const isMCMV = includeMCMVCheckbox.checked;
        const mcmvInfo = isMCMV ?
            `<p>Simulação MCMV: ${getMCMVFaixaText(mcmvFaixaSelect.value)}, ${getMCMVRegiaoText(mcmvRegiaoSelect.value)}, ${getMCMVTipoParticipanteText(mcmvTipoParticipanteSelect.value)}</p>` : '';

        const custosAdicionaisInfo = (includeMIPCheckbox.checked ? `<p>Seguro MIP Mensal (estimado): ${formatCurrency(seguroMIP)}</p>` : '') +
                                     (includeDFICheckbox.checked ? `<p>Seguro DFI Mensal (estimado): ${formatCurrency(seguroDFI)}</p>` : '') +
                                     (includeTaxaAdminCheckbox.checked ? `<p>Taxa Administrativa Mensal (estimado): ${formatCurrency(taxaAdministrativa)}</p>` : '');

        const mainResultsHTML = `
            <h3>Resumo da Simulação</h3>
            <p>Valor do Imóvel: ${formatCurrency(valorImovel)}</p>
            <p>Valor da Entrada: ${formatCurrency(valorEntrada)}</p>
            <p>Valor Financiado: ${formatCurrency(valorFinanciado)}</p>
            <p>Prazo: ${prazoAnos} anos (${prazoMeses} meses)</p>
            <p>Taxa de Juros Anual: ${formatPercentage(taxaJurosAnual)}</p>
            <p>Taxa de Juros Mensal: ${formatPercentage(taxaJurosMensal, true)}</p>
            ${mcmvInfo}
            ${custosAdicionaisInfo}

            <h4>Simulação pelo Sistema SAC</h4>
            <p>Primeira Parcela (sem taxas): ${formatCurrency(primeiraParcelaSAC_semTaxas)}</p>
            <p>Última Parcela (sem taxas): ${formatCurrency(ultimaParcelaSAC_semTaxas)}</p>
            <p><strong>Primeira Parcela (COM taxas): ${formatCurrency(primeiraParcelaSAC_comTaxas)}</strong></p>
            <p><strong>Última Parcela (COM taxas): ${formatCurrency(ultimaParcelaSAC_comTaxas)}</strong></p>
            <p>Total de Juros Pagos (estimado): ${formatCurrency(totalJurosSAC)}</p>
            <p>Total Pago ao Final (COM taxas, estimado): ${formatCurrency(totalPagoSAC)}</p>
            <p><em>No sistema SAC, o valor da parcela diminui ao longo do tempo.</em></p>

            <h4>Simulação pelo Sistema PRICE</h4>
            <p>Valor da Parcela Fixa (sem taxas): ${formatCurrency(parcelaPRICE_semTaxas)}</p>
            <p><strong>Valor da Parcela Fixa (COM taxas): ${formatCurrency(parcelaPRICE_comTaxas)}</strong></p>
            <p>Total de Juros Pagos (estimado): ${formatCurrency(totalJurosPRICE)}</p>
            <p>Total Pago ao Final (COM taxas, estimado): ${formatCurrency(totalPagoPRICE)}</p>
            <p><em>No sistema PRICE, o valor da parcela é constante (sem considerar seguros e taxas).</em></p>
        `;
        if (simulationMainResultsDiv) simulationMainResultsDiv.innerHTML = mainResultsHTML;

        textSummaryForSharing = `*Resumo da Simulação Habitacional*\n\n` +
            `Valor do Imóvel: ${formatCurrency(valorImovel)}\n` +
            `Valor da Entrada: ${formatCurrency(valorEntrada)}\n` +
            `Valor Financiado: ${formatCurrency(valorFinanciado)}\n` +
            `Prazo: ${prazoAnos} anos (${prazoMeses} meses)\n` +
            `Taxa de Juros Anual: ${formatPercentage(taxaJurosAnual)}\n` +
            `Taxa de Juros Mensal: ${formatPercentage(taxaJurosMensal, true)}\n` +
            (isMCMV ? `Simulação MCMV: ${getMCMVFaixaText(mcmvFaixaSelect.value)}, ${getMCMVRegiaoText(mcmvRegiaoSelect.value)}, ${getMCMVTipoParticipanteText(mcmvTipoParticipanteSelect.value)}\n` : '') +
            (includeMIPCheckbox.checked ? `Seguro MIP Mensal (estimado): ${formatCurrency(seguroMIP)}\n` : '') +
            (includeDFICheckbox.checked ? `Seguro DFI Mensal (estimado): ${formatCurrency(seguroDFI)}\n` : '') +
            (includeTaxaAdminCheckbox.checked ? `Taxa Administrativa Mensal (estimado): ${formatCurrency(taxaAdministrativa)}\n` : '') +
            `\n*Simulação SAC*\n` +
            `Primeira Parcela (COM taxas): ${formatCurrency(primeiraParcelaSAC_comTaxas)}\n` +
            `Última Parcela (COM taxas): ${formatCurrency(ultimaParcelaSAC_comTaxas)}\n` +
            `Total Pago (estimado): ${formatCurrency(totalPagoSAC)}\n` +
            `\n*Simulação PRICE*\n` +
            `Parcela Fixa (COM taxas): ${formatCurrency(parcelaPRICE_comTaxas)}\n` +
            `Total Pago (estimado): ${formatCurrency(totalPagoPRICE)}\n\n` +
            `_Estes são cálculos estimados e podem variar._`;

        const limiteParcela = rendaMensal * INCOME_COMMITMENT_RATIO;
        let validationMessageHTML = '';
        let validationMessageText = '';
        const parcelaMaisAlta = Math.max(primeiraParcelaSAC_comTaxas, parcelaPRICE_comTaxas);

        if (parcelaMaisAlta > limiteParcela) {
            validationMessageHTML = `<p style="color: orange; font-weight: bold;">
                Atenção: O valor estimado da maior parcela inicial (SAC: ${formatCurrency(primeiraParcelaSAC_comTaxas)}, PRICE: ${formatCurrency(parcelaPRICE_comTaxas)})
                pode ultrapassar o limite de ${formatPercentage(INCOME_COMMITMENT_RATIO, true)} da sua renda mensal (${formatCurrency(limiteParcela)}).
                Isso pode dificultar a aprovação do financiamento.
            </p>`;
            validationMessageText = `\nAtenção: O valor estimado da maior parcela inicial pode ultrapassar ${formatPercentage(INCOME_COMMITMENT_RATIO, true)} da sua renda mensal (${formatCurrency(limiteParcela)}).`;
        } else {
            validationMessageHTML = `<p style="color: green; font-weight: bold;">
                Com base na sua renda, o valor estimado das parcelas (SAC: ${formatCurrency(primeiraParcelaSAC_comTaxas)}, PRICE: ${formatCurrency(parcelaPRICE_comTaxas)}) parece estar dentro do limite de ${formatPercentage(INCOME_COMMITMENT_RATIO, true)} (${formatCurrency(limiteParcela)}).
            </p>`;
            validationMessageText = `\nCom base na sua renda, o valor estimado das parcelas parece estar dentro do limite de ${formatPercentage(INCOME_COMMITMENT_RATIO, true)} (${formatCurrency(limiteParcela)}).`;
        }

        if (validationTextDiv) validationTextDiv.innerHTML = validationMessageHTML;
        textSummaryForSharing += validationMessageText;

        if (copyResultsBtn) copyResultsBtn.disabled = false;
        if (whatsappShareBtn) whatsappShareBtn.disabled = false;
        console.log('Simulação concluída.');
    }

    function copyResults() {
        if (!textSummaryForSharing) {
            alert('Não há resultados para copiar. Realize uma simulação primeiro.');
            return;
        }
        navigator.clipboard.writeText(textSummaryForSharing).then(() => {
            alert('Resultados copiados para a área de transferência!');
        }).catch(err => {
            console.error('Erro ao copiar resultados: ', err);
            alert('Erro ao copiar resultados. Por favor, tente copiar manualmente.');
        });
    }

    function shareViaWhatsApp() {
        if (!textSummaryForSharing) {
            alert('Não há resultados para compartilhar. Realize uma simulação primeiro.');
            return;
        }
        const whatsappMessage = encodeURIComponent(textSummaryForSharing);
        const whatsappLink = `https://wa.me/?text=${whatsappMessage}`;
        window.open(whatsappLink, '_blank');
    }

    function handleClearInput(event) {
        const targetInputId = event.target.dataset.target;
        const targetInput = document.getElementById(targetInputId);
        if (targetInput) {
            targetInput.value = '';
            if (targetInput.id === 'valorImovel' || targetInput.id === 'valorEntrada') {
                calculateAndSetMinEntrada();
            }
            if (targetInput.id === 'taxaJurosAnual' && includeMCMVCheckbox.checked) {
                updateTaxaJurosMCMV();
            }
        }
    }

    // Esta função handleClearAll é da primeira versão melhorada, que apenas limpa os campos.
    function handleClearAll() {
        console.log('Limpando todos os dados...');
        // Limpa todos os inputs de texto e número (esta query foi definida na inicialização)
        const allInputs = document.querySelectorAll('input[type="text"], input[type="number"]');
        allInputs.forEach(input => {
            input.value = '';
        });

        if (includeMCMVCheckbox) includeMCMVCheckbox.checked = false;
        if (mcmvOptionsGroup) mcmvOptionsGroup.classList.add('hidden');
        if (mcmvFaixaSelect) mcmvFaixaSelect.value = 'faixa1';
        if (mcmvRegiaoSelect) mcmvRegiaoSelect.value = 'outras';
        if (mcmvTipoParticipanteSelect) mcmvTipoParticipanteSelect.value = 'nao-cotista';

        if (includeMIPCheckbox) includeMIPCheckbox.checked = true;
        if (includeDFICheckbox) includeDFICheckbox.checked = true;
        if (includeTaxaAdminCheckbox) includeTaxaAdminCheckbox.checked = true;

        if (simulationMainResultsDiv) simulationMainResultsDiv.innerHTML = `<p>Preencha os dados e clique em "Simular" para ver os resultados.</p>`;
        if (validationTextDiv) validationTextDiv.innerHTML = '';
        textSummaryForSharing = '';
        if (copyResultsBtn) copyResultsBtn.disabled = true;
        if (whatsappShareBtn) whatsappShareBtn.disabled = true;

        calculateAndSetMinEntrada(); // Recalculará com valorImovelInput vazio, resultando em entrada "0,00" ou vazia.
    }

    // --- Configuração de Event Listeners ---
    if (simulateBtn) simulateBtn.addEventListener('click', handleSimulation);
    if (copyResultsBtn) copyResultsBtn.addEventListener('click', copyResults);
    if (whatsappShareBtn) whatsappShareBtn.addEventListener('click', shareViaWhatsApp);
    if (clearAllBtn) clearAllBtn.addEventListener('click', handleClearAll);

    clearInputButtons.forEach(button => button.addEventListener('click', handleClearInput));

    const inputsForFormatting = [ // Seleciona os inputs que precisam de formatação monetária/taxa
        valorImovelInput, valorEntradaInput, rendaMensalInput,
        taxaJurosAnualInput, seguroMIPInput, seguroDFIInput, taxaAdministrativaInput
    ];
    inputsForFormatting.forEach(input => {
        if (input) {
            input.addEventListener('blur', handleBlurFormatting);
            input.addEventListener('focus', handleFocusUnformatting);
        }
    });
    
    if (valorImovelInput) {
        valorImovelInput.addEventListener('input', () => {
            // O calculateAndSetMinEntrada no 'blur' é o mais preciso.
            // Chamá-lo aqui no 'input' pode ser feito para feedback instantâneo,
            // mas a lógica atual já é robusta com o 'blur'.
            // Para evitar formatação enquanto digita, podemos deixar a atualização principal para o blur.
            // Se desejar uma prévia dinâmica, poderia chamar uma versão simplificada aqui
            // ou o próprio calculateAndSetMinEntrada.
        });
    }

    if (includeMCMVCheckbox && mcmvOptionsGroup && mcmvFaixaSelect && mcmvRegiaoSelect && mcmvTipoParticipanteSelect) {
        includeMCMVCheckbox.addEventListener('change', function() {
            if (mcmvOptionsGroup) mcmvOptionsGroup.classList.toggle('hidden', !this.checked);
            if (this.checked) {
                updateTaxaJurosMCMV();
            } else {
                // Opcional: Resetar taxa para um valor padrão não-MCMV.
                // Na primeira versão melhorada, não havia reset explícito aqui.
                // Se desejar, descomente:
                // taxaJurosAnualInput.value = formatNumberString(8.00); 
            }
            calculateAndSetMinEntrada();
        });

        [mcmvFaixaSelect, mcmvRegiaoSelect, mcmvTipoParticipanteSelect].forEach(select => {
            if (select) { // Verifica se o select existe
                select.addEventListener('change', () => {
                    if (includeMCMVCheckbox.checked) {
                        updateTaxaJurosMCMV();
                    }
                    calculateAndSetMinEntrada();
                });
            }
        });
    }

    // --- Inicialização ---
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

        calculateAndSetMinEntrada();
        if (copyResultsBtn) copyResultsBtn.disabled = true;
        if (whatsappShareBtn) whatsappShareBtn.disabled = true;
    }

    initializeForm(); // Garante que os valores iniciais sejam formatados corretamente.
    console.log('Simulador Habitacional inicializado e pronto.');
});
