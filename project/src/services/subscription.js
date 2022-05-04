import {BaseService} from "medusa-interfaces";

class SubscriptionService extends BaseService {
    static resolutionKey = 'subscriptionService';

    static Events = {
        UPDATED: "subscription.updated",
        CREATED: "subscription.created",
        DELETED: "subscription.deleted",
    }

    constructor({manager, subscriptionRepository, subscriptionItemRepository, eventBusService, cartService, lineItemService}) {
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

    async retrieve(subscriptionId, configs) {
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
                    const res = subscriptionItemRepo.create({ ...o, subscription_id: subscription.id})
                    await subscriptionItemRepo.save(res)
                    return res
                })
            )

            const result = await this.retrieve(subscription.id, { relations: ["variant", "items", "line_items"] })

            await this.eventBus_
                .withTransaction(manager)
                .emit(SubscriptionService.Events.CREATED, {
                    id: result.id,
                })

            return result
        })
    }

    async update(subscriptionId, data) {
        const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)
        return subscriptionRepo.update(subscriptionId, data);
    }

    async remove(subscriptionId){
        const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)
        return subscriptionRepo.delete(subscriptionId);
    }
}

export default SubscriptionService