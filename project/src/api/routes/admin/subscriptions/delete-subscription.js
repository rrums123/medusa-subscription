export default async (req, res) => {
  const { id } = req.params

  const subscriptionService = req.scope.resolve("subscriptionService")
  await subscriptionService.delete(id)
  res.json({
    id,
    object: "subscription",
    deleted: true,
  })
}
