using QuizApp.Domain.Common;

namespace QuizApp.Domain.Entities;

public class AttemptAnswer : BaseEntity
{
    public Guid QuizAttemptId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid? SelectedAnswerId { get; set; }
    public string? InputText { get; set; }
    public bool? IsCorrect { get; set; }
    public double Score { get; set; } // 0.0 to 1.0 - partial credit (1.0 = fully correct)
    public string? AiEvaluationNotes { get; set; }
    public DateTime? AnsweredAt { get; set; }

    // Cached LLM-generated feedback ("why this is wrong + correct answer")
    public string? FeedbackExplanation { get; set; }
    // Number of re-evaluations performed (used to enforce per-student limits at the attempt level)
    public int ReevaluationCount { get; set; }

    public QuizAttempt QuizAttempt { get; set; } = null!;
    public Question Question { get; set; } = null!;
    public Answer? SelectedAnswer { get; set; }
}
