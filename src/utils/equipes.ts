const DATA_REFERENCIA = new Date('2026-07-21T12:00:00');
const UM_DIA_MS = 24 * 60 * 60 * 1000;

export function equipesNoDia(data: Date): ['Alfa', 'Bravo'] | ['Charlie', 'Delta'] {
  const diff = Math.floor((data.getTime() - DATA_REFERENCIA.getTime()) / UM_DIA_MS);
  return diff % 2 === 0 ? ['Alfa', 'Bravo'] : ['Charlie', 'Delta'];
}

export function equipeEstaNoPlantao(equipe: string, data: Date): boolean {
  const equipes = equipesNoDia(data);
  return equipes.some(eq => eq === equipe);
}
