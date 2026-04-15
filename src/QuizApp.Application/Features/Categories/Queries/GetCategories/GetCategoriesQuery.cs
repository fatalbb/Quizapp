using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Interfaces;

namespace QuizApp.Application.Features.Categories.Queries.GetCategories;

public record GetCategoriesQuery : IRequest<List<CategoryDto>>;

public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ParentCategoryId { get; set; }
    public int QuestionCount { get; set; }
    public List<CategoryDto> SubCategories { get; set; } = [];
}

public class GetCategoriesQueryHandler : IRequestHandler<GetCategoriesQuery, List<CategoryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCategoriesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CategoryDto>> Handle(GetCategoriesQuery request, CancellationToken cancellationToken)
    {
        var categories = await _context.Categories
            .Include(c => c.SubCategories)
            .Include(c => c.Questions)
            .Where(c => c.ParentCategoryId == null)
            .ToListAsync(cancellationToken);

        return categories.Select(MapToDto).ToList();
    }

    private static CategoryDto MapToDto(Domain.Entities.Category c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Description = c.Description,
        ParentCategoryId = c.ParentCategoryId,
        QuestionCount = c.Questions.Count,
        SubCategories = c.SubCategories.Select(MapToDto).ToList()
    };
}
