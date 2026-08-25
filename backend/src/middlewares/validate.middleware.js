export const validate = (schema) => async (req, res, next) => {
  try {
    // Parse and sanitize input
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Replace req properties with sanitized & transformed data
    req.body = parsed.body ?? req.body;
    req.query = parsed.query ?? req.query;
    req.params = parsed.params ?? req.params;

    next();
  } catch (error) {
    // Format Zod validation errors
    const errors = error.errors?.map((err) => ({
      field: err.path.filter((p) => p !== "body" && p !== "query" && p !== "params").join("."),
      message: err.message,
    })) || [{ message: "Invalid request payload." }];

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }
};