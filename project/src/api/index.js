import admin from "./routes/admin"
import store from "./routes/store"
import {Router} from "express"
import bodyParser from "body-parser"
import {MedusaError} from "medusa-core-utils";

export default () => {
    const router = Router()

    router.post('hooks', bodyParser.raw({type: "*/*"}), async (req, res) => {
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
                subscription = object
                let subscriptionData = await subscriptionService.retrieve(subscription.id)

                if (!subscriptionData) {
                    const customerStripe = await stripeSubscriptionService.getCustomer(subscription.customer)
                    const items = []

                    let customer = await customerService.retrieve(customerStripe.id)

                    if (customer instanceof MedusaError) {
                        customer = await customerService.create({
                            id: customerStripe.id,
                            email: customerStripe.email,
                            first_name: customerStripe.name,
                            last_name: customerStripe.name,
                            password: "password",
                            phone: customerStripe.phone
                        })
                    }

                    for (let item of subscription.items.data) {
                        items.push({
                            variant_id: item.plan.product,
                            quantity: item.quantity,
                        })
                    }

                    const subscriptionObject = {
                        id: subscription.id,
                        status: subscription.status,
                        items: subscription.items.data,
                        metadata: {cart_id: `${cart.id}`}
                    }

                    subscriptionData = await subscriptionService.create(subscriptionObject)

                    let cart = await cartService.create({
                        metadata: { invoice_id: subscription.latest_invoice },
                        country_code: customerStripe.address.country,
                        region_id: 'reg_01G278B83GDM7Y91ZES5TVH8R1',
                        items: items,
                        subscription_id: subscription.id
                    })
                }

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
                subscription = object

                const updateObject = {
                    status: object.status,
                    next_payment_at: (new Date(subscription.current_period_end * 1000)).toISOString()
                }

                if ("previous_attributes" in subscription) {
                    if ("latest_invoice" in subscription.previous_attributes) {
                        const items = []
                        const latestCart = await cartService.retrieve(subscription.metadata.cart_id)

                        for (let item of subscription.items.data) {
                            items.push({
                                variant_id: item.plan.product,
                                quantity: item.quantity,
                            })
                        }

                        const cart = await cartService.create({
                            subscription_id: subscription.id,
                            metadata: { invoice_id: subscription.latest_invoice },
                            region_id: latestCart.region_id,
                            items: items
                        })

                        updateObject.metadata({cart_id: `${cart.id}`})

                        const order = await orderService.retrieveByCartId(cart.id)

                        if(!order) {
                            await cartService.setPaymentSession(cartId, "stripe-subscription")
                            await cartService.authorizePayment(cartId)
                            await orderService.createFromCart(cartId)
                        }
                    }
                }

                await subscriptionService.update(subscription.id, updateObject)
                break

            case 'invoice.payment_succeeded':
                subscription = await subscriptionService.retrieve(invoice.subscription)

                if (subscription && invoice.status === 'paid') {
                    order = orderService.retrieveByCartId(subscription.metadata.cart_id)
                    await orderService.completeOrder(order.id)
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
    })

    router.use(bodyParser.json())
    admin(router)
    store(router)

    return router;
}
