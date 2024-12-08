# AI Sokkuri Photo Generator

An AI-powered photo generation application that allows users to create personalized AI models from their photos. Upload 4 photos to train a custom model, then use text prompts to generate new images in your style. Features Google authentication and a credit-based system powered by Stripe.

## Features

- Personalized AI Model Creation
  - Train custom AI models from 4 of your photos
  - Each model captures your unique style and characteristics
  - Real-time training progress tracking
  - Multiple models per user supported

- AI Image Generation
  - Generate new photos using your trained models
  - Text-to-image generation with custom prompts
  - High-quality image output
  - Download generated images directly

- User Management
  - Google OAuth authentication
  - Credit-based system for model training and image generation
  - Secure payment processing with Stripe
  - View and manage your models and generated images

- Modern User Experience
  - Intuitive drag-and-drop photo upload
  - Real-time progress indicators
  - Responsive design for all devices
  - Gallery view for generated images

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
- **Description**: Upload exactly 4 photos for model training
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `photo1`, `photo2`, `photo3`, `photo4`: Training photos (all required)
  - Max size: 5MB per photo
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
