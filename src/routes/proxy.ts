import { Router, Request, Response as ExpResponse } from "express"

const router = Router()

router.all('/', async (req, res) => {
    try {
        const url = req.query.url as string
        const method = req.method
        const body = parseBody(req)
        const headers = processRequestHeaders(req)

        const response = await fetch(url, { method, headers, body })
        await sendResponse(response, res)
    } catch (err) {
        res.status(500).send("Proxy Error: " + (err as Error).message)
    }
})

async function sendResponse(response: Response, res: ExpResponse) {
    const statusCode = response.status
    
    const resHeaders: Record<string, string> = processResponseHeaders(response)
    res.set(resHeaders).status(statusCode)
    
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
        }));
    }
}

function parseBody(req: Request) {
    if (req.method==="GET" || req.method==="HEAD") {
        return undefined;
    }
    
    const contentType = req.headers['content-type']
    if (contentType?.includes('application/json')) {
        return JSON.stringify(req.body)
    }
    
    if (contentType?.includes('application/x-www-form-urlencoded')) {
        return new URLSearchParams(req.body).toString()
    }
    
    return req.body
}

function processRequestHeaders(req: Request) {
    const headers = { ...req.headers as HeadersInit, "User-Agent": "Mozilla/5.0" } as Record<string, string>
    
    delete headers["content-length"]
    delete headers["connection"]
    
    return headers
}

function processResponseHeaders(response: Response) {
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
        headers[key] = value
    })
    
    delete headers['content-encoding']
    return headers
}



export default router