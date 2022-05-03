import {DeleteResult, EntityManager, UpdateResult} from 'typeorm';
import {CartService, EventBusService, LineItemService} from "@medusajs/medusa/dist/services";
import {BaseService} from "medusa-interfaces";
import {SubscriptionRepository} from "@medusajs/medusa/dist/repositories/subscription";
import {SubscriptionItemRepository} from "@medusajs/medusa/dist/repositories/subscription-item";
import {Subscription} from "@medusajs/medusa";

type ConstructorParams = {
    manager: EntityManager;
    subscriptionRepository: typeof SubscriptionRepository;
    subscriptionItemRepository: typeof SubscriptionItemRepository;
    eventBusService: EventBusService;
    cartService: CartService;
    lineItemService: LineItemService;
};

export class SubscriptionService extends BaseService {
    static resolutionKey = 'subscriptionService';

    static Events = {
        UPDATED: "subscription.updated",
        CREATED: "subscription.created",
        DELETED: "subscription.deleted",
    }

    private readonly manager_: EntityManager;
    private readonly subscriptionRepository_: typeof SubscriptionRepository;
    private readonly subscriptionItemRepository_: typeof SubscriptionItemRepository;
    private readonly eventBus_: EventBusService;
    private readonly cartService_: CartService;
    private readonly lineItemService_: LineItemService;

    constructor(private readonly container: ConstructorParams) {
        super()
        this.manager_ = container.manager
        this.subscriptionRepository_ = container.subscriptionRepository
        this.subscriptionItemRepository_ = container.subscriptionItemRepository
        this.eventBus_ = container.eventBusService
        this.cartService_ = container.cartService
        this.lineItemService_ = container.lineItemService
    }

    public async list() {
        const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)
        return subscriptionRepo.find()
    }

    public async retrieve(subscriptionId: string, configs: object) {
        const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)
        return subscriptionRepo.findOne(subscriptionId)
    }

    /**
     * Creates subscription
     * @param {object} subscriptionObject
     * @return {Promise}
     */
    public async create(subscriptionObject): Promise<Subscription> {
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

    public async update(subscriptionId: string, data: Subscription): Promise<UpdateResult> {
        const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)
        return subscriptionRepo.update(subscriptionId, data);
    }

    public async remove(subscriptionId: string): Promise<DeleteResult> {
        const subscriptionRepo = this.manager_.getCustomRepository(this.subscriptionRepository_)
        return subscriptionRepo.delete(subscriptionId);
    }
}