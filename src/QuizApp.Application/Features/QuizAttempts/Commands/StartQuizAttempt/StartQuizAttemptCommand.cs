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
    public string Mode { get; set; } = "Learning";
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

        var now = DateTime.UtcNow;

        // For Exam quizzes, check if it's currently live
        if (quiz.Mode == QuizMode.Exam)
        {
            if (quiz.StartMode == ExamStartMode.Manual)
            {
                if (quiz.ManualStartedAt == null)
                    throw new InvalidOperationException("This exam has not been started by the teacher yet.");

                var joinDeadline = quiz.ManualStartedAt.Value.AddMinutes(quiz.JoinWindowMinutes);
                if (now > joinDeadline)
                    throw new InvalidOperationException("The join window for this exam has closed.");
            }
            else if (quiz.StartMode == ExamStartMode.Scheduled)
            {
                if (quiz.ScheduledStartAt.HasValue && now < quiz.ScheduledStartAt.Value)
                    throw new InvalidOperationException($"This exam starts at {quiz.ScheduledStartAt.Value:yyyy-MM-dd HH:mm} UTC.");

                if (quiz.ScheduledEndAt.HasValue && now > quiz.ScheduledEndAt.Value)
                    throw new InvalidOperationException("This exam has closed.");
            }
        }

        // Delete any abandoned InProgress attempts for this student+quiz (no junk data)
        var abandoned = await _context.QuizAttempts
            .Include(a => a.AttemptAnswers)
            .Where(a => a.QuizId == quiz.Id
                && a.StudentId == _currentUserService.UserId
                && a.Status == QuizAttemptStatus.InProgress)
            .ToListAsync(cancellationToken);

        if (abandoned.Any())
        {
            // Delete cascades to AttemptAnswers via EF relationship
            _context.AttemptAnswers.RemoveRange(abandoned.SelectMany(a => a.AttemptAnswers));
            _context.QuizAttempts.RemoveRange(abandoned);
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Check max attempts (only Completed/TimedOut count)
        if (quiz.MaxAttempts > 0)
        {
            var completedAttempts = await _context.QuizAttempts
                .CountAsync(a => a.QuizId == quiz.Id
                    && a.StudentId == _currentUserService.UserId
                    && a.Status != QuizAttemptStatus.InProgress, cancellationToken);

            if (completedAttempts >= quiz.MaxAttempts)
                throw new InvalidOperationException(
                    $"You have reached the maximum number of attempts ({quiz.MaxAttempts}) for this quiz.");
        }

        // Select random questions per (category, difficulty, type) bucket
        var selectedQuestions = new List<Question>();
        foreach (var qc in quiz.QuizCategories)
        {
            var easyCount = (int)Math.Round(qc.QuestionCount * qc.EasyPercentage / 100.0);
            var mediumCount = (int)Math.Round(qc.QuestionCount * qc.MediumPercentage / 100.0);
            var hardCount = qc.QuestionCount - easyCount - mediumCount;

            var difficultyBuckets = new[]
            {
                (DifficultyLevel.Easy, easyCount),
                (DifficultyLevel.Medium, mediumCount),
                (DifficultyLevel.Hard, hardCount)
            };

            foreach (var (difficulty, diffCount) in difficultyBuckets)
            {
                if (diffCount <= 0) continue;

                // Split this difficulty bucket across the 4 types
                var mcCount = (int)Math.Round(diffCount * qc.MultipleChoicePercentage / 100.0);
                var scCount = (int)Math.Round(diffCount * qc.SingleChoicePercentage / 100.0);
                var tfCount = (int)Math.Round(diffCount * qc.TrueFalsePercentage / 100.0);
                var inputCount = diffCount - mcCount - scCount - tfCount; // remainder

                var typeBuckets = new[]
                {
                    (QuestionType.MultipleChoice, mcCount),
                    (QuestionType.SingleChoice, scCount),
                    (QuestionType.TrueFalse, tfCount),
                    (QuestionType.Input, inputCount)
                };

                foreach (var (type, typeCount) in typeBuckets)
                {
                    if (typeCount <= 0) continue;

                    var pool = await _context.Questions
                        .Include(q => q.Answers.OrderBy(a => a.OrderIndex))
                        .Include(q => q.Media)
                        .Where(q => q.CategoryId == qc.CategoryId
                            && q.DifficultyLevel == difficulty
                            && q.QuestionType == type)
                        .ToListAsync(cancellationToken);

                    // Take what's available; if fewer than requested, no fallback to other types/difficulties
                    var picked = pool
                        .OrderBy(_ => Random.Shared.Next())
                        .Take(typeCount)
                        .ToList();

                    selectedQuestions.AddRange(picked);
                }
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
            Mode = quiz.Mode.ToString(),
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
