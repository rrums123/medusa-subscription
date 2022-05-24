export default async (req, res) => {
    const signature = req.headers["stripe-signature"]

    let event
    try {
        const stripeProviderService = req.scope.resolve("pp_stripe")
        event = stripeProviderService.constructWebhookEvent(req.body, signature)
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`)
        return
    }

    const object = event.data.object

    const cartService = req.scope.resolve("cartService")
    const orderService = req.scope.resolve("orderService")
    const subscriptionService = req.scope.resolve("subscriptionService")
    const stripeSubscriptionService = req.scope.resolve("stripeSubscriptionService")
    const customerService = req.scope.resolve("customerService")
    const lineItemService = req.scope.resolve("lineItemService")
    const productVariantService = req.scope.resolve("productVariantService")
    const regionService = req.scope.resolve("regionService")

    let cartId = null
    let order = null
    let invoice = null
    let subscription = null
    let paymentIntent = null

    if (object.object === 'payment_intent') {
        paymentIntent = object
        cartId = paymentIntent.metadata.cart_id
        order = await orderService
            .retrieveByCartId(cartId)
            .catch(() => undefined)
    }

    if (object.object === 'subscription') {
        subscription = object
    }

    if (object.object === 'invoice') {
        invoice = object
        subscription = subscriptionService.retrieve(invoice.subscription)
        if ('cart_id' in invoice.metadata) {
            cartId = invoice.metadata.cart_id
        } else {
            cartId = invoice.lines.data[0].metadata.cart_id
        }
    }

    console.info(`hooks event: ${event.type}`)
    switch (event.type) {

        case "payment_intent.succeeded":
            if (order && order.payment_status !== "captured") {
                await orderService.capturePayment(order.id)
            }
            break

        //case "payment_intent.canceled":
        //  if (order) {
        //    await orderService.update(order._id, {
        //      status: "canceled",
        //    })
        //  }
        //  break

        case "payment_intent.payment_failed":
            // TODO: Not implemented yet
            break
        case "payment_intent.amount_capturable_updated":
            if (!order) {
                await cartService.setPaymentSession(cartId, "stripe")
                await cartService.authorizePayment(cartId)
                await orderService.createFromCart(cartId)
            }
            break

        case 'customer.subscription.created':
            break

        case 'customer.subscription.deleted':
            if (event.request != null) {
                // handle a subscription cancelled by your request from above.
            } else {
                // handle subscription cancelled automatically based upon your subscription settings.
                await subscriptionService.delete(subscription.subscription.id)
            }
            break

        case 'customer.subscription.updated':
            const updateObject = {
                status: object.status,
                next_payment_at: (new Date(subscription.current_period_end * 1000)).toISOString()
            }

            let currentSubscription = await subscriptionService.retrieve(subscription.id)
            let currentCart = await cartService.retrieve(currentSubscription.metadata.cart_id)

            // conditions for recurring invoice
            if (subscription.latest_invoice !== currentCart.metadata.invoice_id) {
                let customerStripe = await stripeSubscriptionService.retrieveCustomer(subscription.customer)
                let customer = await customerService.retrieve(customerStripe.metadata.customer_id).catch(() => undefined)

                let cart = await cartService.create({
                    metadata: {
                        subscription_id: subscription.id,
                        invoice_id: subscription.latest_invoice
                    },
                    region_id: currentCart.region_id,
                    email: customer.email,
                    customer_id: customer.id
                })

                let lineItem
                let productVariant
                for (let item of subscription.items.data) {
                    productVariant = await productVariantService.retrieve(item.plan.product)
                    lineItem = await lineItemService.create({
                        title: productVariant.product.title,
                        description: productVariant.title,
                        variant_id: productVariant.id,
                        unit_price: item.plan.amount,
                        quantity: item.quantity
                    })
                    await cartService.addLineItem(cart.id, lineItem)
                }

                updateObject.metadata = {cart_id: `${cart.id}`}
                await cartService.setPaymentSessions(cart.id)
                await cartService.setPaymentSession(cart.id, "stripe-subscription")
            }

            await subscriptionService.update(subscription.id, updateObject)
            break

        case 'invoice.payment_succeeded':
            subscription = await subscriptionService.retrieve(invoice.subscription)
            cartId = subscription.metadata.cart_id
            await cartService.authorizePayment(cartId)
            order = await orderService.createFromCart(cartId)
            if (order && invoice.status === 'paid') {
                await orderService.capturePayment(order.id)
            }

            break

        case 'invoice.upcoming':
            // TODO: push notification to user
            break

        default:
            res.sendStatus(204)
            return
    }

    res.sendStatus(200)
}
