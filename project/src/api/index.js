import admin from "./routes/admin"
import { Router } from "express"
import bodyParser from "body-parser"
export default () => {
    const router = Router()
    router.use(bodyParser.json())
    admin(router)

    return router;
}
