import '../institucional.css';

const recursos = [
  { titulo: 'Visão executiva', texto: 'A página inicial reúne os principais sinais do dia em um só lugar.', itens: ['Indicadores de mercado e Banco Central', 'Notícias de mercado, bancos, investimentos e consignado', 'Normas, comunicados e atualizações do Banco Central'], tom: '' },
  { titulo: 'Relatório Gerencial', texto: 'Acompanha a produção por empresa, equipe e período.', itens: ['Metas e evolução da produção', 'Ranking de equipes e gerentes', 'Casos pagos, em jornada ou encerrados'], tom: 'roxo' },
  { titulo: 'Em Atenção', texto: 'Destaca responsáveis, objeções e propostas que precisam de acompanhamento.', itens: ['Casos críticos e sem atualização', 'Filtros por empresa e responsável', 'Leitura rápida das propostas relacionadas'], tom: 'laranja' },
  { titulo: 'Roteiros', texto: 'Centraliza as regras de atuação de cada convênio.', itens: ['Regime jurídico e situação funcional', 'Idade e valor mínimo de parcela', 'Cessão, requisição, pensão e observações operacionais'], tom: 'roxo' },
  { titulo: 'Diário Oficial', texto: 'Centraliza atos públicos relevantes para a operação de consignado.', itens: ['Consulta de fontes federais, estaduais e municipais', 'Busca de atos relacionados aos convênios acompanhados', 'Atualização por coletas agendadas'], tom: '' },
  { titulo: 'Portal Transparência', texto: 'Apoia a identificação de novos servidores federais com acesso restrito.', itens: ['Comparação mensal do arquivo SIAPE', 'Exclusão de pessoas já presentes na base de clientes', 'Geração de planilha para uso autorizado'], tom: 'roxo' },
  { titulo: 'NOC', texto: 'Mostra a saúde operacional do portal e das fontes de dados.', itens: ['Estado do banco e do volume', 'Último backup detectado', 'Workers, falhas e próximas execuções'], tom: '' },
  { titulo: 'Jurídico', texto: 'Monitora os CNPJs do grupo por rotinas independentes.', itens: ['Consulta cadastral por CNPJ', 'Menções públicas, processos, licitações e contratos', 'Sanções CEIS/CNEP e alertas ainda não vistos'], tom: 'roxo' },
  { titulo: 'Administração', texto: 'Reúne os controles de operação e acesso do portal.', itens: ['Usuários, perfis, empresas e turmas', 'Metas mensais por empresa', 'Agenda, execução e histórico dos workers'], tom: 'laranja' },
];

export default function SaibaMaisPage() {
  return <div className="institucional">
    <section className="intro">
      <div className="kicker">Portal Teck · Saiba Mais</div>
      <h1>O que você encontra nesta ferramenta</h1>
      <p className="lede">Um guia rápido das áreas disponíveis e de como cada uma apoia o acompanhamento gerencial e a operação de consignado.</p>
    </section>
    <section className="grade" aria-label="Funcionalidades do portal">
      {recursos.map((recurso) => <article className={`recurso ${recurso.tom}`} key={recurso.titulo}>
        <h2>{recurso.titulo}</h2>
        <p>{recurso.texto}</p>
        <ul className="lista">{recurso.itens.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>)}
    </section>
  </div>;
}
