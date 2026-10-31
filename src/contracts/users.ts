import { z } from "zod";
import { UserRoleValues } from "./enums.generated";
import { uuidSchema, dateSchema } from "./common";
export const userSchema = z.object({
  id: uuidSchema,
  phone: z.string().nullable(),
  email: z.string().nullable(),
  role: z.enum(UserRoleValues),
  isActive: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export const updateUserSchema = z
  .object({
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/)
      .optional(),
    email: z.email().optional(),
  })
  .strict();
export type UserResponse = z.infer<typeof userSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
