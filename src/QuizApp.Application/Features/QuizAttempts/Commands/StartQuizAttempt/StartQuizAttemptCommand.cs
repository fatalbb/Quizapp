using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.QuizAttempts.Commands.StartQuizAttempt;

public record StartQuizAttemptCommand(Guid QuizId) : IRequest<QuizAttemptStartDto>;

public class QuizAttemptStartDto
{
    public Guid AttemptId { get; set; }
    public int TimeLimitMinutes { get; set; }
    public DateTime StartedAt { get; set; }
    public List<AttemptQuestionDto> Questions { get; set; } = [];
}

public class AttemptQuestionDto
{
    public Guid QuestionId { get; set; }
    public string? Text { get; set; }
    public string QuestionType { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public List<AttemptAnswerOptionDto> Options { get; set; } = [];
    public List<AttemptMediaDto> Media { get; set; } = [];
}

public class AttemptAnswerOptionDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
}

public class AttemptMediaDto
{
    public string Url { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
}

public class StartQuizAttemptCommandHandler : IRequestHandler<StartQuizAttemptCommand, QuizAttemptStartDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IFileStorageService _fileStorageService;

    public StartQuizAttemptCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IFileStorageService fileStorageService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _fileStorageService = fileStorageService;
    }

    public async Task<QuizAttemptStartDto> Handle(StartQuizAttemptCommand request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.QuizCategories)
            .FirstOrDefaultAsync(q => q.Id == request.QuizId, cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.QuizId);

        if (quiz.Status != QuizStatus.Published)
            throw new InvalidOperationException("Quiz is not available.");

        // Select random questions from each category based on difficulty distribution
        var selectedQuestions = new List<Question>();
        foreach (var qc in quiz.QuizCategories)
        {
            var easyCount = (int)Math.Round(qc.QuestionCount * qc.EasyPercentage / 100.0);
            var mediumCount = (int)Math.Round(qc.QuestionCount * qc.MediumPercentage / 100.0);
            var hardCount = qc.QuestionCount - easyCount - mediumCount; // remainder goes to hard

            foreach (var (difficulty, count) in new[]
            {
                (DifficultyLevel.Easy, easyCount),
                (DifficultyLevel.Medium, mediumCount),
                (DifficultyLevel.Hard, hardCount)
            })
            {
                if (count <= 0) continue;

                var allForDifficulty = await _context.Questions
                    .Include(q => q.Answers.OrderBy(a => a.OrderIndex))
                    .Include(q => q.Media)
                    .Where(q => q.CategoryId == qc.CategoryId && q.DifficultyLevel == difficulty)
                    .ToListAsync(cancellationToken);

                // Shuffle in memory (SQLite doesn't support OrderBy(Guid.NewGuid()))
                var questions = allForDifficulty
                    .OrderBy(_ => Random.Shared.Next())
                    .Take(count)
                    .ToList();

                selectedQuestions.AddRange(questions);
            }
        }

        var attempt = new QuizAttempt
        {
            Id = Guid.NewGuid(),
            QuizId = quiz.Id,
            StudentId = _currentUserService.UserId!,
            StartedAt = DateTime.UtcNow,
            TotalQuestions = selectedQuestions.Count,
            TimeLimitMinutes = quiz.TimeLimitMinutes,
            AttemptAnswers = selectedQuestions.Select(q => new AttemptAnswer
            {
                Id = Guid.NewGuid(),
                QuestionId = q.Id
            }).ToList()
        };

        _context.QuizAttempts.Add(attempt);
        await _context.SaveChangesAsync(cancellationToken);

        return new QuizAttemptStartDto
        {
            AttemptId = attempt.Id,
            TimeLimitMinutes = quiz.TimeLimitMinutes,
            StartedAt = attempt.StartedAt,
            Questions = selectedQuestions.Select(q => new AttemptQuestionDto
            {
                QuestionId = q.Id,
                Text = q.Text,
                QuestionType = q.QuestionType.ToString(),
                ContentType = q.ContentType.ToString(),
                Options = q.Answers.Select(a => new AttemptAnswerOptionDto
                {
                    Id = a.Id,
                    Text = a.Text,
                    OrderIndex = a.OrderIndex
                }).ToList(),
                Media = q.Media.Select(m => new AttemptMediaDto
                {
                    Url = _fileStorageService.GetFileUrl(m.FilePath),
                    MediaType = m.MediaType.ToString()
                }).ToList()
            }).ToList()
        };
    }
}
