export default async (req, res) => {
  const { id } = req.params
  console.log(req,'req.body')
  const value = req.body

  const subscriptionService = req.scope.resolve("subscriptionService")

  await subscriptionService.update(id, value)

  const subscription = await subscriptionService.retrieve(id)

  res.status(200).json({ subscription })
}
