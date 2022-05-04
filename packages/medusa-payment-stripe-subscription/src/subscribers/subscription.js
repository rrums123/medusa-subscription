
class SubscriptionSubscriber {
    constructor({
                    subscriptionService,
                    stripeSubscriptionService,
                    eventBusService,
                }) {
        this.subscriptionService_ = subscriptionService
        this.stripeSubscriptionService = stripeSubscriptionService
        this.eventBus_ = eventBusService

        this.eventBus_.subscribe("subscription.created", async (subscription) => {
            await this.onSubscriptionCreated(subscription)
        })

        this.eventBus_.subscribe("subscription.updated", async (subscription) => {
            await this.onSubscriptionUpdated(subscription)
        })

        this.eventBus_.subscribe("subscription.deleted", async (subscription) => {
            await this.onSubscriptionDeleted(subscription)
        })
    }

    async onSubscriptionCreated(subscriptionId) {

    }

    async onSubscriptionUpdated(subscriptionId) {

    }

    async onSubscriptionDeleted(subscriptionId) {

    }
}

export default SubscriptionSubscriber
