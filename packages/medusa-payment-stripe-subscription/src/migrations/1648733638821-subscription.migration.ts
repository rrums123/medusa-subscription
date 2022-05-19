import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionMigration1648733638821 implements MigrationInterface {
    name = 'SubscriptionMigration1648733638821';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE public."subscription" ( "id" TEXT NOT NULL PRIMARY KEY, "status" TEXT NOT NULL, "next_payment_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE)`);
        await queryRunner.query(`CREATE TABLE public."subscription_item" ( "id" TEXT NOT NULL PRIMARY KEY , "subscription_id" TEXT NOT NULL, "period" TEXT NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE)`);
        await queryRunner.query(`ALTER TABLE public."cart" ADD COLUMN IF NOT EXISTS "subscription_id" TEXT DEFAULT NULL`)
        await queryRunner.query(`ALTER TABLE public."line_item" ADD COLUMN IF NOT EXISTS "subscription_item_id" TEXT DEFAULT NULL`)
        await queryRunner.query(`ALTER TABLE public."product_variant" ADD COLUMN IF NOT EXISTS "is_subscription" boolean DEFAULT false`)
        await queryRunner.query(`ALTER TABLE public."product_variant" ADD COLUMN IF NOT EXISTS "is_digital" boolean DEFAULT false`)
        await queryRunner.query(`ALTER TABLE public."product_variant" ADD COLUMN IF NOT EXISTS "subscription_period" TEXT DEFAULT null`)
        await queryRunner.query(`ALTER TABLE public."cart" ADD CONSTRAINT "FK_cart_subscription_id" FOREIGN KEY ("subscription_id") REFERENCES "subscription" ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await queryRunner.query(`ALTER TABLE public."line_item" ADD CONSTRAINT "FK_line_item_subscription_item_id" FOREIGN KEY ("subscription_item_id") REFERENCES "subscription_item" ON DELETE NO ACTION ON UPDATE NO ACTION`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE public."line_item" DROP CONSTRAINT "FK_line_item_subscription_item_id"`)
        await queryRunner.query(`ALTER TABLE public."cart" DROP CONSTRAINT "FK_line_item_subscription_item_id"`)
        await queryRunner.query(`ALTER TABLE public."subscription" DROP CONSTRAINT "FK_subscription_cart_id"`)
        await queryRunner.query(`ALTER TABLE public."product_variant" DROP COLUMN "is_subscription"`)
        await queryRunner.query(`ALTER TABLE public."product_variant" DROP COLUMN "is_digital"`)
        await queryRunner.query(`ALTER TABLE public."product_variant" DROP COLUMN "subscription_period"`)
        await queryRunner.query(`DROP TABLE public."subscription"`)
    }
}