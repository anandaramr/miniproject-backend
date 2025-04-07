import express, { Request, Response } from 'express'
import cors from 'cors'
import proxy from './routes/proxy'
import auth from './routes/auth'
import projects from './routes/projects'
import echo from './routes/echo'

const app = express()
app.use(express.json())
app.use(cors())

app.use('/proxy', proxy)
app.use('/echo', echo)
app.use('/auth', auth)
app.use('/projects', projects)

app.listen(3000, () => {
    console.log("Listening at 3000")
})