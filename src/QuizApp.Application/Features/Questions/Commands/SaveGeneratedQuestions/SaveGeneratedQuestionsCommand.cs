using MediatR;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Questions.Commands.SaveGeneratedQuestions;

public class SaveGeneratedQuestionsCommand : IRequest<List<Guid>>
{
    public Guid CategoryId { get; set; }
    public QuestionType QuestionType { get; set; }
    public List<GeneratedQuestionDto> Questions { get; set; } = [];

    // Optional: Excel file info for table-based questions
    public string? ExcelFilePath { get; set; }
    public string? ExcelFileName { get; set; }
    public string? ExcelStoredFileName { get; set; }
}

public class SaveGeneratedQuestionsCommandHandler : IRequestHandler<SaveGeneratedQuestionsCommand, List<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public SaveGeneratedQuestionsCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<List<Guid>> Handle(SaveGeneratedQuestionsCommand request, CancellationToken cancellationToken)
    {
        var hasExcel = !string.IsNullOrEmpty(request.ExcelFilePath);
        var ids = new List<Guid>();

        foreach (var q in request.Questions)
        {
            var question = new Question
            {
                Id = Guid.NewGuid(),
                Text = q.Text,
                QuestionType = request.QuestionType,
                ContentType = hasExcel ? QuestionContentType.TextAndTable : QuestionContentType.TextOnly,
                DifficultyLevel = q.DifficultyLevel,
                CategoryId = request.CategoryId,
                CreatedById = _currentUserService.UserId!,
                IsAiGenerated = true,
                Answers = q.Answers.Select((a, i) => new Answer
                {
                    Id = Guid.NewGuid(),
                    Text = a.Text,
                    IsCorrect = a.IsCorrect,
                    OrderIndex = i
                }).ToList()
            };

            // Attach Excel file as media if table-based
            if (hasExcel)
            {
                question.Media.Add(new QuestionMedia
                {
                    Id = Guid.NewGuid(),
                    FileName = request.ExcelFileName!,
                    StoredFileName = request.ExcelStoredFileName!,
                    ContentMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    FilePath = request.ExcelFilePath!,
                    MediaType = MediaType.ExcelTable
                });
            }

            _context.Questions.Add(question);
            ids.Add(question.Id);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return ids;
    }
}
