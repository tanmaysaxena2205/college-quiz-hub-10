import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
}

const Quiz = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAI = subjectId === "ai";
  const stateData = location.state as {
    questions?: Question[];
    topic?: string;
    totalTime?: number;
  } | null;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [totalTime, setTotalTime] = useState(300);

  useEffect(() => {
    if (isAI && stateData?.questions) {
      setQuestions(stateData.questions);
      setSubjectName(stateData.topic || "AI Quiz");
      const t = stateData.totalTime || 300;
      setTotalTime(t);
      setTimeLeft(t);
      setLoading(false);
    } else if (!isAI && subjectId) {
      const fetchQuestions = async () => {
        const [{ data: questionsData }, { data: subjectData }] = await Promise.all([
          supabase.from("questions").select("*").eq("subject_id", subjectId),
          supabase.from("subjects").select("name").eq("id", subjectId).single(),
        ]);
        if (questionsData) setQuestions(questionsData);
        if (subjectData) setSubjectName(subjectData.name);
        setTotalTime(300);
        setTimeLeft(300);
        setLoading(false);
      };
      fetchQuestions();
    } else {
      navigate("/dashboard");
    }
  }, [subjectId, isAI, stateData, navigate]);

  const submitQuiz = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    const isGuest = !user;

    let score = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_option) score++;
    });

    const timeTaken = totalTime - timeLeft;

    if (isAI || isGuest) {
      // For AI quizzes or guest users, navigate to results with state (no DB save)
      navigate("/results/ai", {
        state: {
          score,
          total_questions: questions.length,
          time_taken_seconds: timeTaken,
          topic: subjectName,
          questions,
          answers,
        },
      });
    } else {
      const { data: attempt, error } = await supabase
        .from("quiz_attempts")
        .insert({
          user_id: user!.id,
          subject_id: subjectId!,
          score,
          total_questions: questions.length,
          time_taken_seconds: timeTaken,
        })
        .select()
        .single();

      if (error || !attempt) {
        toast.error("Failed to submit quiz");
        setSubmitting(false);
        return;
      }

      const answerRows = questions.map((q) => ({
        attempt_id: attempt.id,
        question_id: q.id,
        selected_option: answers[q.id] || null,
        is_correct: answers[q.id] === q.correct_option,
      }));

      await supabase.from("quiz_answers").insert(answerRows);
      navigate(`/results/${attempt.id}`);
    }
  }, [submitting, user, questions, answers, timeLeft, totalTime, subjectId, isAI, subjectName, navigate]);

  useEffect(() => {
    if (loading || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, questions.length, submitQuiz]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-grid">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-grid">
        <Card className="max-w-md w-full mx-4 bg-card/80 border-border/50">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-lg font-display font-semibold text-foreground">No questions available</p>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = questions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const options = [
    { key: "A", text: current.option_a },
    { key: "B", text: current.option_b },
    { key: "C", text: current.option_c },
    { key: "D", text: current.option_d },
  ];

  return (
    <div className="min-h-screen bg-background bg-grid">
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-display font-semibold text-foreground">{subjectName}</p>
            <p className="text-xs text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
            timeLeft < 60 ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"
          )}>
            <Clock className="w-4 h-4" />
            {minutes}:{seconds.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2">
          <Progress value={progress} className="h-1.5" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8">
            <p className="text-lg font-medium text-foreground leading-relaxed">{current.question_text}</p>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: opt.key }))}
              className={cn(
                "w-full text-left p-4 rounded-xl border-2 transition-all",
                answers[current.id] === opt.key
                  ? "border-primary bg-accent glow-primary text-foreground shadow-sm"
                  : "border-border/50 bg-card/60 hover:border-primary/30 text-foreground"
              )}
            >
              <span className={cn(
                "inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-semibold mr-3",
                answers[current.id] === opt.key
                  ? "bg-gradient-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}>
                {opt.key}
              </span>
              {opt.text}
            </button>
          ))}
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button onClick={submitQuiz} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex((i) => i + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-center pt-4">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                i === currentIndex
                  ? "bg-gradient-primary text-primary-foreground glow-primary"
                  : answers[q.id]
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Quiz;
