import { Router } from "express"
import "reflect-metadata"
import middlewares from "@medusajs/medusa/dist/api/middlewares"

const route = Router()

export default (app) => {
    app.use("/subscriptions", route)

    route.get(
        "/",
        middlewares.normalizeQuery(),
        middlewares.wrap(require("./list-subscriptions").default)
    )

    route.get(
        "/:id",
        middlewares.normalizeQuery(),
        middlewares.wrap(require("./get-subscription").default)
    )

    route.delete("/:id", middlewares.wrap(require("./delete-subscription").default))

    return app
}
export * from "./list-subscriptions"
export * from "./get-subscription"
export * from "./update-subscription"
export * from "./delete-subscription"
