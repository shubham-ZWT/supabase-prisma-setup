import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import { AuthService } from "./auth.service.js";

const authService = new AuthService();

export const register = asyncHandler(async (req, res) => {
    const { fullname, email, password } = req.body;

    const newUser = await authService.registerUser(fullname, email, password);

    res.status(201).json({ user: newUser });
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);

    res.status(200).json({ result });
})

export const registerCompany = asyncHandler(async (req, res) => {
    const { companyName } = req.body

    res.status(201).json({ message: "Company registered successfully" });
});