#!/usr/bin/env node
// Controle do backlog do Portal Teck. Fonte da verdade: docs/backlog/backlog.json.
// Gera docs/BACKLOG.md (leitura) e docs/PACOTE-PARA-IAS.md (tudo em um arquivo para colar em outra IA).
// Uso: node scripts/backlog.mjs <comando>   (sem dependências)
//   listar [--status pendente|em-andamento|bloqueado|concluido]
//   proximo                    próximo item liberado (pendente e com todas as dependências concluídas)
//   ver <ID>
//   iniciar <ID>
//   concluir <ID> --nota "o que foi feito e como validou"     <- OBRIGATÓRIO ao terminar um item
//   bloquear <ID> --motivo "por que travou"
//   reabrir <ID> [--nota "motivo"]
//   render                     regenera os .md
//   validar                    confere ids, dependências, ordem e riscos
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_BACKLOG = path.join(RAIZ, 'docs', 'backlog', 'backlog.json');
const MD_BACKLOG = path.join(RAIZ, 'docs', 'BACKLOG.md');
const MD_PACOTE = path.join(RAIZ, 'docs', 'PACOTE-PARA-IAS.md');
const MD_CONTEXTO = path.join(RAIZ, 'docs', 'CONTEXTO.md');
const MD_COMO_USAR = path.join(RAIZ, 'docs', 'backlog', 'COMO-USAR.md');

export const STATUS = ['pendente', 'em-andamento', 'bloqueado', 'concluido'];

export const hoje = (agora = new Date()) => agora.toISOString().slice(0, 10);

export function validar(dados) {
  const erros = [];
  const ids = new Set();
  const ordens = new Set();
  for (const i of dados.itens) {
    if (ids.has(i.id)) erros.push(`id repetido: ${i.id}`);
    ids.add(i.id);
    if (ordens.has(i.ordem)) erros.push(`ordem repetida: ${i.ordem} (${i.id})`);
    ordens.add(i.ordem);
    if (!STATUS.includes(i.status)) erros.push(`${i.id}: status inválido "${i.status}"`);
    if (!i.criterioPronto) erros.push(`${i.id}: sem criterioPronto`);
  }
  const riscos = new Set(dados.riscos.map((r) => r.id));
  for (const i of dados.itens) {
    for (const d of i.dependeDe) if (!ids.has(d)) erros.push(`${i.id}: depende de ${d}, que não existe`);
    for (const r of i.riscos) if (!riscos.has(r)) erros.push(`${i.id}: risco ${r} não existe`);
  }
  // ciclos de dependência
  const porId = new Map(dados.itens.map((i) => [i.id, i]));
  const visitando = new Set();
  const feitos = new Set();
  const visitar = (id, trilha) => {
    if (feitos.has(id)) return;
    if (visitando.has(id)) {
      erros.push(`ciclo de dependência: ${[...trilha, id].join(' -> ')}`);
      return;
    }
    visitando.add(id);
    for (const d of porId.get(id)?.dependeDe ?? []) visitar(d, [...trilha, id]);
    visitando.delete(id);
    feitos.add(id);
  };
  for (const i of dados.itens) visitar(i.id, []);
  return erros;
}

const concluidos = (dados) => new Set(dados.itens.filter((i) => i.status === 'concluido').map((i) => i.id));

// Próximo = menor "ordem" entre os pendentes cujas dependências já estão concluídas.
export function proximo(dados) {
  const ok = concluidos(dados);
  return (
    dados.itens
      .filter((i) => i.status === 'pendente' && i.dependeDe.every((d) => ok.has(d)))
      .sort((a, b) => a.ordem - b.ordem)[0] ?? null
  );
}

