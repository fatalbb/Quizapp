using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Helpers;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.QuizAttempts.Commands.RequestBatchReevaluation;

public class RequestBatchReevaluationCommand : IRequest<BatchReevaluationResultDto>
{
    public Guid AttemptId { get; set; }
    public string Justification { get; set; } = string.Empty;
}

public class BatchReevaluationResultDto
{
    public int Processed { get; set; }
    public int Skipped { get; set; } // skipped due to quota cap
    public int ResultsChanged { get; set; }
    public double NewTotalScore { get; set; }
    public int RemainingReevaluations { get; set; } // -1 = unlimited
    public List<BatchReevaluationItem> Items { get; set; } = [];
}

public class BatchReevaluationItem
{
    public Guid QuestionId { get; set; }
    public bool IsCorrect { get; set; }
    public bool ResultChanged { get; set; }
    public string Explanation { get; set; } = string.Empty;
}

public class RequestBatchReevaluationCommandHandler : IRequestHandler<RequestBatchReevaluationCommand, BatchReevaluationResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IOllamaService _ollamaService;

    public RequestBatchReevaluationCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IOllamaService ollamaService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _ollamaService = ollamaService;
    }

    public async Task<BatchReevaluationResultDto> Handle(RequestBatchReevaluationCommand request, CancellationToken cancellationToken)
    {
        var attempt = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .Include(a => a.AttemptAnswers)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuizAttempt), request.AttemptId);

        var role = _currentUserService.Role;
        var isStudent = role == UserRole.Student;
        var isTeacherOwner = role == UserRole.Teacher && attempt.Quiz.CreatedById == _currentUserService.UserId;
        var isAdmin = role == UserRole.Admin;

        if (isStudent)
        {
            if (attempt.StudentId != _currentUserService.UserId)
                throw new ForbiddenAccessException();
            if (!attempt.Quiz.AllowReevaluation)
                throw new InvalidOperationException("Re-evaluation is disabled for this quiz.");
        }
        else if (!isTeacherOwner && !isAdmin)
        {
            throw new ForbiddenAccessException();
        }

        // Find wrong Input questions in this attempt
        var inputQuestions = await _context.Questions
            .IgnoreQueryFilters()
            .Include(q => q.Answers)
            .Where(q => q.QuestionType == QuestionType.Input
                && attempt.AttemptAnswers.Select(aa => aa.QuestionId).Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, cancellationToken);

        var wrongInputAnswers = attempt.AttemptAnswers
            .Where(aa => aa.IsCorrect != true && inputQuestions.ContainsKey(aa.QuestionId))
            .ToList();

        // Determine quota cap for student
        var maxToProcess = wrongInputAnswers.Count;
        if (isStudent)
        {
            var effectiveMax = ReevaluationQuotaHelper.GetEffectiveMax(attempt.Quiz, attempt);
            if (effectiveMax == 0)
                throw new InvalidOperationException("No re-evaluations available.");

            var totalReeval = attempt.AttemptAnswers.Sum(aa => aa.ReevaluationCount);
            var remainingQuota = Math.Max(0, effectiveMax - totalReeval);
            if (remainingQuota == 0)
                throw new InvalidOperationException(
                    $"You have used all your re-evaluations ({effectiveMax}).");
            maxToProcess = Math.Min(maxToProcess, remainingQuota);
        }

        var toProcess = wrongInputAnswers.Take(maxToProcess).ToList();
        var skipped = wrongInputAnswers.Count - toProcess.Count;

        var items = new List<BatchReevaluationItem>();
        foreach (var aa in toProcess)
        {
            var question = inputQuestions[aa.QuestionId];
            var expected = question.Answers.FirstOrDefault(a => a.IsCorrect)?.Text ?? "";
            var studentText = aa.InputText ?? "";

            try
            {
                var evaluation = await _ollamaService.ReevaluateAnswerAsync(
                    question.Text ?? "",
                    expected,
                    studentText,
                    string.IsNullOrWhiteSpace(request.Justification)
                        ? "Please reconsider this answer carefully."
                        : request.Justification,
                    isTeacher: !isStudent,
                    cancellationToken);

                var prev = aa.IsCorrect == true;
                var changed = prev != evaluation.IsCorrect;

                aa.IsCorrect = evaluation.IsCorrect;
                aa.Score = evaluation.IsCorrect ? 1.0 : 0.0;
                aa.AiEvaluationNotes = $"[Re-evaluated (batch)] {evaluation.Explanation}";
                aa.ReevaluationCount += 1;

                items.Add(new BatchReevaluationItem
                {
                    QuestionId = aa.QuestionId,
                    IsCorrect = evaluation.IsCorrect,
                    ResultChanged = changed,
                    Explanation = evaluation.Explanation
                });
            }
            catch (Exception ex)
            {
                items.Add(new BatchReevaluationItem
                {
                    QuestionId = aa.QuestionId,
                    IsCorrect = false,
                    ResultChanged = false,
                    Explanation = $"Re-evaluation failed: {ex.Message}"
                });
            }
        }

        // Recalculate attempt totals
        attempt.CorrectAnswers = attempt.AttemptAnswers.Count(aa => aa.IsCorrect == true);
        var totalScore = attempt.AttemptAnswers.Sum(aa => aa.Score);
        attempt.Score = attempt.TotalQuestions > 0
            ? Math.Round(totalScore / attempt.TotalQuestions * 100, 2)
            : 0;

        await _context.SaveChangesAsync(cancellationToken);

        var remaining = -1;
        if (isStudent)
        {
            var max = ReevaluationQuotaHelper.GetEffectiveMax(attempt.Quiz, attempt);
            if (max > 0)
            {
                var used = attempt.AttemptAnswers.Sum(aa => aa.ReevaluationCount);
                remaining = Math.Max(0, max - used);
            }
        }

        return new BatchReevaluationResultDto
        {
            Processed = items.Count,
            Skipped = skipped,
            ResultsChanged = items.Count(i => i.ResultChanged),
            NewTotalScore = attempt.Score ?? 0,
            RemainingReevaluations = remaining,
            Items = items
        };
    }
}
