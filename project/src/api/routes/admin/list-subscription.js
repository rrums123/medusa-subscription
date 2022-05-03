export default async (req, res) => {
    try {
        const subscriptionService = req.scope.resolve("subscriptionService")
        let subscriptions = await subscriptionService.list()
        res.status(200).json({ subscriptions: subscriptions })
    } catch (err) {
        console.log(err)
        throw err
    }
}
