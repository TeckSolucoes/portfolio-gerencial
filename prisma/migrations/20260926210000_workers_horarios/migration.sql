-- Agenda por horário do dia: só acrescenta a coluna (aditiva, sem recriar a tabela).
ALTER TABLE "worker_configs" ADD COLUMN "horarios" TEXT;
