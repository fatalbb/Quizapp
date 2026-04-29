using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Common.Models;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Questions.Queries.GetQuestions;

public record GetQuestionsQuery(
    int PageNumber = 1,
    int PageSize = 10,
    Guid? CategoryId = null,
    QuestionType? Type = null,
    DifficultyLevel? Difficulty = null) : IRequest<PaginatedList<QuestionListDto>>;

public class QuestionListDto
{
    public Guid Id { get; set; }
    public string? Text { get; set; }
    public string QuestionType { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string DifficultyLevel { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public bool IsAiGenerated { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GetQuestionsQueryHandler : IRequestHandler<GetQuestionsQuery, PaginatedList<QuestionListDto>>
{
    private readonly IApplicationDbContext _context;

    public GetQuestionsQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<PaginatedList<QuestionListDto>> Handle(GetQuestionsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Questions
            .Include(q => q.Category)
            .AsQueryable();

        if (request.CategoryId.HasValue)
            query = query.Where(q => q.CategoryId == request.CategoryId.Value);

        if (request.Type.HasValue)
            query = query.Where(q => q.QuestionType == request.Type.Value);

        if (request.Difficulty.HasValue)
            query = query.Where(q => q.DifficultyLevel == request.Difficulty.Value);

        var projected = query.Select(q => new QuestionListDto
        {
            Id = q.Id,
            Text = q.Text,
            QuestionType = q.QuestionType.ToString(),
            ContentType = q.ContentType.ToString(),
            DifficultyLevel = q.DifficultyLevel.ToString(),
            CategoryName = q.Category.Name,
            IsAiGenerated = q.IsAiGenerated,
            CreatedAt = q.CreatedAt
        });

        return await PaginatedList<QuestionListDto>.CreateAsync(projected, request.PageNumber, request.PageSize);
    }
}
