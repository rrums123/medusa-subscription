export default async (req, res) => {
    const {id} = req.params

    const subscriptionService = req.scope.resolve("subscriptionService")

    const subscription = await subscriptionService.retrieve(id)

    res.json({subscription})
}
