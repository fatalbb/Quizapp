using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Helpers;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.QuizAttempts.Commands.SubmitQuizAttempt;

public class SubmitQuizAttemptCommand : IRequest<QuizAttemptResultDto>
{
    public Guid AttemptId { get; set; }
    public List<SubmitAnswerDto> Answers { get; set; } = [];
}

public class SubmitAnswerDto
{
    public Guid QuestionId { get; set; }
    public Guid? SelectedAnswerId { get; set; }
    public List<Guid>? SelectedAnswerIds { get; set; } // for multiple choice
    public string? InputText { get; set; }
}

public class QuizAttemptResultDto
{
    public Guid AttemptId { get; set; }
    public double Score { get; set; }
    public int CorrectAnswers { get; set; }
    public int TotalQuestions { get; set; }
    public bool Passed { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsGrading { get; set; } // true while LLM is still grading Input questions
    public bool AllowFeedback { get; set; }
    public bool AllowReevaluation { get; set; }
    public int MaxReevaluationsPerStudent { get; set; } // effective per-attempt cap (auto or manual override)
    public int ReevaluationsUsed { get; set; } // total across all questions in this attempt
    public List<QuestionResultDto> QuestionResults { get; set; } = [];
}

public class QuestionResultDto
{
    public Guid QuestionId { get; set; }
    public string? QuestionText { get; set; }
    public bool? IsCorrect { get; set; } // null while pending grading
    public string? AiEvaluationNotes { get; set; }
}

public class SubmitQuizAttemptCommandHandler : IRequestHandler<SubmitQuizAttemptCommand, QuizAttemptResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SubmitQuizAttemptCommandHandler> _logger;

