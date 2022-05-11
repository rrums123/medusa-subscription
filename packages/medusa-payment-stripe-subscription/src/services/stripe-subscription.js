import Stripe from "stripe"
import {PaymentService} from "medusa-interfaces"

class StripeSubscriptionService extends PaymentService {
    static identifier = "stripe-subscription"

    constructor(
        {
            stripeProviderService,
            customerService,
            totalsService,
            regionService,
            subscriptionService,
            cartService
        },
        options
    ) {
        super()

        /**
         * Required Stripe options:
         *  {
         *    api_key: "stripe_secret_key", REQUIRED
         *    webhook_secret: "stripe_webhook_secret", REQUIRED
         *    // Use this flag to capture payment immediately (default is false)
         *    capture: true
         *  }
         */
        this.options_ = options

        /** @private @const {Stripe} */
        this.stripe_ = Stripe(options.api_key)

        /** @private @const {CustomerService} */
        this.stripeProviderService_ = stripeProviderService

        /** @private @const {CustomerService} */
        this.customerService_ = customerService

        /** @private @const {RegionService} */
        this.regionService_ = regionService

        /** @private @const {TotalsService} */
        this.totalsService_ = totalsService

        /** @private @const {SubscriptionService} */
        this.subcriptionService_ = subscriptionService

        /** @private @const {CartService} */
        this.cartService_ = cartService
    }

    async createPortalSession(customerId) {
        const customer = await this.customerService_.retrieve(customerId)
        return this.stripe_.billingPortal.sessions.create({
            customer: customer.metadata.stripe_id,
            return_url: this.options_.return_url,
        });
    }

    /**
     * Fetches Stripe payment intent. Check its status and returns the
     * corresponding Medusa status.
     * @param {object} paymentData - payment method data from cart
     * @returns {string} the status of the payment intent
     */
    async getStatus(paymentData) {
        return  this.stripeProviderService_.getStatus(paymentData.latest_invoice.payment_intent)
    }

    /**
     * Fetches a customers saved payment methods if registered in Stripe.
     * @param {object} customer - customer to fetch saved cards for
     * @returns {Promise<Array<object>>} saved payments methods
     */
    async retrieveSavedMethods(customer) {
        return this.stripeProviderService_.retrieveSavedMethods(customer)
    }

    /**
     * Fetches a Stripe customer
     * @param {string} customerId - Stripe customer id
     * @returns {Promise<object>} Stripe customer
     */
    async retrieveCustomer(customerId) {
        return await this.stripeProviderService_.retrieveCustomer(customerId)
    }

    /**
     * Creates a Stripe customer using a Medusa customer.
     * @param {object} customer - Customer data from Medusa
     * @returns {Promise<object>} Stripe customer
     */
    async createCustomer(customer) {
        return await this.stripeProviderService_.createCustomer(customer)
    }

    /**
     * Creates a Stripe subsciption and first payment intent.
     * If customer is not registered in Stripe, we do so.
     * @param {object} cart - cart to create a payment for
     * @returns {object} Stripe payment intent
     */
    async createPayment(cart) {
        let {customer_id, region_id, email} = cart
        const region = await this.regionService_.retrieve(region_id)
        const {currency_code} = region

        const cart_items = cart.items;
        const items = [];

        let cart_item;
        for (cart_item of cart_items) {
            let product = await this.stripe_.products.retrieve(cart_item.variant_id)

            let prices = await this.stripe_.prices.list({
                currency: currency_code,
                product: product.id
            })

            let price = prices.data[0]

            items.push({ price: price.id })
        }

        const subscriptionRequest = {
            items: items,
            expand: ['latest_invoice.payment_intent'],
            payment_behavior: 'default_incomplete',
            metadata: {cart_id: `${cart.id}`}
        }

        if (customer_id) {
            const customer = await this.customerService_.retrieve(customer_id)
            email = customer.email

            if (customer.metadata?.stripe_id) {
                subscriptionRequest.customer = customer.metadata.stripe_id
            } else {
                const stripeCustomer = await this.createCustomer({
                    email: email,
                    name: customer.name,
                    id: customer_id,
                })

                subscriptionRequest.customer = stripeCustomer.id
            }
        } else {
            const stripeCustomer = await this.createCustomer({
                email,
            })

            subscriptionRequest.customer = stripeCustomer.id
        }

        const subscriptionStripe = await this.stripe_.subscriptions.create(subscriptionRequest);

        const subscriptionObject = {
            id: subscriptionStripe.id,
            status: subscriptionStripe.status,
            items: subscriptionStripe.items.data
        }

        const subscription = await this.subcriptionService_.create(subscriptionObject)
        const cartUpdate = await this.cartService_.update(cart.id, {
            subscription_id: subscription.id,
            external_id: subscriptionStripe.latest_invoice.id
        })
        const invoice = await this.stripe_.invoices.update(subscriptionStripe.latest_invoice.id, {
            metadata: { cart_id: `${cart.id}` }
        })

        return subscriptionStripe
    }

    /**
     * Retrieves Stripe payment intent.
     * @param {object} data - the data of the payment to retrieve
     * @returns {Promise<object>} Stripe payment intent
     */
    async retrievePayment(data) {
        try {
            return this.stripe_.subscriptions.retrieve(data.id,{expand:['latest_invoice','latest_invoice.payment_intent']})
        } catch (error) {
            throw error
        }
    }

    /**
     * Gets a Stripe payment intent and returns it.
     * @param {object} sessionData - the data of the payment to retrieve
     * @returns {Promise<object>} Stripe payment intent
     */
    async getPaymentData(sessionData) {
        try {
            return this.stripe_.subscriptions.retrieve(sessionData.data.id,{expand:['latest_invoice','latest_invoice.payment_intent']})
        } catch (error) {
            throw error
        }
    }

