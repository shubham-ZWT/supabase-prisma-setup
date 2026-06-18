import { prisma } from "../../configs/prisma.js";
import { supabase } from "../../configs/supabase.js";
import { AppError } from "../../middlewares/errorHandler.middleware.js";
import jwt from "jsonwebtoken"

class AuthService {
    async registerUser(fullname: string, email: string, password: string) {
        if (!fullname || !email || !password) {
            throw new AppError("All fields are required", 400);
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new AppError("User already exists", 400);
        }

        const { data: signUpData, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { fullname }
            }
        });

        if (error) {
            throw new AppError(error.message, 400);
        }

        const supabaseUser = signUpData?.user;
        if (!supabaseUser) {
            throw new AppError("Failed to create user", 400);
        }

        const newUser = await prisma.user.create({
            data: {
                supabaseId: supabaseUser.id,
                fullname,
                email,
            }
        });

        return newUser;
    }

    async loginUser(email: string, password: string) {
        console.log(email, password);

        if (!email || !password) {
            throw new AppError("All fields are required", 400);
        }

        const { data: signInData, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw new AppError(error.message, 400);
        }

        const supabaseUser = signInData?.user;
        if (!supabaseUser) {
            throw new AppError("Failed to create user", 400);
        }

        const user = await prisma.user.findUnique({
            where: { supabaseId: supabaseUser.id }
        });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        const payload = {
            userId: user.id,
            email: user.email
        }
        const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "1h" });


        return {
            user: {
                fullname: user.fullname,
                email: user.email,
            },
            token
        };
    }
}

export { AuthService };