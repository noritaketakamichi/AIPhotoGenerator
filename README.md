# Photo ZIP Manager

A modern web application for processing and converting images to ZIP format. Upload exactly 4 photos, and get them processed, compressed, and packaged into a convenient ZIP file with cloud storage integration.

## Features

- Upload exactly 4 photos (max 5MB each)
- Automatic image processing and optimization
- ZIP file creation with compressed images
- Progress tracking and status indicators
- Cloud storage integration with FAL.ai
- PostgreSQL database for upload tracking
- Modern, responsive UI with drag-and-drop support
- Secure payment integration with Stripe
- Credit-based system for photo generation

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: FAL.ai
- **Image Processing**: Sharp
- **File Compression**: Archiver
- **Payment Processing**: Stripe

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- FAL.ai API key

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
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/noritaketakamichi/AIPhotoGenerator.git
cd photo-zip-manager
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

### Payment Integration

#### Stripe Setup
1. Configure Stripe environment variables:
```env
STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

2. Credit System:
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
  - **Response**: Stripe session ID
  ```json
  {
    "id": "cs_test_..."
  }
  ```

- **Webhook Handler**
  - **Endpoint**: `POST /api/stripe-webhook`
  - **Description**: Handles successful payments and updates user credits
  - **Headers**:
    - `stripe-signature`: Webhook signature for verification
  - **Events Handled**:
    - `checkout.session.completed`: Credits are added to user account
  - **Response**: 200 OK on success

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
