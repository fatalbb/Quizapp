using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;

namespace QuizApp.Application.Features.Questions.Queries.GetQuestionById;

public record GetQuestionByIdQuery(Guid Id) : IRequest<QuestionDetailDto>;

public class QuestionDetailDto
{
    public Guid Id { get; set; }
    public string? Text { get; set; }
    public string QuestionType { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string DifficultyLevel { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public bool IsAiGenerated { get; set; }
    public List<AnswerDto> Answers { get; set; } = [];
    public List<MediaDto> Media { get; set; } = [];
}

public class AnswerDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int OrderIndex { get; set; }
}

public class MediaDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
}

public class GetQuestionByIdQueryHandler : IRequestHandler<GetQuestionByIdQuery, QuestionDetailDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorageService;

    public GetQuestionByIdQueryHandler(IApplicationDbContext context, IFileStorageService fileStorageService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
    }

    public async Task<QuestionDetailDto> Handle(GetQuestionByIdQuery request, CancellationToken cancellationToken)
    {
        var question = await _context.Questions
            .Include(q => q.Category)
            .Include(q => q.Answers.OrderBy(a => a.OrderIndex))
            .Include(q => q.Media)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Question), request.Id);

        return new QuestionDetailDto
        {
            Id = question.Id,
            Text = question.Text,
            QuestionType = question.QuestionType.ToString(),
            ContentType = question.ContentType.ToString(),
            DifficultyLevel = question.DifficultyLevel.ToString(),
            CategoryId = question.CategoryId,
            CategoryName = question.Category.Name,
            IsAiGenerated = question.IsAiGenerated,
            Answers = question.Answers.Select(a => new AnswerDto
            {
                Id = a.Id,
                Text = a.Text,
                IsCorrect = a.IsCorrect,
                OrderIndex = a.OrderIndex
            }).ToList(),
            Media = question.Media.Select(m => new MediaDto
            {
                Id = m.Id,
                FileName = m.FileName,
                Url = _fileStorageService.GetFileUrl(m.FilePath),
                MediaType = m.MediaType.ToString()
            }).ToList()
        };
    }
}
