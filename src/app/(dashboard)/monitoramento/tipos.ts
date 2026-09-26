import type { TipoAlerta } from '@/lib/monitoramento/detectar';

export const TIPOS: Record<TipoAlerta, { nome: string; curto: string; explica: string; classe: string }> = {
  INÉDITO: {
    nome: 'Convênio novo para a equipe',
    curto: 'Convênio novo',
    explica: 'A equipe nunca tinha inserido proposta nesse convênio nos 90 dias anteriores.',
    classe: 't-novo',
  },
  RARO: {
    nome: 'Convênio incomum',
    curto: 'Incomum',
    explica: 'A equipe já usou o convênio, mas ele representa menos de 2% de tudo o que ela insere.',
    classe: 't-raro',
  },
  PICO: {
    nome: 'Volume acima do normal',
    curto: 'Volume alto',
    explica: 'No dia, a equipe inseriu mais de 3 vezes a média diária dela nesse convênio (mínimo de 5 propostas).',
    classe: 't-pico',
  },
};

export const ORDEM: TipoAlerta[] = ['INÉDITO', 'RARO', 'PICO'];
