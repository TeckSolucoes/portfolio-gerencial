'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Resposta {
  linhas: number;
  ignoradas: number;
  colunas: Record<string, string>;
  status: { status: string; qtd: number; contaComoFechado: boolean }[];
}

const n = (v: number) => v.toLocaleString('pt-BR');

// Envio da nossa base (export do Front ou SELECT do Função). Substitui a base daquela origem.
export function EnvioBase() {
  const router = useRouter();
  const [origem, setOrigem] = useState<'front' | 'funcao'>('funcao');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resposta, setResposta] = useState<Resposta | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) return setErro('Escolha o arquivo.');
    setEnviando(true);
    setErro(null);
    setResposta(null);
    try {
      const form = new FormData();
      form.set('origem', origem);
      form.set('arquivo', arquivo);
      const r = await fetch('/api/transparencia/base', { method: 'POST', body: form });
      const dados = await r.json().catch(() => ({ erro: `Falha (HTTP ${r.status}).` }));
      if (!r.ok) return setErro(dados.erro ?? `Falha (HTTP ${r.status}).`);
      setResposta(dados);
      router.refresh();
    } catch {
      setErro('Sem conexão com o servidor. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="envio" onSubmit={enviar}>
      <div className="envio-campos">
        <label>
          <span>Origem</span>
          <select value={origem} onChange={(e) => setOrigem(e.target.value as 'front' | 'funcao')} disabled={enviando}>
            <option value="funcao">Função (SELECT do banco)</option>
            <option value="front">Front (export)</option>
          </select>
        </label>
        <label>
          <span>Arquivo CSV</span>
          <input type="file" accept=".csv,.txt,text/csv" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} disabled={enviando} />
        </label>
        <button type="submit" className="botao" disabled={enviando || !arquivo}>
          {enviando ? 'Importando…' : 'Importar base'}
        </button>
      </div>
      <p className="envio-dica">
        Colunas usadas: CPF, nome, data do contrato, valor e status. CPF e nome não ficam guardados: o painel guarda só uma impressão irreversível
        (6 dígitos do meio do CPF + nome) para cruzar com o Portal.
      </p>
      {erro && (
        <p className="envio-erro" role="alert">
          {erro}
        </p>
      )}
      {resposta && (
        <div className="envio-ok" role="status">
          <b>
            {n(resposta.linhas)} linhas importadas{resposta.ignoradas > 0 && ` · ${n(resposta.ignoradas)} ignoradas (sem CPF ou nome)`}
          </b>
          <span>
            Colunas reconhecidas:{' '}
            {Object.entries(resposta.colunas)
              .map(([campo, col]) => `${campo} = ${col}`)
              .join(' · ')}
          </span>
          {resposta.status.length > 0 && (
            <span>
              Status que contam como contrato fechado no indicador:{' '}
              {resposta.status
                .map((s) => `${s.status} (${n(s.qtd)}) ${s.contaComoFechado ? '✓' : '✗'}`)
                .join(' · ')}
            </span>
          )}
        </div>
      )}
    </form>
  );
}
