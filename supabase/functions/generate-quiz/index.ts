const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai-gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { topic, numQuestions = 5, difficulty = "medium" } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Generate exactly ${numQuestions} multiple choice questions about: "${topic.trim()}"

Difficulty level: ${difficulty}

Return a JSON array of objects with this exact structure:
[
  {
    "question_text": "the question",
    "option_a": "first option",
    "option_b": "second option", 
    "option_c": "third option",
    "option_d": "fourth option",
    "correct_option": "A"
  }
]

Rules:
- correct_option must be one of: "A", "B", "C", "D"
- Each question must have exactly 4 options
- Questions should be factually accurate
- Vary the correct answer position
- Return ONLY the JSON array, no other text`;

    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a quiz question generator. Always respond with valid JSON arrays only. No markdown, no explanations." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("AI API error:", err);
      return new Response(JSON.stringify({ error: "Failed to generate questions" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const questions = JSON.parse(jsonStr);

    if (!Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid questions generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate structure
    const validated = questions.map((q: Record<string, unknown>, i: number) => ({
      id: `ai-${i}`,
      question_text: String(q.question_text || ""),
      option_a: String(q.option_a || ""),
      option_b: String(q.option_b || ""),
      option_c: String(q.option_c || ""),
      option_d: String(q.option_d || ""),
      correct_option: ["A", "B", "C", "D"].includes(String(q.correct_option)) ? String(q.correct_option) : "A",
    }));

    return new Response(JSON.stringify({ questions: validated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
