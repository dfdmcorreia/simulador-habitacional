// Registra o Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Caminho do Service Worker corrigido para ser relativo ao diretório atual
        navigator.serviceWorker.register('service-worker.js').then(function(registration) {
            // Registro bem-sucedido
            console.log('Service Worker registrado com sucesso:', registration.scope);
        }, function(err) {
            // Falha no registro
            console.log('Falha no registro do Service Worker:', err);
        });
    });
}


// Aguarda o carregamento completo do DOM (Document Object Model)
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM completamente carregado.');

    // --- Obtém referências para os elementos HTML ---
    const valorImovelInput = document.getElementById('valorImovel');
    const valorEntradaInput = document.getElementById('valorEntrada');
    const rendaMensalInput = document.getElementById('rendaMensal');
    const prazoAnosInput = document.getElementById('prazoAnos');
    const taxaJurosAnualInput = document.getElementById('taxaJurosAnual');
    // Novos elementos MCMV
    const includeMCMVCheckbox = document.getElementById('includeMCMV');
    const mcmvOptionsGroup = document.querySelector('.mcmv-options-group');
    const mcmvFaixaSelect = document.getElementById('mcmvFaixa');
    const mcmvRegiaoSelect = document.getElementById('mcmvRegiao');
    const mcmvTipoParticipanteSelect = document.getElementById('mcmvTipoParticipante');

    // Campos para custos adicionais
    const seguroMIPInput = document.getElementById('seguroMIP');
    const seguroDFIInput = document.getElementById('seguroDFI');
    const taxaAdministrativaInput = document.getElementById('taxaAdministrativa');
    // Checkboxes para incluir/excluir custos adicionais (seguros/taxa)
    const includeMIPCheckbox = document.getElementById('includeMIP');
    const includeDFICheckbox = document.getElementById('includeDFI');
    const includeTaxaAdminCheckbox = document.getElementById('includeTaxaAdmin');

    const simulateBtn = document.getElementById('simulateBtn');
    const resultsOutput = document.getElementById('results-output');
    const validationTextDiv = resultsOutput.querySelector('.validation-text');

    // Variável para armazenar o resumo em texto formatado para compartilhamento
    let textSummaryForSharing = '';

    // --- Taxas de Juros de Exemplo por Faixa, Região e Tipo de Participante MCMV (Ilustrativas) ---
    // ** Importante: Estas taxas são apenas exemplos e podem não refletir as taxas reais do programa.
    // As taxas reais dependem de diversos fatores e podem mudar.
    // Consulte fontes oficiais (Caixa/Ministério das Cidades) para as taxas atuais.
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
         faixa4: { // Taxas da Faixa 4 (Exemplo: uniformes para todas regiões/tipos)
            'norte-nordeste': { 'cotista': 9.16, 'nao-cotista': 9.16 },
            'outras': { 'cotista': 9.16, 'nao-cotista': 9.16 }
        }
    };

    // --- Porcentagens de Entrada Mínima para MCMV (Ilustrativas) ---
    // ** Importante: Estes são exemplos e podem não refletir as regras reais do MCMV.
    // O valor da entrada mínima pode variar por diversos fatores, incluindo subsídios,
    // limites de valor do imóvel e políticas de cada banco.
    const mcmvMinEntradaPorcentagem = {
        faixa1: 10, // 10%
        faixa2: 15, // 15%
        faixa3: 20, // 20%
        faixa4: 25  // 25%
    };


    // --- Funções auxiliares para formatação de números nos inputs ---

    // Remove a formatação (pontos de milhar e substitui vírgula por ponto decimal)
    function unformatNumberString(formattedString) {
        if (!formattedString) return '';
        // Remove pontos de milhar e substitui vírgula decimal por ponto
        return formattedString.replace(/\./g, '').replace(/,/g, '.');
    }

    // Formata um número para string com ponto de milhar e vírgula decimal
    function formatNumberString(number) {
        if (isNaN(number)) return '';
        // Usa toLocaleString para formatar com separadores de milhar e decimal BRL
        return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Aplica a formatação ao valor de um input quando o campo perde o foco
    function handleBlurFormatting(event) {
        const input = event.target;
        // O valor já está desformatado pela handleFocusUnformatting para ser processado por parseFloat.
        // Apenas parseamos e reformatamos.
        const number = parseFloat(input.value); // input.value deve ser como "300000.00" ou "300000"
        if (!isNaN(number)) {
            input.value = formatNumberString(number);
        } else {
            input.value = '';
        }

        // Se o input que perdeu o foco for o valor do imóvel, recalcula a entrada mínima
        if (input.id === 'valorImovel') {
            calculateAndSetMinEntrada();
        }
    }

    // Remove a formatação ao focar no campo para facilitar a edição
    function handleFocusUnformatting(event) {
        const input = event.target;
        const value = unformatNumberString(input.value);
        input.value = value; // Remove a formatação, mas mantém o ponto decimal se houver
    }


    // --- Funções auxiliares para formatação de números nos resultados ---

    // Formata um número como moeda BRL para exibição nos resultados
    function formatCurrency(number) {
        if (isNaN(number)) return '';
        return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

     // Formata um número como porcentagem para exibição nos resultados
    function formatPercentage(number) {
        if (isNaN(number)) return '';
        return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Obtém o texto da faixa MCMV selecionada
    function getMCMVFaixaText(faixaValue) {
        switch (faixaValue) {
            case 'faixa1':
                return 'Faixa 1 (Renda até R$ 2.640)';
            case 'faixa2':
                return 'Faixa 2 (Renda de R$ 2.640,01 a R$ 4.400)';
            case 'faixa3':
                return 'Faixa 3 (Renda de R$ 4.400,01 a R$ 8.000)';
            case 'faixa4':
                return 'Faixa 4 (Renda de R$ 8.000,01 a R$ 12.000)';
            default:
                return 'Não especificada';
        }
    }

     // Obtém o texto da região selecionada
    function getMCMVRegiaoText(regiaoValue) {
        switch (regiaoValue) {
            case 'norte-nordeste':
                return 'Norte e Nordeste';
            case 'outras':
                return 'Sul, Sudeste e Centro-Oeste';
            default:
                return 'Não especificada';
        }
    }

    // Obtém o texto do tipo de participante selecionado
    function getMCMVTipoParticipanteText(tipoValue) {
        switch (tipoValue) {
            case 'cotista':
                return 'Cotista do FGTS';
            case 'nao-cotista':
                return 'Não Cotista do FGTS';
            default:
                return 'Não especificado';
        }
    }


    // --- Função para atualizar a taxa de juros com base nas seleções MCMV ---
    function updateTaxaJurosMCMV() {
        console.log('Atualizando taxa de juros MCMV...');
        const selectedFaixa = mcmvFaixaSelect.value;
        const selectedRegiao = mcmvRegiaoSelect.value;
        const selectedTipo = mcmvTipoParticipanteSelect.value;

        console.log('Seleções MCMV:', { selectedFaixa, selectedRegiao, selectedTipo });

        const taxaCorrespondente = mcmvTaxasExemplo[selectedFaixa]
                                    && mcmvTaxasExemplo[selectedFaixa][selectedRegiao]
                                    && mcmvTaxasExemplo[selectedFaixa][selectedRegiao][selectedTipo];


        if (taxaCorrespondente !== undefined) {
            taxaJurosAnualInput.value = formatNumberString(taxaCorrespondente);
            taxaJurosAnualInput.dispatchEvent(new Event('blur'));
            console.log('Taxa de juros atualizada no input.');
        } else {
            console.warn('Taxa MCMV não encontrada para a combinação selecionada.');
        }
    }

    // --- Função para calcular e preencher a entrada mínima ---
    function calculateAndSetMinEntrada() {
        console.log('Calculando e definindo entrada mínima...');
        const valorImovel = parseFloat(unformatNumberString(valorImovelInput.value));
        const isMCMV = includeMCMVCheckbox.checked;

        if (isNaN(valorImovel) || valorImovel <= 0) {
            // Não faz nada se o valor do imóvel for inválido
            return;
        }

        if (isMCMV && mcmvFaixaSelect) {
            const selectedFaixa = mcmvFaixaSelect.value;
            const minPorcentagem = mcmvMinEntradaPorcentagem[selectedFaixa];

            if (minPorcentagem !== undefined) {
                const minEntradaCalculada = valorImovel * (minPorcentagem / 100);

                // Só preenche o campo se ele estiver vazio ou com o valor padrão inicial
                // Isso permite que o usuário digite um valor diferente
                if (valorEntradaInput.value === '' || parseFloat(unformatNumberString(valorEntradaInput.value)) === 60000) { // Verifica se é o valor padrão
                    valorEntradaInput.value = formatNumberString(minEntradaCalculada);
                    valorEntradaInput.dispatchEvent(new Event('blur')); // Aplica a formatação
                    console.log(`Entrada mínima calculada para ${minPorcentagem}%: R$ ${formatCurrency(minEntradaCalculada)}`);
                }
            } else {
                console.warn('Porcentagem de entrada mínima MCMV não encontrada para a faixa selecionada.');
            }
        } else {
            // Se MCMV não estiver marcado, ou se não houver select de faixa,
            // pode-se opcionalmente resetar o campo de entrada ou deixar como está.
            // Por enquanto, deixamos o valor atual ou o padrão do HTML.
            console.log('MCMV não selecionado ou faixa não disponível. Não calculando entrada mínima MCMV.');
        }
    }


    // --- Adiciona ouvintes de evento ---
    console.log('Adicionando ouvintes de evento...');

    // Botão de simulação
    if (simulateBtn) {
        simulateBtn.addEventListener('click', handleSimulation);
        console.log('Ouvinte de clique adicionado ao botão Simular.');
    } else {
        console.error('Botão Simular Financiamento não encontrado no DOM!');
    }

    // Botões de compartilhamento
    if (copyResultsBtn) {
        copyResultsBtn.addEventListener('click', copyResults);
    } else {
         console.warn('Botão Copiar Resumo não encontrado no DOM.');
    }

    if (whatsappShareBtn) {
        whatsappShareBtn.addEventListener('click', shareViaWhatsApp);
    } else {
         console.warn('Botão Compartilhar WhatsApp não encontrado no DOM.');
    }


    // Botões de limpar individuais
    clearInputButtons.forEach(button => {
        button.addEventListener('click', handleClearInput);
    });
    // Botão Limpar Todos
     if (clearAllBtn) {
        clearAllBtn.addEventListener('click', handleClearAll);
    } else {
         console.warn('Botão Limpar Todos não encontrado no DOM.');
    }


    // Adiciona ouvintes de evento para formatação nos inputs de texto
    const textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
        input.addEventListener('blur', handleBlurFormatting);
        input.addEventListener('focus', handleFocusUnformatting);
    });

    // Ouvinte de evento para o checkbox MCMV
    if (includeMCMVCheckbox && mcmvOptionsGroup && mcmvFaixaSelect && mcmvRegiaoSelect && mcmvTipoParticipanteSelect) {
        includeMCMVCheckbox.addEventListener('change', function() {
            console.log('Checkbox MCMV alterado. Checked:', includeMCMVCheckbox.checked);
            if (includeMCMVCheckbox.checked) {
                mcmvOptionsGroup.classList.remove('hidden');
                console.log('Grupo MCMV visível.');
                updateTaxaJurosMCMV(); // Atualiza a taxa de juros
                calculateAndSetMinEntrada(); // Calcula e define a entrada mínima
            } else {
                mcmvOptionsGroup.classList.add('hidden');
                 console.log('Grupo MCMV escondido.');
                taxaJurosAnualInput.dispatchEvent(new Event('blur'));
            }
        });
        console.log('Ouvinte de mudança adicionado ao checkbox MCMV.');
    } else {
         console.warn('Alguns elementos MCMV não encontrados no DOM. Funcionalidade MCMV pode não operar completamente.');
    }


    // Ouvintes de evento para as seleções MCMV (faixa, região, tipo de participante)
    if (mcmvFaixaSelect && mcmvRegiaoSelect && mcmvTipoParticipanteSelect) {
        mcmvFaixaSelect.addEventListener('change', function() {
            updateTaxaJurosMCMV(); // Atualiza a taxa de juros
            calculateAndSetMinEntrada(); // Calcula e define a entrada mínima
        });
        console.log('Ouvinte de mudança adicionado ao select de Faixa MCMV.');

        mcmvRegiaoSelect.addEventListener('change', updateTaxaJurosMCMV);
         console.log('Ouvinte de mudança adicionado ao select de Região MCMV.');
        mcmvTipoParticipanteSelect.addEventListener('change', updateTaxaJurosMCMV);
         console.log('Ouvinte de mudança adicionado ao select de Tipo de Participante MCMV.');
    } else {
         console.warn('Alguns selects MCMV não encontrados no DOM. Atualização automática de taxa pode não operar.');
    }


    // --- Função que lida com o evento de clique no botão de simulação ---
    function handleSimulation() {
        console.log('Botão Simular clicado. Iniciando simulação...');

        const valorImovel = parseFloat(unformatNumberString(valorImovelInput.value));
        const valorEntrada = parseFloat(unformatNumberString(valorEntradaInput.value));
        const rendaMensal = parseFloat(unformatNumberString(rendaMensalInput.value));
        const prazoAnos = parseInt(prazoAnosInput.value);
        const taxaJurosAnual = parseFloat(unformatNumberString(taxaJurosAnualInput.value));

        console.log('Valores de entrada obtidos:', { valorImovel, valorEntrada, rendaMensal, prazoAnos, taxaJurosAnual });


        const isMCMV = includeMCMVCheckbox.checked;
        const selectedMCMVFaixaText = (isMCMV && mcmvFaixaSelect) ? getMCMVFaixaText(mcmvFaixaSelect.value) : 'Não Aplicável';
        const selectedMCMVRegiaoText = (isMCMV && mcmvRegiaoSelect) ? getMCMVRegiaoText(mcmvRegiaoSelect.value) : 'Não Aplicável';
        const selectedMCMVTipoText = (isMCMV && mcmvTipoParticipanteSelect) ? getMCMVTipoParticipanteText(mcmvTipoParticipanteSelect.value) : 'Não Aplicável';


        console.log('Status MCMV:', { isMCMV, selectedMCMVFaixaText, selectedMCMVRegiaoText, selectedMCMVTipoText });


        const seguroMIP = includeMIPCheckbox.checked ? (parseFloat(unformatNumberString(seguroMIPInput.value)) || 0) : 0;
        const seguroDFI = includeDFICheckbox.checked ? (parseFloat(unformatNumberString(seguroDFIInput.value)) || 0) : 0;
        const taxaAdministrativa = includeTaxaAdminCheckbox.checked ? (parseFloat(unformatNumberString(taxaAdministrativaInput.value)) || 0) : 0;

        console.log('Valores de custos adicionais:', { seguroMIP, seguroDFI, taxaAdministrativa });


        // --- Validação básica dos inputs ---
        if (isNaN(valorImovel) || isNaN(valorEntrada) || isNaN(rendaMensal) || isNaN(prazoAnos) || isNaN(taxaJurosAnual)) {
            console.error('Erro de validação: Inputs principais inválidos.');
            resultsOutput.innerHTML = '<p style="color: red;">Por favor, preencha os campos principais (Valor do Imóvel, Entrada, Renda, Prazo, Taxa de Juros) com valores numéricos válidos.</p>';
            textSummaryForSharing = '';
            copyResultsBtn.disabled = true;
            whatsappShareBtn.disabled = true;
            if (validationTextDiv) validationTextDiv.innerHTML = '';
            return;
        }

        if (valorEntrada > valorImovel) {
             console.error('Erro de validação: Entrada maior que valor do imóvel.');
             resultsOutput.innerHTML = '<p style="color: red;">O valor da entrada não pode ser maior que o valor do imóvel.</p>';
             textSummaryForSharing = '';
             copyResultsBtn.disabled = true;
             whatsappShareBtn.disabled = true;
             if (validationTextDiv) validationTextDiv.innerHTML = '';
             return;
        }

         if (valorImovel <= 0 || rendaMensal <= 0 || prazoAnos <= 0 || taxaJurosAnual < 0) {
              console.error('Erro de validação: Valores devem ser positivos.');
             resultsOutput.innerHTML = '<p style="color: red;">Valor do imóvel, renda mensal e prazo devem ser maiores que zero. A taxa de juros anual deve ser zero ou maior.</p>';
             textSummaryForSharing = '';
             copyResultsBtn.disabled = true;
             whatsappShareBtn.disabled = true;
             if (validationTextDiv) validationTextDiv.innerHTML = '';
             return;
         }

        console.log('Validação inicial bem-sucedida.');


        const valorFinanciado = valorImovel - valorEntrada;
        const taxaJurosMensal = (taxaJurosAnual / 100) / 12;
        const prazoMeses = prazoAnos * 12;

        console.log('Valores calculados:', { valorFinanciado, taxaJurosMensal, prazoMeses });


        // --- Cálculo da Parcela (Método SAC - Sistema de Amortização Constante) ---
        let saldoDevedorSAC = valorFinanciado;
        let totalJurosSAC = 0;
        let totalPagoSAC = 0;
        let primeiraParcelaSAC_semTaxas = 0;
        let ultimaParcelaSAC_semTaxas = 0;
        let primeiraParcelaSAC_comTaxas = 0;
        let ultimaParcelaSAC_comTaxas = 0;

        console.log('Iniciando cálculo SAC...');

        for (let i = 1; i <= prazoMeses; i++) {
            const jurosMensal = saldoDevedorSAC * taxaJurosMensal;
            const amortizacaoMensal = valorFinanciado / prazoMeses;
            const parcelaMensal_semTaxas = jurosMensal + amortizacaoMensal;
            const parcelaMensal_comTaxas = parcelaMensal_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;

            saldoDevedorSAC -= amortizacaoMensal;
            totalJurosSAC += jurosMensal;
            totalPagoSAC += parcelaMensal_comTaxas;

            if (i === 1) {
                primeiraParcelaSAC_semTaxas = parcelaMensal_semTaxas;
                primeiraParcelaSAC_comTaxas = parcelaMensal_comTaxas;
            }
            if (i === prazoMeses) {
                 ultimaParcelaSAC_semTaxas = parcelaMensal_semTaxas;
                 ultimaParcelaSAC_comTaxas = parcelaMensal_comTaxas;
            }
        }
        console.log('Cálculo SAC concluído.');


        // --- Cálculo da Parcela (Método PRICE - Sistema Francês de Amortização) ---
        let parcelaPRICE_semTaxas = 0;
        let parcelaPRICE_comTaxas = 0;
        let totalJurosPRICE = 0;
        let totalPagoPRICE = 0;

        console.log('Iniciando cálculo PRICE...');

        if (taxaJurosMensal > 0) {
             parcelaPRICE_semTaxas = valorFinanciado * (taxaJurosMensal / (1 - Math.pow(1 + taxaJurosMensal, -prazoMeses)));
        } else {
            parcelaPRICE_semTaxas = valorFinanciado / prazoMeses;
        }

        parcelaPRICE_comTaxas = parcelaPRICE_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;
        totalPagoPRICE = parcelaPRICE_comTaxas * prazoMeses;
        totalJurosPRICE = (parcelaPRICE_semTaxas * prazoMeses) - valorFinanciado;

         console.log('Cálculo PRICE concluído.');


        // --- Exibição dos Resultados na Página (HTML) ---

        console.log('Atualizando resultados na página...');

        let mainResultsHTML = `
            <h3>Resumo da Simulação</h3>
            <p>Valor do Imóvel: R$ ${formatCurrency(valorImovel)}</p>
            <p>Valor da Entrada: R$ ${formatCurrency(valorEntrada)}</p>
            <p>Valor Financiado: R$ ${formatCurrency(valorFinanciado)}</p>
            <p>Prazo: ${prazoAnos} anos (${prazoMeses} meses)</p>
            <p>Taxa de Juros Anual: ${formatPercentage(taxaJurosAnual)}%</p>
            <p>Taxa de Juros Mensal: ${formatPercentage(taxaJurosMensal * 100)}%</p>
            ${isMCMV ? `<p>Simulação MCMV: ${selectedMCMVFaixaText}, ${selectedMCMVRegiaoText}, ${selectedMCMVTipoText}</p>` : ''}
            ${includeMIPCheckbox.checked ? `<p>Seguro MIP Mensal (estimado): R$ ${formatCurrency(seguroMIP)}</p>` : ''}
            ${includeDFICheckbox.checked ? `<p>Seguro DFI Mensal (estimado): R$ ${formatCurrency(seguroDFI)}</p>` : ''}
            ${includeTaxaAdminCheckbox.checked ? `<p>Taxa Administrativa Mensal (estimado): R$ ${formatCurrency(taxaAdministrativa)}</p>` : ''}


            <h4>Simulação pelo Sistema SAC (Sistema de Amortização Constante)</h4>
            <p>Primeira Parcela (sem taxas): R$ ${formatCurrency(primeiraParcelaSAC_semTaxas)}</p>
            <p>Última Parcela (sem taxas): R$ ${formatCurrency(ultimaParcelaSAC_semTaxas)}</p>
            <p><strong>Primeira Parcela (COM taxas): R$ ${formatCurrency(primeiraParcelaSAC_comTaxas)}</strong></p>
             <p><strong>Última Parcela (COM taxas): R$ ${formatCurrency(ultimaParcelaSAC_comTaxas)}</strong></p>
            <p>Total de Juros Pagos (estimado): R$ ${formatCurrency(totalJurosSAC)}</p>
             <p>Total Pago ao Final (COM taxas, estimado): R$ ${formatCurrency(totalPagoSAC)}</p>
            <p><em>No sistema SAC, o valor da parcela diminui ao longo do tempo.</em></p>


            <h4>Simulação pelo Sistema PRICE (Sistema Francês de Amortização)</h4>
            <p>Valor da Parcela Fixa (sem taxas): R$ ${formatCurrency(parcelaPRICE_semTaxas)}</p>
             <p><strong>Valor da Parcela Fixa (COM taxas): R$ ${formatCurrency(parcelaPRICE_comTaxas)}</strong></p>
            <p>Total de Juros Pagos (estimado): R$ ${formatCurrency(totalJurosPRICE)}</p>
             <p>Total Pago ao Final (COM taxas, estimado): R$ ${formatCurrency(totalPagoPRICE)}</p>
            <p><em>No sistema PRICE, o valor da parcela é constante (sem considerar seguros e taxas).</em></p>
        `;

        const firstH3 = resultsOutput.querySelector('h3');
        if (firstH3) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = resultsOutput.innerHTML;
            const disclaimerDiv = tempDiv.querySelector('.disclaimer-text');
            const validationDiv = tempDiv.querySelector('.validation-text');

            resultsOutput.innerHTML = mainResultsHTML;

            if (disclaimerDiv) resultsOutput.appendChild(disclaimerDiv);
            if (validationDiv) resultsOutput.appendChild(validationDiv);

        } else {
             resultsOutput.innerHTML = mainResultsHTML + resultsOutput.innerHTML;
        }

        console.log('Resultados na página atualizados.');


        // --- Formatação do Resumo para Compartilhamento (Texto Puro) ---
        console.log('Formatando resumo para compartilhamento...');

        textSummaryForSharing = `*Resumo da Simulação Habitacional*\n\n` +
                                `Valor do Imóvel: R$ ${formatCurrency(valorImovel)}\n` +
                                `Valor da Entrada: R$ ${formatCurrency(valorEntrada)}\n` +
                                `Valor Financiado: R$ ${formatCurrency(valorFinanciado)}\n` +
                                `Prazo: ${prazoAnos} anos (${prazoMeses} meses)\n` +
                                `Taxa de Juros Anual: ${formatPercentage(taxaJurosAnual)}%\n` +
                                `Taxa de Juros Mensal: ${formatPercentage(taxaJurosMensal * 100)}%\n`;

        if (isMCMV) {
             textSummaryForSharing += `Simulação MCMV: ${selectedMCMVFaixaText}, ${selectedMCMVRegiaoText}, ${selectedMCMVTipoText}\n`;
        }
        if (includeMIPCheckbox.checked) {
            textSummaryForSharing += `Seguro MIP Mensal (estimado): R$ ${formatCurrency(seguroMIP)}\n`;
        }
        if (includeDFICheckbox.checked) {
            textSummaryForSharing += `Seguro DFI Mensal (estimado): R$ ${formatCurrency(seguroDFI)}\n`;
        }
        if (includeTaxaAdminCheckbox.checked) {
            textSummaryForSharing += `Taxa Administrativa Mensal (estimado): R$ ${formatCurrency(taxaAdministrativa)}\n`;
        }

        textSummaryForSharing += `\n*Simulação SAC*\n` +
                                 `Primeira Parcela (sem taxas): R$ ${formatCurrency(primeiraParcelaSAC_semTaxas)}\n` +
                                 `Última Parcela (sem taxas): R$ ${formatCurrency(ultimaParcelaSAC_semTaxas)}\n` +
                                 `*Primeira Parcela (COM taxas): R$ ${formatCurrency(primeiraParcelaSAC_comTaxas)}*\n` +
                                 `*Última Parcela (COM taxas): R$ ${formatCurrency(ultimaParcelaSAC_comTaxas)}*\n` +
                                 `Total de Juros Pagos (estimado): R$ ${formatCurrency(totalJurosSAC)}\n` +
                                 `Total Pago ao Final (COM taxas, estimado): R$ ${formatCurrency(totalPagoSAC)}\n` +
                                 `_No sistema SAC, o valor da parcela diminui ao longo do tempo._\n\n`;

        textSummaryForSharing += `*Simulação PRICE*\n` +
                                 `Valor da Parcela Fixa (sem taxas): R$ ${formatCurrency(parcelaPRICE_semTaxas)}\n` +
                                 `*Valor da Parcela Fixa (COM taxas): R$ ${formatCurrency(parcelaPRICE_comTaxas)}*\n` +
                                 `Total de Juros Pagos (estimado): R$ ${formatCurrency(totalJurosPRICE)}\n` +
                                 `Total Pago ao Final (COM taxas, estimado): R$ ${formatCurrency(totalPagoPRICE)}*\n` +
                                 `_No sistema PRICE, o valor da parcela é constante (sem considerar seguros e taxas)._\n\n`;

        textSummaryForSharing += `_Estes são cálculos estimados e podem variar._`;


        // --- Validação da Parcela vs Renda (Adicional) ---
        console.log('Iniciando validação de parcela vs renda...');
        const limiteParcela = rendaMensal * 0.30;
        let validationMessageHTML = '';
        let validationMessageText = '';

        const primeiraParcelaParaValidacao = primeiraParcelaSAC_comTaxas;
        const parcelaPRICEParaValidacao = parcelaPRICE_comTaxas;

        if (primeiraParcelaParaValidacao > limiteParcela || parcelaPRICEParaValidacao > limiteParcela) {
            validationMessageHTML = `<p style="color: orange; font-weight: bold;">
                Atenção: O valor estimado das parcelas (SAC: R$ ${formatCurrency(primeiraParcelaParaValidacao)}, PRICE: R$ ${formatCurrency(parcelaPRICEParaValidacao)})
                pode ultrapassar o limite de 30% da sua renda mensal (R$ ${formatCurrency(limiteParcela)}).
                Isso pode dificultar a aprovação do financiamento ou exigir ajustes no valor, prazo ou entrada.
            </p>`;
             validationMessageText = `\nAtenção: O valor estimado das parcelas (SAC: R$ ${formatCurrency(primeiraParcelaParaValidacao)}, PRICE: R$ ${formatCurrency(parcelaPRICEParaValidacao)}) pode ultrapassar o limite de 30% da sua renda mensal (R$ ${formatCurrency(limiteParcela)}). Isso pode dificultar a aprovação.`;

        } else {
             validationMessageHTML = `<p style="color: green; font-weight: bold;">
                Com base na sua renda, o valor estimado das parcelas parece estar dentro do limite de 30% (R$ ${formatCurrency(limiteParcela)}).
            </p>`;
             validationMessageText = `\nCom base na sua renda, o valor estimado das parcelas parece estar dentro do limite de 30% (R$ ${formatCurrency(limiteParcela)}).`;
        }

        if (validationTextDiv) {
            validationTextDiv.innerHTML = validationMessageHTML;
             console.log('Mensagem de validação exibida na página.');
        } else {
             console.warn('Div de validação não encontrada no DOM.');
        }

        textSummaryForSharing += validationMessageText;
        console.log('Mensagem de validação adicionada ao resumo de texto.');

        copyResultsBtn.disabled = false;
        whatsappShareBtn.disabled = false;
        console.log('Botões de compartilhamento habilitados.');

        console.log('Simulação concluída.');

    }

    // --- Função para copiar os resultados para a área de transferência ---
    function copyResults() {
        console.log('Botão Copiar Resumo clicado.');
        navigator.clipboard.writeText(textSummaryForSharing).then(function() {
            alert('Resultados copiados para a área de transferência! Cole em um aplicativo de mensagens ou editor de texto para ver a formatação.');
            console.log('Resultados copiados com sucesso.');
        }).catch(function(err) {
            console.error('Erro ao copiar resultados: ', err);
            alert('Erro ao copiar resultados. Por favor, copie manualmente.');
        });
    }

    // --- Função para compartilhar via WhatsApp ---
    function shareViaWhatsApp() {
         console.log('Botão Compartilhar via WhatsApp clicado.');
        const whatsappMessage = encodeURIComponent("Simulação Habitacional:\n\n" + textSummaryForSharing);
        console.log('Mensagem para WhatsApp codificada.');
        const whatsappLink = `https://wa.me/?text=${whatsappMessage}`;
        console.log('Link do WhatsApp criado:', whatsappLink);
        window.open(whatsappLink, '_blank');
         console.log('Abrindo link do WhatsApp.');
    }

    // --- Função para limpar um campo de input individual ---
    function handleClearInput(event) {
         console.log('Botão Limpar individual clicado.');
        const targetInputId = event.target.dataset.target;
        const targetInput = document.getElementById(targetInputId);
         console.log('Alvo do botão limpar:', targetInputId, targetInput);
        if (targetInput) {
            targetInput.value = '';
             console.log('Input alvo limpo.');
            if (targetInput.type === 'text') {
                targetInput.value = unformatNumberString(targetInput.value);
            }
        } else {
             console.warn('Input alvo para limpar não encontrado:', targetInputId);
        }
    }

    // --- Função para limpar todos os campos de input ---
    function handleClearAll() {
        console.log('Botão Limpar Todos clicado. Limpando todos os campos...');
        const allNumberInputs = document.querySelectorAll('input[type="number"]');
        allNumberInputs.forEach(input => {
            input.value = '';
        });

        const allTextInputs = document.querySelectorAll('input[type="text"]');
        allTextInputs.forEach(input => {
            input.value = '';
        });

        if (includeMCMVCheckbox) {
            includeMCMVCheckbox.checked = false;
        }
        if (mcmvOptionsGroup) {
            mcmvOptionsGroup.classList.add('hidden');
        }
        if (mcmvFaixaSelect) {
            mcmvFaixaSelect.value = 'faixa1';
        }
         if (mcmvRegiaoSelect) {
            mcmvRegiaoSelect.value = 'outras';
        }
         if (mcmvTipoParticipanteSelect) {
            mcmvTipoParticipanteSelect.value = 'nao-cotista';
        }

        if (includeMIPCheckbox) includeMIPCheckbox.checked = true;
        if (includeDFICheckbox) includeDFICheckbox.checked = true;
        if (includeTaxaAdminCheckbox) includeTaxaAdminCheckbox.checked = true;
        console.log('Checkboxes de seguros/taxa resetados.');

         resultsOutput.innerHTML = `
            <p>Preencha os dados e clique em "Simular" para ver os resultados.</p>

            <div class="disclaimer-text">
                <p>* Estes são cálculos estimados e podem não refletir o valor exacto das parcelas e do total pago, que podem variar entre as instituições financeiras e incluir outros encargos não considerados aqui.</p>
            </div>

            <div class="validation-text">
                </div>
        `;
        console.log('Área de resultados limpa.');

        textSummaryForSharing = '';
        console.log('Resumo de texto para compartilhamento limpo.');

        copyResultsBtn.disabled = true;
        whatsappShareBtn.disabled = true;
        console.log('Botões de compartilhamento desabilitados.');

        console.log('Limpeza completa concluída.');
    }


    // Desabilita os botões de compartilhamento inicialmente
    if (copyResultsBtn) copyResultsBtn.disabled = true;
    if (whatsappShareBtn) whatsappShareBtn.disabled = true;

    // Inicializa a formatação dos inputs de texto com os valores padrão
    textInputs.forEach(input => {
        const value = unformatNumberString(input.value);
        const number = parseFloat(value);
         if (!isNaN(number)) {
            input.value = formatNumberString(number);
        }
    });

    console.log('Inicialização do DOM concluída.');

});
