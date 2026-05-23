export const validate = (schemas) => (req, res, next) => {
  for (const [target, schema] of Object.entries(schemas)) {
    const parsed = schema.safeParse(req[target]);

    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || 'Invalid request payload.',
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req[target] = parsed.data;
  }

  next();
};
