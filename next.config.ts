import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // O proxy.ts (login) guarda o corpo da requisição e corta acima deste limite sem erro. O upload da
    // base de clientes (/api/transparencia/base) aceita até 50 MB: sem isto chegaria truncado.
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
