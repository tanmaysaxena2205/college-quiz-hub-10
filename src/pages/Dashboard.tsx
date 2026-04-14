import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, Trophy, Clock, Zap } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface AttemptStats {
  total_attempts: number;
  avg_score: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<AttemptStats>({ total_attempts: 0, avg_score: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: subjectsData }, { data: attemptsData }] = await Promise.all([
        supabase.from("subjects").select("*"),
        supabase.from("quiz_attempts").select("score, total_questions"),
      ]);

      if (subjectsData) setSubjects(subjectsData);
      if (attemptsData && attemptsData.length > 0) {
        const totalAttempts = attemptsData.length;
        const avgScore = attemptsData.reduce((acc, a) => acc + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0), 0) / totalAttempts;
        setStats({ total_attempts: totalAttempts, avg_score: Math.round(avgScore) });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: BookOpen, value: subjects.length, label: "Subjects" },
            { icon: Trophy, value: stats.total_attempts, label: "Quizzes Taken" },
            { icon: Clock, value: `${stats.avg_score}%`, label: "Avg Score" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/50 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Subjects */}
        <div>
          <h2 className="text-xl font-display font-bold text-foreground mb-4">Choose a Subject</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border/50 bg-card/60 animate-pulse">
                  <CardContent className="p-6 h-36" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <Card
                  key={subject.id}
                  className="border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:glow-primary transition-all cursor-pointer group"
                  onClick={() => navigate(`/quiz/${subject.id}`)}
                >
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{subject.icon}</span>
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity text-gradient-primary">
                        Start →
                      </Button>
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground text-lg">{subject.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{subject.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
