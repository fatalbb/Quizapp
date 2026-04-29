using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Quizzes.Queries.GetQuizPreview;

public record GetQuizPreviewQuery(Guid Id) : IRequest<QuizPreviewDto>;

public class QuizPreviewDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Mode { get; set; } = string.Empty;
    public bool IsValidated { get; set; }
    public List<PreviewQuestionDto> Questions { get; set; } = [];
}

public class PreviewQuestionDto
{
    public Guid Id { get; set; }
    public string? Text { get; set; }
    public string QuestionType { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string DifficultyLevel { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public List<PreviewAnswerDto> Answers { get; set; } = [];
    public List<PreviewMediaDto> Media { get; set; } = [];
}

public class PreviewAnswerDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int OrderIndex { get; set; }
}

public class PreviewMediaDto
{
    public string Url { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
}

public class GetQuizPreviewQueryHandler : IRequestHandler<GetQuizPreviewQuery, QuizPreviewDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IFileStorageService _fileStorageService;

    public GetQuizPreviewQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IFileStorageService fileStorageService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _fileStorageService = fileStorageService;
    }

    public async Task<QuizPreviewDto> Handle(GetQuizPreviewQuery request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.QuizCategories)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        if (_currentUserService.Role != UserRole.Admin && quiz.CreatedById != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        // For each category, load only questions matching the configured difficulty distribution
        // (e.g., if Easy=50%, Medium=50%, Hard=0%, exclude Hard questions from preview)
        var questions = new List<Question>();
        foreach (var qc in quiz.QuizCategories)
        {
            var allowedDifficulties = new List<DifficultyLevel>();
            if (qc.EasyPercentage > 0) allowedDifficulties.Add(DifficultyLevel.Easy);
            if (qc.MediumPercentage > 0) allowedDifficulties.Add(DifficultyLevel.Medium);
            if (qc.HardPercentage > 0) allowedDifficulties.Add(DifficultyLevel.Hard);

            if (allowedDifficulties.Count == 0) continue;

            var categoryQuestions = await _context.Questions
                .Include(q => q.Category)
                .Include(q => q.Answers)
                .Include(q => q.Media)
                .Where(q => q.CategoryId == qc.CategoryId && allowedDifficulties.Contains(q.DifficultyLevel))
                .ToListAsync(cancellationToken);

            questions.AddRange(categoryQuestions);
        }

        return new QuizPreviewDto
        {
            Id = quiz.Id,
            Title = quiz.Title,
            Description = quiz.Description,
            Mode = quiz.Mode.ToString(),
            IsValidated = quiz.IsValidated,
            Questions = questions.Select(q => new PreviewQuestionDto
            {
                Id = q.Id,
                Text = q.Text,
                QuestionType = q.QuestionType.ToString(),
                ContentType = q.ContentType.ToString(),
                DifficultyLevel = q.DifficultyLevel.ToString(),
                CategoryName = q.Category.Name,
                Answers = q.Answers.OrderBy(a => a.OrderIndex).Select(a => new PreviewAnswerDto
                {
                    Id = a.Id,
                    Text = a.Text,
                    IsCorrect = a.IsCorrect,
                    OrderIndex = a.OrderIndex
                }).ToList(),
                Media = q.Media.Select(m => new PreviewMediaDto
                {
                    Url = _fileStorageService.GetFileUrl(m.FilePath),
                    FileName = m.FileName,
                    MediaType = m.MediaType.ToString()
                }).ToList()
            }).ToList()
        };
    }
}
