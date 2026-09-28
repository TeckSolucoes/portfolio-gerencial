import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consultaMonitoramento, termosMonitorados } from './juridicoConsulta';

const empresa = { cnpj: '19131243000197', razaoSocial: 'Empresa Exemplo S.A.', nomeFantasia: 'Exemplo' };

test('monitoramento usa razão social, fantasia e CNPJ com e sem máscara', () => {
  assert.deepEqual(termosMonitorados(empresa), ['Empresa Exemplo S.A.', 'Exemplo', '19.131.243/0001-97', '19131243000197']);
});

test('consulta combina os identificadores com o assunto da fonte', () => {
  const consulta = consultaMonitoramento(empresa, 'processos');
  assert.match(consulta, /"Empresa Exemplo S\.A\." OR "Exemplo"/);
  assert.match(consulta, /"19\.131\.243\/0001-97" OR "19131243000197"/);
  assert.match(consulta, /processo OR tribunal/);
});
