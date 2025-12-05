import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, Stethoscope, Heart } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Heart className="w-12 h-12 text-red-500" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              DiabetesCare
            </h1>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Comprehensive diabetes management platform connecting patients with their care team
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <Activity className="w-10 h-10 text-green-500 mb-2" />
              <CardTitle>Track Your Health</CardTitle>
              <CardDescription className="text-slate-400">
                Log glucose readings, meals, insulin doses, and lab results
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <Stethoscope className="w-10 h-10 text-blue-500 mb-2" />
              <CardTitle>AI-Powered Insights</CardTitle>
              <CardDescription className="text-slate-400">
                Get personalized recommendations based on your health data
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <Users className="w-10 h-10 text-purple-500 mb-2" />
              <CardTitle>Connected Care</CardTitle>
              <CardDescription className="text-slate-400">
                Share data with doctors, nutritionists, and family members
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Main CTAs */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-700/50 backdrop-blur hover:border-green-600/70 transition-all cursor-pointer group">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-all">
                <Activity className="w-10 h-10 text-green-400" />
              </div>
              <CardTitle className="text-2xl mb-2">I am a Patient</CardTitle>
              <CardDescription className="text-slate-300">
                Track your diabetes, log your health data, and get AI-powered insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              >
                Go to Patient App
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-700/50 backdrop-blur hover:border-blue-600/70 transition-all cursor-pointer group">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
                <Stethoscope className="w-10 h-10 text-blue-400" />
              </div>
              <CardTitle className="text-2xl mb-2">I am a Healthcare Provider</CardTitle>
              <CardDescription className="text-slate-300">
                Monitor your patients, review their data, and provide care remotely
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/app/doctor')}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
              >
                Go to Provider Portal
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-slate-400">
          <p className="mb-4">Don't have an account?</p>
          <Button
            variant="outline"
            onClick={() => navigate('/register')}
            className="border-slate-700 hover:bg-slate-800"
          >
            Sign Up Now
          </Button>
        </div>
      </div>
    </div>
  );
}