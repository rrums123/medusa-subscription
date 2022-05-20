import admin from "./routes/admin"
import store from "./routes/store"
import {Router} from "express"


export default () => {
    const router = Router()

    admin(router)
    store(router)

    return router;
}
