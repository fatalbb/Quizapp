using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Analytics.Queries;

public record GetTeacherDashboardQuery : IRequest<TeacherDashboardDto>;

public class TeacherDashboardDto
{
    public int TotalQuizzes { get; set; }
    public int TotalQuestions { get; set; }
    public int TotalAttempts { get; set; }
    public double AverageScore { get; set; }
    public double PassRate { get; set; }
    public List<RecentAttemptDto> RecentAttempts { get; set; } = [];
}

public class RecentAttemptDto
{
    public string StudentName { get; set; } = string.Empty;
    public string QuizTitle { get; set; } = string.Empty;
    public double? Score { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class GetTeacherDashboardQueryHandler : IRequestHandler<GetTeacherDashboardQuery, TeacherDashboardDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetTeacherDashboardQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<TeacherDashboardDto> Handle(GetTeacherDashboardQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        var isAdmin = _currentUserService.Role == UserRole.Admin;

        var quizQuery = isAdmin
            ? _context.Quizzes.AsQueryable()
            : _context.Quizzes.Where(q => q.CreatedById == userId);

        var quizIds = await quizQuery.Select(q => q.Id).ToListAsync(cancellationToken);

        var attempts = await _context.QuizAttempts
            .Include(a => a.Student)
            .Include(a => a.Quiz)
            .Where(a => quizIds.Contains(a.QuizId) && a.Status != QuizAttemptStatus.InProgress)
            .ToListAsync(cancellationToken);

        var totalQuestions = isAdmin
            ? await _context.Questions.CountAsync(cancellationToken)
            : await _context.Questions.CountAsync(q => q.CreatedById == userId, cancellationToken);

        var completedAttempts = attempts.Where(a => a.Score.HasValue).ToList();

        return new TeacherDashboardDto
        {
            TotalQuizzes = quizIds.Count,
            TotalQuestions = totalQuestions,
            TotalAttempts = attempts.Count,
            AverageScore = completedAttempts.Count > 0
                ? Math.Round(completedAttempts.Average(a => a.Score!.Value), 2)
                : 0,
            PassRate = completedAttempts.Count > 0
                ? Math.Round(completedAttempts.Count(a =>
                    a.Score >= a.Quiz.PassingScorePercentage) * 100.0 / completedAttempts.Count, 2)
                : 0,
            RecentAttempts = attempts
                .OrderByDescending(a => a.CompletedAt)
                .Take(10)
                .Select(a => new RecentAttemptDto
                {
                    StudentName = $"{a.Student.FirstName} {a.Student.LastName}",
                    QuizTitle = a.Quiz.Title,
                    Score = a.Score,
                    CompletedAt = a.CompletedAt ?? a.StartedAt
                }).ToList()
        };
    }
}
