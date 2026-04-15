using QuizApp.Domain.Common;
using QuizApp.Domain.Enums;

namespace QuizApp.Domain.Entities;

public class Quiz : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public QuizStatus Status { get; set; } = QuizStatus.Draft;
    public int PassingScorePercentage { get; set; } = 50;
    public string CreatedById { get; set; } = string.Empty;

    public ApplicationUser CreatedBy { get; set; } = null!;
    public ICollection<QuizCategory> QuizCategories { get; set; } = [];
    public ICollection<QuizAttempt> Attempts { get; set; } = [];
}
