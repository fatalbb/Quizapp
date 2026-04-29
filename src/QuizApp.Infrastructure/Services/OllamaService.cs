using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Enums;

namespace QuizApp.Infrastructure.Services;

public class OllamaService : IOllamaService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OllamaService> _logger;

    public OllamaService(HttpClient httpClient, IConfiguration configuration, ILogger<OllamaService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<List<GeneratedQuestionDto>> GenerateQuestionsAsync(
        string categoryName,
        QuestionType questionType,
        DifficultyLevel difficulty,
        int count,
        List<TableSchemaDto>? tableSchemas = null,
        CancellationToken cancellationToken = default)
    {
        var model = _configuration["OllamaSettings:Model"] ?? "gemma4:e4b";
        var prompt = tableSchemas is { Count: > 0 }
            ? BuildSchemaBasedPrompt(questionType, difficulty, count, tableSchemas)
            : BuildGenerationPrompt(categoryName, questionType, difficulty, count);

        var response = await CallOllamaAsync(model, prompt, cancellationToken);

        try
        {
            var jsonStart = response.IndexOf('[');
            var jsonEnd = response.LastIndexOf(']') + 1;
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var json = response[jsonStart..jsonEnd];
                var questions = JsonSerializer.Deserialize<List<GeneratedQuestionDto>>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? [];

                // Force the correct difficulty on all questions (LLM sometimes ignores it)
                foreach (var q in questions)
                    q.DifficultyLevel = difficulty;

                return questions;
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse Ollama response as JSON");
        }

        return [];
    }

    public async Task<AnswerEvaluation> EvaluateAnswerAsync(
        string questionText,
        string expectedAnswer,
        string studentAnswer,
        CancellationToken cancellationToken = default)
    {
        var model = _configuration["OllamaSettings:Model"] ?? "gemma4:e4b";
        var prompt = $$"""
            You are an SQL quiz answer evaluator. Determine if the student's answer is semantically correct.

            Question: {{questionText}}
            Expected Answer: {{expectedAnswer}}
            Student's Answer: {{studentAnswer}}

            Respond with ONLY a JSON object: {"isCorrect": true/false, "explanation": "brief explanation"}
            """;

        var response = await CallOllamaAsync(model, prompt, cancellationToken);

        try
        {
            var jsonStart = response.IndexOf('{');
            var jsonEnd = response.LastIndexOf('}') + 1;
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var json = response[jsonStart..jsonEnd];
                return JsonSerializer.Deserialize<AnswerEvaluation>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? new AnswerEvaluation { IsCorrect = false, Explanation = "Failed to evaluate" };
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse Ollama evaluation response");
        }

        return new AnswerEvaluation { IsCorrect = false, Explanation = "Failed to evaluate answer" };
    }

    public async Task<string> GenerateFeedbackAsync(
        string questionText,
        string questionType,
        string correctAnswerText,
        string studentAnswerText,
        bool wasCorrect,
        CancellationToken cancellationToken = default)
    {
        var model = _configuration["OllamaSettings:Model"] ?? "gemma4:e4b";

        var prompt = $$"""
            You are a helpful teaching assistant. A student took a {{questionType}} SQL quiz question.

            Question: {{questionText}}

            Correct answer: {{correctAnswerText}}

            Student's answer: {{studentAnswerText}}

            Was correct: {{(wasCorrect ? "yes" : "no")}}

            Write a SHORT, friendly explanation (3-5 sentences) that:
            1. States whether the answer is correct or not
            2. If wrong: explains WHY the student's answer is wrong (concretely, referencing SQL behavior)
            3. Shows what the correct answer is and briefly explains why it's correct

            Be encouraging but precise. Plain text only, no JSON, no markdown.
            """;

        try
        {
            var response = await CallOllamaAsync(model, prompt, cancellationToken);
            return response.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to generate feedback");
            return wasCorrect
                ? $"Your answer was correct. The expected answer was: {correctAnswerText}"
                : $"Your answer was incorrect. The correct answer was: {correctAnswerText}";
        }
    }

    public async Task<AnswerEvaluation> ReevaluateAnswerAsync(
        string questionText,
        string expectedAnswer,
        string studentAnswer,
        string justification,
        bool isTeacher,
        CancellationToken cancellationToken = default)
    {
        var model = _configuration["OllamaSettings:Model"] ?? "gemma4:e4b";

        var role = isTeacher
            ? "a teacher reviewing the AI's previous grading"
            : "a student appealing the previous grading";

        var prompt = $$"""
            You are an SQL quiz answer evaluator performing a RE-EVALUATION. {{role}} is asking you to reconsider.

            Question: {{questionText}}
            Expected Answer: {{expectedAnswer}}
            Student's Answer: {{studentAnswer}}
            Justification provided: {{justification}}

            Reconsider whether the student's answer is semantically correct, taking the justification into account.
            Be strict but fair. Don't accept incorrect SQL just because the justification sounds confident.

            Respond with ONLY a JSON object: {"isCorrect": true/false, "explanation": "brief explanation citing the justification"}
            """;

        var response = await CallOllamaAsync(model, prompt, cancellationToken);

        try
        {
            var jsonStart = response.IndexOf('{');
            var jsonEnd = response.LastIndexOf('}') + 1;
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var json = response[jsonStart..jsonEnd];
                return JsonSerializer.Deserialize<AnswerEvaluation>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? new AnswerEvaluation { IsCorrect = false, Explanation = "Failed to re-evaluate" };
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse Ollama re-evaluation response");
        }

        return new AnswerEvaluation { IsCorrect = false, Explanation = "Failed to re-evaluate answer" };
    }

    private async Task<string> CallOllamaAsync(string model, string prompt, CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["OllamaSettings:BaseUrl"] ?? "http://localhost:11434";
        var request = new
        {
            model,
            prompt,
            stream = false
        };

        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
        var timeoutSeconds = int.Parse(_configuration["OllamaSettings:TimeoutSeconds"] ?? "600");
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsync($"{baseUrl}/api/generate", content, cts.Token);
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException(
                $"Cannot connect to Ollama at {baseUrl}. Make sure Ollama is running ('ollama serve') and the model '{model}' is pulled ('ollama pull {model}').", ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cts.Token);
            throw new InvalidOperationException(
                $"Ollama returned {response.StatusCode}: {errorBody}");
        }

        var responseBody = await response.Content.ReadAsStringAsync(cts.Token);
        var responseJson = JsonSerializer.Deserialize<JsonElement>(responseBody);
        return responseJson.GetProperty("response").GetString() ?? string.Empty;
    }

    private static string GetDifficultyDescription(DifficultyLevel difficulty) => difficulty switch
    {
        DifficultyLevel.Easy => "EASY - Basic recall and simple concepts. Students should know these from introductory lessons. Simple SELECT, basic WHERE, simple INSERT.",
        DifficultyLevel.Medium => "MEDIUM - Requires understanding of multiple concepts. Involves JOINs, GROUP BY, HAVING, subqueries, or combining 2-3 concepts together.",
        DifficultyLevel.Hard => "HARD - Advanced and tricky. Requires deep understanding. Complex subqueries, nested JOINs, window functions, edge cases, optimization concepts.",
        _ => "MEDIUM"
    };

    private static string GetTypeInstructions(QuestionType questionType) => questionType switch
    {
        QuestionType.SingleChoice => """
            QUESTION TYPE: SINGLE CHOICE
            - Provide EXACTLY 4 answer options
            - EXACTLY 1 answer must have "isCorrect": true
            - The other 3 must have "isCorrect": false
            - Make wrong answers plausible (not obviously wrong)

            EXAMPLE:
            {
              "text": "Which SQL clause is used to filter rows?",
              "answers": [
                {"text": "WHERE", "isCorrect": true},
                {"text": "HAVING", "isCorrect": false},
                {"text": "GROUP BY", "isCorrect": false},
                {"text": "ORDER BY", "isCorrect": false}
              ]
            }
            """,
        QuestionType.MultipleChoice => """
            QUESTION TYPE: MULTIPLE CHOICE (multiple correct answers)
            - Provide EXACTLY 4 answer options
            - AT LEAST 2 answers must have "isCorrect": true
            - AT LEAST 1 answer must have "isCorrect": false
            - The question text MUST say "Select all that apply" or "Which of the following are correct"

            EXAMPLE:
            {
              "text": "Which of the following are aggregate functions? (Select all that apply)",
              "answers": [
                {"text": "COUNT()", "isCorrect": true},
                {"text": "SUM()", "isCorrect": true},
                {"text": "WHERE()", "isCorrect": false},
                {"text": "AVG()", "isCorrect": true}
              ]
            }
            """,
        QuestionType.TrueFalse => """
            QUESTION TYPE: TRUE OR FALSE
            - Provide EXACTLY 2 answer options: "True" and "False"
            - EXACTLY 1 must be correct
            - The question must be a clear statement that is either true or false

            EXAMPLE:
            {
              "text": "The WHERE clause is used to filter rows before grouping.",
              "answers": [
                {"text": "True", "isCorrect": true},
                {"text": "False", "isCorrect": false}
              ]
            }
            """,
        QuestionType.Input => """
            QUESTION TYPE: FREE TEXT INPUT (student types the answer)
            - Provide EXACTLY 1 answer with "isCorrect": true
            - The answer should be a SQL query or short text answer
            - The question should ask the student to write a SQL query or provide a specific answer

            EXAMPLE:
            {
              "text": "Write a SQL query to select all columns from the 'users' table.",
              "answers": [
                {"text": "SELECT * FROM users;", "isCorrect": true}
              ]
            }
            """,
        _ => "Single choice with exactly 4 options and 1 correct answer."
    };

    private static string BuildSchemaBasedPrompt(QuestionType questionType, DifficultyLevel difficulty, int count, List<TableSchemaDto> tableSchemas)
    {
        var sb = new StringBuilder();

        sb.AppendLine("You are an expert SQL quiz question generator. You MUST follow ALL instructions exactly.");
        sb.AppendLine();
        sb.AppendLine($"DIFFICULTY LEVEL: {GetDifficultyDescription(difficulty)}");
        sb.AppendLine();
        sb.AppendLine(GetTypeInstructions(questionType));
        sb.AppendLine();
        sb.AppendLine("=== DATABASE SCHEMA ===");
        sb.AppendLine();

        foreach (var table in tableSchemas)
        {
            sb.AppendLine($"Table: {table.TableName}");
            sb.AppendLine($"Columns: {string.Join(", ", table.Columns.Select(c => $"{c.Name} ({c.DataType})"))}");
            if (table.SampleRows.Count > 0)
            {
                sb.AppendLine("Sample data:");
                foreach (var row in table.SampleRows)
                    sb.AppendLine($"  | {string.Join(" | ", row)} |");
            }
            sb.AppendLine();
        }

        sb.AppendLine("=== END SCHEMA ===");
        sb.AppendLine();
        sb.AppendLine($"Generate EXACTLY {count} SQL questions about the tables above.");
        sb.AppendLine($"ALL questions MUST be {difficulty.ToString().ToUpper()} difficulty.");
        sb.AppendLine();
        sb.AppendLine($$"""
            CRITICAL RULES:
            1. Return ONLY a valid JSON array. No text before or after.
            2. Every question must reference the provided tables.
            3. Follow the question type format EXACTLY as shown in the example above.
            4. Use the exact difficulty level specified.

            JSON format:
            [
              {
                "text": "question text",
                "answers": [{"text": "answer", "isCorrect": true/false}],
                "difficultyLevel": {{(int)difficulty}}
              }
            ]
            """);

        return sb.ToString();
    }

    private static string BuildGenerationPrompt(string categoryName, QuestionType questionType, DifficultyLevel difficulty, int count)
    {
        var sb = new StringBuilder();

        sb.AppendLine("You are an expert SQL quiz question generator. You MUST follow ALL instructions exactly.");
        sb.AppendLine();
        sb.AppendLine($"TOPIC: {categoryName}");
        sb.AppendLine();
        sb.AppendLine($"DIFFICULTY LEVEL: {GetDifficultyDescription(difficulty)}");
        sb.AppendLine();
        sb.AppendLine(GetTypeInstructions(questionType));
        sb.AppendLine();
        sb.AppendLine($"Generate EXACTLY {count} SQL questions about \"{categoryName}\".");
        sb.AppendLine($"ALL questions MUST be {difficulty.ToString().ToUpper()} difficulty.");
        sb.AppendLine();
        sb.AppendLine($$"""
            CRITICAL RULES:
            1. Return ONLY a valid JSON array. No text before or after.
            2. Every question must be about SQL and specifically about "{{categoryName}}".
            3. Follow the question type format EXACTLY as shown in the example above.
            4. Use the exact difficulty level specified.

            JSON format:
            [
              {
                "text": "question text",
                "answers": [{"text": "answer", "isCorrect": true/false}],
                "difficultyLevel": {{(int)difficulty}}
              }
            ]
            """);

        return sb.ToString();
    }
}
