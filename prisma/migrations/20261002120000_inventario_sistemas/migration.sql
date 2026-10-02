CREATE TABLE "sistemas" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "url" TEXT,
  "classificacao" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "empresa" TEXT,
  "responsavel" TEXT,
  "situacao" TEXT NOT NULL DEFAULT 'ativo',
  "descricao" TEXT,
  "atualizado_por" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);

CREATE INDEX "sistemas_classificacao_categoria_idx" ON "sistemas"("classificacao", "categoria");

INSERT INTO "sistemas" ("id","nome","url","classificacao","categoria","empresa","descricao","situacao","atualizado_por","created_at","updated_at") VALUES
('sis-inicial-01','Único IDCloud','https://identity.acesso.io/','externo','Parceiro',NULL,'Identidade e biometria (acesso.io).','ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-02','Brasil Indoc','https://app.brasilindoc.com.br/','externo','Parceiro',NULL,'Gestão de documentos.','ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-03','ClickSign','https://app.clicksign.com/','externo','Parceiro',NULL,'Assinatura eletrônica.','ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-04','Função Capital Consig','https://cc.netcapital.com.br/WebFIMenuMVC/Login/AC.UI.LOGIN.aspx','externo','Esteira de crédito','Capital Consig','Menu do sistema Função da Capital Consig.','ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-05','Função ABC Card','https://funcao.abcconsig.com.br/WebFIMenuMVC/Login/AC.UI.LOGIN.aspx','externo','Esteira de crédito','ABC Card','Menu do sistema Função da ABC Card.','ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-06','Front Consig V1','https://crm2.consigfront.com.br/','interno','CRM',NULL,'CRM de originação (versão 1).','ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-07','Front Consig V2','https://front-consig-homolog.tecksolucoes.com.br/','interno','CRM',NULL,'CRM de originação (versão 2). Link do catálogo aponta para homologação.','ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-08','Site da Você Seguradora','https://www.voceseguradora.com.br/','interno','Site institucional','Você Seguradora',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-09','Site da Hoje Previdência','https://hojeprevidencia.com.br/','interno','Site institucional','Hoje Previdência',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-10','Site da Capital Consig','https://www.capitalconsig.com.br/home.html','interno','Site institucional','Capital Consig',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-11','Site da ABC Card','https://abccard.com.br/','interno','Site institucional','ABC Card',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-12','Site da Apus','https://www.apusdigital.com.br/','interno','Site institucional','Apus',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-13','Site do Click Bank','https://bankclick.com.br/','interno','Site institucional','Click Bank',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-14','Internal','https://internal2.capitalbank.systems/login','interno','Plataforma Capital Bank','Capital Consig',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-15','Internal Orbital','https://portal-orbital.capitalbank.systems/login','interno','Plataforma Capital Bank','Capital Consig',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-16','Internal SandBox','https://sandbox.capitalbank.systems/login','interno','Plataforma Capital Bank','Capital Consig','Ambiente de testes.','ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-17','Portal Teck','https://app.tecksolucoes.com.br/logar/','interno','Corporativo','Teck Soluções',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-18','Jira','https://capitalconsig.atlassian.net/jira/servicedesk/projects/SER/queues/custom/118','interno','Corporativo','Teck Soluções','Abertura e acompanhamento de chamados.','ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-19','Intranet da Teck Soluções','https://capitalconsig.atlassian.net/wiki/spaces/ITS/overview','interno','Corporativo','Teck Soluções','Confluence: políticas, catálogo e documentação.','ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-20','Backoffice Capital Consig','https://orbital-cartoes-capital-consig-consult.cwnurc.easypanel.host/','interno','Backoffice','Capital Consig',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('sis-inicial-21','Backoffice Click Bank','https://cb-consulta.tecksolucoes.com.br/dashboard','interno','Backoffice','Click Bank',NULL,'ativo','Catálogo da Intranet',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT INTO "permissoes_perfil" ("role", "funcionalidade", "permitido", "updated_at") VALUES
('superadmin', 'sistemas', true, CURRENT_TIMESTAMP),
('gerente', 'sistemas', true, CURRENT_TIMESTAMP),
('visualizador', 'sistemas', false, CURRENT_TIMESTAMP)
ON CONFLICT("role", "funcionalidade") DO NOTHING;
