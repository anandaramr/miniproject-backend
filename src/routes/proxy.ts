import { Router } from "express";

const router = Router()

router.all('/', async (req, res) => {
    try {
        const url = req.query.url as string
        const response = await fetch(url,
            {
                method: req.method,
                headers: { 
                    ...req.headers as HeadersInit, 
                    host: new URL(url).host,
                    "User-Agent": "Mozilla/5.0"
                },
                body: req.method!=="GET" && req.method!=="HEAD" ? JSON.stringify(req.body) : undefined
            }
        )
    
        const statusCode = response.status
    
        const headers: Record<string, string> = {}
        response.headers.forEach((value, key) => {
            headers[key] = value
        })
    
        delete headers['content-encoding']
        delete headers['access-control-allow-origin']
        res.set(headers).status(statusCode)
    
        const contentType = response.headers.get('content-type') || 'application/octet-stream'
    
        if (contentType.includes('application/json')) {
            const data = await response.json()
            res.json(data)
        } else if (contentType.includes("text") || contentType.includes("html")) {
            const data = await response.text()
            res.send(data)
        } else {
            response.body?.pipeTo(new WritableStream({
                write(chunk) { res.write(chunk) },
                close() { res.end() }
            }))
        }
    } catch (err) {
        res.status(500).send("Proxy Error: " + (err as Error).message)
    }
})

export default router