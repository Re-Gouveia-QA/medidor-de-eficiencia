-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "valor" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "duracao_padrao_min" INTEGER,
ADD COLUMN     "possui_valor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "valor_label" TEXT,
ADD COLUMN     "valor_padrao" DECIMAL(12,2);
