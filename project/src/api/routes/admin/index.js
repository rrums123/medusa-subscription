import { Router } from "express"
import subscriptionRoutes from "./subscriptions"

const route = Router()

export default (app) => {
    app.use("/admin", route)

    subscriptionRoutes(route)

    return app
}
