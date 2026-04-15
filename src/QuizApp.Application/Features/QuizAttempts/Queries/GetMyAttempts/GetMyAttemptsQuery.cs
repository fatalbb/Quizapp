using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Common.Models;

namespace QuizApp.Application.Features.QuizAttempts.Queries.GetMyAttempts;

public record GetMyAttemptsQuery(int PageNumber = 1, int PageSize = 10) : IRequest<PaginatedList<MyAttemptDto>>;

public class MyAttemptDto
{
    public Guid AttemptId { get; set; }
    public Guid QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public double? Score { get; set; }
    public int CorrectAnswers { get; set; }
    public int TotalQuestions { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class GetMyAttemptsQueryHandler : IRequestHandler<GetMyAttemptsQuery, PaginatedList<MyAttemptDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetMyAttemptsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<PaginatedList<MyAttemptDto>> Handle(GetMyAttemptsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.QuizAttempts
            .Include(a => a.Quiz)
            .Where(a => a.StudentId == _currentUserService.UserId)
            .OrderByDescending(a => a.StartedAt)
            .Select(a => new MyAttemptDto
            {
                AttemptId = a.Id,
                QuizId = a.QuizId,
                QuizTitle = a.Quiz.Title,
                Score = a.Score,
                CorrectAnswers = a.CorrectAnswers,
                TotalQuestions = a.TotalQuestions,
                Status = a.Status.ToString(),
                StartedAt = a.StartedAt,
                CompletedAt = a.CompletedAt
            });

        return await PaginatedList<MyAttemptDto>.CreateAsync(query, request.PageNumber, request.PageSize);
    }
}
