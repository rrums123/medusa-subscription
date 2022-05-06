import admin from "./routes/admin"
import store from "./routes/store"
import { Router } from "express"
import bodyParser from "body-parser"
export default () => {
    const router = Router()
    router.use(bodyParser.json())
    admin(router)
    store(router)

    return router;
}
