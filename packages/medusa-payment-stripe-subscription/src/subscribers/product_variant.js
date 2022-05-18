const selects = [
    "id",
    "product_id",
    "title",
    "is_subscription",
    "is_digital",
    "subscription_period",
];

const relations = [
    "product",
    "prices"
];

class ProductVariantSubscriber {
    constructor({
                    productVariantService,
                    paymentProviderService,
                    stripeSubscriptionService,
                    eventBusService,
                }) {
        this.productVariantService_ = productVariantService
        this.paymentProviderService_ = paymentProviderService
        this.stripeSubscriptionService_ = stripeSubscriptionService
        this.eventBus_ = eventBusService

        this.eventBus_.subscribe("product-variant.created", async (data) => {
            await this.onProductVariantCreated(data)
        })
    }

    async onProductVariantCreated(data) {
        const {id, product_id} = data
        const productVariant = await this.productVariantService_.retrieve(id, {
            select: selects,
            relations: relations,
        })

        if (productVariant.is_subscription) {
            return this.stripeSubscriptionService_.createProduct(productVariant)
        }
    }
}

export default ProductVariantSubscriber
