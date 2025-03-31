import { Router, Response as ExpResponse } from "express"

const router = Router()

router.post('/', async (req, res) => {
    try {
        const { url, method, headers, body } = parseRequest(req.body)
        const response = await fetch(url, { method, headers, body })
        await sendResponse(response, res)
    } catch (err) {
        const message = (err as Error).message
        console.log(message)
        res.status(500).json("Proxy Error: " + message)
    }
})

async function sendResponse(response: Response, res: ExpResponse) {
    const status = response.status
    res.status(status)
    
    const contentType = response.headers.get('content-type') || 'text/plain'
    
    if (contentType.includes('application/json')) {
        const data = await response.json()
        return res.json(data)
    }
    
    if (contentType.includes("text")) {
        const data = await response.text()
        return res.send(data)
    }
    
    if (contentType.includes("html")) {
        const data = await response.text()
        res.setHeader('content-type', 'text/html')
        return res.send(data)
    }

    response.body?.pipeTo(new WritableStream({
        write(chunk) { res.write(chunk) },
        close() { res.end() }
    }));
}

function parseRequest(requestBody: any) {
    const { url, method, headers, body: rawBody } = requestBody
    const contentType = headers ? headers['content-type'] : undefined

    let body = rawBody
    if (method==="GET" || method==="HEAD") {
        body = undefined;
    } else if (contentType?.includes('application/json')) {
        body =  JSON.stringify(rawBody)
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        body = new URLSearchParams(rawBody).toString()
    }

    return { url, method, headers, body }
}

export default router