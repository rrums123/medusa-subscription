import {
    Index,
    BeforeInsert,
    Column,
    ManyToOne,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
    JoinColumn,
} from "typeorm";
import { ulid } from "ulid";
import {Subscription} from "./subscription";
import {DbAwareColumn} from "@medusajs/medusa/dist/utils/db-aware-column";

@Entity()
export class SubscriptionItem {
    @PrimaryColumn()
    id: string

    @Column({ nullable: true })
    period: string

    @Index()
    @Column({ nullable: false })
    subscription_id: string

    @ManyToOne(() => Subscription, (subscription) => subscription.items)
    @JoinColumn({ name: 'subscription_id' })
    subscription: Subscription

    @DbAwareColumn({ type: "jsonb", nullable: true })
    metadata: any

    @CreateDateColumn({ nullable: false })
    created_at: Date

    @UpdateDateColumn({ nullable: false })
    updated_at: Date

    @DeleteDateColumn({ nullable: true })
    deleted_at: Date

    @BeforeInsert()
    private beforeInsert() {
        if (this.id) return
        const id = ulid()
        this.id = `subitem_${id}`
    }
}