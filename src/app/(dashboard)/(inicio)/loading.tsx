import { BLOCOS, BolsaSkeleton, IndicadoresSkeleton, NoticiasSkeleton } from './secoes';
import './home.css';

export default function HomeLoading() {
  return (
    <div className="home" aria-busy="true">
      <section className="abertura">
        <div className="sk" style={{ width: '35%', height: 30 }} />
        <div className="sk" style={{ width: '65%', height: 13, marginTop: 12 }} />
      </section>
      <div className="topo"><BolsaSkeleton /><IndicadoresSkeleton /></div>
      <h2 className="sec-titulo sec-noticias">Notícias</h2>
      <div className="blocos">
        {BLOCOS.map((bloco) => <NoticiasSkeleton key={bloco.id} id={bloco.id} titulo={bloco.titulo} tom={bloco.tom} />)}
      </div>
    </div>
  );
}
