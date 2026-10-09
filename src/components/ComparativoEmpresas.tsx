import type { ComparativoEmpresas as DadosComparativo } from '@/lib/relatorio/comparativo-empresas';
import { formatarBRL } from '@/lib/dinheiro';
import './comparativo-empresas.css';

const numero = new Intl.NumberFormat('pt-BR');
const percentual = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const atualizacao = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});
const data = (ref: string) => ref.split('-').reverse().join('/');

export function ComparativoEmpresas({ dados }: { dados: DadosComparativo }) {
  const periodo = dados.dias === 7 ? `${data(dados.inicio)} a ${data(dados.ref)} · 7 dias` : data(dados.ref);
  const total = dados.empresas.reduce((soma, empresa) => soma + empresa.valor, 0);
  const desatualizado = dados.empresas.some((empresa) => empresa.desatualizado);
  const empate = dados.estado === 'disponivel' && total > 0 && !dados.lider && !desatualizado;

  return (
    <section className="comparativo-empresas" aria-label={`Comparativo de vendas AKRK e DIG: ${periodo}`}>
      <div className="comparativo-empresas__cabecalho">
        <div>
          <h2 className="comparativo-empresas__titulo">Vendas • {periodo}</h2>
          <p className="comparativo-empresas__conceito">AKRK × DIG · Propostas válidas · Valor contratado</p>
        </div>
        {empate && <span className="comparativo-empresas__situacao">Empate em valor contratado</span>}
        {dados.estado === 'disponivel' && total === 0 && <span className="comparativo-empresas__situacao">Sem vendas no período</span>}
      </div>
      {dados.estado === 'indisponivel' ? (
        <p className="comparativo-empresas__aviso" role="status">{dados.motivo ?? 'Comparativo indisponível para este período.'}</p>
      ) : (
        <>
          <div className="comparativo-empresas__linhas">
            {dados.empresas.map((empresa) => {
              const participacao = total > 0 ? empresa.valor / total * 100 : 0;
              const lider = total > 0 && !desatualizado && dados.lider === empresa.empresa;
              return (
                <div className={`comparativo-empresas__linha comparativo-empresas__linha--${empresa.empresa.toLowerCase()}`} key={empresa.empresa}>
                  <div className="comparativo-empresas__empresa">
                    <strong>{empresa.empresa}</strong>
                    {lider && <span className="comparativo-empresas__lider">Liderando no período</span>}
                  </div>
                  <div className="comparativo-empresas__metricas">
                    <strong className="comparativo-empresas__valor">{formatarBRL(empresa.valor)}</strong>
                    <span>{numero.format(empresa.qtd)} {empresa.qtd === 1 ? 'proposta' : 'propostas'} · {percentual.format(participacao)}% do total</span>
                  </div>
                  <div className="comparativo-empresas__barra" role="progressbar" aria-label={`Participação da ${empresa.empresa} no valor contratado`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(participacao.toFixed(1))} aria-valuetext={`${percentual.format(participacao)}% do total: ${formatarBRL(empresa.valor)}, ${numero.format(empresa.qtd)} propostas`}>
                    <span style={{ width: `${participacao}%` }} />
                  </div>
                  <p className="comparativo-empresas__atualizacao">{empresa.desatualizado ? 'Dados desatualizados' : 'Atualizado'} · <time dateTime={empresa.geradoEm}>{atualizacao.format(new Date(empresa.geradoEm))}</time></p>
                </div>
              );
            })}
          </div>
          {desatualizado && <p className="comparativo-empresas__aviso" role="status">Dados desatualizados. A liderança fica suspensa até a atualização das duas empresas.</p>}
        </>
      )}
    </section>
  );
}
