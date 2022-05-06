import { Router } from "express"
import customerRoutes from "./customers"

const route = Router()

export default (app) => {
    app.use("/store", route)

    customerRoutes(route)

    return app
}
