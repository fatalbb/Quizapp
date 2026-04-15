using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Analytics.Queries;

public record GetStudentPerformanceQuery(string StudentId) : IRequest<StudentPerformanceDto>;

public class StudentPerformanceDto
{
    public string StudentName { get; set; } = string.Empty;
    public int TotalAttempts { get; set; }
    public double AverageScore { get; set; }
    public int QuizzesPassed { get; set; }
    public int QuizzesFailed { get; set; }
    public List<StudentAttemptDto> Attempts { get; set; } = [];
}

public class StudentAttemptDto
{
    public string QuizTitle { get; set; } = string.Empty;
    public double? Score { get; set; }
    public bool Passed { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class GetStudentPerformanceQueryHandler : IRequestHandler<GetStudentPerformanceQuery, StudentPerformanceDto>
{
    private readonly IApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public GetStudentPerformanceQueryHandler(IApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<StudentPerformanceDto> Handle(GetStudentPerformanceQuery request, CancellationToken cancellationToken)
    {
        var student = await _userManager.FindByIdAsync(request.StudentId)
            ?? throw new NotFoundException(nameof(ApplicationUser), request.StudentId);

        var attempts = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .Where(a => a.StudentId == request.StudentId && a.Status != QuizAttemptStatus.InProgress)
            .OrderByDescending(a => a.CompletedAt)
            .ToListAsync(cancellationToken);

        var completed = attempts.Where(a => a.Score.HasValue).ToList();

        return new StudentPerformanceDto
        {
            StudentName = $"{student.FirstName} {student.LastName}",
            TotalAttempts = attempts.Count,
            AverageScore = completed.Count > 0 ? Math.Round(completed.Average(a => a.Score!.Value), 2) : 0,
            QuizzesPassed = completed.Count(a => a.Score >= a.Quiz.PassingScorePercentage),
            QuizzesFailed = completed.Count(a => a.Score < a.Quiz.PassingScorePercentage),
            Attempts = attempts.Select(a => new StudentAttemptDto
            {
                QuizTitle = a.Quiz.Title,
                Score = a.Score,
                Passed = a.Score >= a.Quiz.PassingScorePercentage,
                CompletedAt = a.CompletedAt ?? a.StartedAt
            }).ToList()
        };
    }
}
