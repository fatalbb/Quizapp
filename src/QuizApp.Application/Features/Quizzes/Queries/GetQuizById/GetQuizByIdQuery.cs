using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Features.Quizzes.Commands.CreateQuiz;
using QuizApp.Domain.Entities;

namespace QuizApp.Application.Features.Quizzes.Queries.GetQuizById;

public record GetQuizByIdQuery(Guid Id) : IRequest<QuizDetailDto>;

public class QuizDetailDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public string Status { get; set; } = string.Empty;
    public int PassingScorePercentage { get; set; }
    public List<QuizCategoryDetailDto> Categories { get; set; } = [];
}

public class QuizCategoryDetailDto
{
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int QuestionCount { get; set; }
    public int EasyPercentage { get; set; }
    public int MediumPercentage { get; set; }
    public int HardPercentage { get; set; }
}

public class GetQuizByIdQueryHandler : IRequestHandler<GetQuizByIdQuery, QuizDetailDto>
{
    private readonly IApplicationDbContext _context;

    public GetQuizByIdQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<QuizDetailDto> Handle(GetQuizByIdQuery request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.QuizCategories)
                .ThenInclude(qc => qc.Category)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        return new QuizDetailDto
        {
            Id = quiz.Id,
            Title = quiz.Title,
            Description = quiz.Description,
            TimeLimitMinutes = quiz.TimeLimitMinutes,
            Status = quiz.Status.ToString(),
            PassingScorePercentage = quiz.PassingScorePercentage,
            Categories = quiz.QuizCategories.Select(qc => new QuizCategoryDetailDto
            {
                CategoryId = qc.CategoryId,
                CategoryName = qc.Category.Name,
                QuestionCount = qc.QuestionCount,
                EasyPercentage = qc.EasyPercentage,
                MediumPercentage = qc.MediumPercentage,
                HardPercentage = qc.HardPercentage
            }).ToList()
        };
    }
}
