import { Router, Response as ExpResponse } from "express"

const router = Router()

router.all('/', (req, res) => {
    const response = {
        method: req.method,
        args: req.query,
        data: req.body,
        host: req.hostname,
        path: req.path,
        headers: req.headers,
        ip: req.ip,
        isBase64Encoded: isBase64(req.body),
        timestamp: new Date().toISOString()
    }

    res.status(200).json(response)
})

function isBase64(parsedBody: any) {
    const body = JSON.stringify(parsedBody)

    try {
        return Buffer.from(body, 'base64').toString('base64') === body;
    } catch {
        return false;
    }
}

export default router
