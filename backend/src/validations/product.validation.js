import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Product name is required"),
    sku: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    sellingPrice: z.number({ required_error: "Selling price is required" }),
    costPrice: z.number().optional().nullable(),
    unit: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    categoryName: z.string().optional().nullable(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    sku: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    sellingPrice: z.number().optional(),
    costPrice: z.number().optional().nullable(),
    unit: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    categoryName: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});