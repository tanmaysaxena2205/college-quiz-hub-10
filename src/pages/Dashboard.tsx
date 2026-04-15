import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Zap, LogOut, Settings2, Sparkles, FileText, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [difficulty, setDifficulty] = useState<string>("MEDIUM");
  const [questionType, setQuestionType] = useState<"objective" | "subjective">("objective");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic or syllabus");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { topic: topic.trim(), numQuestions, difficulty: difficulty.toLowerCase(), questionType },
      });

      if (error) throw error;
      if (!data?.questions?.length) throw new Error("No questions generated");

      // Navigate to quiz with AI-generated questions
      navigate("/quiz/ai", {
        state: {
          questions: data.questions,
          topic: topic.trim(),
          timePerQuestion,
          totalTime: timePerQuestion * numQuestions,
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate quiz. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              Home
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button 
  variant="ghost" 
  size="sm" 
  onClick={async () => {
    await signOut(); // This clears the Supabase session
    localStorage.removeItem('isGuest'); // Clean up the guest flag we added earlier
    navigate("/"); // Redirect to your Landing page
  }} 
  className="text-muted-foreground hover:text-foreground"
>
  <LogOut className="w-4 h-4 mr-2" /> Sign Out
</Button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Configure Quiz</h1>
            <p className="text-muted-foreground">Set the parameters for your AI-generated challenge</p>
          </div>
        </div>

        {/* Config Card */}
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 sm:p-8 space-y-8">
          {/* Topic */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-display font-semibold text-foreground">
              <Sparkles className="w-5 h-5 text-primary" />
              Topic or Syllabus
            </label>
            <Textarea
              placeholder="e.g. 'Advanced React Hooks', 'World War II History', 'Python Data Structures'"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[120px] bg-background/50 border-border resize-none text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-foreground text-sm">Number of Questions</span>
                <span className="font-display font-bold text-primary text-lg">{numQuestions}</span>
              </div>
              <Slider
                value={[numQuestions]}
                onValueChange={(v) => setNumQuestions(v[0])}
                min={3}
                max={20}
                step={1}
                className="w-full"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-foreground text-sm">Time per Question (sec)</span>
                <span className="font-display font-bold text-yellow-400 text-lg">{timePerQuestion}s</span>
              </div>
              <Slider
                value={[timePerQuestion]}
                onValueChange={(v) => setTimePerQuestion(v[0])}
                min={15}
                max={120}
                step={5}
                className="w-full"
              />
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <span className="font-display font-semibold text-foreground text-sm">Difficulty Level</span>
            <div className="flex gap-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "px-6 py-2.5 rounded-full text-sm font-semibold transition-all",
                    difficulty === d
                      ? "bg-gradient-primary text-primary-foreground glow-primary"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || !topic.trim()}
          className="w-full h-14 text-lg rounded-2xl font-display font-semibold"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Generating Questions...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate & Start Quiz
            </>
          )}
        </Button>
      </main>
    </div>
  );
};

export default Dashboard;
