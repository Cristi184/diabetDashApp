# Diabet App - Diabetes Management Application

A comprehensive diabetes management application built with React, TypeScript, and Supabase. This app helps patients track their glucose readings, meals, lab results, and treatments while enabling healthcare providers to monitor and communicate with their patients.

## 🚀 Features

### For Patients
- **Dashboard**: Real-time glucose trends with meal and treatment tracking
- **Glucose Logs**: Track and manage blood glucose readings with pagination and filtering
- **Meal Tracking**: Log meals with nutritional information (carbs, protein, fat, calories)
- **Lab Results**: Store and view laboratory test results
- **Treatment Logs**: Track insulin doses and medication
- **AI Chat**: Get AI-powered diabetes management advice
- **Messages**: Direct communication with healthcare providers
- **Care Team**: Manage connections with doctors, nutritionists, and family members
- **Multi-language Support**: Available in English, Spanish, French, German, Chinese, and Romanian

### For Healthcare Providers
- **Patient Dashboard**: View patient health data and trends
- **Patient Management**: Access detailed patient charts and history
- **Messaging**: Communicate directly with patients
- **Real-time Monitoring**: Track patient progress over time

## 🛠️ Technology Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, Authentication, Storage, Edge Functions)
- **State Management**: Zustand + React Query
- **Charts**: Recharts
- **Routing**: React Router
- **Internationalization**: react-i18next
- **AI Integration**: OpenAI API (via Supabase Edge Functions)

## 📋 Prerequisites

- Node.js 18+ 
- pnpm 8+ (or npm/yarn)
- Supabase account
- OpenAI API key (for AI features)

## 🔧 Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Diabet-app
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For reference, see `.env.example`.

### 4. Configure Supabase Edge Functions

Set the OpenAI API key in your Supabase Dashboard:
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add secret: `OPENAI_API_KEY` = `your_openai_api_key`

Or using Supabase CLI:
```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

### 5. Run the development server

```bash
pnpm run dev
```

The app will be available at `http://localhost:5173`

## 🏗️ Build for Production

```bash
pnpm run build
```

The built files will be in the `dist` directory.

## 🚢 Deployment

### Deploy to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Configure build settings:
   - **Build command**: `pnpm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18` (or higher)
4. Add environment variables in Netlify Dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy!

The `netlify.toml` file is already configured for automatic deployments.

## 📁 Project Structure

```
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # shadcn/ui components
│   │   └── ...
│   ├── contexts/       # React contexts (Auth, etc.)
│   ├── hooks/          # Custom React hooks
│   ├── i18n/           # Internationalization files
│   ├── lib/            # Utility functions and API clients
│   └── pages/          # Page components
│       └── doctor/     # Doctor-specific pages
├── supabase/
│   ├── functions/      # Supabase Edge Functions
│   └── migrations/     # Database migrations
├── .env                # Environment variables (not committed)
├── .env.example        # Environment variables template
├── netlify.toml        # Netlify configuration
└── package.json
```

## 🔐 Security Notes

- Never commit your `.env` file
- The Supabase anon key is safe to use in client-side code (Row Level Security is configured)
- The service role key should only be used in server-side code (Edge Functions)
- OpenAI API key is stored as a secret in Supabase Edge Functions

## 📝 Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build locally
- `pnpm run lint` - Run ESLint

## 🌍 Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Chinese (zh)
- Romanian (ro)

## 📄 License

[Add your license here]

## 👥 Contributors

[Add contributors here]

## 📞 Support

[Add support information here]
