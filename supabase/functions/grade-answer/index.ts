const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

    const { question, userAnswer, modelAnswer, maxMarks, gradingCriteria, isCoding } = await req.json();

    const prompt = `Grade the following ${isCoding ? "code" : "written"} answer.

Question: ${question}

Student's Answer:
${userAnswer}

Model Answer:
${modelAnswer}

Grading Criteria: ${gradingCriteria}
Maximum Marks: ${maxMarks}

Return a JSON object with this exact structure:
{
  "score": <number between 0 and ${maxMarks}>,
  "feedback": "detailed feedback explaining the grade",
  "correct_points": ["list of things the student got right"],
  "missed_points": ["list of things the student missed or got wrong"]
}

Be fair but thorough. For code answers, check correctness, efficiency, and style. Return ONLY JSON.`;

    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert grader. Always respond with valid JSON only. No markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("AI API error:", err);
      return new Response(JSON.stringify({ error: "Failed to grade answer" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonStr);

    return new Response(JSON.stringify(result), {
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
