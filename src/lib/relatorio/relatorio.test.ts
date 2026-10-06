import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirCasos, normalizarCpf, normalizarProduto, tipoDe } from './casos';
import { escopoGerente, escopoGerentePorValores, montarRelatorio } from './relatorio';
import type { Proposta } from './types';

// Dados sintéticos: só existem pra provar as regras, não representam venda real.
let seq = 1000;

test('escopo oficial reconhece apenas nome completo ou alias cadastrado', () => {
  const escopo = escopoGerentePorValores('Luana Cosme', ['Luana Cosme', 'LUANA C. MEDEIROS']);
  assert.equal(escopo.corresponde('Luana Cosme'), true);
  assert.equal(escopo.corresponde('Luana C. Medeiros'), true);
  assert.equal(escopo.corresponde('Luana Silva'), false);
});

function p(over: Partial<Proposta> = {}): Proposta {
  seq += 1;
  return {
    numero: String(seq),
    cpf: '111.111.111-11',
    nome: 'Cliente Teste',
    produto: 'Empréstimo',
    modalidade: 'Novo',
    data: '2026-09-10',
    valor: 100,
    gerente: 'LUANA COSME MEDEIROS',
    equipe: 'Equipe A',
    operador: 'Operador 1',
    convenio: 'Convenio X',
    status: 'Em análise',
    esteira: '',
    temCodigoFuncao: false,
    integrada: false,
    excecao: false,
    cancelada: false,
    frontReprovado: false,
    esteiraReprovada: false,
    motivoCancFront: '',
    motivoCancelamento: '',
    dataCancelamento: '',
    ...over,
  };
}

test('tipo: Adiantamento vence a modalidade; depois Compra; depois Novo', () => {
  assert.equal(tipoDe('Adiantamento', 'Compra'), 'Adiantamento');
  assert.equal(tipoDe('Crédito', 'Compra'), 'Compra');
  assert.equal(tipoDe('Benefício', 'Novo'), 'Novo');
  assert.equal(tipoDe('Benefício', 'Outra'), 'Novo');
  assert.equal(tipoDe('Crédito', 'COMPRA DE DIVIDA'), 'Compra');
  assert.equal(normalizarProduto('Cartão de Crédito'), 'Crédito');
  assert.equal(normalizarProduto('Adiantamento Salarial'), 'Adiantamento');
  assert.equal(normalizarProduto('Cartão Benefício'), 'Benefício');
  assert.equal(normalizarProduto('Cartão consignado'), 'Crédito');
  assert.equal(normalizarProduto('Produto recém-cadastrado'), 'Não informado');
});

test('CPF: só dígitos, completa zeros à esquerda, rejeita vazio e excesso', () => {
  assert.equal(normalizarCpf('123.456.789-01'), '12345678901');
  assert.equal(normalizarCpf('399432329'), '00399432329');
  assert.equal(normalizarCpf(''), null);
  assert.equal(normalizarCpf('123456789012'), null);
});

test('chave: número novo não cria caso; tipo ou produto diferente cria', () => {
  const { casos } = construirCasos(
    [
      p({ cpf: '111.111.111-11', modalidade: 'Novo' }),
      p({ cpf: '11111111111', modalidade: 'Novo', data: '2026-09-11' }),
      p({ cpf: '11111111111', modalidade: 'Compra' }),
      p({ cpf: '11111111111', modalidade: 'Novo', produto: 'Crédito' }),
    ],
    '2026-09-30',
  );
  assert.equal(casos.length, 3);
  const novoEmprestimo = casos.find((c) => c.tipo === 'Novo' && c.produto === 'Empréstimo')!;
  assert.equal(novoEmprestimo.propostas.length, 2);
});

test('lote e dono do lote vêm da primeira proposta, mesmo se a reinserção for de outro gerente', () => {
  const { casos } = construirCasos(
    [
      p({ data: '2026-09-12', gerente: 'DANIEL MANSUR', equipe: 'Equipe B', operador: 'Op 2' }),
      p({ data: '2026-09-05', gerente: 'LUANA COSME MEDEIROS', equipe: 'Equipe A', operador: 'Op 1' }),
    ],
    '2026-09-30',
  );
  assert.equal(casos[0].lote, '2026-09-05');
  assert.equal(casos[0].gerente, 'LUANA COSME MEDEIROS');
  assert.equal(casos[0].equipe, 'Equipe A');
  assert.equal(casos[0].operador, 'Op 1');
});

