# AI Sokkuri Photo Generator

A modern web application for generating AI-powered photos based on user uploads. The system uses FAL.ai for image processing and training, allows users to create custom models from their photos, and generates new images based on text prompts. The application includes user authentication and a credit-based system powered by Stripe.

## Features

- Upload exactly 4 photos for model training
- AI model training with FAL.ai integration
- Custom model management for each user
- Text-to-image generation using trained models
- Credit-based system for training and generation
- Progress tracking and status indicators
- Modern, responsive UI with drag-and-drop support
- Secure payment integration with Stripe
- User authentication with Google OAuth

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: FAL.ai API
- **Authentication**: Google OAuth
- **Payment Processing**: Stripe
- **State Management**: TanStack Query

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

### Upload Photos
- **Endpoint**: `POST /api/upload`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `photo1`: First photo (required)
  - `photo2`: Second photo (required)
  - `photo3`: Third photo (required)
  - `photo4`: Fourth photo (required)
- **Response**:
```json
{
  "success": true,
  "uploadId": number,
  "falUrl": string
}
```

### Model Training
- **Endpoint**: `POST /api/train`
- **Description**: Initiates model training with uploaded photos
- **Cost**: 20 credits
- **Body**:
```json
{
  "falUrl": string
}
```

### Image Generation
- **Endpoint**: `POST /api/generate`
- **Description**: Generates new images using trained models
- **Cost**: 1 credit per image
- **Body**:
```json
{
  "modelId": number,
  "loraUrl": string,
  "prompt": string
}
```

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