    /**
     * Authorizes Stripe payment intent by simply returning
     * the status for the payment intent in use.
     * @param {object} sessionData - payment session data
     * @param {object} context - properties relevant to current context
     * @returns {Promise<{ status: string, data: object }>} result with data and status
     */
    async authorizePayment(sessionData, context = {}) {
        const stat = await this.getStatus(sessionData.data)

        try {
            return {data: sessionData.data, status: stat}
        } catch (error) {
            throw error
        }
    }

    async updatePaymentData(sessionData, updatedData) {
      return updatedData;
    }

    /**
     * Updates Stripe payment intent.
     * @param {object} sessionData - payment session data.
     * @param {object} update - objec to update intent with
     * @returns {object} Stripe payment intent
     */
    async updatePayment(sessionData, cart) {
        try {
            const stripeId = cart.customer?.metadata?.stripe_id || undefined
            if (stripeId !== sessionData.customer) {
                return this.createPayment(cart)
            } else {
                return sessionData
            }
        } catch (error) {
            throw error
        }
    }

    async deletePayment(payment) {
        try {
            const {id} = payment.data
            return this.stripe_.subscriptions.del(id).catch((err) => {
                if (err.statusCode === 400) {
                    return
                }
                throw err
            })
        } catch (error) {
            throw error
        }

    }

    /**
     * Captures payment for Stripe payment intent.
     * @param {object} paymentData - payment method data from cart
     * @returns {object} Stripe payment intent
     */
    async capturePayment(payment) {
        const {id} = payment.data
        try {
            return  this.stripe_.subscriptions.retrieve(id)
        } catch (error) {
            throw error
        }
    }

    /**
     * Refunds payment for Stripe payment intent.
     * @param {object} paymentData - payment method data from cart
     * @param {number} amountToRefund - amount to refund
     * @returns {string} refunded payment intent
     */
    async refundPayment(payment, amountToRefund) {
        const {id} = payment.data.latest_invoice.payment_intent
        try {
            await this.stripe_.refunds.create({
                amount: Math.round(amountToRefund),
                payment_intent: id,
            })

            return payment.data
        } catch (error) {
            throw error
        }

    }

    /**
     * Cancels payment for Stripe payment intent.
     * @param {object} paymentData - payment method data from cart
     * @returns {object} canceled payment intent
     */
    async cancelPayment(payment) {
        const {id} = payment.data.latest_invoice.payment_intent
        try {
            return this.stripe_.paymentIntents.cancel(id)
        } catch (error) {
            if (error.payment_intent.status === "canceled") {
                return error.payment_intent
            }

            throw error
        }
    }

    /**
     * Creates a product in Stripe.
     * @param {object} product_variant
     * @returns {object} Stripe payment intent
     */
    async createProduct(product_variant) {
        const product_title = product_variant.product.title
        const title =  product_title + " / " + product_variant.title
        const prices = product_variant.prices
        const product = await this.stripe_.products.create({
            id: product_variant.id,
            name: title
        })

        for (let price of prices) {
            let currency = price.currency_code
            const priceStripe = await this.stripe_.prices.create({
                product: product.id,
                recurring: this.getRecurringObject(product_variant),
                currency: currency,
                unit_amount: price.amount
            })
        }

        return product
    }

    /**
     * Update a product in Stripe.
     * @param {object} product_variant
     * @returns {object} Stripe payment intent
     */
    async updateProduct(product_variant) {
        const product_title = product_variant.product.title
        const title =  product_title + " / " + product_variant.title
        const prices = product_variant.prices

        let product = await this.stripe_.products.retrieve(product_variant.id)

        if (product) {
            product = await this.stripe_.products.update(product.id, {
                name: title
            })

            for (let price of prices) {
                let currency = price.currency_code
                const priceStripe = await this.stripe_.prices.update(price.id, {
                    product: product.id,
                    recurring: this.getRecurringObject(product_variant),
                    currency: currency,
                    unit_amount: price.amount
                })
            }
        }

        return product
    }

    /**
     * Delete a product in Stripe.
     * @param {object} product_variant
     * @returns string Stripe payment intent
     */
    async deleteProduct(product_variant) {
        let product = await this.stripe_.products.retrieve(product_variant.id)

        if (product) {
            product = await this.stripe_.products.del(product.id)
        }

        return product
    }

    async retrieveSubscription(subscription_id) {
        const subscriptions = await this.stripe_.subscriptions.retrieve(subscription_id);
        return subscriptions
    }

    async getSubscription(customer_id = null) {
        const subscriptions = await this.stripe_.subscriptions.list({
            customer: customer_id,
            status: 'all',
            expand: ['data.default_payment_method']
        });

        return subscriptions
    }

    async updateSubscription(subscription) {
        const subscriptions = await this.stripe_.subscriptions.update(subscription.id, subscription);
        return subscriptions
    }

    getRecurringObject(product_variant) {
        let recurring = {}

        if (product_variant.subscription_period === 'weekly') {
            recurring = {
                interval: 'week'
            }
        } else if (product_variant.subscription_period === 'monthly' || product_variant.subscription_period === '') {
            recurring = {
                interval: 'month'
            }
        } else if (product_variant.subscription_period === 'annually' || product_variant.subscription_period === 'yearly') {
            recurring = {
                interval: 'year'
            }
        } else {
            recurring = {
                interval: 'day',
                interval_count: Number(product_variant.subscription_period)
            }
        }

        return recurring
    }
}

export default StripeSubscriptionService
