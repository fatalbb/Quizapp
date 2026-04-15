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
}

public class GetQuizAnalyticsQueryHandler : IRequestHandler<GetQuizAnalyticsQuery, QuizAnalyticsDto>
{
    private readonly IApplicationDbContext _context;

    public GetQuizAnalyticsQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<QuizAnalyticsDto> Handle(GetQuizAnalyticsQuery request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes.FindAsync([request.QuizId], cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.QuizId);

        var attempts = await _context.QuizAttempts
            .Where(a => a.QuizId == request.QuizId && a.Status != QuizAttemptStatus.InProgress && a.Score.HasValue)
            .ToListAsync(cancellationToken);

        return new QuizAnalyticsDto
        {
            QuizId = quiz.Id,
            QuizTitle = quiz.Title,
            TotalAttempts = attempts.Count,
            AverageScore = attempts.Count > 0 ? Math.Round(attempts.Average(a => a.Score!.Value), 2) : 0,
            PassRate = attempts.Count > 0
                ? Math.Round(attempts.Count(a => a.Score >= quiz.PassingScorePercentage) * 100.0 / attempts.Count, 2)
                : 0,
            HighestScore = attempts.Count > 0 ? attempts.Max(a => a.Score!.Value) : 0,
            LowestScore = attempts.Count > 0 ? attempts.Min(a => a.Score!.Value) : 0
        };
    }
}
