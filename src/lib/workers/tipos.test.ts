import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estaVencido, estaVencidoMensal, estaVencidoNaJanela, proximaExecucaoNaJanela, lerHorarios, normalizarHorarios, proximaExecucao, proximaExecucaoMensal, proximoHorario, proximoHorarioMensal, ultimoHorario, ultimoHorarioMensal } from './tipos';

// Horários em Brasília (UTC-3): 08:00 BRT = 11:00Z, 13:00 BRT = 16:00Z, 19:00 BRT = 22:00Z.
const t = (s: string) => new Date(s);
const PADRAO = ['08:00', '13:00', '19:00'];

test('nunca rodou: vence já', () => {
  const agora = t('2026-09-26T12:00:00Z');
  assert.equal(estaVencido(null, PADRAO, agora), true);
  assert.equal(proximaExecucao(null, PADRAO, agora).getTime(), agora.getTime());
});

test('manhã, tarde e noite no horário de Brasília (servidor em UTC)', () => {
  assert.equal(proximoHorario(PADRAO, t('2026-09-26T10:59:00Z')).toISOString(), '2026-09-26T11:00:00.000Z');
  assert.equal(proximoHorario(PADRAO, t('2026-09-26T11:00:00Z')).toISOString(), '2026-09-26T16:00:00.000Z');
  assert.equal(proximoHorario(PADRAO, t('2026-09-26T16:30:00Z')).toISOString(), '2026-09-26T22:00:00.000Z');
});

test('depois das 19:00 o próximo é 08:00 do dia seguinte, inclusive após a meia-noite UTC', () => {
  // 21:30 BRT de 26/09 = 00:30Z de 27/09: o dia em Brasília ainda é 26.
  assert.equal(proximoHorario(PADRAO, t('2026-09-27T00:30:00Z')).toISOString(), '2026-09-27T11:00:00.000Z');
  assert.equal(ultimoHorario(PADRAO, t('2026-09-27T00:30:00Z')).toISOString(), '2026-09-26T22:00:00.000Z');
});

test('antes das 08:00 o último horário foi 19:00 de ontem', () => {
  assert.equal(ultimoHorario(PADRAO, t('2026-09-26T09:00:00Z')).toISOString(), '2026-09-25T22:00:00.000Z');
});

test('vence quando o horário passa depois da última execução, uma vez só', () => {
  const ontemNoite = t('2026-09-25T22:00:05Z');
  assert.equal(estaVencido(ontemNoite, PADRAO, t('2026-09-26T10:59:59Z')), false);
  assert.equal(estaVencido(ontemNoite, PADRAO, t('2026-09-26T11:00:00Z')), true);
  // Rodou às 08:00:20: não repete até 13:00.
  assert.equal(estaVencido(t('2026-09-26T11:00:20Z'), PADRAO, t('2026-09-26T15:59:00Z')), false);
  assert.equal(proximaExecucao(t('2026-09-26T11:00:20Z'), PADRAO, t('2026-09-26T12:00:00Z')).toISOString(), '2026-09-26T16:00:00.000Z');
});

test('servidor fora do ar no horário: roda assim que voltar', () => {
  // Última às 19:00 de ontem; servidor voltou às 10:00 BRT (perdeu as 08:00).
  assert.equal(estaVencido(t('2026-09-25T22:00:05Z'), PADRAO, t('2026-09-26T13:00:00Z')), true);
});

test('execução manual entre horários não impede o próximo horário', () => {
  const manual = t('2026-09-26T14:00:00Z'); // 11:00 BRT
  assert.equal(estaVencido(manual, PADRAO, t('2026-09-26T15:59:59Z')), false);
  assert.equal(estaVencido(manual, PADRAO, t('2026-09-26T16:00:00Z')), true);
});

test('um horário só por dia', () => {
  assert.equal(proximoHorario(['06:30'], t('2026-09-26T10:00:00Z')).toISOString(), '2026-09-27T09:30:00.000Z');
  assert.equal(ultimoHorario(['06:30'], t('2026-09-26T10:00:00Z')).toISOString(), '2026-09-26T09:30:00.000Z');
});

test('agenda mensal roda uma vez no dia configurado e aponta o mês seguinte', () => {
  const antes = t('2026-09-20T10:59:00Z'); // 07:59 em Brasília
  const depois = t('2026-09-20T11:01:00Z');
  assert.equal(proximoHorarioMensal(20, '08:00', antes).toISOString(), '2026-09-20T11:00:00.000Z');
  assert.equal(ultimoHorarioMensal(20, '08:00', depois).toISOString(), '2026-09-20T11:00:00.000Z');
  assert.equal(estaVencidoMensal(t('2026-08-20T11:00:05Z'), 20, '08:00', depois), true);
  assert.equal(estaVencidoMensal(t('2026-09-20T11:00:05Z'), 20, '08:00', depois), false);
  assert.equal(proximaExecucaoMensal(t('2026-09-20T11:00:05Z'), 20, '08:00', depois).toISOString(), '2026-10-20T11:00:00.000Z');
});

test('normalizar: ordena, tira repetidos e valida', () => {
  assert.deepEqual(normalizarHorarios(['19:00', '08:00', '13:00', '08:00']), ['08:00', '13:00', '19:00']);
  assert.throws(() => normalizarHorarios([]), /pelo menos um/);
  assert.throws(() => normalizarHorarios(['24:00']), /inválido/);
  assert.throws(() => normalizarHorarios(['8:00']), /inválido/);
  assert.throws(() => normalizarHorarios(Array.from({ length: 25 }, (_, i) => `${String(i % 24).padStart(2, '0')}:${i < 24 ? '00' : '30'}`)), /No máximo/);
});

test('ler do banco: vazio ou corrompido cai no padrão (null)', () => {
  assert.deepEqual(lerHorarios('13:00,08:00'), ['08:00', '13:00']);
  assert.equal(lerHorarios(null), null);
  assert.equal(lerHorarios(''), null);
  assert.equal(lerHorarios('lixo'), null);
});

const JANELA = 15 * 60_000;

test('janela: ligar longe do horário não dispara e aponta o próximo', () => {
  const agora = t('2026-09-27T02:00:00Z'); // 23:00 BRT, último horário 19:00
  assert.equal(estaVencidoNaJanela(null, PADRAO, JANELA, agora), false);
  assert.equal(proximaExecucaoNaJanela(null, PADRAO, JANELA, agora).toISOString(), '2026-09-27T11:00:00.000Z');
});

test('janela: dentro de 15 min do horário roda uma vez; depois disso o atraso é descartado', () => {
  assert.equal(estaVencidoNaJanela(null, PADRAO, JANELA, t('2026-09-26T16:10:00Z')), true);
  assert.equal(estaVencidoNaJanela(t('2026-09-26T16:00:30Z'), PADRAO, JANELA, t('2026-09-26T16:10:00Z')), false);
  assert.equal(estaVencidoNaJanela(t('2026-09-26T11:00:30Z'), PADRAO, JANELA, t('2026-09-26T16:47:00Z')), false);
});
