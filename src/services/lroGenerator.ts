import jsPDF from 'jspdf';
import { criarDocumento, type AutentiqueSigner } from './autentiqueService';

export function montarHTML(dados: Record<string, unknown>): string {
  const e = (k: string, fallback = '') => String(dados[k] ?? fallback);

  const logoUrl = e('logoUrl', '/logobombeiro.jpeg');
  const equipeNome = e('equipeNome');
  const dataInicio = e('dataInicio');
  const dataFim = e('dataFim');
  const chefeEquipe = e('chefeEquipe');
  const comunic = e('comunicacao');
  const dataAss = e('dataAssinatura', new Date().toLocaleDateString('pt-BR'));
  const chefeAss = e('chefeAssinatura', chefeEquipe);
  const gerenteAss = e('gerenteAssinatura');
  const coordAss = e('coordenadorAssinatura');

  const instrucoes = (dados.instrucoes as string[]) || [];
  const instrucoesHorarios = (dados.instrucoesHorarios as string[]) || [];
  const frota = (dados.frota as Array<Record<string, string>>) || [];
  const ocorrenciasXII = (dados.ocorrenciasXII as string[]) || [];
  const solicitacoes = (dados.solicitacoes as string[]) || [];
  const substituicao = (dados.substituicao as Array<Record<string, string>>) || [];
  const cci2 = (dados.cci2 as Array<Record<string, string>>) || [];
  const cci3 = (dados.cci3 as Array<Record<string, string>>) || [];
  const crs = (dados.crs as Array<Record<string, string>>) || [];
  const temEmergencia = dados.emergenciaXI;
  const temSubstituicao = substituicao.length > 0;

  const grid3 = (items: Array<Record<string, string>>) =>
    `<div style="display:grid; grid-template-columns:1fr 1fr 1fr; font-size:11px;">${items.map(i => `<div><span class="b">${i.funcao}</span> ${i.nome}</div>`).join('')}</div>`;
  const grid4 = (items: Array<Record<string, string>>) =>
    `<div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; font-size:11px;">${items.map(i => `<div><span class="b">${i.funcao}</span> ${i.nome}</div>`).join('')}</div>`;

  const instrucoesHTML = instrucoes.length > 0
    ? `<tr><td colspan="7" style="border-left:1px solid #000; border-right:1px solid #000; padding:4px 5px; font-size:10px; vertical-align:top; min-height:40px;"><div style="height:1em;"></div>${instrucoes.map((item, i) => `${i > 0 ? '<div style="height:1em;"></div>' : ''}<div style="display:grid; grid-template-columns:1fr 45px; gap:0; padding-right:90px;"><div>${item}</div><div>${instrucoesHorarios[i] || ''}</div></div>`).join('')}<div style="height:1em;"></div></td></tr>`
    : `<tr><td colspan="7" style="border-left:1px solid #000; border-right:1px solid #000; padding:4px 5px; font-size:10px; vertical-align:top; min-height:40px;"></td></tr>`;

  const frotaHTML = frota.map(f => `
    <tr style="border-top:1px solid #000; border-bottom:1px solid #000;"><td class="b" style="border:none; border-left:1px solid #000; font-size:11px; padding-right:16px; white-space:nowrap; width:50px;">${f.viatura || ''}</td><td style="border:none; font-size:11px; padding-left:0; white-space:nowrap; width:40px;">${f.prefixo || ''}</td><td style="border-left:none; border-right:1px solid #000; font-size:11px; padding:2px 8px; white-space:nowrap;">KM INICIAL</td><td style="border-left:none; border-right:1px solid #000; font-size:11px; padding:2px 16px; white-space:nowrap;">${f.kmIni || ''}</td><td style="border-left:none; border-right:1px solid #000; font-size:11px; padding:2px 8px; white-space:nowrap;">KM FINAL</td><td style="border-left:none; border-right:1px solid #000; font-size:11px; padding:2px 16px; white-space:nowrap;">${f.kmFim || ''}</td><td style="border-left:none; border-right:1px solid #000; font-size:11px; padding:2px 5px; width:100%;">${f.situacao || ''}</td></tr>
  `).join('') || '<tr style="border-top:1px solid #000; border-bottom:1px solid #000;"><td class="b" style="border:none;">CCI 319</td><td style="border:none;"></td><td style="border-left:1px solid #000; border-right:1px solid #000;">KM INICIAL</td><td style="border-left:1px solid #000; border-right:1px solid #000;"></td><td style="border-left:1px solid #000; border-right:1px solid #000;">KM FINAL</td><td style="border-left:1px solid #000; border-right:1px solid #000;"></td><td style="border-left:1px solid #000; border-right:1px solid #000;"></td></tr><tr style="border-top:1px solid #000; border-bottom:1px solid #000;"><td class="b" style="border:none;">CCI 320</td><td style="border:none;"></td><td style="border-left:1px solid #000; border-right:1px solid #000;">KM INICIAL</td><td style="border-left:1px solid #000; border-right:1px solid #000;"></td><td style="border-left:1px solid #000; border-right:1px solid #000;">KM FINAL</td><td style="border-left:1px solid #000; border-right:1px solid #000;"></td><td style="border-left:1px solid #000; border-right:1px solid #000;"></td></tr><tr style="border-top:1px solid #000; border-bottom:1px solid #000;"><td class="b" style="border:none;">CCI 333</td><td style="border:none;"></td><td style="border-left:1px solid #000; border-right:1px solid #000;">KM INICIAL</td><td style="border-left:1px solid #000; border-right:1px solid #000;"></td><td style="border-left:1px solid #000; border-right:1px solid #000;">KM FINAL</td><td style="border-left:1px solid #000; border-right:1px solid #000;"></td><td style="border-left:1px solid #000; border-right:1px solid #000;"></td></tr>';

  const subHTML = temSubstituicao
    ? substituicao.map(s => `
      <tr><td colspan="7" style="padding:4px 4px; font-size:11px;"><div style="display:grid; grid-template-columns:2fr 1fr 2fr; text-align:center;"><div><span class="b" style="font-size:11px;">${s.funcao1 || 'BA-2'}</span> <span style="font-size:11px; text-transform:uppercase;">${s.nome1 || ''}</span></div><div style="align-self:center;"><span style="font-size:14px;">→</span></div><div><span class="b" style="font-size:11px;">${s.funcao2 || 'BA-2'}</span> <span style="font-size:11px; text-transform:uppercase;">${s.nome2 || ''}</span></div></div></td></tr>
    `).join('')
    : '';

  const ocorrenciasHTML = ocorrenciasXII.length > 0
    ? ocorrenciasXII.map(o => `<tr><td style="border:none; padding:2px 8px; font-size:11px;">${o}</td></tr>`).join('')
    : '<tr><td style="border:none; padding:10px 4px; font-size:11px;"></td></tr>';

  const solicitacoesHTML = solicitacoes.length > 0
    ? solicitacoes.map(s => `<tr><td style="border:none; padding:2px 8px; font-size:11px;">${s}</td></tr>`).join('')
    : '<tr><td style="border:none; height:16px;"></td></tr>';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>LIVRO ATA DE CHEFE DE EQUIPE</title>
<style>
  @page { size: A4; margin: 15mm 10mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 7.5px; line-height: 1.2; color: #000; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 3px; page-break-inside: avoid; }
  td, th { border: 1px solid #000; padding: 5px 5px; font-size: 7.5px; text-align: left; vertical-align: top; }
  .b { font-weight: bold; }
  .c { text-align: center; }
  .sec-title td { font-weight: bold; font-size: 11px; background: #d4d4d4; padding: 2px 3px; text-align:center; }
  .mb { margin-top: 2px; margin-bottom: 2px; }
</style>
</head><body>

  <!-- HEADER -->
  <table style="margin-bottom:3px;">
    <tr>
      <td rowspan="4" style="width:3cm; text-align:center; vertical-align:middle; padding:2px 2px;">
        <img src="${logoUrl}" style="max-width:45px; height:auto; display:block; margin:0 auto;" alt="SCI NVT" />
      </td>
      <td style="width:70%; padding:2px 2px; text-align:center; vertical-align:middle;">
        <div style="font-size:8px; font-weight:bold;">FORMULÁRIO (FOR)</div>
      </td>
      <td colspan="2" style="text-align:center; padding:2px 2px; font-size:11px; vertical-align:middle;"><span class="b">Código:</span></td>
    </tr>
    <tr>
      <td rowspan="3" style="width:70%; padding:4px 6px; text-align:center; vertical-align:middle;">
        <div style="font-size:12px; font-weight:bold; text-transform:uppercase; padding:1px 0;">LIVRO ATA DE CHEFE DE EQUIPE</div>
      </td>
      <td colspan="2" style="text-align:center; padding:2px 3px; font-size:9px; vertical-align:middle;">MMS.BR.BA.FOR.001</td>
    </tr>
    <tr>
      <td style="width:9%; text-align:center; padding:2px 2px; font-size:11px; vertical-align:middle;"><span class="b">Revisão:</span></td>
      <td style="width:9%; text-align:center; padding:2px 2px; font-size:11px; vertical-align:middle;"><span class="b">Página:</span></td>
    </tr>
    <tr>
      <td style="text-align:center; padding:2px 3px; font-size:9px; vertical-align:middle;">00</td>
      <td style="text-align:center; padding:2px 3px; font-size:9px; vertical-align:middle;"><span class="page-num"></span> de <span class="page-total"></span></td>
    </tr>
  </table>

  <!-- SUBTÍTULOS + IDENTIFICAÇÃO -->
  <table class="mb">
    <tr><td class="b c" style="font-size:10px; padding:5px 5px;" colspan="5">SERVIÇO DE SALVAMENTO E COMBATE A INCÊNDIO - SESCINC</td></tr>
    <tr><td class="b c" style="font-size:10px; padding:5px 5px;" colspan="5">REGISTRO DE OCORRÊNCIA RELATIVO AO SERVIÇO DE CHEFE DE EQUIPE AO SESCINC</td></tr>
    <tr><td class="b" style="font-size:10px; width:25%; background:#d4d4d4; padding:5px 5px;" colspan="5">IDENTIFICAÇÃO DO AEROPORTO:</td></tr>
    <tr><td class="b" style="font-size:10px; padding:5px 5px;" colspan="5">SBNF - AEROPORTO INTERNACIONAL MINISTRO VICTOR KONDER</td></tr>
    <tr><td class="b" style="font-size:10px; width:7%; padding:5px 5px;">PLANTÃO:</td><td class="b" style="font-size:10px; width:5%; background:#d4d4d4; padding:5px 5px;">Data início:</td><td style="font-size:10px; width:10%; padding:5px 5px;">${dataInicio}</td><td class="b" style="font-size:10px; width:5%; background:#d4d4d4; padding:5px 5px;">Data do fim:</td><td style="font-size:10px; width:10%; padding:5px 5px;">${dataFim}</td></tr>
  </table>

  <!-- I. EQUIPE -->
  <table style="margin-bottom:0;">
    <tr class="sec-title"><td colspan="7" style="font-size:11px; background:#fff;">I. EQUIPE DE SERVIÇO ${equipeNome}</td></tr>
    <tr><td class="b" colspan="3" style="font-size:11px; width:22%">1.1. Chefe de Equipe:</td><td style="font-size:11px;" colspan="4">${chefeEquipe}</td></tr>
    <tr><td class="b" colspan="3" style="font-size:11px;">1.2. Comunicação BA-OC:</td><td style="font-size:11px;" colspan="4">${comunic}</td></tr>
    <tr><td class="b" colspan="7" style="font-size:11px; padding:5px 5px;">1.3. Equipagem dos CCI - EM LINHA, CCI - RT e CRS:</td></tr>
    <tr><td class="b" style="font-size:11px; width:1%; border-bottom:none; border-right:none;">CCI 2</td><td colspan="6" style="font-size:11px; border-bottom:none; border-left:none;">${grid3(cci2)}</td></tr>
    <tr><td class="b" style="font-size:11px; border-top:none; border-bottom:none; border-right:none;">CCI 3</td><td colspan="6" style="font-size:11px; border-top:none; border-bottom:none; border-left:none;">${grid3(cci3)}</td></tr>
    <tr><td class="b" style="font-size:11px; border-top:none; border-right:none;">CRS</td><td colspan="6" style="font-size:11px; border-top:none; border-left:none;">${grid4(crs)}</td></tr>
    <tr><td class="b" colspan="7" style="font-size:11px;">1.3. Substituições de BA: ${temSubstituicao ? '✓ ABAIXO' : '☐ ABAIXO'} &nbsp;&nbsp;&nbsp; ${temSubstituicao ? '☐ NÃO HOUVE' : '✓ NÃO HOUVE'}</td></tr>
    ${subHTML}
    <tr><td style="border-top:1px solid #000; border-bottom:1px solid #000; padding:2px 3px; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center;" colspan="7">II. INSTRUÇÕES</td></tr>
    ${instrucoesHTML}
    <tr><td style="border-bottom:1px solid #000;" colspan="7"></td></tr>
    <tr><td colspan="7" style="border:1px solid #000; padding:2px 8px; font-size:11px; min-height:40px; vertical-align:top;">${e('ptrba', '')}</td></tr>
    <tr class="sec-title"><td colspan="7">III. SITUAÇÃO OPERACIONAL DA FROTA DO SESCINC:</td></tr>
    ${frotaHTML}
  </table>

  <!-- IV -->
  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center; padding:2px 3px;">IV. SITUAÇÃO OPERACIONAL DA CENTRAL FAÍSCA, EQUIPAMENTOS DE COMUNICAÇÃO E ALARME:</td></tr>
    <tr><td style="border:none; border-bottom:1px solid #000; padding:2px 8px; font-size:11px;"><span class="b">3.1 CENTRAL FAÍSCA:</span></td></tr>
    <tr><td style="border:none; border-bottom:1px solid #000; padding:2px 8px; font-size:11px;">${e('centralFaisca', 'SEM ALTERAÇÕES')}</td></tr>
    <tr><td style="border:none; border-bottom:1px solid #000; padding:2px 8px; font-size:11px;"><span class="b">3.2 RÁDIOS, HOTLINE, SISTEMA DE ALARME:</span></td></tr>
    <tr><td style="border:none; padding:2px 8px; font-size:11px;">${e('radioComunicacao', 'SEM ALTERAÇÕES')}</td></tr>
  </table>

  <!-- V -->
  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center; padding:2px 3px;">V. SITUAÇÃO OPERACIONAL DOS TP, EPR EM LINHA E EM ESTOQUE</td></tr>
    ${e('tpTexto') ? `
    <tr><td style="border:none; padding:2px 40px; font-size:11px;"><span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;">✓</span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;"></span> SEM ALTERAÇÕES</td></tr>
    <tr><td style="border:none; border-top:1px solid #000; padding:6px 8px; font-size:11px;">${e('tpTexto')}</td></tr>` : `
    <tr><td style="border:none; padding:2px 40px; font-size:11px;"><span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;"></span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;">✓</span> SEM ALTERAÇÕES</td></tr>
    <tr><td style="border:none; border-top:1px solid #000; padding:6px 8px; font-size:11px;">SEM ALTERAÇÕES</td></tr>`}
  </table>

  <!-- VI -->
  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center; padding:2px 3px;">VI. SITUAÇÃO OPERACIONAL DOS AGENTES EXTINTORES (LGE E PQ) E NITROGÊNIO EM LINHA E ESTOQUE</td></tr>
    ${e('extTexto') ? `
    <tr><td style="border:none; padding:2px 40px; font-size:11px;"><span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;">✓</span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;"></span> SEM ALTERAÇÕES</td></tr>
    <tr><td style="border:none; border-top:1px solid #000; padding:6px 8px; font-size:11px;">${e('extTexto')}</td></tr>` : `
    <tr><td style="border:none; padding:2px 40px; font-size:11px;"><span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;"></span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;">✓</span> SEM ALTERAÇÕES</td></tr>
    <tr><td style="border:none; border-top:1px solid #000; padding:6px 8px; font-size:11px;">SEM ALTERAÇÕES</td></tr>`}
  </table>

  <!-- VII -->
  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center; padding:2px 3px;">VII. SITUAÇÃO OPERACIONAL DOS EQUIPAMENTOS E MATERIAIS DO SESCINC</td></tr>
    ${e('equipTexto') ? `
    <tr><td style="border:none; padding:2px 40px; font-size:11px;"><span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;">✓</span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;"></span> SEM ALTERAÇÕES</td></tr>
    <tr><td style="border:none; border-top:1px solid #000; padding:6px 8px; font-size:11px;">${e('equipTexto')}</td></tr>` : `
    <tr><td style="border:none; padding:2px 40px; font-size:11px;"><span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;"></span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;">✓</span> SEM ALTERAÇÕES</td></tr>
    <tr><td style="border:none; border-top:1px solid #000; padding:6px 8px; font-size:11px;">SEM ALTERAÇÕES</td></tr>`}
  </table>

  <!-- VIII -->
  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center; padding:2px 3px;">VIII. SITUAÇÃO OPERACIONAL DAS EDIFICAÇÕES / INSTALAÇÕES DA SCI</td></tr>
    ${e('edifTexto') ? `
    <tr><td style="border:none; padding:2px 40px; font-size:11px;"><span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;">✓</span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;"></span> SEM ALTERAÇÕES</td></tr>
    <tr><td style="border:none; border-top:1px solid #000; padding:6px 8px; font-size:11px;">${e('edifTexto')}</td></tr>` : `
    <tr><td style="border:none; padding:2px 40px; font-size:11px;"><span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;"></span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;">✓</span> SEM ALTERAÇÕES</td></tr>
    <tr><td style="border:none; border-top:1px solid #000; padding:6px 8px; font-size:11px;">SEM ALTERAÇÕES</td></tr>`}
  </table>

  <!-- IX a XI -->
  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center; padding:2px 3px;">IX. OCORRÊNCIAS NÃO AERONÁUTICAS</td></tr>
    <tr><td style="border:none; height:14px;"></td></tr>
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center; padding:2px 3px;">X. INSPEÇÕES TÉCNICAS E VISTORIAS</td></tr>
    <tr><td style="border:none; height:14px;">${e('inspecoes')}</td></tr>
  </table>

  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center; padding:2px 3px;">XI. EMERGÊNCIAS AERONÁUTICAS</td></tr>
    ${temEmergencia ? `<tr><td style="border:none; padding:2px 8px; font-size:11px;">${temEmergencia}</td></tr>` : '<tr><td style="border:none; height:14px;"></td></tr>'}
  </table>

  <!-- XII -->
  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center; padding:2px 3px;">XII. OUTRAS OCORRÊNCIAS</td></tr>
    ${ocorrenciasHTML}
  </table>

  <!-- XIII -->
  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:11px; background:#d4d4d4; text-align:center; padding:2px 3px;">XIII. SOLICITAÇÕES EFETUADAS A CCR</td></tr>
    ${solicitacoesHTML}
  </table>

  <!-- ASSINATURAS -->
  <table style="border:1px solid #000; border-collapse:separate; border-spacing:0; margin-top:3px;">
    <tr><td colspan="6" style="border:none; border-bottom:1px solid #000; font-weight:bold; font-size:10px; background:#d4d4d4; text-align:center; padding:2px 3px;">LOCAL, DATA E ASSINATURAS</td></tr>
    <tr><td colspan="6" style="border:none; padding:6px 4px; font-size:10px; text-align:right;">${cidade} - ${uf}, ${dia} de ${mes} de ${ano}</td></tr>
    <tr><td colspan="6" style="border:none; padding:0 4px; font-size:10px; text-align:right;">(cidade) &nbsp;&nbsp;&nbsp; (dia) &nbsp;&nbsp;&nbsp; (mês) &nbsp;&nbsp;&nbsp; (ano)</td></tr>
    <tr><td style="border:none; height:40px;"></td></tr>
    <tr>
      <td style="width:33%; border:none; text-align:center; padding:0 16px;">
        <div style="border-top:1px solid #000; padding-top:6px; font-size:9px; font-weight:bold;">CHEFE DE EQUIPE:</div>
        <div style="font-size:9px; margin-top:8px; min-height:24px; text-transform:uppercase;">${chefeAss}</div>
      </td>
      <td style="width:33%; border:none; text-align:center; padding:0 16px;">
        <div style="border-top:1px solid #000; padding-top:6px; font-size:9px; font-weight:bold;">GERENTE DO SESCINC SBNF:</div>
        <div style="font-size:9px; margin-top:8px; min-height:24px; text-transform:uppercase;">${gerenteAss}</div>
      </td>
      <td style="width:33%; border:none; text-align:center; padding:0 16px;">
        <div style="border-top:1px solid #000; padding-top:6px; font-size:9px; font-weight:bold;">COORD DE PREV E EMERG:</div>
        <div style="font-size:9px; margin-top:8px; min-height:24px; text-transform:uppercase;">${coordAss}</div>
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
        try { resolve(doc.output('blob')); } catch (err) { reject(err); }
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
