import admin from "./routes/admin"
import store from "./routes/store"
import {Router} from "express"
import bodyParser from "body-parser"
import {MedusaError} from "medusa-core-utils";

export default () => {
    const router = Router()

    admin(router)
    store(router)

    return router;
}
