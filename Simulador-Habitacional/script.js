// Registra o Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
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
    // --- Obtém referências para os elementos HTML ---
    const valorImovelInput = document.getElementById('valorImovel');
    const valorEntradaInput = document.getElementById('valorEntrada');
    const rendaMensalInput = document.getElementById('rendaMensal');
    const prazoAnosInput = document.getElementById('prazoAnos');
    const taxaJurosAnualInput = document.getElementById('taxaJurosAnual');
    // Campos para custos adicionais
    const seguroMIPInput = document.getElementById('seguroMIP');
    const seguroDFIInput = document.getElementById('seguroDFI');
    const taxaAdministrativaInput = document.getElementById('taxaAdministrativa');
    // Checkboxes para incluir/excluir custos adicionais
    const includeMIPCheckbox = document.getElementById('includeMIP');
    const includeDFICheckbox = document.getElementById('includeDFI');
    const includeTaxaAdminCheckbox = document.getElementById('includeTaxaAdmin');

    const simulateBtn = document.getElementById('simulateBtn');
    const resultsOutput = document.getElementById('results-output');
    // Referência para a nova div de validação
    const validationTextDiv = resultsOutput.querySelector('.validation-text');

    // Botões de compartilhamento
    const copyResultsBtn = document.getElementById('copyResultsBtn');
    const whatsappShareBtn = document.getElementById('whatsappShareBtn');
    // Botões de limpar
    const clearInputButtons = document.querySelectorAll('.clear-input'); // Seleciona todos os botões com a classe clear-input
    const clearAllBtn = document.getElementById('clearAllBtn'); // Botão Limpar Todos

    // Variável para armazenar o resumo em texto formatado para compartilhamento
    let textSummaryForSharing = '';

    // --- Adiciona ouvintes de evento ---
    // Botão de simulação
    simulateBtn.addEventListener('click', handleSimulation);
    // Botões de compartilhamento
    copyResultsBtn.addEventListener('click', copyResults);
    whatsappShareBtn.addEventListener('click', shareViaWhatsApp);

    // Botões de limpar individuais
    clearInputButtons.forEach(button => {
        button.addEventListener('click', handleClearInput);
    });
    // Botão Limpar Todos
    clearAllBtn.addEventListener('click', handleClearAll);


    // --- Função que lida com o evento de clique no botão de simulação ---
    function handleSimulation() {
        // Obtém os valores dos campos de entrada e converte para números
        const valorImovel = parseFloat(valorImovelInput.value);
        const valorEntrada = parseFloat(valorEntradaInput.value);
        const rendaMensal = parseFloat(rendaMensalInput.value);
        const prazoAnos = parseInt(prazoAnosInput.value);
        const taxaJurosAnual = parseFloat(taxaJurosAnualInput.value);

        // Obtém os valores dos campos opcionais, considerando se o checkbox está marcado
        const seguroMIP = includeMIPCheckbox.checked ? (parseFloat(seguroMIPInput.value) || 0) : 0;
        const seguroDFI = includeDFICheckbox.checked ? (parseFloat(seguroDFIInput.value) || 0) : 0;
        const taxaAdministrativa = includeTaxaAdminCheckbox.checked ? (parseFloat(taxaAdministrativaInput.value) || 0) : 0;


        // --- Validação básica dos inputs ---
        if (isNaN(valorImovel) || isNaN(valorEntrada) || isNaN(rendaMensal) || isNaN(prazoAnos) || isNaN(taxaJurosAnual)) {
            resultsOutput.innerHTML = '<p style="color: red;">Por favor, preencha os campos principais (Valor do Imóvel, Entrada, Renda, Prazo, Taxa de Juros) com valores numéricos válidos.</p>';
            // Limpa o resumo de texto e desabilita botões de compartilhamento em caso de erro
            textSummaryForSharing = '';
            copyResultsBtn.disabled = true;
            whatsappShareBtn.disabled = true;
             // Limpa a div de validação
            if (validationTextDiv) validationTextDiv.innerHTML = '';
            return; // Interrompe a execução da função
        }

        if (valorEntrada > valorImovel) {
             resultsOutput.innerHTML = '<p style="color: red;">O valor da entrada não pode ser maior que o valor do imóvel.</p>';
             // Limpa o resumo de texto e desabilita botões de compartilhamento em caso de erro
             textSummaryForSharing = '';
             copyResultsBtn.disabled = true;
             whatsappShareBtn.disabled = true;
              // Limpa a div de validação
             if (validationTextDiv) validationTextDiv.innerHTML = '';
             return; // Interrompe a execução da função
        }

         if (valorImovel <= 0 || rendaMensal <= 0 || prazoAnos <= 0 || taxaJurosAnual < 0) {
             resultsOutput.innerHTML = '<p style="color: red;">Valor do imóvel, renda mensal e prazo devem ser maiores que zero. A taxa de juros anual deve ser zero ou maior.</p>';
             // Limpa o resumo de texto e desabilita botões de compartilhamento em caso de erro
             textSummaryForSharing = '';
             copyResultsBtn.disabled = true;
             whatsappShareBtn.disabled = true;
              // Limpa a div de validação
             if (validationTextDiv) validationTextDiv.innerHTML = '';
             return; // Interrompe a execução da função
         }


        // Calcula o valor a ser financiado
        const valorFinanciado = valorImovel - valorEntrada;

        // Converte a taxa de juros anual para mensal (em decimal)
        const taxaJurosMensal = (taxaJurosAnual / 100) / 12;

        // Converte o prazo de anos para meses
        const prazoMeses = prazoAnos * 12;

        // --- Cálculo da Parcela (Método SAC - Sistema de Amortização Constante) ---
        // SAC: A amortização (redução do saldo devedor) é constante.
        // O valor da parcela diminui ao longo do tempo.

        let saldoDevedorSAC = valorFinanciado;
        let totalJurosSAC = 0;
        let totalPagoSAC = 0;
        let primeiraParcelaSAC_semTaxas = 0;
        let ultimaParcelaSAC_semTaxas = 0;
        let primeiraParcelaSAC_comTaxas = 0;
        let ultimaParcelaSAC_comTaxas = 0;


        // Calcula cada parcela no sistema SAC
        for (let i = 1; i <= prazoMeses; i++) {
            const jurosMensal = saldoDevedorSAC * taxaJurosMensal;
            const amortizacaoMensal = valorFinanciado / prazoMeses;
            const parcelaMensal_semTaxas = jurosMensal + amortizacaoMensal;
            const parcelaMensal_comTaxas = parcelaMensal_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;

            saldoDevedorSAC -= amortizacaoMensal;
            totalJurosSAC += jurosMensal;
            totalPagoSAC += parcelaMensal_comTaxas; // Soma o total pago com as taxas

            if (i === 1) {
                primeiraParcelaSAC_semTaxas = parcelaMensal_semTaxas;
                primeiraParcelaSAC_comTaxas = parcelaMensal_comTaxas;
            }
            if (i === prazoMeses) {
                 ultimaParcelaSAC_semTaxas = parcelaMensal_semTaxas;
                 ultimaParcelaSAC_comTaxas = parcelaMensal_comTaxas;
            }
        }


        // --- Cálculo da Parcela (Método PRICE - Sistema Francês de Amortização) ---
        // PRICE: O valor da parcela (sem seguros e taxas administrativas) é constante.
        // A amortização aumenta e os juros diminuem ao longo do tempo.

        let parcelaPRICE_semTaxas = 0;
        let parcelaPRICE_comTaxas = 0;
        let totalJurosPRICE = 0;
        let totalPagoPRICE = 0;

        // Fórmula da Parcela PRICE: PMT = PV * [i / (1 - (1 + i)^-n)]
        // PMT = Parcela Mensal
        // PV = Valor Financiado
        // i = Taxa de Juros Mensal
        // n = Prazo em Meses

        if (taxaJurosMensal > 0) {
             parcelaPRICE_semTaxas = valorFinanciado * (taxaJurosMensal / (1 - Math.pow(1 + taxaJurosMensal, -prazoMeses)));
        } else {
            // Se a taxa de juros for zero, a parcela é simplesmente o valor financiado dividido pelo prazo
            parcelaPRICE_semTaxas = valorFinanciado / prazoMeses;
        }

        // Calcula a parcela PRICE incluindo os custos adicionais
        parcelaPRICE_comTaxas = parcelaPRICE_semTaxas + seguroMIP + seguroDFI + taxaAdministrativa;

        // Calcula o total pago e total de juros no sistema PRICE (com base na parcela sem taxas para o cálculo dos juros)
        totalPagoPRICE = parcelaPRICE_comTaxas * prazoMeses;
        totalJurosPRICE = (parcelaPRICE_semTaxas * prazoMeses) - valorFinanciado;


        // --- Exibição dos Resultados na Página (HTML) ---

        // Limpa o conteúdo principal da div de resultados, mas mantém as divs de aviso e validação
        let mainResultsHTML = `
            <h3>Resumo da Simulação</h3>
            <p>Valor do Imóvel: R$ ${valorImovel.toFixed(2)}</p>
            <p>Valor da Entrada: R$ ${valorEntrada.toFixed(2)}</p>
            <p>Valor Financiado: R$ ${valorFinanciado.toFixed(2)}</p>
            <p>Prazo: ${prazoAnos} anos (${prazoMeses} meses)</p>
            <p>Taxa de Juros Anual: ${taxaJurosAnual.toFixed(2)}%</p>
            <p>Taxa de Juros Mensal: ${(taxaJurosMensal * 100).toFixed(4)}%</p>
            ${includeMIPCheckbox.checked ? `<p>Seguro MIP Mensal (estimado): R$ ${seguroMIP.toFixed(2)}</p>` : ''}
            ${includeDFICheckbox.checked ? `<p>Seguro DFI Mensal (estimado): R$ ${seguroDFI.toFixed(2)}</p>` : ''}
            ${includeTaxaAdminCheckbox.checked ? `<p>Taxa Administrativa Mensal (estimado): R$ ${taxaAdministrativa.toFixed(2)}</p>` : ''}


            <h4>Simulação pelo Sistema SAC (Sistema de Amortização Constante)</h4>
            <p>Primeira Parcela (sem taxas): R$ ${primeiraParcelaSAC_semTaxas.toFixed(2)}</p>
            <p>Última Parcela (sem taxas): R$ ${ultimaParcelaSAC_semTaxas.toFixed(2)}</p>
            <p><strong>Primeira Parcela (COM taxas): R$ ${primeiraParcelaSAC_comTaxas.toFixed(2)}</strong></p>
             <p><strong>Última Parcela (COM taxas): R$ ${ultimaParcelaSAC_comTaxas.toFixed(2)}</strong></p>
            <p>Total de Juros Pagos (estimado): R$ ${totalJurosSAC.toFixed(2)}</p>
             <p>Total Pago ao Final (COM taxas, estimado): R$ ${totalPagoSAC.toFixed(2)}</p>
            <p><em>No sistema SAC, o valor da parcela diminui ao longo do tempo.</em></p>


            <h4>Simulação pelo Sistema PRICE (Sistema Francês de Amortização)</h4>
            <p>Valor da Parcela Fixa (sem taxas): R$ ${parcelaPRICE_semTaxas.toFixed(2)}</p>
             <p><strong>Valor da Parcela Fixa (COM taxas): R$ ${parcelaPRICE_comTaxas.toFixed(2)}</strong></p>
            <p>Total de Juros Pagos (estimado): R$ ${totalJurosPRICE.toFixed(2)}</p>
             <p>Total Pago ao Final (COM taxas, estimado): R$ ${totalPagoPRICE.toFixed(2)}</p>
            <p><em>No sistema PRICE, o valor da parcela é constante (sem considerar seguros e taxas).</em></p>
        `;

        // Define o conteúdo principal da div de resultados
        // Usamos querySelector para encontrar o primeiro h3 e substituir o conteúdo a partir dele
        const firstH3 = resultsOutput.querySelector('h3');
        if (firstH3) {
            firstH3.parentElement.innerHTML = mainResultsHTML;
        } else {
             // Fallback caso a estrutura HTML mude (menos ideal)
             resultsOutput.innerHTML = mainResultsHTML + resultsOutput.innerHTML;
        }


        // --- Formatação do Resumo para Compartilhamento (Texto Puro) ---
        // Usamos \n para quebras de linha e *texto* ou **texto** para negrito no WhatsApp
        textSummaryForSharing = `*Resumo da Simulação Habitacional*\n\n` +
                                `Valor do Imóvel: R$ ${valorImovel.toFixed(2)}\n` +
                                `Valor da Entrada: R$ ${valorEntrada.toFixed(2)}\n` +
                                `Valor Financiado: R$ ${valorFinanciado.toFixed(2)}\n` +
                                `Prazo: ${prazoAnos} anos (${prazoMeses} meses)\n` +
                                `Taxa de Juros Anual: ${taxaJurosAnual.toFixed(2)}%\n` +
                                `Taxa de Juros Mensal: ${(taxaJurosMensal * 100).toFixed(4)}%\n`;

        if (includeMIPCheckbox.checked) {
            textSummaryForSharing += `Seguro MIP Mensal (estimado): R$ ${seguroMIP.toFixed(2)}\n`;
        }
        if (includeDFICheckbox.checked) {
            textSummaryForSharing += `Seguro DFI Mensal (estimado): R$ ${seguroDFI.toFixed(2)}\n`;
        }
        if (includeTaxaAdminCheckbox.checked) {
            textSummaryForSharing += `Taxa Administrativa Mensal (estimado): R$ ${taxaAdministrativa.toFixed(2)}\n`;
        }

        textSummaryForSharing += `\n*Simulação SAC*\n` +
                                 `Primeira Parcela (sem taxas): R$ ${primeiraParcelaSAC_semTaxas.toFixed(2)}\n` +
                                 `Última Parcela (sem taxas): R$ ${ultimaParcelaSAC_semTaxas.toFixed(2)}\n` +
                                 `*Primeira Parcela (COM taxas): R$ ${primeiraParcelaSAC_comTaxas.toFixed(2)}*\n` +
                                 `*Última Parcela (COM taxas): R$ ${ultimaParcelaSAC_comTaxas.toFixed(2)}*\n` +
                                 `Total de Juros Pagos (estimado): R$ ${totalJurosSAC.toFixed(2)}\n` +
                                 `Total Pago ao Final (COM taxas, estimado): R$ ${totalPagoSAC.toFixed(2)}\n` +
                                 `_No sistema SAC, o valor da parcela diminui ao longo do tempo._\n\n`; // _texto_ para itálico no WhatsApp

        textSummaryForSharing += `*Simulação PRICE*\n` +
                                 `Valor da Parcela Fixa (sem taxas): R$ ${parcelaPRICE_semTaxas.toFixed(2)}\n` +
                                 `*Valor da Parcela Fixa (COM taxas): R$ ${parcelaPRICE_comTaxas.toFixed(2)}*\n` +
                                 `Total de Juros Pagos (estimado): R$ ${totalJurosPRICE.toFixed(2)}\n` +
                                 `Total Pago ao Final (COM taxas, estimado): R$ ${totalPagoPRICE.toFixed(2)}\n` +
                                 `_No sistema PRICE, o valor da parcela é constante (sem considerar seguros e taxas)._\n\n`; // _texto_ para itálico no WhatsApp

        textSummaryForSharing += `_Estes são cálculos estimados e podem variar._`; // Mensagem final em itálico


        // --- Validação da Parcela vs Renda (Adicional) ---
        const limiteParcela = rendaMensal * 0.30; // 30% da renda mensal
        let validationMessageHTML = ''; // Mensagem para exibir na página
        let validationMessageText = ''; // Mensagem para incluir no texto de compartilhamento

        // Verifica se a primeira parcela no SAC (com taxas) ou a parcela fixa no PRICE (com taxas)
        // ultrapassam o limite de 30% da renda.
        const primeiraParcelaParaValidacao = primeiraParcelaSAC_comTaxas; // Usa a primeira do SAC por ser a maior no SAC
        const parcelaPRICEParaValidacao = parcelaPRICE_comTaxas; // Usa a parcela fixa do PRICE

        if (primeiraParcelaParaValidacao > limiteParcela || parcelaPRICEParaValidacao > limiteParcela) {
            validationMessageHTML = `<p style="color: orange; font-weight: bold;">
                Atenção: O valor estimado das parcelas (SAC: R$ ${primeiraParcelaParaValidacao.toFixed(2)}, PRICE: R$ ${parcelaPRICEParaValidacao.toFixed(2)})
                pode ultrapassar o limite de 30% da sua renda mensal (R$ ${limiteParcela.toFixed(2)}).
                Isso pode dificultar a aprovação do financiamento ou exigir ajustes no valor, prazo ou entrada.
            </p>`;
             validationMessageText = `\nAtenção: O valor estimado das parcelas (SAC: R$ ${primeiraParcelaParaValidacao.toFixed(2)}, PRICE: R$ ${parcelaPRICEParaValidacao.toFixed(2)}) pode ultrapassar o limite de 30% da sua renda mensal (R$ ${limiteParcela.toFixed(2)}). Isso pode dificultar a aprovação.`;

        } else {
             validationMessageHTML = `<p style="color: green; font-weight: bold;">
                Com base na sua renda, o valor estimado das parcelas parece estar dentro do limite de 30% (R$ ${limiteParcela.toFixed(2)}).
            </p>`;
             validationMessageText = `\nCom base na sua renda, o valor estimado das parcelas parece estar dentro do limite de 30% (R$ ${limiteParcela.toFixed(2)}).`;
        }

        // Adiciona a mensagem de validação à NOVA div de validação na página
        if (validationTextDiv) {
            validationTextDiv.innerHTML = validationMessageHTML;
        }

        // Adiciona a mensagem de validação ao resumo de texto para compartilhamento
        textSummaryForSharing += validationMessageText;


        // Habilita os botões de compartilhamento após a simulação
        copyResultsBtn.disabled = false;
        whatsappShareBtn.disabled = false;

    }

    // --- Função para copiar os resultados para a área de transferência ---
    function copyResults() {
        // Usa o resumo de texto formatado para copiar
        navigator.clipboard.writeText(textSummaryForSharing).then(function() {
            // Feedback para o usuário (opcional)
            // Mensagem ajustada para indicar que a formatação é para texto simples/mensagens
            alert('Resultados copiados para a área de transferência! Cole em um aplicativo de mensagens ou editor de texto para ver a formatação.');
        }).catch(function(err) {
            // Em caso de erro (ex: permissão negada)
            console.error('Erro ao copiar resultados: ', err);
            alert('Erro ao copiar resultados. Por favor, copie manualmente.');
        });
    }

    // --- Função para compartilhar via WhatsApp ---
    function shareViaWhatsApp() {
        // Usa o resumo de texto formatado para compartilhar
        const whatsappMessage = encodeURIComponent("Simulação Habitacional:\n\n" + textSummaryForSharing);

        // Cria o link do WhatsApp
        const whatsappLink = `https://wa.me/?text=${whatsappMessage}`;

        // Abre o link em uma nova aba/janela
        window.open(whatsappLink, '_blank');
    }

    // --- Função para limpar um campo de input individual ---
    function handleClearInput(event) {
        // Obtém o ID do input alvo a partir do atributo data-target do botão
        const targetInputId = event.target.dataset.target;
        const targetInput = document.getElementById(targetInputId);

        // Limpa o valor do input alvo
        if (targetInput) {
            targetInput.value = '';
        }
         // Opcional: Limpar resultados ou re-simular após limpar um campo
         // resultsOutput.innerHTML = '<p>Preencha os dados e clique em "Simular" para ver os resultados.</p>';
         // textSummaryForSharing = ''; // Limpa o resumo de texto
         // Desabilita botões de compartilhamento
         // copyResultsBtn.disabled = true;
         // whatsappShareBtn.disabled = true;
         // if (validationTextDiv) validationTextDiv.innerHTML = ''; // Limpa a div de validação
    }

    // --- Função para limpar todos os campos de input ---
    function handleClearAll() {
        // Limpa todos os campos de input numéricos
        const allNumberInputs = document.querySelectorAll('input[type="number"]');
        allNumberInputs.forEach(input => {
            input.value = '';
        });

        // Reseta os checkboxes para o estado inicial (marcados)
        includeMIPCheckbox.checked = true;
        includeDFICheckbox.checked = true;
        includeTaxaAdminCheckbox.checked = true;

        // Limpa a área de resultados, mas mantém as divs de aviso e validação vazias
         resultsOutput.innerHTML = `
            <p>Preencha os dados e clique em "Simular" para ver os resultados.</p>

            <div class="disclaimer-text">
                <p>* Estes são cálculos estimados e podem não refletir o valor exato das parcelas e do total pago, que podem variar entre as instituições financeiras e incluir outros encargos não considerados aqui.</p>
            </div>

            <div class="validation-text">
                </div>
        `;

        // Limpa o resumo de texto
        textSummaryForSharing = '';

        // Desabilita botões de compartilhamento
        copyResultsBtn.disabled = true;
        whatsappShareBtn.disabled = true;
    }


    // Desabilita os botões de compartilhamento inicialmente
    copyResultsBtn.disabled = true;
    whatsappShareBtn.disabled = true;

});
