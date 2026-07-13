import type { Bombeiro, Cargo } from '../types/bombeiro';

export type NivelRestricao = 'ok' | 'aviso' | 'bloqueado';

export interface ResultadoValidacaoCurso {
  nivel: NivelRestricao;
  titulo: string;
  mensagem: string;
}

const CARGO_LABELS: Record<string, string> = {
  'BA-CE': 'Chefe de Equipe',
  'BA-LR': 'Líder de Resgate',
  'BA-MC': 'Motorista/Operador de CCI',
  'BA-RE': 'Resgatista',
  'BA-2': 'Bombeiro de Aeródromo',
  'GS': 'Gerente de Seção',
  'OC': 'Operador de Comunicações',
};

export function labelCargo(cargo: string): string {
  return CARGO_LABELS[cargo] || cargo;
}

export function temCategoriaD(cnhCategoria: string): boolean {
  return cnhCategoria.toUpperCase().includes('D');
}

export function validarCursoParaFuncao(
  bombeiro: Bombeiro,
  funcao: Cargo,
): ResultadoValidacaoCurso | null {
  if (funcao === 'BA-CE' || funcao === 'BA-LR') {
    if (bombeiro.cursoChefeEquipe) {
      return null;
    }
    return {
      nivel: 'bloqueado',
      titulo: `Curso de Chefe de Equipe obrigatório`,
      mensagem: `${bombeiro.nomeGuerra} não possui o Curso de Chefe de Equipe. É obrigatório para exercer a função de ${labelCargo(funcao)}.`,
    };
  }

  if (funcao === 'BA-MC') {
    if (bombeiro.cursoMotoristaCCI) {
      return null;
    }
    if (temCategoriaD(bombeiro.cnhCategoria)) {
      return {
        nivel: 'aviso',
        titulo: 'Somente pode dirigir o CRS',
        mensagem: `${bombeiro.nomeGuerra} não possui o Curso de Motorista/Condutor de CCI, mas possui Categoria D. Poderá dirigir apenas o CRS, não as viaturas CCI.`,
      };
    }
    return {
      nivel: 'bloqueado',
      titulo: 'Curso de Motorista obrigatório',
      mensagem: `${bombeiro.nomeGuerra} não possui o Curso de Motorista/Condutor de CCI nem habilitação Categoria D. Não pode exercer a função de Motorista.`,
    };
  }

  return null;
}
