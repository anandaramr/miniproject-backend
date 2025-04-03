import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'
import { AuthResponse } from "./types";

export function authorize(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(" ")[1]
    if(!token) {
        res.status(400).json({ error: "Token not found" });
        return;
    }

    jwt.verify(token, process.env.ACCESS_KEY as string, (err, result) => {
        if(err) return res.status(403).json({ error: err.message });
        (res as AuthResponse).user = result
        next()
    })
}