import { test } from 'node:test';
import assert from 'node:assert/strict';
import { juntarBlocos, montarBloco, normalizarDestinatarios } from './formato';
import type { Relatorio } from '../relatorio/types';

test('destinatários: sem DDI vira Brasil, aceita grupo e @lid, tira repetidos', () => {
  const r = normalizarDestinatarios('(21) 99999-8888\n5521999998888, 120363220363669191@g.us; 99999999999999@lid\n\n');
  assert.deepEqual(r, { ok: true, lista: ['5521999998888', '120363220363669191@g.us', '99999999999999@lid'] });
});

test('destinatários: recusa número curto e lista vazia', () => {
  assert.equal(normalizarDestinatarios('12345').ok, false);
  assert.equal(normalizarDestinatarios(' \n ').ok, false);
});

// Dados sintéticos: só existem para provar o texto, não representam venda real.
const soma = (qtd: number, valor: number) => ({ qtd, valor });
const relatorio = {
  ref: '2026-10-01',
  escopo: 'Geral',
  kpis: {
    total: soma(10, 1000), novas: soma(6, 600), reinseridas: soma(4, 400), front: soma(3, 300), ccnet: soma(7, 700),
    canceladosOntem: null, taxaMes: null, excecaoDia: soma(1, 100), vendasMes: soma(10, 1000), vendasGeral: soma(50, 5000),
    canceladosMes: soma(1, 50), canceladosMesPct: 0.1, canceladosGeral: soma(5, 500), pagosMes: soma(4, 400),
    pagosExcecaoMes: soma(1, 100), excecaoMes: soma(2, 200),
  },
  meta: { valor: 2000, modelo: true, pagos: soma(4, 400), pagosExcecao: soma(1, 100), pagosExcecaoPct: 0.25, falta: 1600, faltaPct: 0.8 },
  rankingPagos: { convenio: { nome: 'INSS', valor: 300, pct: 0.75 }, produto: null, equipe: null, gerente: null },
  lista: [{ nome: 'FULANO DE TAL', cpf: '12345678900' }],
  etapasFront: [{ chave: 'Digitada', qtd: 3, valor: 300 }],
} as unknown as Relatorio;

test('bloco: meta oficial substitui a de modelo e recalcula a falta', () => {
  const texto = montarBloco({ relatorio, empresa: 'AKRK', aba: 'Geral', metaOficial: { valor: 1000, faltando: [] }, horaParcial: '14:05' });
  assert.match(texto, /^\*Relatório diário — AKRK · Geral\*/);
  assert.match(texto, /01\/10\/2026 · parcial, atualizado às 14:05/);
  assert.match(texto, /\*Meta \(OFICIAL\)\*\n• Meta: R\$\s1\.000,00/);
  assert.match(texto, /Falta: R\$\s600,00 · 60,0% para a meta/);
  assert.match(texto, /Convênio: INSS \(75,0%\)/);
  assert.match(texto, /Cancelados ontem: —/);
});

test('bloco: na aba do gerente não mostra falta da empresa', () => {
  const texto = montarBloco({ relatorio, empresa: 'AKRK', aba: 'Luana', metaOficial: null, horaParcial: null });
  assert.match(texto, /dia fechado/);
  assert.match(texto, /\*Meta \(MODELO\)\*/);
  assert.match(texto, /Falta: só no Geral/);
});

test('juntar: separa empresas e põe o link no fim', () => {
  assert.equal(juntarBlocos(['A', 'B'], 'https://x/relatorio'), 'A\n\n————————\n\nB\n\nRelatório completo: https://x/relatorio');
  assert.equal(juntarBlocos(['A'], null), 'A');
});

test('bloco: leva todas as seções, mas da lista só a contagem (sem nome nem CPF)', () => {
  const texto = montarBloco({ relatorio, empresa: 'AKRK', aba: 'Geral', metaOficial: null, horaParcial: null });
  for (const secao of ['Vendas do dia', 'Clientes', 'Meta', 'Ranking dos pagos', 'Exceção vendida', 'Por canal', 'Churn', 'Lote do mês', 'Onde está a venda do dia']) {
    assert.ok(texto.includes(`*${secao}`), secao);
  }
  assert.match(texto, /Não reinseridos: 1 casos/);
  assert.match(texto, /– Digitada: 3 · R\$\s300,00/);
  assert.ok(!texto.includes('FULANO') && !texto.includes('12345678900'));
});
