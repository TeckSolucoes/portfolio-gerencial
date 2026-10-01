import './BolhaWhatsapp.css';

// Mostra o *negrito* do WhatsApp como ele aparece no celular, sem montar HTML a partir do texto.
export function BolhaWhatsapp({ texto }: { texto: string }) {
  return (
    <pre className="wa-bolha">
      {texto.split(/(\*[^*\n]+\*)/g).map((parte, i) => (/^\*[^*\n]+\*$/.test(parte) ? <b key={i}>{parte.slice(1, -1)}</b> : parte))}
    </pre>
  );
}
