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
                return JsonSerializer.Deserialize<List<GeneratedQuestionDto>>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? [];
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
        var model = _configuration["OllamaSettings:Model"] ?? "llama3";
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
        var timeoutSeconds = int.Parse(_configuration["OllamaSettings:TimeoutSeconds"] ?? "120");
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

    private static string BuildSchemaBasedPrompt(QuestionType questionType, DifficultyLevel difficulty, int count, List<TableSchemaDto> tableSchemas)
    {
        var typeDescription = questionType switch
        {
            QuestionType.MultipleChoice => "multiple choice (2 or more correct answers out of 4 options)",
            QuestionType.SingleChoice => "single choice (exactly 1 correct answer out of 4 options)",
            QuestionType.TrueFalse => "true or false",
            QuestionType.Input => "free text input (provide the expected answer)",
            _ => "single choice"
        };

        var sb = new StringBuilder();
        sb.AppendLine($"You are an SQL quiz question generator. Generate exactly {count} {difficulty.ToString().ToLower()} difficulty {typeDescription} questions.");
        sb.AppendLine();
        sb.AppendLine("You have the following database tables:");
        sb.AppendLine();

        foreach (var table in tableSchemas)
        {
            sb.AppendLine($"Table: {table.TableName}");
            sb.AppendLine($"Columns: {string.Join(", ", table.Columns.Select(c => $"{c.Name} ({c.DataType})"))}");
            if (table.SampleRows.Count > 0)
            {
                sb.AppendLine("Sample data:");
                foreach (var row in table.SampleRows)
                {
                    sb.AppendLine($"| {string.Join(" | ", row)} |");
                }
            }
            sb.AppendLine();
        }

        sb.AppendLine("Generate SQL questions that require writing queries against these tables.");
        sb.AppendLine();
        sb.AppendLine($$"""
            Return ONLY a valid JSON array with this exact schema:
            [
              {
                "text": "question text here",
                "answers": [
                  {"text": "answer text", "isCorrect": true/false}
                ],
                "difficultyLevel": {{(int)difficulty}}
              }
            ]

            Rules:
            - Questions must be about SQL queries against the provided tables
            - Each question must have clear, unambiguous answers
            - For true/false: provide exactly 2 answers ("True" and "False")
            - For input type: provide exactly 1 answer with isCorrect=true
            - Return ONLY the JSON array, no other text
            """);

        return sb.ToString();
    }

    private static string BuildGenerationPrompt(string categoryName, QuestionType questionType, DifficultyLevel difficulty, int count)
    {
        var typeDescription = questionType switch
        {
            QuestionType.MultipleChoice => "multiple choice (2 or more correct answers out of 4 options)",
            QuestionType.SingleChoice => "single choice (exactly 1 correct answer out of 4 options)",
            QuestionType.TrueFalse => "true or false",
            QuestionType.Input => "free text input (provide the expected answer)",
            _ => "single choice"
        };

        return $$"""
            You are an SQL quiz question generator. Generate exactly {{count}} {{difficulty.ToString().ToLower()}} difficulty {{typeDescription}} questions about "{{categoryName}}".

            Return ONLY a valid JSON array with this exact schema:
            [
              {
                "text": "question text here",
                "answers": [
                  {"text": "answer text", "isCorrect": true/false}
                ],
                "difficultyLevel": {{(int)difficulty}}
              }
            ]

            Rules:
            - Questions must be about SQL and specifically about {{categoryName}}
            - Each question must have clear, unambiguous answers
            - For true/false: provide exactly 2 answers ("True" and "False")
            - For input type: provide exactly 1 answer with isCorrect=true
            - Return ONLY the JSON array, no other text
            """;
    }
}