export function aplicarStatus(dados, id, status, nota, agora = new Date()) {
  const item = dados.itens.find((i) => i.id === id);
  if (!item) throw new Error(`Item não encontrado: ${id}`);
  if (status === 'concluido' && !nota?.trim()) throw new Error('Para concluir, informe --nota "o que foi feito e como validou".');
  if (status === 'bloqueado' && !nota?.trim()) throw new Error('Para bloquear, informe --motivo "por que travou".');
  item.status = status;
  item.historico = [...(item.historico ?? []), { data: hoje(agora), acao: status, nota: nota?.trim() ?? '' }];
  if (status === 'concluido') item.concluidoEm = hoje(agora);
  else delete item.concluidoEm;
  dados.atualizadoEm = hoje(agora);
  return item;
}

const MARCA = { pendente: '[ ]', 'em-andamento': '[~]', bloqueado: '[!]', concluido: '[x]' };

function linhaItem(i, dados) {
  const ok = concluidos(dados);
  const faltam = i.dependeDe.filter((d) => !ok.has(d));
  const partes = [`impacto ${i.impacto}`, `esforço ${i.esforco}`, `dono: ${i.donoSugerido}`];
  if (i.dependeDe.length) partes.push(`depende de: ${i.dependeDe.map((d) => (ok.has(d) ? `~~${d}~~` : d)).join(', ')}`);
  const linhas = [`- ${MARCA[i.status]} **${i.id}** ${i.titulo}`, `  - ${partes.join(' · ')}${faltam.length && i.status === 'pendente' ? ' · **aguarda dependências**' : ''}`];
  linhas.push(`  - Pronto quando: ${i.criterioPronto}`);
  if (i.riscos.length) linhas.push(`  - Riscos: ${i.riscos.join(', ')}`);
  if (i.notas) linhas.push(`  - Notas: ${i.notas}`);
  if (i.status === 'concluido') linhas.push(`  - Concluído em ${i.concluidoEm}: ${(i.historico ?? []).filter((h) => h.acao === 'concluido').at(-1)?.nota ?? ''}`);
  if (i.status === 'bloqueado') linhas.push(`  - Bloqueado: ${(i.historico ?? []).filter((h) => h.acao === 'bloqueado').at(-1)?.nota ?? 'depende de outros itens'}`);
  return linhas.join('\n');
}

export function renderBacklog(dados) {
  const itens = [...dados.itens].sort((a, b) => a.ordem - b.ordem);
  const cont = Object.fromEntries(STATUS.map((s) => [s, itens.filter((i) => i.status === s).length]));
  const prox = proximo(dados);
  const abertos = itens.filter((i) => i.status !== 'concluido');
  const feitos = itens.filter((i) => i.status === 'concluido');
  return [
    `# Backlog — ${dados.projeto}`,
    '',
    `Atualizado em ${dados.atualizadoEm}. **Gerado por \`node scripts/backlog.mjs render\` a partir de \`docs/backlog/backlog.json\`: não edite este arquivo à mão.**`,
    '',
    '**Ao terminar um item, marque como concluído** (obrigatório, no mesmo PR do trabalho):',
    '',
    '```bash',
    'node scripts/backlog.mjs concluir <ID> --nota "o que foi feito e como validou"',
    '```',
    '',
    'Orientações completas: `docs/backlog/COMO-USAR.md`. Contexto do projeto: `docs/CONTEXTO.md`.',
    '',
    `## Resumo`,
    '',
    `- Pendentes: ${cont.pendente} · Em andamento: ${cont['em-andamento']} · Bloqueados: ${cont.bloqueado} · Concluídos: ${cont.concluido}`,
    `- Próximo item liberado: ${prox ? `**${prox.id}** ${prox.titulo}` : 'nenhum (todos dependem de algo pendente)'}`,
    '',
    '## Itens em aberto (do mais importante para o menos importante)',
    '',
    abertos.map((i) => linhaItem(i, dados)).join('\n\n') || '_Nada em aberto._',
    '',
    '## Concluídos',
    '',
    feitos.map((i) => linhaItem(i, dados)).join('\n\n') || '_Nenhum ainda._',
    '',
    '## Riscos',
    '',
    '| ID | Risco | Gravidade | Mitigação |',
    '|---|---|---|---|',
    ...dados.riscos.map((r) => `| ${r.id} | ${r.titulo} | ${r.severidade} | ${r.mitigacao} |`),
    '',
  ].join('\n');
}

