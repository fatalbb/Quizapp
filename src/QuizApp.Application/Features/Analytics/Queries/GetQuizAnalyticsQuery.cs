using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Analytics.Queries;

public record GetQuizAnalyticsQuery(Guid QuizId) : IRequest<QuizAnalyticsDto>;

public class QuizAnalyticsDto
{
    public Guid QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public int TotalAttempts { get; set; }
    public double AverageScore { get; set; }
    public double PassRate { get; set; }
    public double HighestScore { get; set; }
    public double LowestScore { get; set; }
    public int PassingScore { get; set; }
    public List<AttemptSummaryDto> Attempts { get; set; } = [];
}

public class AttemptSummaryDto
{
    public Guid AttemptId { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public double? Score { get; set; }
    public int CorrectAnswers { get; set; }
    public int TotalQuestions { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool Passed { get; set; }
}

public class GetQuizAnalyticsQueryHandler : IRequestHandler<GetQuizAnalyticsQuery, QuizAnalyticsDto>
{
    private readonly IApplicationDbContext _context;

    public GetQuizAnalyticsQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<QuizAnalyticsDto> Handle(GetQuizAnalyticsQuery request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes.FindAsync([request.QuizId], cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.QuizId);

        var allAttempts = await _context.QuizAttempts
            .Include(a => a.Student)
            .Where(a => a.QuizId == request.QuizId && a.Status != QuizAttemptStatus.InProgress)
            .OrderByDescending(a => a.CompletedAt ?? a.StartedAt)
            .ToListAsync(cancellationToken);

        var scoredAttempts = allAttempts.Where(a => a.Score.HasValue).ToList();

        return new QuizAnalyticsDto
        {
            QuizId = quiz.Id,
            QuizTitle = quiz.Title,
            PassingScore = quiz.PassingScorePercentage,
            TotalAttempts = scoredAttempts.Count,
            AverageScore = scoredAttempts.Count > 0 ? Math.Round(scoredAttempts.Average(a => a.Score!.Value), 2) : 0,
            PassRate = scoredAttempts.Count > 0
                ? Math.Round(scoredAttempts.Count(a => a.Score >= quiz.PassingScorePercentage) * 100.0 / scoredAttempts.Count, 2)
                : 0,
            HighestScore = scoredAttempts.Count > 0 ? scoredAttempts.Max(a => a.Score!.Value) : 0,
            LowestScore = scoredAttempts.Count > 0 ? scoredAttempts.Min(a => a.Score!.Value) : 0,
            Attempts = allAttempts.Select(a => new AttemptSummaryDto
            {
                AttemptId = a.Id,
                StudentId = a.StudentId,
                StudentName = $"{a.Student.FirstName} {a.Student.LastName}",
                StudentEmail = a.Student.Email ?? "",
                Score = a.Score,
                CorrectAnswers = a.CorrectAnswers,
                TotalQuestions = a.TotalQuestions,
                Status = a.Status.ToString(),
                StartedAt = a.StartedAt,
                CompletedAt = a.CompletedAt,
                Passed = a.Score.HasValue && a.Score >= quiz.PassingScorePercentage
            }).ToList()
        };
    }
}
