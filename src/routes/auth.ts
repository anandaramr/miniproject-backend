import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Pool from '../database'
import { AuthResponse, JwtPayload } from '../types.js'
import { authorize } from '../utils'

const router = Router()

router.get('/', authorize, (req, res: AuthResponse) => {
    Pool.from('Users').select().eq('user_id', res.user?.userId)
    .then(({ data, error}) => {
        if (error) {
            res.status(500).json({ error: error.message })
            return;
        }

        res.status(200).json(data[0])
    })
})

router.post('/register', async (req,res) => {
    if(req.body.username.length<3) {
        res.status(400).json({ error: "Username field should have atleast 3 characters"})
        return;
    }
    if(req.body.password.length<4) {
        res.status(400).json({ error: "Password field should have atleast 4 characters"})
        return;
    }

    const username = req.body.username
    bcrypt.hash(req.body.password, 10, (err, password) => {
        if(err) return res.status(500).json({ err });

        Pool.from('Users').insert({ username, password }).select()
        .then(async result => {
            if (result.error) {
                res.status(400).json(result.error.message);
                return;
            }

            const user = result.data?.at(0)
            const data = { userId: user.user_id, username: user.username }
            const accessToken = getAccessToken(data)
            const refreshToken = await getRefreshToken(data)
            res.status(201).json({ accessToken, refreshToken })
        })
    })

})

router.post('/login', async (req,res) => {
    const username = req.body.username
    const password = req.body.password

    const { data, error } = await Pool.from('Users').select('user_id, username, password').eq('username', username);
    if (error) {
        res.status(500).json(error);
        return;
    }
    
    const [user] = data
    if (!user) {
        res.status(404).json("User not found");
        return;
    }

    bcrypt.compare(password, user.password, async (err, result) => {
        if(err) return res.status(500).json({ error: err.message })
        if(!result) return res.status(200).json({ error: "Wrong Password" });

        const data = { userId: user.user_id, username: user.username }
        const accessToken = getAccessToken(data)
        const refreshToken = await getRefreshToken(data)
        res.status(201).json({ accessToken, refreshToken })
    })
})

router.post('/refresh', (req,res) => {
    const token = req.body.token
    if(!token) {
        res.status(400).json({ error: "Token not found" });
        return;
    }

    Pool.from("Tokens").delete().eq('token', token).select()
    .then((result) => {
        if(!result.data?.length) return res.status(403).json({ error: "invalid refresh token" });

        jwt.verify(token, process.env.REFRESH_KEY as string, async (err: any, result: any) => {
            if(err) return res.status(403).json({ error: err.message });
            
            const { userId, username } = result
            const accessToken = getAccessToken({ userId, username })
            const refreshToken = await getRefreshToken({ userId, username })
            res.status(201).json({ accessToken, refreshToken })
        })
    })
})

router.post('/logout', (req,res: AuthResponse) => {
    console.log(req.body)
    const token = req.body.token
    if(!token) {
        res.status(400).json({ error: "Token not found" });
        return;
    }
    
    jwt.verify(token, process.env.REFRESH_KEY as string, (err: any, user: any) => {
        if(err) return res.status(403).json({ error: "Unauthorized access" });
    
        Pool.from('Tokens').delete().eq('token', token).select()
        .then(result => {
            const tokenExists = result.data?.length
            if(!tokenExists) return res.status(201).json({ error: "Invalid session" });

            const { userId, username } = user
            res.status(201).json({ message: "Logged out successfully", userId, username })
        })
    })
})

function getAccessToken(data: JwtPayload) {
    return jwt.sign(data, process.env.ACCESS_KEY as string, { expiresIn: '1h' })
}

async function getRefreshToken(data: JwtPayload) {
    const token =  jwt.sign(data, process.env.REFRESH_KEY as string, { expiresIn: '1d' })
    return await Pool.from('Tokens').insert({ token })
    .then(() => token)
}

export default router