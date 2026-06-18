import { Router } from "express";
import { register, registerCompany, login } from "./auth.controller.js";
import { superAdminVerify } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/register/company", superAdminVerify, registerCompany);
router.post("/login", login)

export default router;