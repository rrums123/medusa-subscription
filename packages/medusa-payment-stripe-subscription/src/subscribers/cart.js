const selects = [
  "subtotal",
  "tax_total",
  "shipping_total",
  "discount_total",
  "total",
  "metadata"
];

const relations = [
  "items",
  "billing_address",
  "shipping_address",
  "region",
  "region.payment_providers",
  "payment_sessions",
  "customer",
]

class CartSubscriber {
  constructor({
    cartService,
    customerService,
    paymentProviderService,
    eventBusService,
  }) {
    this.cartService_ = cartService
    this.customerService_ = customerService
    this.paymentProviderService_ = paymentProviderService
    this.eventBus_ = eventBusService

    this.eventBus_.subscribe("cart.customer_updated", async (cart) => {
      await this.onCustomerUpdated(cart)
    })

    this.eventBus_.subscribe("cart.created", async (cart) => {
      await this.onCartCreated(cart)
    })

    this.eventBus_.subscribe("cart.updated", async (cart) => {
      await this.onCartUpdated(cart)
    })
  }

  async onCustomerUpdated(cartId) {
    const cart = await this.cartService_.retrieve(cartId, {
      selects,
      relations
    })

    if (!cart.payment_sessions?.length) {
      return Promise.resolve()
    }

    const session = cart.payment_sessions.find(
      (ps) => ps.provider_id === "stripe-subscription"
    )

    if (session) {
      return this.paymentProviderService_.updateSession(session, cart)
    }
  }

  async onCartCreated(cartId) {

  }



  async onCartUpdated(cartId) {

  }
}

export default CartSubscriber
