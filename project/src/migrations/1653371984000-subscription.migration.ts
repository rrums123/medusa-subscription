import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionMigration1653371984000 implements MigrationInterface {
    name = 'SubscriptionMigration1653371984000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE public."subscription" ( "id" TEXT NOT NULL PRIMARY KEY, "status" TEXT NOT NULL, "next_payment_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE)`);
        await queryRunner.query(`CREATE TABLE public."subscription_item" ( "id" TEXT NOT NULL PRIMARY KEY , "subscription_id" TEXT NOT NULL, "period" TEXT DEFAULT NULL, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE public."subscription_item"`)
        await queryRunner.query(`DROP TABLE public."subscription"`)
    }
}