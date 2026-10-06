import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparItensDaFonte, chaveHierarquia, intervaloSobrepoe, lerCadastro, lerDataCivil, lerVigencia, normalizarIdentificador, resolverHierarquiaHistorica, validarMesmoGrupo, vinculoVigente } from './dominio';

const form = (campos: Record<string, string>) => {
  const dados = new FormData();
  for (const [campo, valor] of Object.entries(campos)) dados.set(campo, valor);
  return dados;
};

test('normalização remove acentos, caixa e espaços sem apagar palavras', () => {
  assert.equal(normalizarIdentificador('  João   da Sílva '), 'JOAO DA SILVA');
  assert.equal(normalizarIdentificador('AKRK - Croácia'), 'AKRK - CROACIA');
  assert.equal(chaveHierarquia('equipe', 'front_v2', 'AKRK - Croácia'), 'equipe|front_v2|AKRK - CROACIA');
});

test('itens da fonte são agregados sem transformar ausência em pendência', () => {
  const agregados = agruparItensDaFonte([
    { tipo: 'equipe', origem: 'front_v2', valor: ' AKRK - Croácia ' },
    { tipo: 'equipe', origem: 'front_v2', valor: 'AKRK - CROACIA' },
    { tipo: 'vendedor', origem: 'front_v2', valor: '(não informado)' },
    { tipo: 'gerente', origem: 'front_v2', valor: '' },
  ]);
  assert.equal(agregados.size, 1);
  assert.equal(agregados.get('equipe|front_v2|AKRK - CROACIA')?.ocorrencias, 2);
});

test('cadastro aceita apenas empresas conhecidas e exige nome', () => {
  const valido = lerCadastro(form({ empresa: 'akrk', nome: ' Equipe Centro ', codigoExterno: ' 123 ' }));
  assert.deepEqual(valido, { ok: true, dados: { empresa: 'AKRK', nome: 'Equipe Centro', nomeNormalizado: 'EQUIPE CENTRO', codigoExterno: '123' } });
  assert.equal(lerCadastro(form({ empresa: 'OUTRA', nome: 'Equipe' })).ok, false);
  assert.equal(lerCadastro(form({ empresa: 'DIG', nome: ' ' })).ok, false);
});

test('vigência usa datas civis, aceita fim vazio e rejeita intervalo invertido', () => {
  const aberto = lerVigencia(form({ inicio: '2026-10-01', fim: '' }));
  assert.equal(aberto.ok, true);
  if (aberto.ok) {
    assert.equal(aberto.dados.inicio.toISOString(), '2026-10-01T03:00:00.000Z');
    assert.equal(aberto.dados.fim, null);
  }
  assert.equal(lerVigencia(form({ inicio: '01/10/2026' })).ok, false);
  assert.equal(lerVigencia(form({ inicio: '2026-10-02', fim: '2026-10-01' })).ok, false);
  assert.equal(lerDataCivil('2026-10-05', true)?.toISOString(), '2026-10-06T02:59:59.999Z');
});

test('vínculo só está vigente depois do início e antes do fim', () => {
  const referencia = new Date('2026-10-05T12:00:00.000Z');
  assert.equal(vinculoVigente({ inicio: '2026-10-06', fim: null }, referencia), false);
  assert.equal(vinculoVigente({ inicio: '2026-10-01', fim: null }, referencia), true);
  assert.equal(vinculoVigente({ inicio: '2026-10-01', fim: '2026-10-04T23:59:59.000Z' }, referencia), false);
  assert.equal(vinculoVigente({ inicio: '2026-10-01T03:00:00.000Z', fim: '2026-10-06T02:59:59.999Z' }, referencia), true);
});

test('intervalos inclusivos detectam sobreposição, inclusive quando um deles é aberto', () => {
  const d = (valor: string) => new Date(`${valor}T00:00:00.000Z`);
  assert.equal(intervaloSobrepoe(d('2026-01-01'), d('2026-01-31'), d('2026-02-01'), null), false);
  assert.equal(intervaloSobrepoe(d('2026-01-01'), d('2026-01-31'), d('2026-01-31'), d('2026-03-01')), true);
  assert.equal(intervaloSobrepoe(d('2026-01-01'), null, d('2027-01-01'), null), true);
});

