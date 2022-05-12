import cart from "../../../subscribers/cart";

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

    console.info(event.type)
    // handle stripe events
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
            // TODO: Not implemented yet
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
                status: subscription.status,
                next_payment_at: (new Date(subscription.current_period_end*1000)).toISOString()
            }

            if ("previous_attributes" in subscription) {
                if ("latest_invoice" in subscription.previous_attributes) {
                    const items = []
                    const latestCart = await cartService.retrieve(subscription.metadata.cart_id)

                    for (let item in subscription.items.data) {
                        item['variant_id'] = item.plan.product
                        item['quantity'] = item.plan.quantity
                        items.push(item)
                    }

                    const cart = await cartService.create({
                        subscription_id: subscriptionId,
                        metadata: { invoice_id: subscription.latest_invoice },
                        region_id: latestCart.region_id,
                        items: items
                    })

                    updateObject.metadata({cart_id: `${cart.id}`})
                }
            }


            await subscriptionService.update(subscription.id, updateObject)
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
