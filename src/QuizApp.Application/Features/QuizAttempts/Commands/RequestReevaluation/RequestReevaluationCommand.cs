using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Helpers;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.QuizAttempts.Commands.RequestReevaluation;

public class RequestReevaluationCommand : IRequest<ReevaluationResultDto>
{
    public Guid AttemptId { get; set; }
    public Guid QuestionId { get; set; }
    public string Justification { get; set; } = string.Empty;
}

public class ReevaluationResultDto
{
    public bool IsCorrect { get; set; }
    public string Explanation { get; set; } = string.Empty;
    public bool ResultChanged { get; set; }
    public double NewTotalScore { get; set; }
    public int RemainingReevaluations { get; set; } // -1 = unlimited (teacher/admin)
}

public class RequestReevaluationCommandHandler : IRequestHandler<RequestReevaluationCommand, ReevaluationResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IOllamaService _ollamaService;

    public RequestReevaluationCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IOllamaService ollamaService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _ollamaService = ollamaService;
    }

    public async Task<ReevaluationResultDto> Handle(RequestReevaluationCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Justification))
            throw new InvalidOperationException("Justification is required.");

        var attempt = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .Include(a => a.AttemptAnswers)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuizAttempt), request.AttemptId);

        var role = _currentUserService.Role;
        var isStudent = role == UserRole.Student;
        var isTeacherOwner = role == UserRole.Teacher && attempt.Quiz.CreatedById == _currentUserService.UserId;
        var isAdmin = role == UserRole.Admin;

        // Authorization
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

        var attemptAnswer = attempt.AttemptAnswers.FirstOrDefault(aa => aa.QuestionId == request.QuestionId)
            ?? throw new NotFoundException(nameof(AttemptAnswer), request.QuestionId);

        var question = await _context.Questions
            .IgnoreQueryFilters()
            .Include(q => q.Answers)
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Question), request.QuestionId);

        if (question.QuestionType != QuestionType.Input)
            throw new InvalidOperationException("Re-evaluation is only available for Input questions.");

        // Enforce re-evaluation limit ONLY for students
        if (isStudent)
        {
            var effectiveMax = ReevaluationQuotaHelper.GetEffectiveMax(attempt.Quiz, attempt);
            var totalReeval = attempt.AttemptAnswers.Sum(aa => aa.ReevaluationCount);
            if (effectiveMax > 0 && totalReeval >= effectiveMax)
            {
                throw new InvalidOperationException(
                    $"You have used all your re-evaluations ({effectiveMax}).");
            }
            if (effectiveMax == 0)
            {
                throw new InvalidOperationException("No re-evaluations available.");
            }
        }

        var expected = question.Answers.FirstOrDefault(a => a.IsCorrect)?.Text ?? "";
        var studentText = attemptAnswer.InputText ?? "";

        var evaluation = await _ollamaService.ReevaluateAnswerAsync(
            question.Text ?? "",
            expected,
            studentText,
            request.Justification,
            isTeacher: !isStudent,
            cancellationToken);

        var previouslyCorrect = attemptAnswer.IsCorrect == true;
        var resultChanged = previouslyCorrect != evaluation.IsCorrect;

        attemptAnswer.IsCorrect = evaluation.IsCorrect;
        attemptAnswer.Score = evaluation.IsCorrect ? 1.0 : 0.0;
        attemptAnswer.AiEvaluationNotes = $"[Re-evaluated] {evaluation.Explanation}";
        attemptAnswer.ReevaluationCount += 1;

        // Recalculate attempt totals
        attempt.CorrectAnswers = attempt.AttemptAnswers.Count(aa => aa.IsCorrect == true);
        var totalScore = attempt.AttemptAnswers.Sum(aa => aa.Score);
        attempt.Score = attempt.TotalQuestions > 0
            ? Math.Round(totalScore / attempt.TotalQuestions * 100, 2)
            : 0;

        await _context.SaveChangesAsync(cancellationToken);

        // Compute remaining for student; -1 means unlimited
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

        return new ReevaluationResultDto
        {
            IsCorrect = evaluation.IsCorrect,
            Explanation = evaluation.Explanation,
            ResultChanged = resultChanged,
            NewTotalScore = attempt.Score ?? 0,
            RemainingReevaluations = remaining
        };
    }
}
