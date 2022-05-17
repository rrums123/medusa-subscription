import {
    BeforeInsert,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
    OneToMany
} from "typeorm";
import { ulid } from "ulid";
import { SubscriptionItem } from "./subscription-item";
import { Cart } from "./cart"
import {DbAwareColumn} from "../utils/db-aware-column";

@Entity()
export class Subscription {
    @PrimaryColumn()
    id: string

    @Column({ nullable: false })
    status: string

    @Column({ nullable: true })
    next_payment_at: Date

    @OneToMany(() => Cart, (c) => c.subscription)
    carts?: Cart[]

    @OneToMany(() => SubscriptionItem, (si) => si.subscription)
    items?: SubscriptionItem[]

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
        this.id = `sub_${id}`
    }
}