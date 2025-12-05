# Deployment Guide - GitHub & Netlify

This guide will help you deploy your Diabetes Management App to GitHub and Netlify.

## 📦 Step 1: Create GitHub Repository

### Option A: Using GitHub Web Interface

1. **Go to GitHub**: Visit [github.com](https://github.com) and sign in
2. **Create New Repository**:
   - Click the "+" icon in the top right → "New repository"
   - Repository name: `diabet-app` (or your preferred name)
   - Description: "Diabetes Management Application"
   - Choose **Public** or **Private**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
   - Click "Create repository"

3. **Copy the repository URL** (you'll need it in the next step)

### Option B: Using GitHub CLI

```bash
gh repo create diabet-app --public --source=. --remote=origin --push
```

## 🔗 Step 2: Connect Local Repository to GitHub

After creating the GitHub repository, connect your local repository:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/diabet-app.git

# Verify the remote was added
git remote -v

# Push your code to GitHub
git branch -M main
git push -u origin main
```

If you're using SSH instead of HTTPS:

```bash
git remote add origin git@github.com:YOUR_USERNAME/diabet-app.git
git push -u origin main
```

## 🚀 Step 3: Deploy to Netlify

### Option A: Connect via Netlify Dashboard (Recommended)

1. **Sign up/Login to Netlify**:
   - Go to [netlify.com](https://www.netlify.com)
   - Sign up or log in (you can use your GitHub account)

2. **Add New Site**:
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub" as your Git provider
   - Authorize Netlify to access your GitHub account if prompted
   - Select your repository: `diabet-app`

3. **Configure Build Settings**:
   - **Branch to deploy**: `main`
   - **Build command**: `pnpm run build` (or `npm run build` if using npm)
   - **Publish directory**: `dist`
   - These settings should be auto-detected from `netlify.toml`

4. **Add Environment Variables**:
   - Click "Show advanced" → "New variable"
   - Add the following variables:
     - `VITE_SUPABASE_URL` = `https://bxhrkgyfpepniulhvgqh.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your key)
   
   **Important**: Get these values from your `.env` file

5. **Deploy**:
   - Click "Deploy site"
   - Wait for the build to complete (usually 2-3 minutes)
   - Your site will be live at: `https://your-site-name.netlify.app`

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize and Deploy**:
   ```bash
   # Initialize (follow prompts)
   netlify init

   # Build your site
   pnpm run build

   # Deploy
   netlify deploy --prod
   ```

4. **Set Environment Variables**:
   ```bash
   netlify env:set VITE_SUPABASE_URL "https://bxhrkgyfpepniulhvgqh.supabase.co"
   netlify env:set VITE_SUPABASE_ANON_KEY "your_anon_key_here"
   ```

## ✅ Step 4: Verify Deployment

1. Visit your Netlify site URL
2. Test the application:
   - Try logging in
   - Check if the dashboard loads
   - Verify API connections are working

## 🔄 Step 5: Automatic Deployments

Netlify will automatically deploy whenever you push to the `main` branch:

```bash
# Make changes to your code
git add .
git commit -m "Your commit message"
git push origin main

# Netlify will automatically build and deploy your changes
```

You can see deployment status in the Netlify dashboard.

## 🌐 Custom Domain (Optional)

1. In Netlify Dashboard → Site settings → Domain management
2. Click "Add custom domain"
3. Follow the instructions to configure DNS

## 🔐 Environment Variables Summary

### Required in Netlify:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Required in Supabase Dashboard (Edge Functions):
- `OPENAI_API_KEY` - Your OpenAI API key (for AI features)

## 📝 Notes

- The `netlify.toml` file is already configured with the correct build settings
- All routes redirect to `index.html` for client-side routing to work
- Security headers are configured in `netlify.toml`
- Your `.env` file is not committed (it's in `.gitignore`)

## 🐛 Troubleshooting

### Build Fails
- Check Netlify build logs for errors
- Ensure Node version is 18+ (configured in `netlify.toml`)
- Verify `package.json` has correct build script

### Environment Variables Not Working
- Make sure variables start with `VITE_` prefix
- Redeploy after adding/changing environment variables
- Check variable names match exactly (case-sensitive)

### Site Not Loading
- Check browser console for errors
- Verify Supabase URL and keys are correct
- Check Netlify function logs if using edge functions

## 🆘 Need Help?

- [Netlify Documentation](https://docs.netlify.com/)
- [GitHub Documentation](https://docs.github.com/)
- Check your Netlify dashboard for deployment logs

