import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionAddMetadataMigration1649775522999 implements MigrationInterface {
    name = 'SubscriptionAddMetadataMigration1649775522999';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE public."subscription" ADD COLUMN IF NOT EXISTS "metadata" jsonb`)
        await queryRunner.query(`ALTER TABLE public."subscription_item" ADD COLUMN IF NOT EXISTS "metadata" jsonb`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE public."subscription_item" DROP COLUMN "metadata"`)
        await queryRunner.query(`ALTER TABLE public."subscription" DROP COLUMN "metadata"`)
    }
}