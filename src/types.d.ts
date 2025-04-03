import { Response } from "express"

export type JwtPayload = { 
    userId: number,
    username: string
}

export type AuthResponse = Response & {
    user?: any
}