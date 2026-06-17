import { prisma } from "../../configs/prisma.js";
import { supabase } from "../../configs/supabase.js";
import { AppError } from "../../middlewares/errorHandler.middleware.js";

export async function registerUser(fullname: string, email: string, password: string) {
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
