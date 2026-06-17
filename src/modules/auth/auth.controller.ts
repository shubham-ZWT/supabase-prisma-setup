import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import { registerUser } from "./auth.service.js";

export const register = asyncHandler(async (req, res) => {
    const { fullname, email, password } = req.body;

    const newUser = await registerUser(fullname, email, password);

    res.status(201).json({ user: newUser });
});