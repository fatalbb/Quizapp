using QuizApp.Domain.Common;
using QuizApp.Domain.Enums;

namespace QuizApp.Domain.Entities;

public class QuizAttempt : BaseEntity
{
    public Guid QuizId { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public double? Score { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectAnswers { get; set; }
    public QuizAttemptStatus Status { get; set; } = QuizAttemptStatus.InProgress;
    public int TimeLimitMinutes { get; set; }

    public Quiz Quiz { get; set; } = null!;
    public ApplicationUser Student { get; set; } = null!;
    public ICollection<AttemptAnswer> AttemptAnswers { get; set; } = [];
}
