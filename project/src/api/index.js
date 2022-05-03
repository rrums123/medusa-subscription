import { Router } from "express"
import admin from "./routes/admin"
import store from "./routes/store"

// guaranteed to get dependencies
export default (rootDirectory) => {
    const app = Router()

    admin(app, rootDirectory)
    store(app, rootDirectory)

    return app
}
