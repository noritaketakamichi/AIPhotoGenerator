# TypeScript Integration Notes

## Known Type Definition Issues

### Request Type Handling
```typescript
// Current implementation with type assertion
const asyncHandler: AsyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req as any, res, next);
  } catch (error) {
    next(error);
  }
};
```

#### Problem
The Express Request type doesn't properly handle Multer's file upload types. The type `File[]` is not assignable to `{ [fieldname: string]: File[]; }`.

#### Current Solution
We use a custom Request type that extends Express.Request:
```typescript
interface CustomRequest<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = ParsedQs> {
  files?: { [fieldname: string]: Express.Multer.File[] };
  // ... other properties
}
```

### Authentication Type Issues

#### Problem
Passport.js types don't properly integrate with Express session types, causing conflicts with user authentication.

#### Current Solution
We extend the Express namespace and session module:
```typescript
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      credit: number;
      created_at: Date;
    }
  }
}
```

### Future Improvements
1. Replace type assertions with proper type definitions
2. Create custom type definitions for Multer integration
3. Implement proper generic constraints for route handlers
4. Add comprehensive type testing

## Best Practices
1. Use type guards for authenticated requests
2. Avoid `any` types except in specific middleware cases
3. Maintain strict type checking for API responses
4. Document any necessary type assertions
