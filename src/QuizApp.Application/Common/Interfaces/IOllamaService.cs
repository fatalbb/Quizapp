using QuizApp.Domain.Enums;

namespace QuizApp.Application.Common.Interfaces;

public interface IOllamaService
{
    Task<List<GeneratedQuestionDto>> GenerateQuestionsAsync(
        string categoryName,
        QuestionType questionType,
        DifficultyLevel difficulty,
        int count,
        List<TableSchemaDto>? tableSchemas = null,
        CancellationToken cancellationToken = default);

    Task<AnswerEvaluation> EvaluateAnswerAsync(
        string questionText,
        string expectedAnswer,
        string studentAnswer,
        CancellationToken cancellationToken = default);
}

public class GeneratedQuestionDto
{
    public string Text { get; set; } = string.Empty;
    public List<GeneratedAnswerDto> Answers { get; set; } = [];
    public DifficultyLevel DifficultyLevel { get; set; }
}

public class GeneratedAnswerDto
{
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}

public class AnswerEvaluation
{
    public bool IsCorrect { get; set; }
    public string Explanation { get; set; } = string.Empty;
}
