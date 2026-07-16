import jsPDF from 'jspdf';
import { criarDocumento, type AutentiqueSigner } from './autentiqueService';

function montarHTML(dados: Record<string, unknown>): string {
  const e = (k: string, fallback = '') => String(dados[k] ?? fallback);

  const instrucoes = (dados.instrucoes as string[]) || [];
  const instrucoesHTML = instrucoes.length > 0
    ? instrucoes.map((i, idx) => `
      <tr><td style="border:none; height:5px;"></td></tr>
      <tr><td style="border:none; padding:2px 40px; font-size:7px;"><div style="display:grid; grid-template-columns:3fr 1fr; align-items:center;"><div>${i}</div><div style="text-align:right;"></div></div></td></tr>
    `).join('')
    : '<tr><td style="border:none; height:14px; font-size:7px; text-align:center; padding:2px 40px;">Nenhuma instrução registrada neste plantão</td></tr>';

  const frota = (dados.frota as Array<Record<string, string>>) || [];
  const frotaHTML = frota.map(f => `
    <tr><td class="b">${f.viatura || ''}</td><td>${f.prefixo || ''}</td><td>${f.kmIni || ''}</td><td>${f.kmFim || ''}</td><td>${f.combIni || ''}</td><td>${f.combFim || ''}</td><td>${f.situacao || ''}</td></tr>
  `).join('');

  const cci2 = (dados.cci2 as Array<Record<string, string>>) || [];
  const cci3 = (dados.cci3 as Array<Record<string, string>>) || [];
  const crs = (dados.crs as Array<Record<string, string>>) || [];

  const grid3 = (items: Array<Record<string, string>>) =>
    `<div style="display:grid; grid-template-columns:1fr 1fr 1fr;">${items.map(i => `<div><span class="b">${i.funcao}:</span> ${i.nome}</div>`).join('')}</div>`;
  const grid4 = (items: Array<Record<string, string>>) =>
    `<div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr;">${items.map(i => `<div><span class="b">${i.funcao}:</span> ${i.nome}</div>`).join('')}</div>`;

  const temSubstituicao = dados.substituicao && Array.isArray(dados.substituicao) && (dados.substituicao as Array<any>).length > 0;
  const subHTML = temSubstituicao
    ? (dados.substituicao as Array<Record<string, string>>).map(s => `
      <tr><td colspan="6" style="padding:2px 4px;font-size:7px;"><span class="b">${s.funcao1 || 'BA-2'}:</span> ${s.nome1 || ''} &nbsp;&nbsp;→&nbsp;&nbsp; <span class="b">${s.funcao2 || 'BA-2'}:</span> ${s.nome2 || ''}</td></tr>
    `).join('')
    : '';

  const ocorrencias = (dados.ocorrenciasXII as string[]) || [];
  const ocorrenciasHTML = ocorrencias.length > 0
    ? ocorrencias.map(o => `<tr><td style="border:none; padding:2px 4px; font-size:7px;">${o}</td></tr>`).join('')
    : '<tr><td style="border:none; padding:10px 4px; font-size:7px;"></td></tr>';

  const solicitacoes = (dados.solicitacoes as string[]) || [];
  const solicitacoesHTML = solicitacoes.length > 0
    ? solicitacoes.map(s => `<tr><td style="border:none; padding:2px 4px; font-size:7px;">${s}</td></tr>`).join('')
    : '<tr><td style="border:none; height:16px;"></td></tr>';

  const temEmergencia = dados.emergenciaXI;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>LRO</title>
<style>
  @page { size: A4; margin: 15mm 10mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 8mm 10mm; font-size: 7.5px; line-height: 1.2; color: #000; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 3px; page-break-inside: avoid; }
  td, th { border: 1px solid #000; padding: 1.5px 3px; font-size: 7.5px; text-align: left; vertical-align: top; }
  .b { font-weight: bold; }
  .c { text-align: center; }
  .sec-title td { font-weight: bold; font-size: 8px; background: #d4d4d4; padding: 2px 3px; text-align:center; }
</style>
</head><body>

  <!-- HEADER -->
  <table style="margin-bottom:3px;">
    <tr>
      <td rowspan="4" style="width:12%; text-align:center; vertical-align:middle; padding:4px;">
        <img src="${e('logoUrl', '/logobombeiro.jpeg')}" style="max-width:45px; height:auto; display:block; margin:0 auto;" alt="SCI NVT" />
      </td>
      <td style="width:70%; padding:2px 6px; text-align:center; vertical-align:middle;">
        <div style="font-size:6px; font-weight:bold;">FORMULÁRIO (FOR)</div>
      </td>
      <td colspan="2" style="text-align:center; padding:2px 3px; font-size:6px; vertical-align:middle;"><span class="b">Código:</span></td>
    </tr>
    <tr>
      <td rowspan="3" style="width:70%; padding:4px 6px; text-align:center; vertical-align:middle;">
        <div style="font-size:9px; font-weight:bold; text-transform:uppercase; padding:1px 0;">LIVRO ATA DE CHEFE DE EQUIPE</div>
      </td>
      <td colspan="2" style="text-align:center; padding:2px 3px; font-size:6px; vertical-align:middle;">MMS.BR.BA.FOR.001</td>
    </tr>
    <tr>
      <td style="width:9%; text-align:center; padding:2px 2px; font-size:6px; vertical-align:middle;"><span class="b">Revisão:</span></td>
      <td style="width:9%; text-align:center; padding:2px 2px; font-size:6px; vertical-align:middle;"><span class="b">Página:</span></td>
    </tr>
    <tr>
      <td style="text-align:center; padding:2px 3px; font-size:6px; vertical-align:middle;">00</td>
      <td style="text-align:center; padding:2px 3px; font-size:6px; vertical-align:middle;">1 de 1</td>
    </tr>
  </table>

  <table class="mb">
    <tr><td class="b c" style="font-size:7px;">SERVIÇO DE SALVAMENTO E COMBATE A INCÊNDIO - SESCINC</td></tr>
  </table>
  <table class="mb">
    <tr><td class="b c" style="font-size:7px;">REGISTRO DE OCORRÊNCIA RELATIVO AO SERVIÇO DE CHEFE DE EQUIPE AO SESCINC</td></tr>
  </table>

  <table class="mb">
    <tr><td class="b" style="width:25%;background:#d4d4d4;">IDENTIFICAÇÃO DO AEROPORTO:</td><td colspan="4">SBNF - AEROPORTO INTERNACIONAL MINISTRO VICTOR KONDER</td></tr>
    <tr><td class="b" style="width:10%">PLANTÃO:</td><td class="b" style="width:18%;background:#d4d4d4;">Data início:</td><td style="width:22%">${e('dataInicio')}</td><td class="b" style="width:18%;background:#d4d4d4;">Data do fim:</td><td style="width:32%">${e('dataFim')}</td></tr>
  </table>

  <table style="margin-bottom:3px;">
    <tr class="sec-title"><td colspan="6">I. EQUIPE DE SERVIÇO ${e('equipeNome')}</td></tr>
    <tr><td class="b" colspan="2" style="width:22%">1.1. Chefe de Equipe:</td><td colspan="4">${e('chefeEquipe')}</td></tr>
    <tr><td class="b" colspan="2">1.2. Comunicação BA-OC:</td><td colspan="4">${e('comunicacao')}</td></tr>
    <tr><td colspan="6" class="b" style="padding:2px 3px;font-size:8px;background:#d4d4d4;">1.3. Equipagem dos CCI - EM LINHA, CCI - RT e CRS:</td></tr>
    <tr><td class="b" style="width:1%;">CCI 2</td><td colspan="5">${grid3(cci2)}</td></tr>
    <tr><td class="b">CCI 3</td><td colspan="5">${grid3(cci3)}</td></tr>
    <tr><td class="b">CRS</td><td colspan="5">${grid4(crs)}</td></tr>
    <tr><td class="b" colspan="6">1.4. Substituições de BA: ${temSubstituicao ? '✅ ABAIXO' : '☐ ABAIXO'} &nbsp;&nbsp;&nbsp; ${!temSubstituicao ? '✅ NÃO HOUVE' : '☐ NÃO HOUVE'}</td></tr>
    ${subHTML}
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-bottom:3px;">
    <tr><td style="border:none; border-bottom:1px solid #000; padding:2px 3px; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center;">II. INSTRUÇÕES</td></tr>
    ${instrucoesHTML}
  </table>

  <table>
    <tr class="sec-title"><td colspan="7">III. SITUAÇÃO OPERACIONAL DA FROTA DO SESCINC:</td></tr>
    <tr class="b"><th>VIATURA</th><th>PREFIXO</th><th>KM INICIAL</th><th>KM FINAL</th><th>COMB. INICIAL</th><th>COMB. FINAL</th><th>SITUAÇÃO</th></tr>
    ${frotaHTML || '<tr><td class="b">CCI 319</td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td class="b">CCI 320</td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td class="b">CCI 333</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'}
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">IV. SITUAÇÃO OPERACIONAL DA CENTRAL FAÍSCA, EQUIPAMENTOS DE COMUNICAÇÃO E ALARME:</td></tr>
    <tr><td style="border:none; border-bottom:1px solid #000; padding:2px 4px; font-size:7px;"><span class="b">3.1 CENTRAL FAÍSCA:</span></td></tr>
    <tr><td style="border:none; border-bottom:1px solid #000; padding:2px 4px; font-size:7px;">${e('centralFaisca', 'SEM ALTERAÇÕES')}</td></tr>
    <tr><td style="border:none; border-bottom:1px solid #000; padding:2px 4px; font-size:7px;"><span class="b">3.2 RÁDIOS, HOTLINE, SISTEMA DE ALARME:</span></td></tr>
    <tr><td style="border:none; padding:2px 4px; font-size:7px;">${e('radioComunicacao', 'SEM ALTERAÇÕES')}</td></tr>
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">V. SITUAÇÃO OPERACIONAL DOS TP, EPR EM LINHA E EM ESTOQUE</td></tr>
    <tr><td style="border:none; padding:2px 40px; font-size:7px;">${e('tpStatus', '☐ ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ NÃO HOUVE')}</td></tr>
    ${e('tpTexto') ? `<tr><td style="border:none; padding:2px 4px; font-size:7px;">${e('tpTexto')}</td></tr>` : ''}
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">VI. SITUAÇÃO OPERACIONAL DOS AGENTES EXTINTORES (LGE E PQ) E NITROGÊNIO EM LINHA E ESTOQUE</td></tr>
    <tr><td style="border:none; padding:2px 40px; font-size:7px;">${e('extStatus', '☐ ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ NÃO HOUVE')}</td></tr>
    ${e('extTexto') ? `<tr><td style="border:none; padding:2px 4px; font-size:7px;">${e('extTexto')}</td></tr>` : ''}
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">VII. SITUAÇÃO OPERACIONAL DOS EQUIPAMENTOS E MATERIAIS DO SESCINC</td></tr>
    <tr><td style="border:none; padding:2px 40px; font-size:7px;">${e('equipStatus', '☐ ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ NÃO HOUVE')}</td></tr>
    ${e('equipTexto') ? `<tr><td style="border:none; padding:2px 4px; font-size:7px;">${e('equipTexto')}</td></tr>` : ''}
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">VIII. SITUAÇÃO OPERACIONAL DAS EDIFICAÇÕES / INSTALAÇÕES DA SCI</td></tr>
    <tr><td style="border:none; padding:2px 40px; font-size:7px;">${e('edifStatus', '☐ ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ NÃO HOUVE')}</td></tr>
    ${e('edifTexto') ? `<tr><td style="border:none; padding:2px 4px; font-size:7px;">${e('edifTexto')}</td></tr>` : ''}
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">IX. OCORRÊNCIAS NÃO AERONÁUTICAS</td></tr>
    <tr><td style="border:none; height:14px;"></td></tr>
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">X. INSPEÇÕES TÉCNICAS E VISTORIAS</td></tr>
    <tr><td style="border:none; height:14px;">${e('inspecoes')}</td></tr>
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">XI. EMERGÊNCIAS AERONÁUTICAS</td></tr>
    ${temEmergencia ? `<tr><td style="border:none; padding:2px 4px; font-size:7px;">${temEmergencia}</td></tr>` : '<tr><td style="border:none; height:14px;"></td></tr>'}
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">XII. OUTRAS OCORRÊNCIAS</td></tr>
    ${ocorrenciasHTML}
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">XIII. SOLICITAÇÕES EFETUADAS A CCR</td></tr>
    ${solicitacoesHTML}
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:8px; background:#d4d4d4; text-align:center; padding:2px 3px;">LOCAL, DATA E ASSINATURAS</td></tr>
    <tr><td colspan="6" style="border:none; padding:6px 4px; font-size:7px; text-align:right;">NAVEGANTES-SC, ${e('dataAssinatura')}</td></tr>
    <tr><td style="border:none; height:40px;"></td></tr>
    <tr>
      <td style="width:33%; border:none; text-align:center; padding:0 16px;">
        <div style="border-top:1px solid #000; padding-top:6px; font-size:7px; font-weight:bold;">CHEFE DE EQUIPE:</div>
        <div style="font-size:8px; margin-top:8px; min-height:24px;">${e('chefeAssinatura')}</div>
      </td>
      <td style="width:33%; border:none; text-align:center; padding:0 16px;">
        <div style="border-top:1px solid #000; padding-top:6px; font-size:7px; font-weight:bold;">GERENTE DO SESCINC SBNF:</div>
        <div style="font-size:8px; margin-top:8px; min-height:24px;">${e('gerenteAssinatura')}</div>
      </td>
      <td style="width:33%; border:none; text-align:center; padding:0 16px;">
        <div style="border-top:1px solid #000; padding-top:6px; font-size:7px; font-weight:bold;">COORD DE PREV E EMERG:</div>
        <div style="font-size:8px; margin-top:8px; min-height:24px;">${e('coordenadorAssinatura')}</div>
      </td>
    </tr>
  </table>

</body></html>`;
}

export async function gerarPDF(dados: Record<string, unknown>): Promise<Blob> {
  const html = montarHTML(dados);
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  return new Promise((resolve, reject) => {
    doc.html(html, {
      callback: () => {
        try {
          const blob = doc.output('blob');
          resolve(blob);
        } catch (err) {
          reject(err);
        }
      },
      margin: [10, 10, 10, 10],
      autoPaging: 'text',
      width: 190,
      windowWidth: 1900,
    });
  });
}

export async function gerarEEnviarAutentique(
  dados: Record<string, unknown>,
  signatarios: AutentiqueSigner[],
  nomeDocumento: string,
): Promise<{ id: string; link: string }> {
  const blob = await gerarPDF(dados);
  const result = await criarDocumento(blob, nomeDocumento, signatarios);
  const link = result.signatures?.[0]?.link?.short_link || '';
  return { id: result.id, link };
}
