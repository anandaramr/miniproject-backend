import express, { Request, Response } from 'express'
import cors from 'cors'
import proxy from './routes/proxy'

const app = express()
app.use(express.json())
app.use(cors())

app.use('/proxy', proxy)

app.listen(3000, () => {
    console.log("Listening at 3000")
})