    public SubmitQuizAttemptCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IServiceScopeFactory scopeFactory,
        ILogger<SubmitQuizAttemptCommandHandler> logger)
    {
        _context = context;
        _currentUserService = currentUserService;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<QuizAttemptResultDto> Handle(SubmitQuizAttemptCommand request, CancellationToken cancellationToken)
    {
        var attempt = await _context.QuizAttempts
            .Include(a => a.AttemptAnswers)
            .Include(a => a.Quiz)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuizAttempt), request.AttemptId);

        if (attempt.StudentId != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        if (attempt.Status != QuizAttemptStatus.InProgress)
            throw new InvalidOperationException("This attempt has already been completed.");

        // Check time limit (only enforce for Exam mode; Learning has no timer)
        var isTimedOut = attempt.Quiz.Mode == QuizMode.Exam &&
                         DateTime.UtcNow > attempt.StartedAt.AddMinutes(attempt.TimeLimitMinutes);
        attempt.Status = isTimedOut ? QuizAttemptStatus.TimedOut : QuizAttemptStatus.Completed;
        attempt.CompletedAt = DateTime.UtcNow;

        // Synchronous grading: choice-based questions (instant)
        // Async grading: Input questions (LLM, slow)
        var inputQuestionIds = new List<Guid>();
        var correctCount = 0;
        var totalScore = 0.0;
        var questionResults = new List<QuestionResultDto>();

        foreach (var attemptAnswer in attempt.AttemptAnswers)
        {
            var submitted = request.Answers.FirstOrDefault(a => a.QuestionId == attemptAnswer.QuestionId);
            if (submitted == null) continue;

            var question = await _context.Questions
                .IgnoreQueryFilters()
                .Include(q => q.Answers)
                .FirstOrDefaultAsync(q => q.Id == attemptAnswer.QuestionId, cancellationToken);

            if (question == null) continue;

            attemptAnswer.AnsweredAt = DateTime.UtcNow;

            switch (question.QuestionType)
            {
                case QuestionType.SingleChoice:
                case QuestionType.TrueFalse:
                {
                    attemptAnswer.SelectedAnswerId = submitted.SelectedAnswerId;
                    var correctAnswer = question.Answers.FirstOrDefault(a => a.IsCorrect);
                    var isCorrect = correctAnswer != null && submitted.SelectedAnswerId == correctAnswer.Id;
                    var score = isCorrect ? 1.0 : 0.0;
                    attemptAnswer.IsCorrect = isCorrect;
                    attemptAnswer.Score = score;
                    totalScore += score;
                    if (isCorrect) correctCount++;
                    questionResults.Add(new QuestionResultDto
                    {
                        QuestionId = attemptAnswer.QuestionId,
                        QuestionText = question.Text,
                        IsCorrect = isCorrect,
                        AiEvaluationNotes = null
                    });
                    break;
                }

                case QuestionType.MultipleChoice:
                {
                    var correctIds = question.Answers.Where(a => a.IsCorrect).Select(a => a.Id).ToHashSet();
                    var wrongIds = question.Answers.Where(a => !a.IsCorrect).Select(a => a.Id).ToHashSet();
                    var selectedIds = submitted.SelectedAnswerIds?.ToHashSet() ?? [];

                    var correctSelected = selectedIds.Intersect(correctIds).Count();
                    var wrongSelected = selectedIds.Intersect(wrongIds).Count();
                    var totalCorrect = correctIds.Count;

                    var score = totalCorrect > 0
                        ? Math.Max(0.0, Math.Min(1.0, (double)(correctSelected - wrongSelected) / totalCorrect))
                        : 0.0;
                    var isCorrect = score >= 1.0;

                    attemptAnswer.SelectedAnswerId = submitted.SelectedAnswerIds?.FirstOrDefault();
                    attemptAnswer.InputText = submitted.SelectedAnswerIds != null
                        ? string.Join(",", submitted.SelectedAnswerIds)
                        : null;
                    attemptAnswer.IsCorrect = isCorrect;
                    attemptAnswer.Score = score;
                    attemptAnswer.AiEvaluationNotes = totalCorrect > 0
                        ? $"Selected {correctSelected}/{totalCorrect} correct answers" +
                          (wrongSelected > 0 ? $" and {wrongSelected} incorrect" : "") +
                          $" (score: {score * 100:F0}%)"
                        : null;
                    totalScore += score;
                    if (isCorrect) correctCount++;
                    questionResults.Add(new QuestionResultDto
                    {
                        QuestionId = attemptAnswer.QuestionId,
                        QuestionText = question.Text,
                        IsCorrect = isCorrect,
                        AiEvaluationNotes = attemptAnswer.AiEvaluationNotes
                    });
                    break;
                }

                case QuestionType.Input:
                {
                    // DON'T call Ollama here. Just store the input and queue for background grading.
                    attemptAnswer.InputText = submitted.InputText;
                    attemptAnswer.IsCorrect = null; // pending
                    attemptAnswer.Score = 0; // will be updated by background grader
                    inputQuestionIds.Add(attemptAnswer.QuestionId);
                    questionResults.Add(new QuestionResultDto
                    {
                        QuestionId = attemptAnswer.QuestionId,
                        QuestionText = question.Text,
                        IsCorrect = null,
                        AiEvaluationNotes = "Grading in progress..."
                    });
                    break;
                }
            }
        }

        attempt.CorrectAnswers = correctCount;
        // Initial score reflects only choice-based questions; final score updated by background grader
        attempt.Score = attempt.TotalQuestions > 0
            ? Math.Round(totalScore / attempt.TotalQuestions * 100, 2)
            : 0;
        attempt.IsGrading = inputQuestionIds.Count > 0;

        await _context.SaveChangesAsync(cancellationToken);

        // If there are Input questions, kick off background grading (fire-and-forget)
        if (inputQuestionIds.Count > 0)
        {
            var attemptId = attempt.Id;
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var bgContext = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                    var ollama = scope.ServiceProvider.GetRequiredService<IOllamaService>();
                    await GradeInputQuestionsAsync(bgContext, ollama, attemptId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background grading failed for attempt {AttemptId}", attemptId);
                }
            });
        }

        return new QuizAttemptResultDto
        {
            AttemptId = attempt.Id,
            Score = attempt.Score ?? 0,
            CorrectAnswers = correctCount,
            TotalQuestions = attempt.TotalQuestions,
            Passed = (attempt.Score ?? 0) >= attempt.Quiz.PassingScorePercentage,
            Status = attempt.Status.ToString(),
            IsGrading = attempt.IsGrading,
            AllowFeedback = attempt.Quiz.AllowFeedback,
            AllowReevaluation = attempt.Quiz.AllowReevaluation,
            MaxReevaluationsPerStudent = ReevaluationQuotaHelper.GetEffectiveMax(attempt.Quiz, attempt),
            ReevaluationsUsed = attempt.AttemptAnswers.Sum(aa => aa.ReevaluationCount),
            QuestionResults = questionResults
        };
    }

    private static async Task GradeInputQuestionsAsync(
        IApplicationDbContext context,
        IOllamaService ollama,
        Guid attemptId)
    {
        var attempt = await context.QuizAttempts
            .Include(a => a.AttemptAnswers)
            .Include(a => a.Quiz)
            .FirstOrDefaultAsync(a => a.Id == attemptId);

        if (attempt == null) return;

        foreach (var aa in attempt.AttemptAnswers.Where(a => a.IsCorrect == null))
        {
            var question = await context.Questions
                .IgnoreQueryFilters()
                .Include(q => q.Answers)
                .FirstOrDefaultAsync(q => q.Id == aa.QuestionId);

            if (question == null || question.QuestionType != QuestionType.Input) continue;

            var expected = question.Answers.FirstOrDefault(a => a.IsCorrect)?.Text ?? "";
            try
            {
                var evaluation = await ollama.EvaluateAnswerAsync(
                    question.Text ?? "",
                    expected,
                    aa.InputText ?? "",
                    CancellationToken.None);

                aa.IsCorrect = evaluation.IsCorrect;
                aa.Score = evaluation.IsCorrect ? 1.0 : 0.0;
                aa.AiEvaluationNotes = evaluation.Explanation;
            }
            catch (Exception ex)
            {
                aa.IsCorrect = false;
                aa.Score = 0;
                aa.AiEvaluationNotes = $"Grading failed: {ex.Message}";
            }

            // Save incrementally so polling can show progress
            await context.SaveChangesAsync(CancellationToken.None);
        }

        // Recalculate total score and correct count
        var correctCount = attempt.AttemptAnswers.Count(a => a.IsCorrect == true);
        var totalScore = attempt.AttemptAnswers.Sum(a => a.Score);
        attempt.CorrectAnswers = correctCount;
        attempt.Score = attempt.TotalQuestions > 0
            ? Math.Round(totalScore / attempt.TotalQuestions * 100, 2)
            : 0;
        attempt.IsGrading = false;
        await context.SaveChangesAsync(CancellationToken.None);
    }
}
