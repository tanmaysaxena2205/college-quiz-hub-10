import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttemptDetail {
  score: number;
  total_questions: number;
  time_taken_seconds: number | null;
  subject_id: string;
  subjects: { name: string } | null;
}

interface AnswerDetail {
  selected_option: string | null;
  is_correct: boolean;
  questions: {
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
  } | null;
}

const Results = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      const [{ data: attemptData }, { data: answersData }] = await Promise.all([
        supabase
          .from("quiz_attempts")
          .select("score, total_questions, time_taken_seconds, subject_id, subjects(name)")
          .eq("id", attemptId!)
          .single(),
        supabase
          .from("quiz_answers")
          .select("selected_option, is_correct, questions(question_text, option_a, option_b, option_c, option_d, correct_option)")
          .eq("attempt_id", attemptId!),
      ]);

      if (attemptData) setAttempt(attemptData as unknown as AttemptDetail);
      if (answersData) setAnswers(answersData as unknown as AnswerDetail[]);
      setLoading(false);
    };
    fetchResults();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Results not found.</p>
      </div>
    );
  }

  const percentage = attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0;
  const minutes = attempt.time_taken_seconds ? Math.floor(attempt.time_taken_seconds / 60) : 0;
  const seconds = attempt.time_taken_seconds ? attempt.time_taken_seconds % 60 : 0;

  const getOptionText = (q: AnswerDetail["questions"], key: string) => {
    if (!q) return "";
    const map: Record<string, string> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
    return map[key] || "";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground font-display text-lg font-bold flex items-center justify-center">
              Q
            </div>
            <span className="font-display font-bold text-foreground">Results</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Score card */}
        <Card className="border-border/50 overflow-hidden">
          <div className={cn(
            "p-8 text-center",
            percentage >= 70 ? "bg-success/10" : percentage >= 40 ? "bg-primary/10" : "bg-destructive/10"
          )}>
            <p className="text-6xl font-display font-bold text-foreground">{percentage}%</p>
            <p className="text-lg text-muted-foreground mt-2">
              {attempt.score} out of {attempt.total_questions} correct
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {attempt.subjects?.name} • {minutes}m {seconds}s
            </p>
            <p className={cn(
              "mt-3 font-display font-semibold text-lg",
              percentage >= 70 ? "text-success" : percentage >= 40 ? "text-primary" : "text-destructive"
            )}>
              {percentage >= 70 ? "Excellent! 🎉" : percentage >= 40 ? "Good effort! 👍" : "Keep practicing! 💪"}
            </p>
          </div>
        </Card>

        {/* Answer review */}
        <div className="space-y-4">
          <h2 className="font-display font-bold text-lg text-foreground">Review Answers</h2>
          {answers.map((answer, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  {answer.is_correct ? (
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  )}
                  <p className="font-medium text-foreground">{answer.questions?.question_text}</p>
                </div>
                {answer.selected_option ? (
                  <p className={cn("text-sm ml-8", answer.is_correct ? "text-success" : "text-destructive")}>
                    Your answer: {answer.selected_option} — {getOptionText(answer.questions, answer.selected_option)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground ml-8">Not answered</p>
                )}
                {!answer.is_correct && answer.questions && (
                  <p className="text-sm text-success ml-8">
                    Correct: {answer.questions.correct_option} — {getOptionText(answer.questions, answer.questions.correct_option)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 justify-center pt-4">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          {attempt.subject_id && (
            <Button onClick={() => navigate(`/quiz/${attempt.subject_id}`)}>
              <RotateCcw className="w-4 h-4 mr-2" /> Retry Quiz
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Results;
