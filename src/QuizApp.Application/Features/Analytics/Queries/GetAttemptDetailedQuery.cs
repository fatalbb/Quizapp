using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Analytics.Queries;

public record GetAttemptDetailedQuery(Guid AttemptId) : IRequest<AttemptDetailedDto>;

public class AttemptDetailedDto
{
    public Guid AttemptId { get; set; }
    public Guid QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public double? Score { get; set; }
    public int CorrectAnswers { get; set; }
    public int TotalQuestions { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int TimeLimitMinutes { get; set; }
    public int PassingScorePercentage { get; set; }
    public bool Passed { get; set; }
    public List<DetailedQuestionResultDto> Questions { get; set; } = [];
}

public class DetailedQuestionResultDto
{
    public Guid QuestionId { get; set; }
    public string? QuestionText { get; set; }
    public string QuestionType { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string DifficultyLevel { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public double Score { get; set; } // 0.0 to 1.0 partial credit
    public string? AiEvaluationNotes { get; set; }
    public DateTime? AnsweredAt { get; set; }
    public List<DetailedAnswerOptionDto> Options { get; set; } = [];
    public List<Guid> StudentSelectedAnswerIds { get; set; } = [];
    public string? StudentInputText { get; set; }
    public List<DetailedMediaDto> Media { get; set; } = [];
}

public class DetailedAnswerOptionDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public bool WasSelected { get; set; }
    public int OrderIndex { get; set; }
}

public class DetailedMediaDto
{
    public string Url { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
}

public class GetAttemptDetailedQueryHandler : IRequestHandler<GetAttemptDetailedQuery, AttemptDetailedDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IFileStorageService _fileStorageService;

    public GetAttemptDetailedQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IFileStorageService fileStorageService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _fileStorageService = fileStorageService;
    }

    public async Task<AttemptDetailedDto> Handle(GetAttemptDetailedQuery request, CancellationToken cancellationToken)
    {
        var attempt = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .Include(a => a.Student)
            .Include(a => a.AttemptAnswers)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuizAttempt), request.AttemptId);

        // Authorization: Admin sees all, Teacher sees only their own quizzes
        if (_currentUserService.Role != UserRole.Admin)
        {
            if (_currentUserService.Role == UserRole.Teacher && attempt.Quiz.CreatedById != _currentUserService.UserId)
                throw new ForbiddenAccessException();

            if (_currentUserService.Role == UserRole.Student && attempt.StudentId != _currentUserService.UserId)
                throw new ForbiddenAccessException();
        }

        // Load all questions referenced by this attempt with full details
        var questionIds = attempt.AttemptAnswers.Select(aa => aa.QuestionId).ToList();
        var questions = await _context.Questions
            .IgnoreQueryFilters()
            .Include(q => q.Category)
            .Include(q => q.Answers)
            .Include(q => q.Media)
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, cancellationToken);

        var questionResults = new List<DetailedQuestionResultDto>();

        foreach (var aa in attempt.AttemptAnswers)
        {
            if (!questions.TryGetValue(aa.QuestionId, out var question))
                continue;

            // Determine which answer IDs the student selected.
            // For SingleChoice/TrueFalse: SelectedAnswerId is the single id.
            // For MultipleChoice: InputText holds comma-separated GUIDs (from grading logic).
            // For Input: InputText holds the free-text answer.
            var selectedIds = new List<Guid>();
            if (question.QuestionType == QuestionType.MultipleChoice && !string.IsNullOrEmpty(aa.InputText))
            {
                foreach (var part in aa.InputText.Split(','))
                {
                    if (Guid.TryParse(part.Trim(), out var g))
                        selectedIds.Add(g);
                }
            }
            else if (aa.SelectedAnswerId.HasValue)
            {
                selectedIds.Add(aa.SelectedAnswerId.Value);
            }

            var selectedSet = selectedIds.ToHashSet();

            questionResults.Add(new DetailedQuestionResultDto
            {
                QuestionId = question.Id,
                QuestionText = question.Text,
                QuestionType = question.QuestionType.ToString(),
                ContentType = question.ContentType.ToString(),
                DifficultyLevel = question.DifficultyLevel.ToString(),
                CategoryName = question.Category.Name,
                IsCorrect = aa.IsCorrect ?? false,
                Score = aa.Score,
                AiEvaluationNotes = aa.AiEvaluationNotes,
                AnsweredAt = aa.AnsweredAt,
                StudentSelectedAnswerIds = selectedIds,
                StudentInputText = question.QuestionType == QuestionType.Input ? aa.InputText : null,
                Options = question.Answers.OrderBy(a => a.OrderIndex).Select(opt => new DetailedAnswerOptionDto
                {
                    Id = opt.Id,
                    Text = opt.Text,
                    IsCorrect = opt.IsCorrect,
                    WasSelected = selectedSet.Contains(opt.Id),
                    OrderIndex = opt.OrderIndex
                }).ToList(),
                Media = question.Media.Select(m => new DetailedMediaDto
                {
                    Url = _fileStorageService.GetFileUrl(m.FilePath),
                    FileName = m.FileName,
                    MediaType = m.MediaType.ToString()
                }).ToList()
            });
        }

        return new AttemptDetailedDto
        {
            AttemptId = attempt.Id,
            QuizId = attempt.QuizId,
            QuizTitle = attempt.Quiz.Title,
            StudentName = $"{attempt.Student.FirstName} {attempt.Student.LastName}",
            StudentEmail = attempt.Student.Email ?? "",
            Score = attempt.Score,
            CorrectAnswers = attempt.CorrectAnswers,
            TotalQuestions = attempt.TotalQuestions,
            Status = attempt.Status.ToString(),
            StartedAt = attempt.StartedAt,
            CompletedAt = attempt.CompletedAt,
            TimeLimitMinutes = attempt.TimeLimitMinutes,
            PassingScorePercentage = attempt.Quiz.PassingScorePercentage,
            Passed = attempt.Score.HasValue && attempt.Score >= attempt.Quiz.PassingScorePercentage,
            Questions = questionResults
        };
    }
}
