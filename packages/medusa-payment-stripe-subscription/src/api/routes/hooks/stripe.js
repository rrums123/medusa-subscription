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

    if (object.object === 'payment_intent') {
        const paymentIntent = object
        const cartId = paymentIntent.metadata.cart_id
        const order = await orderService
            .retrieveByCartId(cartId)
            .catch(() => undefined)
    }

    if (object.object === 'subscription') {
        const subscription = object
    }

    if (object.object === 'invoice') {
        const invoice = object
        const subscription = subscriptionService.retrieve(invoice.subscription)
    }


    console.info(event.type)
    // handle stripe events
    switch (event.type) {

        /**
         * Sent when a PaymentIntent has successfully completed payment.
         */
        case "payment_intent.succeeded":
            if (order && order.payment_status !== "captured") {
                await orderService.capturePayment(order.id)
            }
            break

        case "payment_intent.canceled":
            if (order) {
                await orderService.update(order._id, {
                    status: "canceled",
                })
            }
            break

        case "payment_intent.payment_failed":
            break

        case "payment_intent.amount_capturable_updated":
            if (!order) {
                await cartService.setPaymentSession(cartId, "stripe")
                await cartService.authorizePayment(cartId)
                await orderService.createFromCart(cartId)
            }
            break


        /**
         * Sent when a Customer is successfully created.
         */
        case 'customer.created':
            // TODO: Not implemented yet
            break

        /**
         * Sent when the subscription is created.
         * The subscription status may be incomplete if customer authentication is required to complete the payment
         * or if you set payment_behavior to default_incomplete.
         */
        case 'customer.subscription.created':
            break

        /**
         * Sent when a customer’s subscription ends.
         */
        case 'customer.subscription.deleted':
            await subscriptionService.delete(subscription.subscription.id)
            break
        /**
         * Sent when the subscription is successfully started, after the payment is confirmed.
         * Also sent whenever a subscription is changed.
         * For example, adding a coupon, applying a discount, adding an invoice item, and changing plans all trigger this event.
         */
        case 'customer.subscription.updated':
            await subscriptionService.update(subscription.subscription.id, {
                status: subscription.subscription.status
            })
            break

        /**
         * The invoice couldn’t be finalized. Learn how to handle invoice finalization failures by reading the guide.
         * Learn more about invoice finalization in the invoices overview guide.
         * * Inspect the Invoice’s last_finalization_error to determine the cause of the error.
         * * If you’re using Stripe Tax, check the Invoice object’s automatic_tax field.
         * * If automatic_tax[status]=requires_location_inputs, the invoice can’t be finalized and payments can’t be collected. Notify your customer and collect the required customer location.
         * * If automatic_tax[status]=failed, retry the request later.
         */
        case 'invoice.finalization_failed':
            break

        /**
         * Sent when the invoice is successfully paid.
         * You can provision access to your product when you receive this event and the subscription status is active.
         */
        case 'invoice.paid':
            if (invoice & !order) {
                await cartService.setPaymentSession(cartId, "stripe-subscription")
                await cartService.authorizePayment(cartId)
                await orderService.createFromCart(cartId)
            }
            break

        case 'invoice.finalized':
            console.info(object)

            if (!order) {
                await cartService.setPaymentSession(cartId, "stripe-subscription")
                await cartService.authorizePayment(cartId)
                await orderService.createFromCart(cartId)
            }
            break

        /**
         * Sent when the invoice requires customer authentication.
         * Learn how to handle the subscription when the invoice requires action.
         */
        case 'invoice.payment_action_required':
            if (invoice & !order) {
                await cartService.setPaymentSession(cartId, "stripe-subscription")
                await cartService.authorizePayment(cartId)
                const order = await orderService.createFromCart(cartId)
                await orderService.update(order.id, {
                    external_id: invoice.id
                })
            }
            break

        /**
         * A payment for an invoice failed. The PaymentIntent status changes to requires_action.
         * The status of the subscription continues to be incomplete only for the subscription’s first invoice.
         * If a payment fails, there are several possible actions to take:
         *
         * * Notify the customer. Read about how you can configure subscription settings to enable Smart Retries and other revenue recovery features.
         * * If you’re using PaymentIntents, collect new payment information and confirm the PaymentIntent.
         * * Update the default payment method on the subscription.
         */
        case 'invoice.payment_failed':
            break

        /**
         * Sent a few days prior to the renewal of the subscription.
         * The number of days is based on the number set for Upcoming renewal events in the Dashboard.
         * You can still add extra invoice items, if needed.
         */
        case 'invoice.upcoming':
            break

        /**
         * Sent when an invoice is created for a new or renewing subscription.
         * To immediately finalize the invoice, return a 2xx response when you receive this event.
         * If Stripe fails to receive a successful response to invoice.created, then finalizing all invoices with automatic collection is delayed for up to 72 hours.
         * Read more about finalizing invoices.
         * Respond to the notification by sending a request to the Finalize an invoice API.
         */
        case 'invoice.created':
            break

        /**
         * Sent when a PaymentIntent is created.
         */
        case 'payment_intent.created':
            break

        default:
            res.sendStatus(204)
            return
    }

    res.sendStatus(200)
}
