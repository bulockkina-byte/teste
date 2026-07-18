import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Send, Check } from 'lucide-react';
import { montarHTML, gerarPDF } from '../../services/lroGenerator';
import { criarDocumento as criarDocumentoAutentique } from '../../services/autentiqueService';
import { atualizarStatus } from '../../services/lroDraftService';
import type { AutentiqueSigner } from '../../services/autentiqueService';
import { useAuth } from '../../context/AuthContext';

const SAMPLE_DATA: Record<string, unknown> = {
  logoUrl: '/LOGOLRO.jpeg',
  equipeNome: 'Alfa',
  dataInicio: '2026-07-15',
  dataFim: '2026-07-16',
  chefeEquipe: 'SILVA',
  comunicacao: 'SANTOS',
  dataAssinatura: '16 de Julho de 2026',
  chefeAssinatura: 'MICHAEL ALEXANDRE DE AZEVEDO',
  gerenteAssinatura: 'GUILHERME SERRA CARDIAS',
  coordenadorAssinatura: 'FELIPE AUGUSTO DE OLIVEIRA',
  instrucoes: [
    '14. PCINC - Verificar conformidade dos extintores',
    '15. EQUIPAMENTOS DE PROTEÇÃO - Manter EPIs atualizados',
  ],
  instrucoesHorarios: ['21:00', '22:00'],
  frota: [
    { viatura: 'CCI 319', prefixo: 'VT-01', kmIni: '12500', kmFim: '12580', combIni: '3/4', combFim: '1/2', situacao: 'EM LINHA' },
    { viatura: 'CCI 320', prefixo: 'VT-02', kmIni: '8900', kmFim: '8975', combIni: 'Cheio', combFim: '3/4', situacao: 'EM LINHA' },
    { viatura: 'CCI 333', prefixo: 'VT-03', kmIni: '5400', kmFim: '5400', combIni: '1/2', combFim: '1/2', situacao: 'RESERVA' },
  ],
  centralFaisca: 'FISCAL GABRIEL (MOTIVA) ESTEVE NA SCI, PARTICIPANDO DO NOSSO PTR',
  radioComunicacao: 'REALIZADO TESTE DO SAE E RÁDIO, COM TWR, VEÍCULOS OPERACIONAIS',
  tpStatus: '<span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;"></span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;"></span> SEM ALTERAÇÕES',
  tpTexto: 'Conferido TP da viatura CCI 319 - OK. EPI do CCI 2 com 1 par de luvas vencido, substituído.',
  extStatus: '<span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;"></span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;"></span> SEM ALTERAÇÕES',
  extTexto: 'Extintor do saguão principal - válidade 12/2026, pressão OK. LGE do CCI 319 - nível OK.',
  equipStatus: '<span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;"></span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;"></span> SEM ALTERAÇÕES',
  equipTexto: 'Mangueira de incêndio do hidrante H-03 apresentou desgaste - solicitado substituição.',
  edifStatus: '<span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:-2px;"></span> ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="display:inline-block; width:9px; height:9px; border:1px solid black; text-align:center; line-height:8px; font-size:7px; vertical-align:baseline; position:relative; top:1px;"></span> SEM ALTERAÇÕES',
  edifTexto: 'Portão de acesso ao pátio operacional - apresentando dificuldade para abertura, acionado a manutenção.',
  emergenciaXI: 'Aeronave PR-GXY acionou alerta de pneu com baixa pressão no pouso - equipe SCI deslocada para verificação e liberação da pista.',
  ocorrenciasXII: [
    '00:15 - Presença de animal (cachorro) no sítio aeroportuário próximo à cabeceira 11 - acionado o serviço de zoonoses.',
    '03:30 - Equipe de roça noturna realizou corte de grama no entorno do pátio de manutenção.',
  ],
  solicitacoes: [
    'Solicitado reparo no portão de acesso ao pátio operacional.',
    'Solicitado reposição de luvas de proteção para o CCI 2.',
  ],
  substituicao: [
    { funcao1: 'BA-CE', nome1: 'ALMEIDA', funcao2: 'BA-CE', nome2: 'COSTA' },
  ],
  cci2: [
    { funcao: 'BA-CE', nome: 'ALMEIDA' },
    { funcao: 'BA-MC', nome: 'COSTA' },
    { funcao: 'BA-2', nome: 'PEREIRA' },
  ],
  cci3: [
    { funcao: 'BA-MC', nome: 'LIMA' },
    { funcao: 'BA-2', nome: 'SOUZA' },
    { funcao: 'BA-2', nome: 'BARBOSA' },
  ],
  crs: [
    { funcao: 'BA-LR', nome: 'FERREIRA' },
    { funcao: 'BA-MC', nome: 'RODRIGUES' },
    { funcao: 'BA-RE', nome: 'MARTINS' },
    { funcao: 'BA-RE', nome: 'ARAUJO' },
  ],
};

