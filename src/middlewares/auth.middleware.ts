import { asyncHandler } from "./errorHandler.middleware.js";
import { AppError } from "./errorHandler.middleware.js";

export const superAdminVerify = asyncHandler((req, res, next) => {
    const headers = req.headers;
    const adminSercet = headers["x-admin-secret"];
    console.log(headers);

    if (!adminSercet) {
        throw new AppError("Unauthorized", 401);
    }
    if (adminSercet !== process.env.SUPER_ADMIN_SECRET) {
        throw new AppError("Unauthorized", 401);
    }
    next();
})