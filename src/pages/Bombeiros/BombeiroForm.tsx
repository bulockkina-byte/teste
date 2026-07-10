import { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import type { Bombeiro, Cargo, Equipe, Turno, CatCNH } from '../../types/bombeiro';
import {
  CARGO_OPTIONS,
  EQUIPE_OPTIONS,
  TURNO_OPTIONS,
  CNH_OPTIONS,
} from '../../types/bombeiro';

interface Props {
  bombeiro?: Bombeiro | null;
  onSave: (data: Omit<Bombeiro, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function calcularIdade(dataNasc: string): number {
  if (!dataNasc) return 0;
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mes = hoje.getMonth() - nasc.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

export function BombeiroForm({ bombeiro, onSave, onClose }: Props) {
  const [matricula, setMatricula] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [nomeGuerra, setNomeGuerra] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [cargo, setCargo] = useState<Cargo>('BA-2');
  const [equipe, setEquipe] = useState<Equipe>('Alfa');
  const [turno, setTurno] = useState<Turno>('Diurno');
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [cnhNumero, setCnhNumero] = useState('');
  const [cnhCategoria, setCnhCategoria] = useState<CatCNH>('B');
  const [cnhValidade, setCnhValidade] = useState('');
  const [foto, setFoto] = useState('');
  const [dataDesligamento, setDataDesligamento] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (bombeiro) {
      setMatricula(bombeiro.matricula);
      setNomeCompleto(bombeiro.nomeCompleto);
      setNomeGuerra(bombeiro.nomeGuerra);
      setDataNascimento(bombeiro.dataNascimento);
      setDataAdmissao(bombeiro.dataAdmissao);
      setCargo(bombeiro.cargo);
      setEquipe(bombeiro.equipe);
      setTurno(bombeiro.turno);
      setTipoSanguineo(bombeiro.tipoSanguineo);
      setCpf(bombeiro.cpf);
      setRg(bombeiro.rg);
      setCnhNumero(bombeiro.cnhNumero);
      setCnhCategoria(bombeiro.cnhCategoria);
      setCnhValidade(bombeiro.cnhValidade);
      setFoto(bombeiro.foto);
      setDataDesligamento(bombeiro.dataDesligamento);
    }
  }, [bombeiro]);

  const idade = calcularIdade(dataNascimento);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!matricula || !nomeCompleto || !nomeGuerra || !dataNascimento || !cpf) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }
    setErro('');
    onSave({
      matricula,
      nomeCompleto: nomeCompleto.replace(/\b\w/g, char => char.toUpperCase()),
      nomeGuerra: nomeGuerra.replace(/\b\w/g, char => char.toUpperCase()),
      dataNascimento,
      idade,
      dataAdmissao,
      cargo,
      equipe,
      turno,
      tipoSanguineo,
      cpf: cpf.replace(/\D/g, ''),
      rg,
      cnhNumero,
      cnhCategoria,
      cnhValidade,
      foto,
      dataDesligamento,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10 pb-10">
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl dark:bg-graphite-800">
        <div className="flex items-center justify-between border-b border-graphite-200 px-6 py-4 dark:border-graphite-700">
          <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
            {bombeiro ? 'Editar Bombeiro' : 'Novo Bombeiro'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-graphite-500 transition-colors hover:bg-graphite-100 dark:hover:bg-graphite-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {erro && <p className="text-sm text-alert-red">{erro}</p>}

          {/* Informações Pessoais */}
          <fieldset>
            <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
              Informações Pessoais
            </legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">CPF *</label>
                <input value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00"
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">RG</label>
                <input value={rg} onChange={e => setRg(e.target.value)} placeholder="RG"
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">CNH nº</label>
                <input value={cnhNumero} onChange={e => setCnhNumero(e.target.value)} placeholder="Número da CNH"
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Cat. CNH</label>
                <select value={cnhCategoria} onChange={e => setCnhCategoria(e.target.value as CatCNH)}
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
                  {CNH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Validade CNH</label>
                <input type="date" value={cnhValidade} onChange={e => setCnhValidade(e.target.value)}
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Foto</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-graphite-300 bg-white px-3 py-2 text-sm text-graphite-500 transition-colors hover:border-aviation-500 hover:text-aviation-600 dark:border-graphite-700 dark:bg-graphite-900">
                  <Upload className="h-4 w-4" />
                  {foto ? 'Trocar foto' : 'Enviar foto'}
                  <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                </label>
                {foto && (
                  <img src={foto} alt="preview" className="mt-2 h-16 w-16 rounded-lg object-cover" />
                )}
              </div>
            </div>
          </fieldset>

          {/* Dados Funcionais */}
          <fieldset>
            <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
              Dados Funcionais
            </legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Matrícula MMS *</label>
                <input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="MMS"
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Nome Completo *</label>
                <input value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} placeholder="Nome completo"
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Nome de Guerra *</label>
                <input value={nomeGuerra} onChange={e => setNomeGuerra(e.target.value)} placeholder="Nome de guerra"
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Data de Nascimento *</label>
                <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)}
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Data de Admissão</label>
                <input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)}
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Idade</label>
                <input value={idade || ''} disabled
                  className="w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-2 text-sm text-graphite-500 dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-400" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Cargo *</label>
                <select value={cargo} onChange={e => setCargo(e.target.value as Cargo)}
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
                  {CARGO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Equipe *</label>
                <select value={equipe} onChange={e => setEquipe(e.target.value as Equipe)}
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
                  {EQUIPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Turno *</label>
                <select value={turno} onChange={e => setTurno(e.target.value as Turno)}
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100">
                  {TURNO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Tipo Sanguíneo</label>
                <input value={tipoSanguineo} onChange={e => setTipoSanguineo(e.target.value)} placeholder="Ex: A+"
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
            </div>
          </fieldset>

          {/* Desligamento */}
          <fieldset>
            <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">
              Desligamento
            </legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Data de Desligamento</label>
                <input type="date" value={dataDesligamento} onChange={e => setDataDesligamento(e.target.value)}
                  className="w-full rounded-lg border border-graphite-300 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100" />
              </div>
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-3 border-t border-graphite-200 pt-4 dark:border-graphite-700">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-graphite-300 bg-white px-4 py-2 text-sm font-medium text-graphite-700 transition-colors hover:bg-graphite-50 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200 dark:hover:bg-graphite-700">
              Cancelar
            </button>
            <button type="submit"
              className="rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-aviation-700">
              {bombeiro ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