test('vínculo entre empresas diferentes é recusado', () => {
  assert.doesNotThrow(() => validarMesmoGrupo('AKRK', 'AKRK'));
  assert.throws(() => validarMesmoGrupo('AKRK', 'DIG'), /mesma empresa/i);
});

test('hierarquia histórica respeita a vigência e consolida aliases no ID oficial', () => {
  const entidade = (id: string, nome: string) => ({ id, nome, nomeNormalizado: normalizarIdentificador(nome) });
  const catalogo = {
    gerentes: [entidade('g-antigo', 'Gerente Antigo'), entidade('g-novo', 'Gerente Novo')],
    equipes: [entidade('e-1', 'Equipe Centro')],
    vendedores: [entidade('v-1', 'Maria Vendedora')],
    aliases: [{ tipo: 'vendedor', origem: 'front_v2', valorNormalizado: 'MARIA V.', gerenteId: null, equipeId: null, vendedorId: 'v-1' }],
    vinculosVendedorEquipe: [{ vendedorId: 'v-1', equipeId: 'e-1', inicio: new Date('2026-01-01T03:00:00Z'), fim: null }],
    vinculosEquipeGerente: [
      { equipeId: 'e-1', gerenteId: 'g-antigo', inicio: new Date('2026-01-01T03:00:00Z'), fim: new Date('2026-09-30T02:59:59.999Z') },
      { equipeId: 'e-1', gerenteId: 'g-novo', inicio: new Date('2026-09-30T03:00:00Z'), fim: null },
    ],
  };
  const entradas = [
    { chave: 'antes', data: '2026-09-29', origem: 'front_v2' as const, gerente: 'Gerente Antigo', equipe: 'Equipe Centro', vendedor: 'Maria V.' },
    { chave: 'depois', data: '2026-10-01', origem: 'front_v2' as const, gerente: 'Gerente Novo', equipe: 'Equipe Centro', vendedor: 'Maria V.' },
  ];
  const resolvidas = resolverHierarquiaHistorica(entradas, catalogo);
  assert.equal(resolvidas.get('antes')?.gerenteId, 'g-antigo');
  assert.equal(resolvidas.get('depois')?.gerenteId, 'g-novo');
  assert.equal(resolvidas.get('depois')?.vendedorNome, 'Maria Vendedora');
  assert.equal(resolvidas.get('depois')?.completa, true);
});

test('hierarquia histórica sinaliza divergência entre a fonte e o vínculo vigente', () => {
  const entidade = (id: string, nome: string) => ({ id, nome, nomeNormalizado: normalizarIdentificador(nome) });
  const resolvida = resolverHierarquiaHistorica([{
    chave: 'p-1', data: '2026-10-01', origem: 'front_v2', gerente: 'Gerente B', equipe: 'Equipe B', vendedor: 'Vendedor',
  }], {
    gerentes: [entidade('g-a', 'Gerente A'), entidade('g-b', 'Gerente B')],
    equipes: [entidade('e-a', 'Equipe A'), entidade('e-b', 'Equipe B')],
    vendedores: [entidade('v', 'Vendedor')],
    aliases: [],
    vinculosVendedorEquipe: [{ vendedorId: 'v', equipeId: 'e-a', inicio: new Date('2026-01-01T03:00:00Z'), fim: null }],
    vinculosEquipeGerente: [{ equipeId: 'e-a', gerenteId: 'g-a', inicio: new Date('2026-01-01T03:00:00Z'), fim: null }],
  }).get('p-1')!;
  assert.equal(resolvida.gerenteId, 'g-a');
  assert.equal(resolvida.equipeId, 'e-a');
  assert.equal(resolvida.divergente, true);
  assert.equal(resolvida.completa, false);
});
