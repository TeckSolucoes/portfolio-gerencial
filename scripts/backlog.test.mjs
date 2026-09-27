import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarStatus, proximo, renderBacklog, validar } from './backlog.mjs';

const item = (over) => ({
  id: 'A-1',
  ordem: 1,
  titulo: 'Item',
  tema: 'T',
  impacto: 'alto',
  esforco: 'P',
  status: 'pendente',
  dependeDe: [],
  donoSugerido: 'IA',
  criterioPronto: 'pronto',
  riscos: [],
  notas: '',
  ...over,
});
const base = (itens) => ({ projeto: 'X', atualizadoEm: '2026-01-01', itens, riscos: [{ id: 'RSK-1', titulo: 'r', severidade: 'alta', mitigacao: 'm' }] });

test('próximo respeita a ordem e só libera item com dependências concluídas', () => {
  const d = base([item({ id: 'A-1', ordem: 1, dependeDe: ['A-2'] }), item({ id: 'A-2', ordem: 2 }), item({ id: 'A-3', ordem: 3 })]);
  assert.equal(proximo(d).id, 'A-2');
  aplicarStatus(d, 'A-2', 'concluido', 'feito e testado');
  assert.equal(proximo(d).id, 'A-1');
});

test('concluir exige nota, grava data e histórico; reabrir limpa a data', () => {
  const d = base([item({})]);
  assert.throws(() => aplicarStatus(d, 'A-1', 'concluido', ''), /--nota/);
  const i = aplicarStatus(d, 'A-1', 'concluido', 'ok', new Date('2026-09-30T12:00:00Z'));
  assert.equal(i.status, 'concluido');
  assert.equal(i.concluidoEm, '2026-09-30');
  assert.equal(i.historico.length, 1);
  aplicarStatus(d, 'A-1', 'pendente', 'reaberto');
  assert.equal(i.concluidoEm, undefined);
  assert.equal(i.historico.length, 2);
});

test('bloquear exige motivo e item inexistente dá erro', () => {
  const d = base([item({})]);
  assert.throws(() => aplicarStatus(d, 'A-1', 'bloqueado', ''), /--motivo/);
  assert.throws(() => aplicarStatus(d, 'Z-9', 'concluido', 'x'), /não encontrado/);
});

test('validar pega id e ordem repetidos, dependência ou risco inexistente e ciclo', () => {
  assert.ok(validar(base([item({}), item({})])).some((e) => e.includes('id repetido')));
  assert.ok(validar(base([item({}), item({ id: 'A-2' })])).some((e) => e.includes('ordem repetida')));
  assert.ok(validar(base([item({ dependeDe: ['NAO'] })])).some((e) => e.includes('não existe')));
  assert.ok(validar(base([item({ riscos: ['RSK-9'] })])).some((e) => e.includes('risco RSK-9')));
  const ciclo = base([item({ id: 'A-1', ordem: 1, dependeDe: ['A-2'] }), item({ id: 'A-2', ordem: 2, dependeDe: ['A-1'] })]);
  assert.ok(validar(ciclo).some((e) => e.includes('ciclo')));
  assert.deepEqual(validar(base([item({})])), []);
});

test('render mostra marcador por status, a instrução de concluir e os riscos', () => {
  const d = base([item({ id: 'A-1', ordem: 1, status: 'concluido', concluidoEm: '2026-09-30', historico: [{ data: '2026-09-30', acao: 'concluido', nota: 'ok' }] }), item({ id: 'A-2', ordem: 2 })]);
  const md = renderBacklog(d);
  assert.ok(md.includes('- [x] **A-1**'));
  assert.ok(md.includes('- [ ] **A-2**'));
  assert.ok(md.includes('node scripts/backlog.mjs concluir'));
  assert.ok(md.includes('| RSK-1 |'));
});
