# AI Sokkuri Photo Generator

An AI-powered photo generation application that allows users to create personalized AI models from their photos. Upload 4 photos to train a custom model, then use text prompts to generate new images in your style. Features Google authentication and a credit-based system powered by Stripe.

## Current Status

The application is functional with all core features implemented. There are some TypeScript type definition issues that need to be addressed in a future update, but they don't affect the runtime functionality of the application.

## Features

- Personalized AI Model Creation
  - Train custom AI models from 4 reference photos
  - Capture unique style and characteristics
  - Real-time training progress tracking
  - Support for multiple models per user
  - 20 credits per model training

- AI Image Generation
  - Generate new photos using trained models
  - Text-to-image generation with custom prompts
  - High-quality image output
  - Easy one-click download for generated images
  - 1 credit per image generation

- User Management
### Authentication System

- **Google OAuth Integration**
  - Secure authentication using Google OAuth 2.0
  - Session-based authentication with Express
  - Automatic user profile creation on first login
  - Secure session management with configurable timeout

### Error Handling

- **API Error Responses**
  - Consistent error format across all endpoints
  - Detailed error messages for debugging
  - Credit-related error handling
  - Authentication state validation
  - Rate limiting and request validation

### Type Safety

- **TypeScript Integration**
  - Strict type checking enabled
  - Shared type definitions between client and server
  - Custom type guards for runtime validation
  - Proper error handling types
  - Secure Google OAuth authentication
  - Credit-based system with Stripe integration
  - Easy credit purchase and management
  - Comprehensive model and image gallery
  - Credit usage tracking

- Modern User Experience
  - Simple drag-and-drop photo upload
  - Real-time status indicators
  - Mobile-responsive design
  - Organized gallery with download options
  - Clear credit balance display

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Services**: FAL.ai API for training and generation
- **Authentication**: Google OAuth 2.0
- **Payment**: Stripe integration with webhook support
- **State Management**: TanStack Query v5

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- FAL.ai API key
- Google OAuth credentials
- Stripe account and API keys

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/dbname

# FAL.ai Configuration
FAL_AI_API_KEY=your_fal_ai_key

# Stripe Configuration
STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/noritaketakamichi/AIPhotoGenerator.git
cd ai-photo-generator
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:5000

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## API Documentation

### Model Creation Flow

#### 1. Upload Training Photos
- **Endpoint**: `POST /api/upload`
- **Description**: Upload exactly 4 reference photos for model training
- **Authentication**: Required
- **Cost**: No credit cost for upload (training costs applied separately)
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `photo1`, `photo2`, `photo3`, `photo4`: Reference photos (all required)
  - Max size: 5MB per photo
  - Images must be clear face photos for best results
- **Response**:
```json
{
  "success": true,
  "uploadId": number,
  "falUrl": string
}
```

#### 2. Train AI Model
- **Endpoint**: `POST /api/train`
- **Description**: Create a personalized AI model from uploaded photos
- **Cost**: 20 credits
- **Body**:
```json
{
  "falUrl": string
}
```
- **Response**: Training result including model URLs

### Image Generation

#### Generate New Images
- **Endpoint**: `POST /api/generate`
- **Description**: Create new images using your trained model
- **Cost**: 1 credit per image
- **Body**:
```json
{
  "modelId": number,
  "loraUrl": string,
  "prompt": string
}
```
- **Response**: Generated image URLs and metadata

#### Get User's Models
- **Endpoint**: `GET /api/models`
- **Description**: List all trained models for the current user
- **Authentication**: Required
- **Response**: Array of model information

#### Get Generated Photos
- **Endpoint**: `GET /api/photos`
- **Description**: Retrieve all generated photos for the current user
- **Authentication**: Required
- **Response**: Array of generated photos with metadata

### Payment Integration

#### Credit System
- Training a new model costs 20 credits
- Generating an image costs 1 credit
- Credits can be purchased through the Charge page

#### API Endpoints

- **Create Checkout Session**
  - **Endpoint**: `POST /api/create-checkout-session`
  - **Description**: Creates a Stripe checkout session for credit purchase
  - **Authentication**: Required
  - **Body**:
  ```json
  {
    "credits": number,
    "amount": number
  }
  ```

- **Webhook Handler**
  - **Endpoint**: `POST /api/stripe-webhook`
  - **Description**: Handles successful payments and updates user credits
  - **Headers**:
    - `stripe-signature`: Webhook signature for verification
  - **Events Handled**:
    - `checkout.session.completed`: Credits are added to user account

- **User Credits**
  - **Endpoint**: `GET /api/auth/user`
  - **Description**: Get current user info including credits
  - **Authentication**: Required
  - **Response**:
  ```json
  {
    "id": number,
    "email": string,
## Known Issues

- TypeScript type definitions in routes.ts need refinement:
  - Route handler type mismatches in authentication endpoints
  - Request type definitions need updating for file upload handlers
  - Middleware chain type definitions require updates
  - Missing parenthesis and type definition issues in route handlers (documented in TypeScript errors)
- These issues don't affect runtime functionality but should be addressed in future updates

## Development Roadmap

- [ ] Fix TypeScript syntax errors in routes.ts
- [ ] Refine TypeScript type definitions for route handlers
- [ ] Improve error handling in authentication flow
- [ ] Add comprehensive API response documentation
- [ ] Enhance test coverage
- [ ] Update route handler types to use correct RequestHandler definitions

    "credit": number
  }
  ```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