export function renderPacote({ contexto, comoUsar, backlog }) {
  return [
    '# Pacote para IAs — Portal Teck',
    '',
    'Arquivo único para colar em outra IA: contexto, regras de trabalho e backlog. Fonte: pasta `docs/` do repositório `TeckSolucoes/portfolio-gerencial`.',
    '',
    '---',
    '',
    contexto.trim(),
    '',
    '---',
    '',
    comoUsar.trim(),
    '',
    '---',
    '',
    backlog.trim(),
    '',
  ].join('\n');
}

const ler = (arquivo) => readFileSync(arquivo, 'utf8');
const carregar = () => JSON.parse(ler(JSON_BACKLOG));
const salvar = (dados) => writeFileSync(JSON_BACKLOG, `${JSON.stringify(dados, null, 2)}\n`);

function gerarArquivos(dados) {
  const backlog = renderBacklog(dados);
  writeFileSync(MD_BACKLOG, backlog);
  writeFileSync(MD_PACOTE, renderPacote({ contexto: ler(MD_CONTEXTO), comoUsar: ler(MD_COMO_USAR), backlog }));
}

function opcao(args, nome) {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function principal(args) {
  const [comando, id] = args;
  const dados = carregar();
  const erros = validar(dados);
  if (erros.length && comando !== 'validar') {
    console.error(`Backlog inválido:\n- ${erros.join('\n- ')}`);
    process.exit(1);
  }
  switch (comando) {
    case 'listar': {
      const filtro = opcao(args, 'status');
      for (const i of [...dados.itens].sort((a, b) => a.ordem - b.ordem).filter((x) => !filtro || x.status === filtro)) {
        console.log(`${String(i.ordem).padStart(2)}  ${MARCA[i.status]}  ${i.id.padEnd(7)} ${i.titulo}`);
      }
      return;
    }
    case 'proximo': {
      const p = proximo(dados);
      console.log(p ? `${p.id}: ${p.titulo}\nPronto quando: ${p.criterioPronto}` : 'Nenhum item liberado.');
      return;
    }
    case 'ver': {
      const i = dados.itens.find((x) => x.id === id);
      if (!i) throw new Error(`Item não encontrado: ${id}`);
      console.log(JSON.stringify(i, null, 2));
      return;
    }
    case 'iniciar':
    case 'concluir':
    case 'bloquear':
    case 'reabrir': {
      const status = { iniciar: 'em-andamento', concluir: 'concluido', bloquear: 'bloqueado', reabrir: 'pendente' }[comando];
      const nota = opcao(args, 'nota') ?? opcao(args, 'motivo');
      const item = aplicarStatus(dados, id, status, nota);
      salvar(dados);
      gerarArquivos(dados);
      console.log(`${item.id} -> ${status}. docs/BACKLOG.md e docs/PACOTE-PARA-IAS.md atualizados.`);
      console.log('Lembre de commitar docs/backlog/backlog.json e os .md no mesmo PR.');
      return;
    }
    case 'render':
      gerarArquivos(dados);
      console.log('docs/BACKLOG.md e docs/PACOTE-PARA-IAS.md gerados.');
      return;
    case 'validar':
      if (erros.length) {
        console.error(`Backlog inválido:\n- ${erros.join('\n- ')}`);
        process.exit(1);
      }
      console.log(`Backlog válido: ${dados.itens.length} itens, ${dados.riscos.length} riscos.`);
      return;
    default:
      console.log('Comandos: listar, proximo, ver <ID>, iniciar <ID>, concluir <ID> --nota "...", bloquear <ID> --motivo "...", reabrir <ID>, render, validar');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    principal(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
