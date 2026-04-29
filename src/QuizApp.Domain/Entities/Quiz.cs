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

    // Exam mode fields
    public QuizMode Mode { get; set; } = QuizMode.Learning;
    public bool IsValidated { get; set; }
    public int MaxAttempts { get; set; } // 0 = unlimited
    public ExamStartMode? StartMode { get; set; }
    public DateTime? ScheduledStartAt { get; set; }
    public DateTime? ScheduledEndAt { get; set; }
    public DateTime? ManualStartedAt { get; set; }
    public int JoinWindowMinutes { get; set; } = 5;

    // Feedback / Re-evaluation
    public bool AllowFeedback { get; set; } = true;
    public bool AllowReevaluation { get; set; }
    // If true (default), per-student max = number of wrong answers in the attempt
    // (capped between 0 and TotalQuestions). If false, MaxReevaluationsPerStudent is used.
    public bool AutoReevaluationQuota { get; set; } = true;
    public int MaxReevaluationsPerStudent { get; set; } = 1;

    public ApplicationUser CreatedBy { get; set; } = null!;
    public ICollection<QuizCategory> QuizCategories { get; set; } = [];
    public ICollection<QuizAttempt> Attempts { get; set; } = [];
}
