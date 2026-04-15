using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Common.Models;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Quizzes.Queries.GetQuizzes;

public record GetQuizzesQuery(int PageNumber = 1, int PageSize = 10) : IRequest<PaginatedList<QuizListDto>>;

public class QuizListDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public string Status { get; set; } = string.Empty;
    public int PassingScorePercentage { get; set; }
    public int TotalQuestions { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GetQuizzesQueryHandler : IRequestHandler<GetQuizzesQuery, PaginatedList<QuizListDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetQuizzesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<PaginatedList<QuizListDto>> Handle(GetQuizzesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Quizzes
            .Include(q => q.QuizCategories)
            .AsQueryable();

        // Students only see published quizzes
        if (_currentUserService.Role == UserRole.Student)
            query = query.Where(q => q.Status == QuizStatus.Published);
        // Teachers see their own quizzes
        else if (_currentUserService.Role == UserRole.Teacher)
            query = query.Where(q => q.CreatedById == _currentUserService.UserId);

        var projected = query.Select(q => new QuizListDto
        {
            Id = q.Id,
            Title = q.Title,
            Description = q.Description,
            TimeLimitMinutes = q.TimeLimitMinutes,
            Status = q.Status.ToString(),
            PassingScorePercentage = q.PassingScorePercentage,
            TotalQuestions = q.QuizCategories.Sum(qc => qc.QuestionCount),
            CreatedAt = q.CreatedAt
        });

        return await PaginatedList<QuizListDto>.CreateAsync(projected, request.PageNumber, request.PageSize);
    }
}
