import express, { Request, Response } from 'express'
import cors from 'cors'
import proxy from './routes/proxy'
import auth from './routes/auth'
import projects from './routes/projects'

const app = express()
app.use(express.json())
app.use(cors())

app.use('/proxy', proxy)
app.use('/auth', auth)
app.use('/projects', projects)

app.post('/', (req, res) => {
    console.log('req.body')
    res.status(200).json(req.body)
})

app.listen(3000, () => {
    console.log("Listening at 3000")
})