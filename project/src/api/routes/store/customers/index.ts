import { Router } from "express"
import middlewares from "@medusajs/medusa/dist/api/middlewares"

const route = Router()

export default (app) => {
  app.use("/customers", route)
  // Authenticated endpoints
  route.use(middlewares.authenticate())

  route.get("/me/subscriptions/portal", middlewares.wrap(require("./portal").default))



  return app
}
export * from "./portal"