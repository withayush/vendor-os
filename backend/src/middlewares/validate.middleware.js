import { ZodError } from "zod";

export const validate = (schema) => async (req, res, next) => {
  try {
    const result = await schema.safeParseAsync({
      body: req.body,
    });

    // -----------------------------------------
    // Validation failed
    // -----------------------------------------

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        field: err.path
          .filter((part) => part !== "body")
          .join("."),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // -----------------------------------------
    // Validation successful
    // -----------------------------------------

    // result.data contains the parsed/transformed data
    //
    // Example:
    // {
    //   body: {
    //     email: "ayush@gmail.com",
    //     phone: "+919876543210"
    //   }
    // }

    req.body = result.data.body;

    next();
  } catch (error) {
    next(error);
  }
};

export default validate;