test('mesma data: hora manda; sem hora, número decrescente (regra da prova de 17/09)', () => {
  const comHora = construirCasos(
    [p({ numero: '1', hora: '10:00:00', equipe: 'Segunda' }), p({ numero: '2', hora: '09:00:00', equipe: 'Primeira' })],
    '2026-09-30',
  ).casos[0];
  assert.equal(comHora.equipe, 'Primeira');
  const semHora = construirCasos([p({ numero: '1999', equipe: 'Segunda' }), p({ numero: '2000', equipe: 'Primeira' })]).casos[0];
  assert.equal(semHora.equipe, 'Primeira');
});

test('fim do caso: integrou em qualquer proposta = Pagou, mesmo com a última cancelada', () => {
  const { casos } = construirCasos(
    [p({ data: '2026-09-01', integrada: true }), p({ data: '2026-09-02', cancelada: true })],
    '2026-09-30',
  );
  assert.equal(casos[0].desfecho, 'Pagou');
  assert.equal(casos[0].fim, null);
});

test('fim do caso: cancelado ganha de reprovado', () => {
  const { casos } = construirCasos([p({ cancelada: true, esteiraReprovada: true, temCodigoFuncao: true })], '2026-09-30');
  assert.equal(casos[0].fim, 'Cancelado');
  assert.equal(casos[0].etapaMorte, 'CCNET');
});

test('fim do caso: esteira reprovada, Front reprovado sem código, e Front reprovado com código = jornada', () => {
  const r = (over: Partial<Proposta>) => construirCasos([p(over)], '2026-09-30').casos[0];
  assert.equal(r({ esteiraReprovada: true, temCodigoFuncao: true }).fim, 'Reprovado CCNET');
  const front = r({ frontReprovado: true });
  assert.equal(front.fim, 'Reprovado Front');
  assert.equal(front.etapaMorte, 'Front');
  assert.equal(r({ frontReprovado: true, temCodigoFuncao: true }).desfecho, 'Jornada');
  assert.equal(r({}).desfecho, 'Jornada');
});

test('cancelado sem código morre no Front; com código morre no CCNET', () => {
  const r = (temCodigoFuncao: boolean) =>
    construirCasos([p({ cancelada: true, temCodigoFuncao })], '2026-09-30').casos[0].etapaMorte;
  assert.equal(r(false), 'Front');
  assert.equal(r(true), 'CCNET');
});

test('taxa de morte: em branco quando ninguém fechou, senão morreu/(pagou+morreu)', () => {
  const semFechar = montarRelatorio([p({ cpf: '1' })], '2026-09-10');
  assert.equal(semFechar.kpis.taxaMes, null);
  assert.equal(semFechar.canalMes.Novo.taxaMorte, null);

  const r = montarRelatorio(
    [
      p({ cpf: '1', integrada: true }),
      p({ cpf: '2', cancelada: true }),
      p({ cpf: '3', cancelada: true }),
      p({ cpf: '4' }),
    ],
    '2026-09-10',
  );
  assert.equal(r.canalMes.Novo.pagou, 1);
  assert.equal(r.canalMes.Novo.morreu, 2);
  assert.equal(r.canalMes.Novo.jornada, 1);
  assert.equal(r.canalMes.Novo.taxaMorte, 2 / 3);
  assert.equal(r.canalMes.Novo.mortesFront, 2);
});

test('pagos e ranking seguem a data de integração, não a criação da proposta', () => {
  const r = montarRelatorio(
    [
      p({ cpf: '1', data: '2026-09-12', dataIntegracao: '2026-10-01', integrada: true, valor: 300, convenio: 'Convênio Outubro' }),
      p({ cpf: '2', data: '2026-10-01', dataIntegracao: '2026-09-30', integrada: true, valor: 900, convenio: 'Convênio Setembro' }),
    ],
    '2026-10-02',
  );
  assert.deepEqual(r.kpis.pagosMes, { qtd: 1, valor: 300 });
  assert.deepEqual(r.kpis.integradoContratadoMes, { qtd: 1, valor: 300 });
  assert.equal(r.rankingPagos.convenio?.nome, 'Convênio Outubro');
  assert.equal(r.rankingPagos.convenio?.pct, 1);
});

