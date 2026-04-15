using QuizApp.Domain.Common;

namespace QuizApp.Domain.Entities;

public class AttemptAnswer : BaseEntity
{
    public Guid QuizAttemptId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid? SelectedAnswerId { get; set; }
    public string? InputText { get; set; }
    public bool? IsCorrect { get; set; }
    public string? AiEvaluationNotes { get; set; }
    public DateTime? AnsweredAt { get; set; }

    public QuizAttempt QuizAttempt { get; set; } = null!;
    public Question Question { get; set; } = null!;
    public Answer? SelectedAnswer { get; set; }
}
