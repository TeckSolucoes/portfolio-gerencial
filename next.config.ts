import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O ssh2 carrega implementações criptográficas nativas em runtime. Se o Turbopack tentar
  // colocá-las nos chunks ESM, o build Linux falha com "non-ecmascript placeable asset".
  serverExternalPackages: ["ssh2"],
  experimental: {
    // O proxy.ts (login) guarda o corpo da requisição e corta acima deste limite sem erro. O upload da
    // base de clientes (/api/transparencia/base) aceita até 50 MB: sem isto chegaria truncado.
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
