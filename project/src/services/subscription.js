import {BaseService} from "medusa-interfaces";

class SubscriptionService extends BaseService {
    static resolutionKey = 'subscriptionService';

    static Events = {
        UPDATED: "subscription.updated",
        CREATED: "subscription.created",
        DELETED: "subscription.deleted",
    }

    constructor({
                    manager,
                    subscriptionRepository,
                    subscriptionItemRepository,
                    eventBusService,
                    cartService,
                    lineItemService
                }) {
        super()
        this.manager_ = manager
        this.subscriptionRepository_ = subscriptionRepository
        this.subscriptionItemRepository_ = subscriptionItemRepository
        this.eventBus_ = eventBusService
        this.cartService_ = cartService
        this.lineItemService_ = lineItemService
    }

    async list() {
        const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)
        return subscriptionRepo.find()
    }

    async listAndCount(
        config = {skip: 0, take: 50, order: {created_at: "DESC"}}
    ) {
        const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)
        const [data, total] = await subscriptionRepo.findAndCount(config)
        return [data, total]
    }

    async retrieve(subscriptionId) {
        const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)
        return subscriptionRepo.findOne(subscriptionId)
    }

    /**
     * Creates subscription
     * @param {object} subscriptionObject
     * @return {Promise}
     */
    async create(subscriptionObject) {
        return this.atomicPhase_(async (manager) => {
            const subscriptionRepo = manager.getCustomRepository(this.subscriptionRepository_)
            const subscriptionItemRepo = manager.getCustomRepository(this.subscriptionItemRepository_)

            const {items, ...rest} = subscriptionObject

            let subscription = subscriptionRepo.create(rest)
            subscription = await subscriptionRepo.save(subscription)

            subscription.items = await Promise.all(
                items.map(async (o) => {
                    const res = subscriptionItemRepo.create({...o, subscription_id: subscription.id})
                    await subscriptionItemRepo.save(res)
                    return res
                })
            )

            const result = await this.retrieve(subscription.id, {relations: ["variant", "items", "line_items"]})

            await this.eventBus_
                .withTransaction(manager)
                .emit(SubscriptionService.Events.CREATED, {
                    id: result.id,
                })

            return result
        })
    }

    async update(subscriptionId, data) {
        return this.atomicPhase_(async (manager) => {
            const subscription = await this.retrieve(subscriptionId)
            const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)
            const result = await subscriptionRepo.save(subscriptionRepo.merge(subscription, data))
            await this.eventBus_
                .withTransaction(manager)
                .emit(SubscriptionService.Events.UPDATED, {
                    id: subscriptionId,
                })
            return result
        })
    }

    async delete(subscriptionId) {
        return this.atomicPhase_(async (manager) => {
            const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)

            const subscription = await subscriptionRepo.findOne(subscriptionId)

            if (!subscription) {
                return Promise.resolve()
            }
            await subscriptionRepo.delete(subscriptionId);
            await this.eventBus_
                .withTransaction(manager)
                .emit(SubscriptionService.Events.DELETED, {
                    id: subscriptionId,
                })

            return Promise.resolve()
        })
    }
}

export default SubscriptionService