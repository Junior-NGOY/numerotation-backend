import express from "express";
import {
  createUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword
} from "@/controllers/users";
import { authenticateToken, authorizeRoles } from "@/middleware/auth";
import { validate, validateId, validatePagination } from "@/middleware/validateRequest";
import {
  createUserSchema,
  loginUserSchema,
  updateUserSchema,
  changePasswordSchema,
  paginationSchema,
  idParamSchema
} from "@/middleware/validation";

const userRouter = express.Router();

// Routes publiques
userRouter.post("/register", validate(createUserSchema), createUser);
userRouter.post("/login", validate(loginUserSchema), loginUser);

// Routes protégées (authentification requise)
userRouter.use(authenticateToken);

// Routes utilisateur
userRouter.get("/", authorizeRoles("ADMIN"), validate(paginationSchema), getUsers);
userRouter.get("/:id", validate(idParamSchema), getUserById);
userRouter.put("/:id", validate(idParamSchema), validate(updateUserSchema), updateUser);
userRouter.delete("/:id", authorizeRoles("ADMIN"), validate(idParamSchema), deleteUser);
userRouter.put("/:id/password", validate(idParamSchema), validate(changePasswordSchema), changePassword);

export default userRouter;
