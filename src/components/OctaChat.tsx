import Script from 'next/script';

// Teste do chat da Octadesk na home. Snippet copiado do painel da Octadesk, sem alterações.
// Depois de carregado, o embed.js continua na página ao navegar para outras rotas sem recarregar.
export function OctaChat() {
  return (
    <Script id="octadesk-chat" strategy="afterInteractive">
      {`(function (o, c) {
  o.octadesk = o.octadesk || {};
  o.octadesk.chatOptions = {
    subDomain: 'o211311-074',
    showButton: 'true',
    openOnMessage: 'true',
    showFooterPoweredBy: 'true',
    hide: 'false'
  };
  var bd = c.getElementsByTagName("body")[0];
  var sc = c.createElement("script");
  sc.async = 1;
  sc.src = 'https://cdn.octadesk.com/embed.js';
  bd.appendChild(sc);
})(window, document);`}
    </Script>
  );
}
