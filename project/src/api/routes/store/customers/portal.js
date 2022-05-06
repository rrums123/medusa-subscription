export default async (req, res) => {
    const subscriptionService = req.scope.resolve("pp_stripe-subscription")

    const portalSession = await subscriptionService.createPortalSession(req.user.customer_id)
    res.send({portalSession});
}
