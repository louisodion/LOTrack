import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Enter your name"),
  businessName: z.string().min(2, "Enter your business name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const onboardingSchema = z.object({
  businessName: z.string().min(2, "Enter your business name"),
  businessType: z.string().min(2, "Select a business type"),
  currency: z.string().min(2, "Select a currency"),
  defaultLowStockThreshold: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number().min(1, "Threshold must be at least 1"),
  ),
});

export const productSchema = z.object({
  name: z.string().min(2, "Enter a product name"),
  sku: z.string().min(2, "Enter a product SKU"),
  quantity: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number().min(0, "Quantity must be at least 0"),
  ),
  price: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number().min(0, "Price must be at least 0"),
  ),
  reorder_threshold: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number().min(1, "Reorder threshold must be at least 1"),
  ),
});

export const stockMovementSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  type: z.enum(["stock_in", "stock_out", "sale", "return", "adjustment"]),
  quantity: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number().min(1, "Quantity must be at least 1"),
  ),
  note: z.string().max(240, "Note must be 240 characters or less").optional(),
});