export function PreviewLRO() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [enviando, setEnviando] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [showConfirm, setShowConfirm] = useState(false);
  const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';
  const modoAutentique = (location.state as any)?.modoAutentique;
  const signersAutentique = (location.state as any)?.signers as AutentiqueSigner[] | undefined;
  const draftIdAutentique = (location.state as any)?.draftId as string | undefined;

  const dados = useMemo(() => {
    const stateData = location.state as Record<string, unknown> | null;
    return stateData && Object.keys(stateData).length > 3 ? stateData : SAMPLE_DATA;
  }, [location.state]);

  const isSample = !location.state || Object.keys(location.state).length <= 3;

  const html = useMemo(() => montarHTML(dados, !modoAutentique), [dados, modoAutentique]);

  const htmlWithStyles = html;

  function handleBaixarPDF() {
    const htmlLimpo = montarHTML(dados).replace(
      '</head>',
      `<base href="${window.location.origin}/">\n</head>`
    );
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlLimpo);
      win.document.close();
      const checkReady = () => {
        const imgs = win.document.querySelectorAll('img');
        const loaded = Array.from(imgs).every(img => img.complete && img.naturalWidth > 0);
        if (loaded) {
          win.focus();
          setTimeout(() => win.print(), 200);
        } else {
          setTimeout(checkReady, 300);
        }
      };
      setTimeout(checkReady, 500);
    }
  }

  async function handleEnviarAutentique() {
    setShowConfirm(false);
    if (!signersAutentique) return;
    setEnviando('sending');
    try {
      const nomeArquivo = `LRO_${new Date().toISOString().split('T')[0]}`;

      let blob;
      try {
        blob = await gerarPDF(dados);
      } catch (errPdf) {
        alert('Erro ao gerar o PDF: ' + (errPdf instanceof Error ? errPdf.message : 'Erro'));
        setEnviando('idle');
        return;
      }

      if (!blob || blob.size === 0) {
        alert('Erro: PDF gerado está vazio.');
        setEnviando('idle');
        return;
      }

      try {
        await criarDocumentoAutentique(blob, nomeArquivo, signersAutentique, undefined, true);
      } catch (errAut) {
        alert('Erro do Autentique: ' + (errAut instanceof Error ? errAut.message : 'Erro') + '\n\nVerifique se o token VITE_AUTENTIQUE_TOKEN está configurado no Vercel.');
        setEnviando('idle');
        return;
      }

      if (draftIdAutentique) {
        await atualizarStatus(draftIdAutentique, 'aguardando').catch(() => {});
      }

      setEnviando('sent');
      setTimeout(() => navigate('/registros-diarios/gerar-lro'), 2000);
    } catch (err) {
      console.error('Erro ao enviar:', err);
      alert('Erro inesperado: ' + (err instanceof Error ? err.message : 'Erro'));
      setEnviando('idle');
    }
  }

  function handleImprimir() {
    iframeRef.current?.contentWindow?.print();
  }

  return (
    <div className="min-h-screen bg-graphite-100 dark:bg-graphite-900">
      <div className="sticky top-0 z-40 border-b border-graphite-200 bg-white/95 backdrop-blur dark:border-border-dark dark:bg-surface-card/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-graphite-500 hover:text-graphite-700 dark:hover:text-graphite-300">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div>
              {isSample && (
                <p className="text-xs text-amber-600 dark:text-amber-400">Dados de exemplo — edite no wizard para visualizar seus dados</p>
              )}
            </div>
          </div>
           <div className="flex gap-3">
            {isAdmin && (
              <button onClick={handleImprimir} className="flex items-center gap-2 rounded-xl border border-graphite-300 bg-white px-4 py-2 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            )}
            <button onClick={handleBaixarPDF} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:from-aviation-500 hover:to-aviation-600">
              <Download className="h-4 w-4" /> Baixar PDF
            </button>
            {modoAutentique && signersAutentique && (
              enviando === 'sent' ? (
                <button disabled className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20">
                  <Check className="h-4 w-4" /> Enviado — Aguardando Assinaturas
                </button>
              ) : (
                <button onClick={() => setShowConfirm(true)} disabled={enviando === 'sending'} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg transition-all ${enviando === 'sending' ? 'bg-graphite-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 active:scale-[0.98] shadow-green-500/20'}`}>
                  <Send className="h-4 w-4" /> {enviando === 'sending' ? 'Enviando...' : 'Confirmar e Enviar para Assinatura'}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center py-8">
        <div className="w-[210mm] bg-white shadow-2xl" style={{ minHeight: '297mm' }}>
          <iframe
            ref={iframeRef}
            srcDoc={htmlWithStyles}
            className="h-[297mm] w-full border-0"
            title="Preview LRO"
          />
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Send className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar envio</h3>
            </div>
            <p className="mb-6 text-sm text-graphite-500">
              Após enviar para assinatura, <span className="font-semibold text-graphite-700 dark:text-graphite-300">não será mais possível alterar</span> o LRO. O documento será encaminhado para os 3 signatários via Autentique.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 transition-all hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Cancelar
              </button>
              <button onClick={handleEnviarAutentique} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:from-green-500 hover:to-green-600 active:scale-[0.98]">
                <Send className="h-4 w-4" /> Confirmar e Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PreviewLRO;