test('valor liberado soma releases já consolidadas e informa cobertura parcial', () => {
  const r = montarRelatorio(
    [
      p({ cpf: '1', integrada: true, dataIntegracao: '2026-10-01', valor: 100, valorLiberado: 90 }),
      p({ cpf: '2', integrada: true, dataIntegracao: '2026-10-02', valor: 200 }),
      p({ cpf: '3', integrada: true, dataIntegracao: '2026-10-03', valor: 300, valorLiberado: 250 }),
    ],
    '2026-10-05',
  );
  assert.deepEqual(r.kpis.integradoContratadoMes, { qtd: 3, valor: 600 });
  assert.deepEqual(r.kpis.valorLiberadoMes, { qtd: 2, valor: 340, totalIntegradas: 3, completo: false });
});

test('valor liberado fica indisponível quando nenhuma integrada possui release', () => {
  const r = montarRelatorio([p({ integrada: true, dataIntegracao: '2026-10-01', valor: 100 })], '2026-10-05');
  assert.equal(r.kpis.valorLiberadoMes, null);
});

test('qualidade resume conciliação e hierarquia sem expor dados pessoais', () => {
  const r = montarRelatorio(
    [
      p({ cpf: '1', temCodigoFuncao: true, conciliadaFuncao: true, hierarquiaInformada: true }),
      p({ cpf: '2', conciliadaFuncao: false, hierarquiaInformada: false, data: '2026-09-11' }),
    ],
    '2026-09-12',
  );
  assert.deepEqual(r.qualidade, {
    totalPropostas: 2,
    integradasSemData: 0,
    comCodigoFuncao: 1,
    semCodigoFuncao: 1,
    conciliadasFuncao: 1,
    codigosNaoEncontrados: 0,
    semCorrespondenciaFuncao: 0,
    hierarquiaInformada: 1,
    hierarquiaNaoInformada: 1,
    periodoInicio: '2026-09-10',
    periodoFim: '2026-09-12',
    fonte: 'Front V2 × Função',
  });
  assert.ok(!JSON.stringify(r.qualidade).includes('11111111111'));
});

test('qualidade separa proposta sem código de código não localizado na Função', () => {
  const r = montarRelatorio([
    p({ cpf: '1', temCodigoFuncao: false, conciliadaFuncao: false }),
    p({ cpf: '2', temCodigoFuncao: true, conciliadaFuncao: false }),
    p({ cpf: '3', temCodigoFuncao: true, conciliadaFuncao: true }),
  ], '2026-09-12');
  assert.equal(r.qualidade.semCodigoFuncao, 1);
  assert.equal(r.qualidade.comCodigoFuncao, 2);
  assert.equal(r.qualidade.codigosNaoEncontrados, 1);
  assert.equal(r.qualidade.semCorrespondenciaFuncao, 1);
});

test('escopo por ID não aceita homônimo nem gerente sem vínculo oficial', () => {
  const r = montarRelatorio([
    p({ cpf: '1', gerente: 'Maria Silva', gerenteComercialId: 'g-1', valor: 100 }),
    p({ cpf: '2', gerente: 'Maria Silva', gerenteComercialId: 'g-2', valor: 200 }),
    p({ cpf: '3', gerente: 'Maria Silva', valor: 300 }),
  ], '2026-09-10', { nome: 'Maria Silva', corresponde: (_nome, id) => id === 'g-1' });
  assert.deepEqual(r.kpis.total, { qtd: 1, valor: 100 });
});

test('venda do dia: nova x reinserida, e Front x CCNET com etapas', () => {
  const r = montarRelatorio(
    [
      p({ cpf: '1', data: '2026-09-09', valor: 50, cancelada: true }),
      p({ cpf: '1', data: '2026-09-10', valor: 70, temCodigoFuncao: true, esteira: 'Averbação' }),
      p({ cpf: '2', data: '2026-09-10', valor: 30, status: 'Auditoria' }),
      p({ cpf: '3', data: '2026-09-09', valor: 999 }),
    ],
    '2026-09-10',
  );
  assert.deepEqual(r.kpis.total, { qtd: 2, valor: 100 });
  assert.deepEqual(r.kpis.novas, { qtd: 1, valor: 30 });
  assert.deepEqual(r.kpis.reinseridas, { qtd: 1, valor: 70 });
  assert.deepEqual(r.kpis.front, { qtd: 1, valor: 30 });
  assert.deepEqual(r.kpis.ccnet, { qtd: 1, valor: 70 });
  assert.deepEqual(r.etapasFront, [{ chave: 'Auditoria', qtd: 1, valor: 30 }]);
  assert.deepEqual(r.etapasCcnet, [{ chave: 'Averbação', qtd: 1, valor: 70 }]);
});

