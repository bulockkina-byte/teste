import { useEffect, useState } from 'react';
import { Users, Search, AlertCircle, X, Calendar, Shield, Droplets, User, Hash, IdCard, Car, Briefcase, Clock, FileText } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarBombeiros, buscarBombeiro } from '../../services/bombeiroService';
import type { Bombeiro } from '../../types/bombeiro';
import { CARGO_OPTIONS } from '../../types/bombeiro';

function capitalize(str: string) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

function labelCargo(valor: string) {
  const found = CARGO_OPTIONS.find(o => o.value === valor);
  return found ? found.label : valor;
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR');
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-2xl bg-gradient-to-br from-aviation-50 to-aviation-100 p-1.5 shadow-sm dark:from-aviation-900/30 dark:to-aviation-800/20">
        <Icon className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
      </div>
      <div>
        <p className="text-xs text-graphite-500 dark:text-graphite-400">{label}</p>
        <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{value || '-'}</p>
      </div>
    </div>
  );
}

function DetailModal({ bombeiro, onClose }: { bombeiro: Bombeiro; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10 pb-10" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white/95 shadow-2xl shadow-black/5 backdrop-blur-sm dark:bg-graphite-800/95 dark:shadow-black/20" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-graphite-200 px-6 py-4 dark:border-graphite-700">
          <div className="flex items-center gap-3">
            {bombeiro.foto ? (
              <img src={bombeiro.foto} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-aviation-600 text-sm font-bold text-white">
                {bombeiro.nomeGuerra.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{capitalize(bombeiro.nomeCompleto)}</h2>
              <p className="text-sm text-graphite-500">{capitalize(bombeiro.nomeGuerra)} · {bombeiro.matricula}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-graphite-400 transition-all duration-200 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-graphite-800 dark:hover:text-graphite-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">Informações Pessoais</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoRow icon={IdCard} label="CPF" value={bombeiro.cpf} />
              <InfoRow icon={IdCard} label="RG" value={bombeiro.rg} />
              <InfoRow icon={Car} label="CNH" value={bombeiro.cnhNumero} />
              <InfoRow icon={Car} label="Cat. CNH" value={bombeiro.cnhCategoria} />
              <InfoRow icon={Calendar} label="Validade CNH" value={formatDate(bombeiro.cnhValidade)} />
              <InfoRow icon={Droplets} label="Tipo Sanguíneo" value={bombeiro.tipoSanguineo} />
            </div>
          </div>

          <div className="border-t border-graphite-200 dark:border-graphite-700" />

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-aviation-600 dark:text-aviation-400">Dados Funcionais</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoRow icon={Hash} label="Matrícula MMS" value={bombeiro.matricula} />
              <InfoRow icon={User} label="Nome de Guerra" value={capitalize(bombeiro.nomeGuerra)} />
              <InfoRow icon={Calendar} label="Nascimento" value={formatDate(bombeiro.dataNascimento)} />
              <InfoRow icon={Calendar} label="Idade" value={String(bombeiro.idade)} />
              <InfoRow icon={Calendar} label="Admissão" value={formatDate(bombeiro.dataAdmissao)} />
              <InfoRow icon={Briefcase} label="Cargo" value={labelCargo(bombeiro.cargo)} />
              <InfoRow icon={Shield} label="Equipe" value={bombeiro.equipe} />
              <InfoRow icon={Clock} label="Turno" value={bombeiro.turno} />
              <InfoRow icon={FileText} label="Situação" value={bombeiro.dataDesligamento ? 'Desligado' : 'Ativo'} />
            </div>
          </div>

          {bombeiro.dataDesligamento && (
            <>
              <div className="border-t border-graphite-200 dark:border-graphite-700" />
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-alert-red">Desligamento</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InfoRow icon={Calendar} label="Data de Desligamento" value={formatDate(bombeiro.dataDesligamento)} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState<Bombeiro[]>([]);
  const [termo, setTermo] = useState('');
  const [selecionado, setSelecionado] = useState<Bombeiro | null>(null);

  useEffect(() => {
    setFuncionarios(termo ? buscarBombeiro(termo) : listarBombeiros());
  }, [termo]);

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle icon={Users} title="Funcionários" />
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Pesquisar por matrícula, nome, CPF ou equipe..."
            className="w-full rounded-xl border border-graphite-300/60 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-700/40 dark:bg-graphite-900/50 dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-graphite-900"
          />
        </div>
      </div>

      {funcionarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center backdrop-blur-sm dark:border-graphite-700/40 dark:bg-graphite-900/30">
          <Users className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
            Nenhum funcionário encontrado
          </h3>
          <p className="text-sm text-graphite-400">
            Os funcionários cadastrados no módulo de Bombeiros aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 backdrop-blur-sm dark:border-graphite-700/40 dark:bg-graphite-900/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 bg-graphite-50 text-left dark:border-graphite-700 dark:bg-graphite-800">
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Matrícula</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Nome de Guerra</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Cargo</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Equipe</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Turno</th>
                <th className="px-4 py-3 font-semibold text-graphite-600 dark:text-graphite-300">Situação</th>
              </tr>
            </thead>
            <tbody>
              {funcionarios.map(b => (
                <tr
                  key={b.id}
                  onClick={() => setSelecionado(b)}
                  className="cursor-pointer border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-graphite-800 dark:hover:bg-aviation-900/20"
                >
                  <td className="px-4 py-3 font-medium text-graphite-900 dark:text-graphite-100">{b.matricula}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {b.foto && (
                        <img src={b.foto} alt="" className="h-8 w-8 rounded-full object-cover" />
                      )}
                      <span className="text-graphite-700 dark:text-graphite-300">{capitalize(b.nomeCompleto)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{capitalize(b.nomeGuerra)}</td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{labelCargo(b.cargo)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-aviation-50 px-2.5 py-0.5 text-xs font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                      {b.equipe}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{b.turno}</td>
                  <td className="px-4 py-3">
                    {b.dataDesligamento ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-alert-red dark:bg-red-900/20">
                        <AlertCircle className="h-3 w-3" />
                        Desligado
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-status-green/10 px-2.5 py-0.5 text-xs font-medium text-status-green">
                        Ativo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selecionado && (
        <DetailModal bombeiro={selecionado} onClose={() => setSelecionado(null)} />
      )}
    </PageContainer>
  );
}
