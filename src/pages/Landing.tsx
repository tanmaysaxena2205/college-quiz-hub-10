import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background bg-grid relative overflow-hidden">
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 2}s`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">
              <span className="text-foreground">QUIZ</span>
              <span className="text-gradient-primary">MASTERMIND</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(user ? "/dashboard" : "/auth")} className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              ⚡ Play Quiz
            </button>
            <Button
              size="sm"
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
            >
              {user ? "Dashboard" : "Sign In"}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 pt-24 pb-32 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary/50 text-sm text-muted-foreground">
          <Star className="w-4 h-4 text-primary" />
          AI-POWERED KNOWLEDGE
        </div>

        <h1 className="text-5xl sm:text-7xl font-display font-extrabold leading-tight text-foreground">
          Master Any Topic.
          <br />
          <span className="text-gradient-primary glow-text">Outsmart Everyone.</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Take quizzes on any subject, track your progress, and prove your knowledge. Built for students who want to ace every exam.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            size="lg"
            className="h-14 px-8 text-base rounded-full"
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
          >
            <Zap className="w-5 h-5 mr-2" />
            Start Your Journey
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 px-8 text-base rounded-full"
            onClick={() => navigate("/auth")}
          >
            Play as Guest
          </Button>
        </div>
      </main>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