test('lista: só caso com uma proposta que morreu; motivo cai em cascata', () => {
  const r = montarRelatorio(
    [
      p({ cpf: '1', cancelada: true, motivoCancFront: 'Motivo Front', motivoCancelamento: 'Motivo Canc' }),
      p({ cpf: '2', cancelada: true, motivoCancelamento: 'Motivo Canc' }),
      p({ cpf: '3', cancelada: true, status: 'Cancelada' }),
      p({ cpf: '4', cancelada: true, data: '2026-09-01' }),
      p({ cpf: '4', cancelada: true, data: '2026-09-02' }),
      p({ cpf: '5', integrada: true }),
    ],
    '2026-09-10',
  );
  assert.deepEqual(
    r.lista.map((l) => l.motivo),
    ['Motivo Front', 'Motivo Canc', 'Cancelada'],
  );
  assert.ok(r.lista.every((l) => l.cpf !== '00000000004'));
});

test('cancelados de ontem: indisponível sem data de cancelamento na fonte', () => {
  const sem = montarRelatorio([p({ cancelada: true })], '2026-09-10');
  assert.equal(sem.kpis.canceladosOntem, null);
  assert.equal(sem.canceladasOntem, null);
  assert.ok(sem.alertas.some((a) => a.includes('data de cancelamento')));

  const com = montarRelatorio(
    [
      p({ cpf: '1', cancelada: true, dataCancelamento: '2026-09-09', valor: 40 }),
      p({ cpf: '2', cancelada: true, dataCancelamento: '2026-09-08', valor: 60 }),
    ],
    '2026-09-10',
  );
  assert.deepEqual(com.kpis.canceladosOntem, { qtd: 1, valor: 40 });
});

test('gerente: venda do dia pelo gerente da proposta, caso pelo gerente do lote', () => {
  const props = [
    p({ cpf: '1', data: '2026-09-05', gerente: 'LUANA COSME MEDEIROS', equipe: 'A' }),
    p({ cpf: '1', data: '2026-09-10', gerente: 'DANIEL MANSUR', equipe: 'B', valor: 80 }),
  ];
  const luana = montarRelatorio(props, '2026-09-10', escopoGerente('Luana Cosme Medeiros'));
  const daniel = montarRelatorio(props, '2026-09-10', escopoGerente('Daniel Mansur'));
  assert.equal(luana.kpis.total.qtd, 0);
  assert.equal(luana.resumoMes.inseriu, 1);
  assert.equal(daniel.kpis.total.qtd, 1);
  assert.equal(daniel.kpis.reinseridas.qtd, 1);
  assert.equal(daniel.resumoMes.inseriu, 0);
  assert.deepEqual(daniel.trocasEquipe.map((t) => [t.de, t.para]), [['A', 'B']]);
});

test('escopo casa nome sem acento e em qualquer caixa', () => {
  assert.ok(escopoGerente('Marcos Mota').corresponde('marcos mota'));
  assert.ok(escopoGerente('José Lima').corresponde('JOSE LIMA'));
  assert.ok(!escopoGerente('Marcos Mota').corresponde('marcos mota de souza'));
  assert.ok(!escopoGerente('Luana Cosme').corresponde('DANIEL MANSUR'));
});

test('descartadas viram alerta em vez de sumir; dia vazio também avisa', () => {
  const r = montarRelatorio([p({ cpf: '' }), p({ cpf: '123456789012' })], '2026-09-10');
  assert.ok(r.alertas.some((a) => a.includes('2 proposta(s) descartada(s)')));
  assert.ok(r.alertas.some((a) => a.includes('Nenhuma proposta em 2026-09-10')));
});
