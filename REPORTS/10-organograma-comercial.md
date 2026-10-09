# Organograma comercial —09/10/2026

Status: PARTIAL — implementação e gates locais concluídos; publicação pendente.

Entrega: Estrutura Comercial → Organograma, com Roberto — CEO acima das unidades AKRK e DIG. Gerentes e promotoras usam vínculos cadastrais, mantendo sem vínculo separado. Busca, expansão/recolhimento, cadastro/histórico e fotos privadas até2MB. Escritório Virtual e item lateral antigo removidos; URLs redirecionam, dados e migrations preservados.

Execução: UI, backend e integração em paralelo, ownership separado. Revisão independente cruzada e QA HTTP. Corrigidos filtro global inconsistente e origem interna do proxy; sem bloqueadores restantes nos cenários revisados. 38 testes, TypeScript, lint e build aprovados. Prévia desktop/celular com fixtures, sem dados fictícios no produto.

Segurança: superadmin e permissão hierarquia, cadastro existente, restrição de Origin pública AUTH_URL/NEXTAUTH_URL, stream até2MB, raster validado por assinatura/MIME, paths validados, gravação atômica e GET privado/no-store/nosniff. Fotos persistem em /app/data/organograma-fotos, fora do Git.

Limites: fotos/cadastros externos do Orion não importados; assinatura não valida decodificação integral. Homologação com dados reais e acesso real ainda pendentes. Publicação Weeky anterior continua não validada no EasyPanel. Nenhum deploy executado nesta entrega.

Rollback: reverter commit; sem migration ou exclusão de dados.
Próxima etapa: revisão do PR e aprovação de implantação; importar fotos apenas com fonte e correspondência confirmadas (IMP-ORG-FOTOS).
