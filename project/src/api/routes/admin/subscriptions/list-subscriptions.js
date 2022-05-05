export default async (req, res) => {
    try {
        const value = req.query
        const subscriptionService = req.scope.resolve("subscriptionService")

        const listConfig = {
            //select: includeFields.length ? includeFields : defaultAdminOrdersFields,
            //relations: expandFields.length ? expandFields : defaultAdminOrdersRelations,
            skip: parseInt(value.offset, 10),
            take: parseInt(value.limit, 10),
            order: { created_at: "DESC" },
        }

        const [subscriptions, count] = await subscriptionService.listAndCount(listConfig)

        res.json({ subscriptions:subscriptions, count, offset: listConfig.skip, limit: listConfig.take })
    } catch (err) {
        console.log(err)
        throw err
    }
}
