import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowLeft, RotateCcw, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObjectiveQuestion {
  id: string;
  question_text: string;
  question_type: "objective";
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
}

interface SubjectiveQuestion {
  id: string;
  question_text: string;
  question_type: "subjective";
  is_coding: boolean;
  model_answer: string;
  max_marks: number;
  grading_criteria: string;
}

type Question = ObjectiveQuestion | SubjectiveQuestion;

interface GradeResult {
  score: number;
  feedback: string;
  correct_points: string[];
  missed_points: string[];
}

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

interface AIResultState {
  questionType: "objective" | "subjective";
  score?: number;
  total_questions: number;
  time_taken_seconds: number;
  topic: string;
  questions: Question[];
  answers: Record<string, string>;
}

const Results = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isAI = attemptId === "ai";
  const aiState = location.state as AIResultState | null;

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [dbAnswers, setDbAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [grades, setGrades] = useState<Record<string, GradeResult>>({});

  useEffect(() => {
    if (isAI && aiState) {
      if (aiState.questionType === "subjective") {
        // Grade subjective answers with AI
        gradeSubjectiveAnswers();
      } else {
        setAttempt({
          score: aiState.score || 0,
          total_questions: aiState.total_questions,
          time_taken_seconds: aiState.time_taken_seconds,
          subject_id: "",
          subjects: { name: aiState.topic },
        });
        setLoading(false);
      }
    } else if (!isAI) {
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
        if (answersData) setDbAnswers(answersData as unknown as AnswerDetail[]);
        setLoading(false);
      };
      fetchResults();
    } else {
      navigate("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, isAI]);

  const gradeSubjectiveAnswers = async () => {
    if (!aiState) return;
    setGrading(true);

    const gradeResults: Record<string, GradeResult> = {};
    let totalScore = 0;
    let totalMaxMarks = 0;

    for (const q of aiState.questions) {
      if (q.question_type !== "subjective") continue;
      const subQ = q as SubjectiveQuestion;
      const userAnswer = aiState.answers[q.id] || "(no answer provided)";
      totalMaxMarks += subQ.max_marks;

      try {
        const { data, error } = await supabase.functions.invoke("grade-answer", {
          body: {
            question: subQ.question_text,
            userAnswer,
            modelAnswer: subQ.model_answer,
            maxMarks: subQ.max_marks,
            gradingCriteria: subQ.grading_criteria,
            isCoding: subQ.is_coding,
          },
        });

        if (error) throw error;

        const grade: GradeResult = {
          score: data.score ?? 0,
          feedback: data.feedback ?? "Could not grade",
          correct_points: data.correct_points ?? [],
          missed_points: data.missed_points ?? [],
        };

        gradeResults[q.id] = grade;
        totalScore += grade.score;
      } catch {
        gradeResults[q.id] = {
          score: 0,
          feedback: "Failed to grade this answer",
          correct_points: [],
          missed_points: [],
        };
      }
    }

    setGrades(gradeResults);
    setAttempt({
      score: totalScore,
      total_questions: aiState.total_questions,
      time_taken_seconds: aiState.time_taken_seconds,
      subject_id: "",
      subjects: { name: aiState.topic },
    });
    setGrading(false);
    setLoading(false);
  };

  if (loading || grading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background bg-grid gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        {grading && (
          <div className="text-center space-y-2">
            <p className="text-foreground font-display font-semibold">AI is grading your answers...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        )}
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-grid">
        <p className="text-muted-foreground">Results not found.</p>
      </div>
    );
  }

  const isSubjective = isAI && aiState?.questionType === "subjective";
  const totalMaxMarks = isSubjective
    ? aiState!.questions.reduce((sum, q) => sum + (q.question_type === "subjective" ? (q as SubjectiveQuestion).max_marks : 0), 0)
    : attempt.total_questions;
  const percentage = totalMaxMarks > 0 ? Math.round((attempt.score / totalMaxMarks) * 100) : 0;
  const minutes = attempt.time_taken_seconds ? Math.floor(attempt.time_taken_seconds / 60) : 0;
  const seconds = attempt.time_taken_seconds ? attempt.time_taken_seconds % 60 : 0;

  const getOptionText = (q: { option_a: string; option_b: string; option_c: string; option_d: string }, key: string) => {
    const map: Record<string, string> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
    return map[key] || "";
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold">Results</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className={cn(
            "p-8 text-center",
            percentage >= 70 ? "bg-success/10" : percentage >= 40 ? "bg-primary/10" : "bg-destructive/10"
          )}>
            <p className="text-6xl font-display font-bold text-gradient-primary glow-text">{percentage}%</p>
            <p className="text-lg text-muted-foreground mt-2">
              {isSubjective
                ? `${attempt.score} out of ${totalMaxMarks} marks`
                : `${attempt.score} out of ${attempt.total_questions} correct`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {attempt.subjects?.name} • {minutes}m {seconds}s
            </p>
            <p className={cn(
              "mt-3 font-display font-semibold text-lg",
              percentage >= 70 ? "text-success" : percentage >= 40 ? "text-gradient-primary" : "text-destructive"
            )}>
              {percentage >= 70 ? "Excellent! 🎉" : percentage >= 40 ? "Good effort! 👍" : "Keep practicing! 💪"}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <h2 className="font-display font-bold text-lg text-foreground">Review Answers</h2>

          {/* Subjective review */}
          {isSubjective && aiState && aiState.questions.map((q, i) => {
            const subQ = q as SubjectiveQuestion;
            const grade = grades[q.id];
            const userAnswer = aiState.answers[q.id];
            return (
              <Card key={i} className="border-border/50 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-foreground">{q.question_text}</p>
                    {grade && (
                      <span className={cn(
                        "shrink-0 px-3 py-1 rounded-full text-sm font-semibold",
                        grade.score >= subQ.max_marks * 0.7
                          ? "bg-success/20 text-success"
                          : grade.score >= subQ.max_marks * 0.4
                          ? "bg-primary/20 text-primary"
                          : "bg-destructive/20 text-destructive"
                      )}>
                        {grade.score}/{subQ.max_marks}
                      </span>
                    )}
                  </div>

                  {userAnswer ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Your Answer:</p>
                      <pre className="text-sm text-foreground bg-background/50 p-3 rounded-lg overflow-auto whitespace-pre-wrap font-mono">
                        {userAnswer}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not answered</p>
                  )}

                  {grade && (
                    <div className="space-y-3">
                      <p className="text-sm text-foreground">{grade.feedback}</p>
                      {grade.correct_points.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-success mb-1">✓ Correct Points:</p>
                          <ul className="text-sm text-success/80 space-y-1 ml-4 list-disc">
                            {grade.correct_points.map((p, j) => <li key={j}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      {grade.missed_points.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-destructive mb-1">✗ Missed Points:</p>
                          <ul className="text-sm text-destructive/80 space-y-1 ml-4 list-disc">
                            {grade.missed_points.map((p, j) => <li key={j}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Model Answer:</p>
                        <pre className="text-sm text-muted-foreground bg-background/30 p-3 rounded-lg overflow-auto whitespace-pre-wrap font-mono">
                          {subQ.model_answer}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Objective review */}
          {!isSubjective && (() => {
            const reviewItems = isAI && aiState
              ? aiState.questions.map((q) => ({
                  question_text: q.question_text,
                  selected_option: aiState.answers[q.id] || null,
                  is_correct: q.question_type === "objective" && aiState.answers[q.id] === (q as ObjectiveQuestion).correct_option,
                  correct_option: q.question_type === "objective" ? (q as ObjectiveQuestion).correct_option : "",
                  options: q.question_type === "objective" ? q as ObjectiveQuestion : { option_a: "", option_b: "", option_c: "", option_d: "" },
                }))
              : dbAnswers.map((a) => ({
                  question_text: a.questions?.question_text || "",
                  selected_option: a.selected_option,
                  is_correct: a.is_correct,
                  correct_option: a.questions?.correct_option || "",
                  options: a.questions || { option_a: "", option_b: "", option_c: "", option_d: "" },
                }));

            return reviewItems.map((item, i) => (
              <Card key={i} className="border-border/50 bg-card/60 backdrop-blur-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    {item.is_correct ? (
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                    )}
                    <p className="font-medium text-foreground">{item.question_text}</p>
                  </div>
                  {item.selected_option ? (
                    <p className={cn("text-sm ml-8", item.is_correct ? "text-success" : "text-destructive")}>
                      Your answer: {item.selected_option} — {getOptionText(item.options, item.selected_option)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground ml-8">Not answered</p>
                  )}
                  {!item.is_correct && (
                    <p className="text-sm text-success ml-8">
                      Correct: {item.correct_option} — {getOptionText(item.options, item.correct_option)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ));
          })()}
        </div>

        <div className="flex gap-3 justify-center pt-4">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <Button onClick={() => navigate("/dashboard")}>
            <RotateCcw className="w-4 h-4 mr-2" /> New Quiz
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Results;
